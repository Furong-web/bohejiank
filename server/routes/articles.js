const express = require('express')
const { query } = require('../db')
const { ok, fail } = require('../utils/resp')
const { auth } = require('../middleware/auth')

const router = express.Router()

/** 文章列表（分页，不返回正文以减小体积） */
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const size = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 10))
    const where = []
    const params = []
    if (req.query.keyword) { where.push('(title LIKE ? OR summary LIKE ?)'); params.push('%' + req.query.keyword.trim() + '%', '%' + req.query.keyword.trim() + '%') }
    if (req.query.category) { where.push('category = ?'); params.push(req.query.category) }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : ''
    const [{ c: total }] = await query('SELECT COUNT(*) AS c FROM articles ' + whereSql, params)
    const list = await query(
      'SELECT id, title, category, summary, views, created_at FROM articles ' +
      whereSql + ' ORDER BY created_at DESC, id DESC LIMIT ' + size + ' OFFSET ' + (page - 1) * size,
      params
    )
    ok(res, { list, total, page, pageSize: size })
  } catch (e) { next(e) }
})

/**
 * 文章详情：阅读量 +1
 * 使用可选鉴权：已登录时附带 isFavorite 收藏状态
 */
router.get('/:id', auth(false), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id) || 0
    await query('UPDATE articles SET views = views + 1 WHERE id = ?', [id])
    const rows = await query('SELECT * FROM articles WHERE id = ?', [id])
    if (!rows.length) return fail(res, '文章不存在', 404)
    let isFavorite = false
    if (req.user) {
      const fav = await query('SELECT id FROM favorites WHERE user_id = ? AND article_id = ?', [req.user.id, id])
      isFavorite = fav.length > 0
    }
    ok(res, { ...rows[0], isFavorite })
  } catch (e) { next(e) }
})

/** 收藏 / 取消收藏（切换） */
router.post('/:id/favorite', auth(), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id) || 0
    const rows = await query('SELECT id FROM articles WHERE id = ?', [id])
    if (!rows.length) return fail(res, '文章不存在', 404)
    const exists = await query('SELECT id FROM favorites WHERE user_id = ? AND article_id = ?', [req.user.id, id])
    let favorited
    if (exists.length) {
      await query('DELETE FROM favorites WHERE user_id = ? AND article_id = ?', [req.user.id, id])
      favorited = false
    } else {
      await query('INSERT INTO favorites (user_id, article_id) VALUES (?, ?)', [req.user.id, id])
      favorited = true
    }
    const [{ c: count }] = await query('SELECT COUNT(*) AS c FROM favorites WHERE article_id = ?', [id])
    ok(res, { favorited, count }, favorited ? '已收藏' : '已取消收藏')
  } catch (e) { next(e) }
})

module.exports = router
