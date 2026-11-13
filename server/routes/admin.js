/**
 * 后台管理路由（管理端 Web / 大屏专用）
 * 鉴权：除 /login 外全部走 adminAuth()
 *
 * GET  /api/admin/dashboard   看板概览
 * GET  /api/admin/users       用户列表（分页/搜索/仅真实用户）
 * GET  /api/admin/screen      大屏聚合数据（一次返回全部）
 * POST /api/admin/login       管理员登录
 */
const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { query } = require('../db')
const config = require('../config')
const { ok, fail } = require('../utils/resp')
const { adminAuth } = require('../middleware/auth')
const { calcBudget } = require('../utils/nutrition')
const { calcHealthScore, levelOf } = require('../utils/score')
const { calcStreak } = require('../utils/date')
const { chatStream } = require('../utils/hunyuan')

const router = express.Router()

const LEVELS = ['优秀', '良好', '一般', '需关注']

function sign(user) {
  return jwt.sign({ id: user.id, username: user.username }, config.jwtSecret, { expiresIn: config.jwtExpiresIn })
}
function publicUser(u) {
  if (!u) return null
  const { password_hash, ...rest } = u
  return rest
}

/**
 * 一次性加载所有用户的汇总统计 + 健康分（供 dashboard/users/screen 复用）
 * 仅一条 SQL，避免 N+1
 */
async function loadUserRows() {
  const rows = await query(`
    SELECT u.id, u.username, u.nickname, u.gender, u.age, u.height,
           u.weight, u.target_weight, u.activity_level, u.role, u.created_at,
           COALESCE(AVG(c.intake), 0) avg_intake,
           COALESCE(AVG(c.burn), 0) avg_burn,
           COALESCE(COUNT(c.id), 0) checkin_cnt,
           COALESCE(SUM(CASE WHEN c.date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END), 0) checkin_30
    FROM users u
    LEFT JOIN checkins c ON c.user_id = u.id
    GROUP BY u.id
  `)
  return rows.map(r => {
    const budget = calcBudget(r)
    const checkinRate = Math.min(1, Number(r.checkin_30) / 30)
    const stats = {
      weight: r.weight, target: r.target_weight, budget,
      avgIntake: Number(r.avg_intake), avgBurn: Number(r.avg_burn), checkinRate
    }
    const sc = calcHealthScore(r, stats)
    return {
      id: r.id, username: r.username, nickname: r.nickname, gender: r.gender,
      age: r.age, height: r.height, weight: r.weight, targetWeight: r.target_weight,
      activityLevel: r.activity_level, role: r.role, createdAt: r.created_at,
      budget, avgIntake: +stats.avgIntake.toFixed(0), avgBurn: +stats.avgBurn.toFixed(0),
      checkinCnt: Number(r.checkin_cnt), checkin30: Number(r.checkin_30),
      checkinRate, score: sc.score, level: sc.level
    }
  })
}

// 补全近 30 天（含今天）序列，缺失日期补 null/0
function fillTrend(rows) {
  const map = {}
  rows.forEach(r => {
    map[r.date] = {
      checkinCount: Number(r.checkin_count),
      avgWeight: r.avg_weight != null ? +Number(r.avg_weight).toFixed(1) : null,
      avgIntake: r.avg_intake != null ? +Number(r.avg_intake).toFixed(0) : null,
      avgBurn: r.avg_burn != null ? +Number(r.avg_burn).toFixed(0) : null
    }
  })
  const out = []
  const p = n => (n < 10 ? '0' + n : '' + n)
  const today = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
    out.push({ date: key, ...(map[key] || { checkinCount: 0, avgWeight: null, avgIntake: null, avgBurn: null }) })
  }
  return out
}

async function loadStreak(uid) {
  const rows = await query('SELECT date FROM checkins WHERE user_id = ? ORDER BY date DESC', [uid])
  return calcStreak(rows.map(r => r.date))
}

/** 规则总结（混元不可用时的兜底） */
function ruleSummary(overview, scoreDist) {
  const { totalUsers, todayCheckins, avgScore, avgIntake, avgBurn } = overview
  const top = LEVELS.reduce((a, b) => (scoreDist[b] >= scoreDist[a] ? b : a), LEVELS[0])
  return [
    `当前平台共 ${totalUsers} 位用户，今日 ${todayCheckins} 人完成打卡，整体打卡活跃度${todayCheckins / Math.max(1, totalUsers) > 0.3 ? '较高' : '仍有提升空间'}。`,
    `全体用户平均健康分 ${avgScore} 分，以「${top}」为主（${scoreDist[top]} 人），建议针对「需关注」用户推送个性化减脂方案。`,
    `近 30 天人均日摄入 ${avgIntake} kcal、消耗 ${avgBurn} kcal，保持热量缺口并提升运动频率，是下一阶段运营重点。`
  ].join('')
}

