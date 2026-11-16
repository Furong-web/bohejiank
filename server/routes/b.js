/**
 * B 端机构管理接口（教练 / 企业 HR / 营养师）
 * ------------------------------------------------------------------
 * 说明：B 端学员来自独立表 b_students（规范中文姓名 + 机构归属），
 * 通过 user_id 关联 C 端账号以复用真实打卡数据；学员姓名不再取 users.nickname。
 * 学员数据由 `npm run seed:students` 生成。
 *
 * 接口（均需管理员 JWT，adminAuth）：
 *  GET  /api/b/orgs              机构列表 + 各机构人数
 *  GET  /api/b/overview?org=     群体健康画像（摄入趋势/肥胖分布/运动达标/指标）
 *  GET  /api/b/members?org=      学员列表（热量缺口/蛋白质估算/风险/健康分）
 *  GET  /api/b/pk?org=           团队减脂 PK 排行榜
 *  GET  /api/b/intervention?org= 专业干预配置（食谱/营养处方/禁忌提醒）
 *  POST /api/b/intervention      保存干预配置
 *  POST /api/b/advice            一键发送饮食建议（AI 生成，落库到 notes）
 *  POST /api/b/plan              布置训练计划（落库到 notes）
 */
const express = require('express')
const { query } = require('../db')
const { ok, fail } = require('../utils/resp')
const { adminAuth } = require('../middleware/auth')
const { calcBudget } = require('../utils/nutrition')
const { calcHealthScore, levelOf } = require('../utils/score')
const { quickTip } = require('../utils/hunyuan')

const router = express.Router()

const ORGS = [
  { id: 'fitpro', name: '锋度健身 · 减脂营', type: '健身机构', manager: '陈教练', desc: '面向会员的 8 周减脂训练营' },
  { id: 'hrclub', name: '云栖科技 · 员工健康计划', type: '企业 HR', manager: '李经理', desc: '企业员工健康管理福利项目' },
  { id: 'nutri', name: '轻营养中心 · 医学营养门诊', type: '营养机构', manager: '王医师', desc: '慢病与体重管理医学营养干预' }
]

function safeOrg(raw) {
  return ORGS.some((o) => o.id === raw) ? raw : null
}

/** 计算 BMI 与分级（中国成人标准） */
function bmiOf(weight, heightCm) {
  if (!weight || !heightCm) return { value: 0, label: '未知' }
  const h = heightCm / 100
  const v = Math.round((weight / (h * h)) * 10) / 10
  let label = '正常'
  if (v < 18.5) label = '偏瘦'
  else if (v < 24) label = '正常'
  else if (v < 28) label = '超重'
  else label = '肥胖'
  return { value: v, label }
}

/** 确定性伪随机：让"蛋白质达标率"在演示中稳定（无真实字段） */
function pseudoRate(id, salt, base, span) {
  const s = String(id) + salt
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0
  return base + (h % span)
}

const LEVELS = ['优秀', '良好', '一般', '需关注']

