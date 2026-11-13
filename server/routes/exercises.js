const express = require('express')
const { query } = require('../db')
const { ok, fail } = require('../utils/resp')

const router = express.Router()

/** 运动列表：关键字 / 分类筛选 + 分页（MET 值用于估算消耗） */
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const size = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 20))
    const where = []
    const params = []
    if (req.query.keyword) { where.push('name LIKE ?'); params.push('%' + req.query.keyword.trim() + '%') }
    if (req.query.category) { where.push('category = ?'); params.push(req.query.category) }
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : ''
    const [{ c: total }] = await query('SELECT COUNT(*) AS c FROM exercises ' + whereSql, params)
    const list = await query(
      'SELECT * FROM exercises ' + whereSql + ' ORDER BY met DESC, id ASC LIMIT ' + size + ' OFFSET ' + (page - 1) * size,
      params
    )
    ok(res, { list, total, page, pageSize: size })
  } catch (e) { next(e) }
})

/** 运动详情 */
router.get('/:id', async (req, res, next) => {
  try {
    const rows = await query('SELECT * FROM exercises WHERE id = ?', [parseInt(req.params.id) || 0])
    if (!rows.length) return fail(res, '运动不存在', 404)
    ok(res, rows[0])
  } catch (e) { next(e) }
})

module.exports = router
