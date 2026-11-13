/**
 * JWT 鉴权中间件
 * auth()      强制登录
 * auth(false) 可选登录（携带有效 token 时挂载 req.user，否则放行）
 */
const jwt = require('jsonwebtoken')
const config = require('../config')
const { query } = require('../db')
const { fail } = require('../utils/resp')

function auth(required = true) {
  return (req, res, next) => {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!token) {
      if (!required) { req.user = null; return next() }
      return res.status(401).json({ code: 1, msg: '未登录或登录已过期' })
    }
    try {
      req.user = jwt.verify(token, config.jwtSecret)
      next()
    } catch (e) {
      if (!required) { req.user = null; return next() }
      res.status(401).json({ code: 1, msg: '登录已过期，请重新登录' })
    }
  }
}

/**
 * 管理员鉴权：先校验 JWT，再从 DB 读取最新角色，只有 role===2 放行
 * 用法：adminAuth()
 */
async function adminAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return res.status(401).json({ code: 1, msg: '未登录或登录已过期' })
  let payload
  try {
    payload = jwt.verify(token, config.jwtSecret)
  } catch (e) {
    return res.status(401).json({ code: 1, msg: '登录已过期，请重新登录' })
  }
  try {
    const [u] = await query('SELECT id, role FROM users WHERE id = ?', [payload.id])
    if (!u || u.role !== 2) return fail(res, '无管理员权限', 403)
    req.user = { id: u.id, role: u.role }
    next()
  } catch (e) {
    next(e)
  }
}

module.exports = { auth, adminAuth }