/** 一次性拉取全部 B 端学员的聚合数据（学员表为主，关联 C 端打卡） */
async function loadUserStats() {
  const rows = await query(`
    SELECT s.id AS student_id, s.name, s.employee_no, s.org_id, s.user_id,
           s.gender, s.age, s.height, s.weight AS base_weight,
           s.target_weight, s.activity_level, s.created_at,
           COALESCE(agg.avg_intake, 0) avg_intake,
           COALESCE(agg.avg_burn, 0) avg_burn,
           COALESCE(agg.days, 0) days,
           COALESCE(today.today_intake, 0) today_intake,
           COALESCE(today.today_burn, 0) today_burn,
           COALESCE(wlast.weight, s.weight) last_weight,
           COALESCE(wfirst.weight, s.weight) first_weight
    FROM b_students s
    LEFT JOIN (
      SELECT user_id, AVG(intake) avg_intake, AVG(burn) avg_burn, COUNT(*) days
      FROM checkins WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) GROUP BY user_id
    ) agg ON agg.user_id = s.user_id
    LEFT JOIN (
      SELECT user_id, intake today_intake, burn today_burn FROM checkins WHERE date = CURDATE()
    ) today ON today.user_id = s.user_id
    LEFT JOIN checkins wlast ON wlast.id = (SELECT c2.id FROM checkins c2 WHERE c2.user_id = s.user_id AND c2.weight IS NOT NULL ORDER BY c2.date DESC, c2.id DESC LIMIT 1)
    LEFT JOIN checkins wfirst ON wfirst.id = (SELECT c3.id FROM checkins c3 WHERE c3.user_id = s.user_id AND c3.weight IS NOT NULL ORDER BY c3.date ASC, c3.id ASC LIMIT 1)
    ORDER BY s.org_id, s.id
  `)

  return rows.map((r) => {
    const budget = calcBudget({ gender: r.gender, age: r.age, height: r.height, weight: r.base_weight, activity_level: r.activity_level })
    const bmi = bmiOf(r.last_weight, r.height)
    const todayIntake = Number(r.today_intake) || 0
    const todayBurn = Number(r.today_burn) || 0
    const stats = {
      weight: r.last_weight, target: r.target_weight, budget,
      avgIntake: Number(r.avg_intake), avgBurn: Number(r.avg_burn),
      checkinRate: Math.min(1, Number(r.days) / 30)
    }
    const sc = calcHealthScore({ weight: r.last_weight, target_weight: r.target_weight }, stats)
    const protein = pseudoRate(r.student_id, 'p', 58, 42) // 58%~99%
    const exerciseReached = todayBurn >= 300
    const hasToday = todayIntake > 0 || todayBurn > 0
    const lastWeight = Number(r.last_weight) || 0
    const firstWeight = Number(r.first_weight) || lastWeight
    return {
      id: r.student_id, studentId: r.student_id, user_id: r.user_id,
      username: r.employee_no, nickname: r.name, name: r.name, gender: r.gender,
      age: r.age, height: r.height, weight: lastWeight, targetWeight: r.target_weight,
      activityLevel: r.activity_level, createdAt: r.created_at,
      orgId: r.org_id, budget,
      todayIntake: Math.round(todayIntake), todayBurn: Math.round(todayBurn), hasToday,
      intakeGap: hasToday ? Math.round(budget - todayIntake) : 0,
      avgIntake: Math.round(Number(r.avg_intake)), avgBurn: Math.round(Number(r.avg_burn)),
      protein, proteinGood: protein >= 80,
      bmi: bmi.value, bmiLabel: bmi.label,
      exerciseReached, score: sc.score, level: sc.level,
      weightLoss: Math.round((firstWeight - lastWeight) * 10) / 10,
      checkinDays: Number(r.days)
    }
  })
}

function resolveOrgUsers(all, org) {
  return all.filter((u) => u.orgId === org)
}

// ============================ 机构列表 ============================
router.get('/orgs', adminAuth, async (req, res, next) => {
  try {
    const all = await loadUserStats()
    const list = ORGS.map((o) => ({
      ...o,
      memberCount: all.filter((u) => u.orgId === o.id).length
    }))
    ok(res, { list })
  } catch (e) { next(e) }
})

// ============================ 群体健康画像 ============================
router.get('/overview', adminAuth, async (req, res, next) => {
  try {
    const org = safeOrg(req.query.org) || ORGS[0].id
    const all = await loadUserStats()
    const users = resolveOrgUsers(all, org)
    const n = users.length || 1

    const avg = (fn) => Math.round(users.reduce((s, u) => s + fn(u), 0) / n)
    const avgScore = avg((u) => u.score)
    const avgIntake = avg((u) => u.avgIntake)
    const avgBurn = avg((u) => u.avgBurn)
    const todayUsers = users.filter((u) => u.hasToday)
    const avgGap = todayUsers.length
      ? Math.round(todayUsers.reduce((s, u) => s + u.intakeGap, 0) / todayUsers.length)
      : 0
    const exerciseRate = Math.round((users.filter((u) => u.exerciseReached).length / n) * 100)
    const proteinRate = avg((u) => u.protein)
    const todayCheckins = users.filter((u) => u.todayIntake > 0 || u.todayBurn > 0).length

    // BMI / 肥胖分布
    const bmiDist = { 偏瘦: 0, 正常: 0, 超重: 0, 肥胖: 0 }
    users.forEach((u) => { bmiDist[u.bmiLabel] = (bmiDist[u.bmiLabel] || 0) + 1 })
    const obeseRate = Math.round(((bmiDist.超重 + bmiDist.肥胖) / n) * 100)

    // 健康分分布
    const scoreDist = { 优秀: 0, 良好: 0, 一般: 0, 需关注: 0 }
    users.forEach((u) => { scoreDist[u.level] = (scoreDist[u.level] || 0) + 1 })

    // 近 14 天平均热量摄入趋势（按机构成员的 user_id 过滤）
    const ids = users.map((u) => u.id)
    let intakeTrend = []
    let burnTrend = []
    if (ids.length) {
      const ph = ids.map(() => '?').join(',')
      const rows = await query(`
        SELECT date, AVG(intake) avg_intake, AVG(burn) avg_burn
        FROM checkins
        WHERE user_id IN (${ph}) AND date >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
        GROUP BY date ORDER BY date
      `, ids)
      const map = {}
      rows.forEach((r) => { map[r.date] = r })
      const p = (x) => (x < 10 ? '0' + x : '' + x)
      for (let i = 13; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const key = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
        const r = map[key]
        intakeTrend.push({ date: key.slice(5), value: r ? Math.round(Number(r.avg_intake)) : null })
        burnTrend.push({ date: key.slice(5), value: r ? Math.round(Number(r.avg_burn)) : null })
      }
    }

    ok(res, {
      org: ORGS.find((o) => o.id === org),
      overview: {
        memberCount: users.length, todayCheckins, avgIntake, avgBurn, avgGap,
        avgScore, exerciseRate, proteinRate, obeseRate
      },
      intakeTrend, burnTrend, bmiDist, scoreDist
    })
  } catch (e) { next(e) }
})

