const express = require('express')
const bcrypt = require('bcryptjs')
const { query } = require('../db')
const { ok, fail } = require('../utils/resp')
const { auth } = require('../middleware/auth')
const { todayStr, calcStreak } = require('../utils/date')

const router = express.Router()
router.use(auth())

function publicUser(u) {
  if (!u) return null
  const { password_hash, ...rest } = u
  return rest
}

/** 更新个人资料（昵称/性别/年龄/身高/体重/目标体重/活动量） */
router.put('/profile', async (req, res, next) => {
  try {
    const fields = ['nickname', 'gender', 'age', 'height', 'weight', 'target_weight', 'activity_level']
    const sets = []
    const params = []
    fields.forEach(f => {
      const v = req.body ? req.body[f] : undefined
      if (v !== undefined && v !== null && v !== '') {
        sets.push(f + ' = ?')
        params.push(v)
      }
    })
    if (!sets.length) return fail(res, '没有需要更新的内容')
    params.push(req.user.id)
    await query('UPDATE users SET ' + sets.join(', ') + ' WHERE id = ?', params)
    const rows = await query('SELECT * FROM users WHERE id = ?', [req.user.id])
    ok(res, publicUser(rows[0]), '资料已更新')
  } catch (e) { next(e) }
})

/** 修改密码：校验原密码后 bcrypt 加密新密码 */
router.put('/password', async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body || {}
    if (!oldPassword || !newPassword) return fail(res, '请填写原密码和新密码')
    if (String(newPassword).length < 6 || String(newPassword).length > 20) return fail(res, '新密码长度需为 6-20 位')
    const rows = await query('SELECT * FROM users WHERE id = ?', [req.user.id])
    if (!rows.length) return fail(res, '用户不存在', 404)
    const match = await bcrypt.compare(String(oldPassword), rows[0].password_hash)
    if (!match) return fail(res, '原密码错误')
    const hash = await bcrypt.hash(String(newPassword), 10)
    await query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id])
    ok(res, null, '密码修改成功')
  } catch (e) { next(e) }
})

/** 我的页汇总：打卡天数 / 连续天数 / 收藏数 / 当前体重 */
router.get('/summary', async (req, res, next) => {
  try {
    const uid = req.user.id
    const [{ c: checkinDays }] = await query('SELECT COUNT(*) AS c FROM checkins WHERE user_id = ?', [uid])
    const [{ c: favoriteCount }] = await query('SELECT COUNT(*) AS c FROM favorites WHERE user_id = ?', [uid])
    const dates = (await query(
      'SELECT DISTINCT date FROM checkins WHERE user_id = ? ORDER BY date DESC LIMIT 120',
      [uid]
    )).map(r => r.date)
    const me = (await query('SELECT weight, target_weight FROM users WHERE id = ?', [uid]))[0]
    ok(res, {
      checkinDays,
      favoriteCount,
      streak: calcStreak(dates),
      currentWeight: me ? me.weight : null,
      targetWeight: me ? me.target_weight : null
    })
  } catch (e) { next(e) }
})

/** 我的收藏文章（分页） */
router.get('/favorites', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const size = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 10))
    const uid = req.user.id
    const [{ c: total }] = await query('SELECT COUNT(*) AS c FROM favorites WHERE user_id = ?', [uid])
    const list = await query(
      'SELECT f.id, f.created_at AS favorited_at, a.id AS article_id, a.title, a.category, a.summary, a.views, a.created_at ' +
      'FROM favorites f JOIN articles a ON a.id = f.article_id ' +
      'WHERE f.user_id = ? ORDER BY f.id DESC LIMIT ' + size + ' OFFSET ' + (page - 1) * size,
      [uid]
    )
    ok(res, { list, total, page, pageSize: size })
  } catch (e) { next(e) }
})

module.exports = router