// ============================ 管理员登录 ============================
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {}
    if (!username || !password) return fail(res, '请输入用户名和密码')
    const rows = await query('SELECT * FROM users WHERE username = ?', [username])
    if (!rows.length) return fail(res, '用户不存在')
    const u = rows[0]
    if (u.role !== 2) return fail(res, '该账号不是管理员，无权限登录')
    const match = await bcrypt.compare(String(password), u.password_hash)
    if (!match) return fail(res, '密码错误')
    ok(res, { token: sign(u), user: publicUser(u) }, '登录成功')
  } catch (e) { next(e) }
})

// ============================ 看板概览 ============================
router.get('/dashboard', adminAuth, async (req, res, next) => {
  try {
    const users = await loadUserRows()
    const totalUsers = users.length
    const avgScore = Math.round(users.reduce((s, u) => s + u.score, 0) / Math.max(1, totalUsers))

    const [today] = await query('SELECT COUNT(DISTINCT user_id) c FROM checkins WHERE date = CURDATE()')
    const [agg] = await query(
      'SELECT AVG(intake) ai, AVG(burn) ab, AVG(weight) aw, COUNT(*) cnt FROM checkins WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)'
    )
    const totalCheckins = users.reduce((s, u) => s + u.checkinCnt, 0)

    // 近 7 天每日新增用户 + 打卡人数
    const growth = await query(`
      SELECT DATE(created_at) d, COUNT(*) c FROM users
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY d
    `)
    const checkinByDay = await query(`
      SELECT date d, COUNT(DISTINCT user_id) c FROM checkins
      WHERE date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY d
    `)
    const last7 = []
    const p = n => (n < 10 ? '0' + n : '' + n)
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const key = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
      const g = growth.find(x => x.d === key)
      const ck = checkinByDay.find(x => x.d === key)
      last7.push({ date: key, newUsers: g ? Number(g.c) : 0, checkins: ck ? Number(ck.c) : 0 })
    }

    const genderDist = await query('SELECT gender, COUNT(*) c FROM users GROUP BY gender')
    const activityDist = await query('SELECT activity_level lvl, COUNT(*) c FROM users GROUP BY activity_level')
    const recentUsers = users
      .slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 8)
      .map(u => ({ id: u.id, nickname: u.nickname, gender: u.gender, createdAt: u.createdAt, score: u.score, level: u.level }))

    ok(res, {
      overview: {
        totalUsers, todayCheckins: Number(today.c), totalCheckins,
        avgIntake: agg.ai != null ? +Number(agg.ai).toFixed(0) : 0,
        avgBurn: agg.ab != null ? +Number(agg.ab).toFixed(0) : 0,
        avgWeight: agg.aw != null ? +Number(agg.aw).toFixed(1) : 0,
        avgScore
      },
      last7,
      genderDist: genderDist.map(x => ({ gender: x.gender, count: Number(x.c) })),
      activityDist: activityDist.map(x => ({ level: x.lvl, count: Number(x.c) })),
      recentUsers
    })
  } catch (e) { next(e) }
})

// ============================ 用户列表 ============================
router.get('/users', adminAuth, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const size = Math.max(1, Math.min(100, parseInt(req.query.size) || 10))
    const keyword = (req.query.keyword || '').trim()
    const onlyReal = String(req.query.onlyReal) === '1'

    let users = await loadUserRows()
    if (onlyReal) users = users.filter(u => !u.username.startsWith('seed_'))
    if (keyword) {
      const k = keyword.toLowerCase()
      users = users.filter(u =>
        (u.nickname || '').toLowerCase().includes(k) ||
        (u.username || '').toLowerCase().includes(k))
    }
    const total = users.length
    users.sort((a, b) => b.checkinCnt - a.checkinCnt)
    const list = users.slice((page - 1) * size, page * size).map(u => ({
      id: u.id, nickname: u.nickname, username: u.username, gender: u.gender,
      age: u.age, height: u.height, weight: u.weight, targetWeight: u.targetWeight,
      activityLevel: u.activityLevel, createdAt: u.createdAt, role: u.role,
      isSeeded: u.username.startsWith('seed_'),
      checkinCnt: u.checkinCnt, checkin30: u.checkin30, checkinRate: Math.round(u.checkinRate * 100),
      avgIntake: u.avgIntake, avgBurn: u.avgBurn, score: u.score, level: u.level
    }))
    ok(res, { total, page, size, list, isSeededCount: users.filter(u => u.username.startsWith('seed_')).length })
  } catch (e) { next(e) }
})