// ============================ 学员列表 ============================
router.get('/members', adminAuth, async (req, res, next) => {
  try {
    const org = safeOrg(req.query.org) || ORGS[0].id
    const keyword = (req.query.keyword || '').trim()
    const all = await loadUserStats()
    let users = resolveOrgUsers(all, org)
    if (keyword) {
      const k = keyword.toLowerCase()
      users = users.filter((u) => (u.nickname || '').toLowerCase().includes(k) || (u.username || '').toLowerCase().includes(k))
    }
    users.sort((a, b) => a.score - b.score) // 需关注优先
    ok(res, {
      total: users.length,
      list: users.map((u) => ({
        id: u.id, studentId: u.studentId, name: u.name, nickname: u.nickname, username: u.username, gender: u.gender, age: u.age,
        weight: u.weight, bmi: u.bmi, bmiLabel: u.bmiLabel,
        todayIntake: u.todayIntake, todayBurn: u.todayBurn, intakeGap: u.intakeGap, hasToday: u.hasToday,
        protein: u.protein, proteinGood: u.proteinGood,
        exerciseReached: u.exerciseReached, score: u.score, level: u.level,
        weightLoss: u.weightLoss, checkinDays: u.checkinDays
      }))
    })
  } catch (e) { next(e) }
})

// ============================ 减脂 PK 排行榜 ============================
router.get('/pk', adminAuth, async (req, res, next) => {
  try {
    const org = safeOrg(req.query.org) || ORGS[0].id
    const all = await loadUserStats()
    const users = resolveOrgUsers(all, org)
    // 综合分：减重(kg)*10 + 打卡天数*2 + 连续达标奖励 + 健康分/10
    const board = users.map((u) => {
      const points = Math.max(0, u.weightLoss) * 10 + u.checkinDays * 2 + (u.exerciseReached ? 8 : 0) + Math.round(u.score / 10)
      return {
        id: u.id, nickname: u.nickname, avatar: u.nickname ? u.nickname.slice(0, 1) : '健',
        weightLoss: u.weightLoss, checkinDays: u.checkinDays, score: u.score,
        protein: u.protein, points, trend: pseudoRate(u.id, 't', 0, 5) - 2 // -2~+2 名次变化
      }
    }).sort((a, b) => b.points - a.points)
    board.forEach((b, i) => { b.rank = i + 1 })
    ok(res, { org: ORGS.find((o) => o.id === org), board: board.slice(0, 20), total: board.length })
  } catch (e) { next(e) }
})

