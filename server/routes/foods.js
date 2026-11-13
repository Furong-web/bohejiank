const express = require('express')
const { query } = require('../db')
const { ok, fail } = require('../utils/resp')

const router = express.Router()

/** 食物热量列表：关键字 / 分类筛选 + 分页 */
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const size = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 10))
    const keyword = (req.query.keyword || '').trim()
    const category = (req.query.category || '').trim()

    // 组装 WHERE
    const where = []
    const whereParams = []
    if (category) { where.push('category = ?'); whereParams.push(category) }
    if (keyword) { where.push('name LIKE ?'); whereParams.push('%' + keyword + '%') }
    // 空关键词且无分类：默认只展示常用食物，避免一上来就列一大堆
    if (!keyword && !category) where.push('common = 1')
    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : ''

    // 组装 ORDER BY：有关键字按相关度（精确>前缀>包含，再按名称长度、热量），否则按 id
    const orderParams = []
    let orderSql = ' ORDER BY id ASC '
    if (keyword) {
      orderSql = ' ORDER BY CASE WHEN name = ? THEN 0 WHEN name LIKE ? THEN 1 ELSE 2 END, CHAR_LENGTH(name) ASC, calories ASC '
      orderParams.push(keyword, keyword + '%')
    }

    const [{ c: total }] = await query('SELECT COUNT(*) AS c FROM foods ' + whereSql, whereParams)
    const list = await query(
      'SELECT * FROM foods ' + whereSql + orderSql + 'LIMIT ' + size + ' OFFSET ' + (page - 1) * size,
      whereParams.concat(orderParams)
    )
    ok(res, { list, total, page, pageSize: size })
  } catch (e) { next(e) }
})

/** 分类列表（含食物数量，供前端动态渲染） */
router.get('/categories', async (req, res, next) => {
  try {
    const rows = await query(
      'SELECT category, COUNT(*) AS count FROM foods GROUP BY category ORDER BY count DESC'
    )
    const list = rows.map(r => ({ name: r.category, count: r.count }))
    ok(res, { list })
  } catch (e) { next(e) }
})

/** 同分类更低热量的 Top3 替代建议 */
router.get('/:id/substitute', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id) || 0
    const rows = await query('SELECT * FROM foods WHERE id = ?', [id])
    if (!rows.length) return fail(res, '食物不存在', 404)
    const food = rows[0]
    const subs = await query(
      'SELECT id, name, calories, serving_desc, serving_grams FROM foods ' +
      'WHERE category = ? AND id <> ? AND calories < ? ORDER BY calories ASC LIMIT 3',
      [food.category, id, food.calories]
    )
    ok(res, { list: subs })
  } catch (e) { next(e) }
})

/** 食物详情 */
router.get('/:id', async (req, res, next) => {
  try {
    const rows = await query('SELECT * FROM foods WHERE id = ?', [parseInt(req.params.id) || 0])
    if (!rows.length) return fail(res, '食物不存在', 404)
    ok(res, rows[0])
  } catch (e) { next(e) }
})

module.exports = router