// ============================ 大屏聚合 ============================
router.get('/screen', adminAuth, async (req, res, next) => {
  try {
    const users = await loadUserRows()
    const totalUsers = users.length
    const avgScore = Math.round(users.reduce((s, u) => s + u.score, 0) / Math.max(1, totalUsers))

    const [today] = await query('SELECT COUNT(DISTINCT user_id) c FROM checkins WHERE date = CURDATE()')
    const [agg] = await query(
      'SELECT AVG(intake) ai, AVG(burn) ab FROM checkins WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)'
    )
    const totalCheckins = users.reduce((s, u) => s + u.checkinCnt, 0)

    const trendRows = await query(`
      SELECT date, COUNT(DISTINCT user_id) checkin_count, AVG(weight) avg_weight,
             AVG(intake) avg_intake, AVG(burn) avg_burn
      FROM checkins WHERE date >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
      GROUP BY date ORDER BY date
    `)
    const trend = fillTrend(trendRows)

    // TOP5 打卡达人（带连续天数）
    const topSql = await query(`
      SELECT u.id, u.nickname, COUNT(c.id) checkin_cnt
      FROM users u LEFT JOIN checkins c ON c.user_id = u.id
      GROUP BY u.id ORDER BY checkin_cnt DESC LIMIT 5
    `)
    const topUsers = []
    for (const t of topSql) {
      const streak = await loadStreak(t.id)
      const u = users.find(x => x.id === t.id)
      topUsers.push({
        id: t.id, nickname: t.nickname, checkinDays: Number(t.checkin_cnt),
        streak, score: u ? u.score : 0, level: u ? u.level : '一般'
      })
    }

    // 健康分分布
    const scoreDist = { 优秀: 0, 良好: 0, 一般: 0, 需关注: 0 }
    users.forEach(u => { scoreDist[u.level] = (scoreDist[u.level] || 0) + 1 })

    const recent = await query(`
      SELECT c.id, c.date, c.weight, c.intake, c.burn, u.nickname
      FROM checkins c JOIN users u ON u.id = c.user_id
      ORDER BY c.date DESC, c.id DESC LIMIT 8
    `)
    const recentList = recent.map(r => ({
      id: r.id, date: r.date, nickname: r.nickname,
      weight: r.weight != null ? +Number(r.weight).toFixed(1) : null,
      intake: Math.round(r.intake), burn: Math.round(r.burn)
    }))

    const overview = {
      totalUsers, todayCheckins: Number(today.c), totalCheckins,
      avgIntake: agg.ai != null ? +Number(agg.ai).toFixed(0) : 0,
      avgBurn: agg.ab != null ? +Number(agg.ab).toFixed(0) : 0,
      avgScore, checkinRate: Number((Number(today.c) / Math.max(1, totalUsers) * 100).toFixed(1))
    }

    // AI 总结：优先混元，失败回退规则
    let summary = ruleSummary(overview, scoreDist)
    try {
      const prompt = `你是薄荷健康运营助手，请用一段简洁专业的中文（约80字）总结以下运营数据，给出运营建议：\n` +
        `总用户${overview.totalUsers}人，今日打卡${overview.todayCheckins}人，累计打卡${overview.totalCheckins}条；近30天人均日摄入${overview.avgIntake}kcal、消耗${overview.avgBurn}kcal；平均健康分${overview.avgScore}分。` +
        `健康分分布：优秀${scoreDist.优秀}人、良好${scoreDist.良好}人、一般${scoreDist.一般}人、需关注${scoreDist.需关注}人。`
      const p = chatStream([{ role: 'user', content: prompt }], {}, undefined)
      const race = await Promise.race([
        p,
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 6000))
      ])
      if (race && race.trim()) summary = race.trim()
    } catch (e) {
      // 超时或失败，保留规则兜底
    }

    ok(res, {
      updatedAt: new Date().toISOString(),
      overview, trend, topUsers, scoreDist, recent: recentList, summary
    })
  } catch (e) { next(e) }
})

module.exports = router