// ============================ 干预配置（内存存储，重启重置） ============================
const configStore = {}
router.get('/intervention', adminAuth, async (req, res, next) => {
  try {
    const org = safeOrg(req.query.org) || ORGS[0].id
    const defaults = {
      org,
      recipes: [
        { name: '减脂增肌午餐', kcal: 520, detail: '鸡胸肉150g + 糙米饭100g + 西兰花200g，蛋白质约45g' },
        { name: '高蛋白早餐', kcal: 380, detail: '燕麦40g + 无糖酸奶200g + 水煮蛋2个' }
      ],
      prescription: '目标热量缺口 300~500 kcal/日；蛋白质 1.6g/kg 体重；碳水占比 ≤ 40%。每周复查体重与腰围。',
      taboo: '乳糖不耐：避免普通牛奶，改用无乳糖奶；高血压：限制腌制食品与高钠酱料；痛风：减少海鲜与浓肉汤。',
      updatedAt: null
    }
    ok(res, configStore[org] || defaults)
  } catch (e) { next(e) }
})
router.post('/intervention', adminAuth, async (req, res, next) => {
  try {
    const org = safeOrg(req.body.org) || ORGS[0].id
    configStore[org] = {
      org,
      recipes: Array.isArray(req.body.recipes) ? req.body.recipes : [],
      prescription: String(req.body.prescription || ''),
      taboo: String(req.body.taboo || ''),
      updatedAt: new Date().toISOString()
    }
    ok(res, configStore[org], '干预配置已保存')
  } catch (e) { next(e) }
})

/**
 * 解析请求中的学员标识 → 返回 { uid, displayName }
 * 兼容两种入参：studentId（学员表id，前端用）、userId（C端关联用户id）
 */
async function resolveStudent(body) {
  const studentId = Number(body.studentId)
  const userId = Number(body.userId)
  if (studentId) {
    const [s] = await query('SELECT user_id, name FROM b_students WHERE id = ?', [studentId])
    if (s) return { uid: s.user_id, displayName: s.name }
  }
  if (userId) {
    const [s] = await query('SELECT user_id, name FROM b_students WHERE user_id = ?', [userId])
    if (s) return { uid: s.user_id, displayName: s.name }
    const [u] = await query('SELECT nickname FROM users WHERE id = ?', [userId])
    if (u) return { uid: userId, displayName: u.nickname }
  }
  return { uid: null, displayName: '' }
}

// ============================ 一键发送饮食建议 ============================
router.post('/advice', adminAuth, async (req, res, next) => {
  try {
    const { uid, displayName } = await resolveStudent(req.body)
    if (!uid) return fail(res, '缺少学员标识')
    const [me] = await query('SELECT gender, age, height, weight, activity_level, nickname FROM users WHERE id = ?', [uid])
    if (!me) return fail(res, '学员不存在')
    const budget = calcBudget(me)
    const [row] = await query('SELECT * FROM checkins WHERE user_id = ? AND date = CURDATE()', [uid])
    const today = {
      intake: row ? Number(row.intake) : 0, burn: row ? Number(row.burn) : 0,
      tdee: 0, budget, remaining: budget - (row ? Number(row.intake) : 0), percent: 0
    }
    let content = ''
    try { content = await quickTip(me, today) } catch (e) { content = '今天注意均衡饮食，保证蛋白质摄入，适量运动。' }
    await query(
      'INSERT INTO checkins (user_id, date, intake, burn, note) VALUES (?, CURDATE(), ?, ?, ?) ON DUPLICATE KEY UPDATE note = CONCAT(LEFT(COALESCE(note,\'\'),120), ?)',
      [uid, today.intake, today.burn, '[饮食建议] ' + content, ' | [饮食建议] ' + content]
    )
    ok(res, { userId: uid, nickname: displayName || me.nickname, content }, '已发送饮食建议')
  } catch (e) { next(e) }
})

// ============================ 布置训练计划 ============================
router.post('/plan', adminAuth, async (req, res, next) => {
  try {
    const plan = String(req.body.plan || '').trim()
    if (!plan) return fail(res, '缺少 plan')
    const { uid, displayName } = await resolveStudent(req.body)
    if (!uid) return fail(res, '缺少学员标识')
    const [me] = await query('SELECT nickname FROM users WHERE id = ?', [uid])
    if (!me) return fail(res, '学员不存在')
    const [row] = await query('SELECT intake, burn FROM checkins WHERE user_id = ? AND date = CURDATE()', [uid])
    const intake = row ? Number(row.intake) : 0
    const burn = row ? Number(row.burn) : 0
    await query(
      'INSERT INTO checkins (user_id, date, intake, burn, note) VALUES (?, CURDATE(), ?, ?, ?) ON DUPLICATE KEY UPDATE note = CONCAT(LEFT(COALESCE(note,\'\'),120), ?)',
      [uid, intake, burn, '[训练计划] ' + plan, ' | [训练计划] ' + plan]
    )
    ok(res, { userId: uid, nickname: displayName || me.nickname, plan }, '训练计划已布置')
  } catch (e) { next(e) }
})

module.exports = router
