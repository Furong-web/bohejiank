const express = require('express')
const { query } = require('../db')
const { ok, fail } = require('../utils/resp')
const { auth } = require('../middleware/auth')
const { todayStr, calcStreak } = require('../utils/date')
const { calcTdee, calcBudget } = require('../utils/nutrition')

const router = express.Router()
router.use(auth())

function num(v) {
  if (v === undefined || v === null || v === '' || isNaN(Number(v))) return null
  return Number(v)
}

/**
 * 新增/更新打卡
 * - 整体设置：传 weight / intake / burn / note（覆盖该日记录）
 * - 累加模式：传 addIntake / addBurn（热量查询、运动消耗快速记录）
 * - date 缺省为今天，同一天同一用户仅一条记录
 */
router.post('/', async (req, res, next) => {
  try {
    const b = req.body || {}
    const day = /^\d{4}-\d{2}-\d{2}$/.test(b.date || '') ? b.date : todayStr()
    const note = b.note != null ? String(b.note).slice(0, 200) : null
    const existing = await query('SELECT * FROM checkins WHERE user_id = ? AND date = ?', [req.user.id, day])

    if (!existing.length) {
      await query(
        'INSERT INTO checkins (user_id, date, weight, intake, burn, note) VALUES (?, ?, ?, ?, ?, ?)',
        [
          req.user.id,
          day,
          num(b.weight),
          num(b.intake) != null ? num(b.intake) : (num(b.addIntake) || 0),
          num(b.burn) != null ? num(b.burn) : (num(b.addBurn) || 0),
          note || ''
        ]
      )
    } else {
      const old = existing[0]
      const newWeight = num(b.weight) != null ? num(b.weight) : old.weight
      const newIntake = num(b.intake) != null ? num(b.intake) : Number(old.intake) + (num(b.addIntake) || 0)
      const newBurn = num(b.burn) != null ? num(b.burn) : Number(old.burn) + (num(b.addBurn) || 0)
      const newNote = note != null ? note : old.note
      await query(
        'UPDATE checkins SET weight = ?, intake = ?, burn = ?, note = ?, updated_at = NOW() WHERE id = ?',
        [newWeight, newIntake, newBurn, newNote, old.id]
      )
    }
    const rows = await query('SELECT * FROM checkins WHERE user_id = ? AND date = ?', [req.user.id, day])
    ok(res, rows[0], '打卡成功')
  } catch (e) { next(e) }
})

/** 某一天的记录 */
router.get('/bydate', async (req, res, next) => {
  try {
    const day = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || '') ? req.query.date : todayStr()
    const rows = await query('SELECT * FROM checkins WHERE user_id = ? AND date = ?', [req.user.id, day])
    ok(res, rows[0] || null)
  } catch (e) { next(e) }
})

/** 今日记录 + 预算闭环（摄入/消耗/预算/剩余/占比） */
router.get('/today', async (req, res, next) => {
  try {
    const day = todayStr()
    const [me] = await query('SELECT gender, age, height, weight, activity_level FROM users WHERE id = ?', [req.user.id])
    const rows = await query('SELECT * FROM checkins WHERE user_id = ? AND date = ?', [req.user.id, day])
    const tdee = me ? calcTdee(me) : 0
    const budget = me ? calcBudget(me) : 0
    const intake = rows[0] ? Number(rows[0].intake) : 0
    const burn = rows[0] ? Number(rows[0].burn) : 0
    const remaining = budget - intake
    const percent = budget ? Math.round(intake / budget * 100) : 0
    ok(res, {
      date: day,
      intake,
      burn,
      tdee,
      budget,
      remaining,
      percent: Math.max(0, percent)
    })
  } catch (e) { next(e) }
})

/** 打卡历史（分页，按日期倒序） */
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const size = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 10))
    const uid = req.user.id
    const [{ c: total }] = await query('SELECT COUNT(*) AS c FROM checkins WHERE user_id = ?', [uid])
    const list = await query(
      'SELECT * FROM checkins WHERE user_id = ? ORDER BY date DESC LIMIT ' + size + ' OFFSET ' + (page - 1) * size,
      [uid]
    )
    ok(res, { list, total, page, pageSize: size })
  } catch (e) { next(e) }
})

