const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { query } = require('../db')
const config = require('../config')
const { ok, fail } = require('../utils/resp')
const { auth } = require('../middleware/auth')

const router = express.Router()

function sign(user) {
  return jwt.sign({ id: user.id, username: user.username }, config.jwtSecret, { expiresIn: config.jwtExpiresIn })
}

function publicUser(u) {
  if (!u) return null
  const { password_hash, ...rest } = u
  return rest
}

/** 注册 */
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, nickname } = req.body || {}
    if (!/^[a-zA-Z0-9_\u4e00-\u9fa5]{2,20}$/.test(username || '')) {
      return fail(res, '用户名需为 2-20 位字母、数字、下划线或中文')
    }
    if (!password || String(password).length < 6 || String(password).length > 20) {
      return fail(res, '密码长度需为 6-20 位')
    }
    const exists = await query('SELECT id FROM users WHERE username = ?', [username])
    if (exists.length) return fail(res, '用户名已存在，请换一个试试')
    const hash = await bcrypt.hash(String(password), 10)
    const result = await query(
      'INSERT INTO users (username, password_hash, nickname) VALUES (?, ?, ?)',
      [username, hash, (nickname || '').trim() || username]
    )
    const user = { id: result.insertId, username, nickname: (nickname || '').trim() || username }
    ok(res, { token: sign(user), user })
  } catch (e) { next(e) }
})

/** 登录：bcrypt 校验密码，签发 JWT */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {}
    if (!username || !password) return fail(res, '请输入用户名和密码')
    const rows = await query('SELECT * FROM users WHERE username = ?', [username])
    if (!rows.length) return fail(res, '用户不存在，请先注册')
    const user = rows[0]
    const match = await bcrypt.compare(String(password), user.password_hash)
    if (!match) return fail(res, '密码错误')
    ok(res, { token: sign(user), user: publicUser(user) }, '登录成功')
  } catch (e) { next(e) }
})

/** 获取当前登录用户信息 */
router.get('/me', auth(), async (req, res, next) => {
  try {
    const rows = await query('SELECT * FROM users WHERE id = ?', [req.user.id])
    if (!rows.length) return fail(res, '用户不存在', 404)
    ok(res, publicUser(rows[0]))
  } catch (e) { next(e) }
})

module.exports = router