/** 统计数据（近 N 天）用于图表与汇总 */
router.get('/stats', async (req, res, next) => {
  try {
    const days = Math.min(90, Math.max(1, parseInt(req.query.days) || 14))
    const list = await query(
      'SELECT date, weight, intake, burn FROM checkins WHERE user_id = ? ' +
      'AND date >= DATE_SUB(CURDATE(), INTERVAL ' + (days - 1) + ' DAY) ORDER BY date ASC',
      [req.user.id]
    )
    const weights = list.filter(r => r.weight != null).map(r => Number(r.weight))
    const avgIntake = list.length ? Math.round(list.reduce((s, r) => s + Number(r.intake), 0) / list.length) : 0
    const avgBurn = list.length ? Math.round(list.reduce((s, r) => s + Number(r.burn), 0) / list.length) : 0
    ok(res, {
      list,
      summary: {
        days: list.length,
        streak: calcStreak(list.map(r => r.date).reverse()),
        avgIntake,
        avgBurn,
        currentWeight: weights.length ? weights[weights.length - 1] : null,
        weightChange: weights.length > 1 ? Number((weights[weights.length - 1] - weights[0]).toFixed(1)) : 0
      }
    })
  } catch (e) { next(e) }
})

/** 导出 CSV 数据（含 BOM，Excel 打开不乱码） */
router.get('/export', async (req, res, next) => {
  try {
    const rows = await query(
      'SELECT date, weight, intake, burn, note FROM checkins WHERE user_id = ? ORDER BY date DESC LIMIT 1000',
      [req.user.id]
    )
    const esc = v => {
      const s = v == null ? '' : String(v)
      return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
    }
    const lines = ['日期,体重(kg),摄入(kcal),消耗(kcal),净摄入(kcal),备注']
    rows.forEach(r => {
      lines.push([r.date, r.weight == null ? '' : r.weight, r.intake, r.burn,
        (Number(r.intake) || 0) - (Number(r.burn) || 0), esc(r.note)].join(','))
    })
    ok(res, {
      filename: 'mint_health_' + todayStr() + '.csv',
      count: rows.length,
      content: '\uFEFF' + lines.join('\r\n')
    })
  } catch (e) { next(e) }
})

/** 删除某条打卡记录（仅本人） */
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id) || 0
    const result = await query('DELETE FROM checkins WHERE id = ? AND user_id = ?', [id, req.user.id])
    if (!result.affectedRows) return fail(res, '记录不存在或无权删除', 404)
    ok(res, null, '已删除')
  } catch (e) { next(e) }
})

/** 本周一 00:00（周一为一周起点） */
function startOfWeek(d) {
  const x = new Date(d)
  const day = (x.getDay() + 6) % 7
  x.setDate(x.getDate() - day)
  x.setHours(0, 0, 0, 0)
  return x
}
function addDays(d, n) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
function fmtDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + day
}
async function aggWeek(uid, from, to) {
  const [r] = await query(
    'SELECT COALESCE(SUM(intake),0) intake, COALESCE(SUM(burn),0) burn, COUNT(DISTINCT date) days, COALESCE(AVG(weight),0) avgWeight ' +
    'FROM checkins WHERE user_id = ? AND date >= ? AND date <= ?',
    [uid, from, to]
  )
  return { intake: Number(r.intake), burn: Number(r.burn), days: Number(r.days), avgWeight: Number(r.avgWeight) }
}

/** 本周 vs 上周 战报对比：GET /api/checkins/weekly-report */
router.get('/weekly-report', async (req, res, next) => {
  try {
    const uid = req.user.id
    const mon = startOfWeek(new Date())
    const thisMon = fmtDate(mon)
    const thisSun = fmtDate(addDays(mon, 6))
    const lastMon = fmtDate(addDays(mon, -7))
    const lastSun = fmtDate(addDays(mon, -1))
    const thisWeek = await aggWeek(uid, thisMon, thisSun)
    const lastWeek = await aggWeek(uid, lastMon, lastSun)
    const diff = (a, b) => Math.round(Number(a) - Number(b))
    ok(res, {
      thisWeek,
      lastWeek,
      compare: {
        intakeDiff: diff(thisWeek.intake, lastWeek.intake),
        burnDiff: diff(thisWeek.burn, lastWeek.burn),
        daysDiff: diff(thisWeek.days, lastWeek.days),
        weightDiff: Math.round((Number(thisWeek.avgWeight) - Number(lastWeek.avgWeight)) * 10) / 10
      }
    })
  } catch (e) { next(e) }
})

module.exports = router
