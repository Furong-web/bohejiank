const express = require('express')
const { query } = require('../db')
const { ok, fail } = require('../utils/resp')
const { auth } = require('../middleware/auth')
const { chatStream, estimateFoods, recognizeFoodImage, quickTip } = require('../utils/hunyuan')
const { todayStr } = require('../utils/date')
const { calcTdee, calcBudget } = require('../utils/nutrition')

const router = express.Router()
router.use(auth())

// 中文数量单位 -> 克数映射（兜底用）
// 食物可选分类（AI 估算时用来校验，避免脏值入库）
const CATEGORIES = ['主食', '肉蛋', '蔬菜', '水果', '奶制品', '零食', '饮品', '外卖', '调味品', '豆制品', '其他']

const UNIT_GRAMS = {
  碗: 200, 个: 50, 根: 120, 片: 30, 杯: 240, 份: 100, 块: 50, 串: 30,
  把: 50, 瓶: 500, 罐: 330, 勺: 15, 袋: 100, 桶: 500, 只: 50, 枚: 50, 瓣: 5
}
const UNIT_RE = '碗个根片杯份块串把瓶罐勺袋桶只枚瓣'
const SEG_RE = new RegExp('^(\\d+(?:\\.\\d+)?)?\\s*([' + UNIT_RE + ']?)\\s*(.+)$')
// 中文数字 -> 阿拉伯数字（仅当后面紧跟量词时转换，避免误伤食物名）
const CN_NUM = { 一: '1', 二: '2', 两: '2', 三: '3', 四: '4', 五: '5', 六: '6', 七: '7', 八: '8', 九: '9', 十: '10', 半: '0.5' }
const CN_NUM_RE = new RegExp('^([' + Object.keys(CN_NUM).join('') + '])(?=[' + UNIT_RE + '])')

// 把 "2个鸡翅" / "一碗米饭" / "苹果" 解析为 { qty, grams, name }
function parseSegment(seg) {
  const normalized = seg.replace(CN_NUM_RE, m => CN_NUM[m])
  const m = normalized.match(SEG_RE)
  if (!m) return { qty: 1, grams: 100, name: normalized }
  const qty = m[1] ? Number(m[1]) : 1
  const unit = m[2]
  // 去掉常见后缀「的热量」，避免把整句当成食物名，也便于干净入库
  const name = m[3].trim().replace(/的热量$/, '')
  const grams = unit ? (UNIT_GRAMS[unit] || 100) : 100
  return { qty, grams, name }
}

// 数值安全化：非负、合理范围、保留1位小数
function clampNum(v) {
  let n = Number(v)
  if (!isFinite(n) || n < 0) n = 0
  return Math.min(9999, Math.round(n * 10) / 10)
}

// 由食物记录 + 份量生成前端的明细项；source 标记数据来源（db=库内, ai=AI估算）
function makeItem(f, p, source) {
  const grams = Math.round(p.grams * p.qty)
  return {
    foodId: f.id,
    name: f.name,
    category: f.category,
    grams,
    kcal: Math.round(Number(f.calories) * grams / 100),
    protein: Math.round(Number(f.protein) * grams / 100 * 10) / 10,
    fat: Math.round(Number(f.fat) * grams / 100 * 10) / 10,
    carb: Math.round(Number(f.carb) * grams / 100 * 10) / 10,
    source: source || 'db'
  }
}

/** 文字描述识别：'一碗米饭+两个鸡翅' -> 明细 + 合计 */
router.post('/parse-text', async (req, res, next) => {
  try {
    const text = (req.body && req.body.text || '').trim()
    if (!text) return fail(res, '请输入饮食描述')
    const segs = text.split(/[、,，+＋和/与\s]+/).filter(Boolean)
    const items = []
    const unmatched = []
    const pending = [] // 库里没匹配到的段落，稍后交给 AI 兜底
    for (const seg of segs) {
      const p = parseSegment(seg)
      const rows = await query(
        'SELECT * FROM foods WHERE name LIKE ? ORDER BY CHAR_LENGTH(name) ASC LIMIT 1',
        ['%' + p.name + '%']
      )
      if (!rows.length) { pending.push({ seg, p }); continue }
      items.push(makeItem(rows[0], p))
    }

    // AI 兜底：库里没有的食物，调用混元大模型估算，并把结果缓存进 foods 表（下次秒出）
    if (pending.length) {
      try {
        const estimates = await estimateFoods(pending.map(x => x.p.name))
        const estMap = {}
        estimates.forEach(e => { if (e && e.name) estMap[e.name] = e })
        for (const { seg, p } of pending) {
          const est = estMap[p.name]
          if (!est) { unmatched.push(seg); continue }
          const cal = clampNum(est.calories)
          const prot = clampNum(est.protein)
          const fat = clampNum(est.fat)
          const carb = clampNum(est.carb)
          const category = CATEGORIES.includes(est.category) ? est.category : '其他'
          const servingDesc = String(est.serving_desc || '').slice(0, 50)
          const servingGrams = Math.max(1, Math.min(2000, Math.round(Number(est.serving_grams) || 100)))
          let foodId = null
          try {
            const ins = await query(
              'INSERT INTO foods (name, category, calories, protein, fat, carb, description, serving_desc, serving_grams, common) ' +
              'VALUES (?,?,?,?,?,?,?,?,?,0)',
              [p.name, category, cal, prot, fat, carb, 'AI 估算（仅供参考）', servingDesc, servingGrams]
            )
            foodId = ins.insertId
          } catch (e) {
            // 并发或重复插入时忽略，仍用估算值展示
          }
          items.push(makeItem(
            { id: foodId, name: p.name, category, calories: cal, protein: prot, fat, carb },
            p, 'ai'
          ))
        }
      } catch (e) {
        // AI 调用失败（未配置 key / 网络异常）：把未命中的退回「未识别」
        pending.forEach(({ seg }) => unmatched.push(seg))
      }
    }
    const totalKcal = items.reduce((s, i) => s + i.kcal, 0)
    const totalProtein = Math.round(items.reduce((s, i) => s + i.protein, 0) * 10) / 10
    const totalFat = Math.round(items.reduce((s, i) => s + i.fat, 0) * 10) / 10
    const totalCarb = Math.round(items.reduce((s, i) => s + i.carb, 0) * 10) / 10
    ok(res, { items, totalKcal, totalProtein, totalFat, totalCarb, unmatched })
  } catch (e) { next(e) }
})

/**
 * 营养顾问（真·大模型）：POST /api/ai/chat
 * body: { messages: [{ role, content }] }  只取最后一条用户消息 + 最近几条历史
 * 响应：SSE 流式，data: { delta } 增量文本；结束 data: [DONE]；出错时先写 data: { error }
 */
router.post('/chat', async (req, res, next) => {
  try {
    const messages = (req.body && req.body.messages) || []
    if (!Array.isArray(messages) || !messages.length) return fail(res, '请输入你的问题')

    // 取最近 6 条历史 + 当前用户消息（控制 token）
    const history = messages.slice(-6)

    // 拉取用户资料与今日预算做个性化上下文
    const [me] = await query(
      'SELECT gender, age, height, weight, activity_level, nickname FROM users WHERE id = ?',
      [req.user.id]
    )
    const day = todayStr()
    const [row] = await query('SELECT * FROM checkins WHERE user_id = ? AND date = ?', [req.user.id, day])
    const budget = me ? calcBudget(me) : 0
    const intake = row ? Number(row.intake) : 0
    const burn = row ? Number(row.burn) : 0
    const remaining = budget - intake
    const profile = me || {}
    const today = {
      intake, burn, tdee: me ? calcTdee(me) : 0, budget,
      remaining, percent: budget ? Math.round(intake / budget * 100) : 0
    }

    // SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const write = (obj) => res.write('data: ' + JSON.stringify(obj) + '\n\n')

    try {
      await chatStream(history, { profile, today }, function (delta) {
        write({ delta })
      })
      res.write('data: [DONE]\n\n')
      res.end()
    } catch (e) {
      if (e.code === 'NO_KEY') {
        write({ error: '后端未配置混元 API Key，请在 server/config.js 的 hunyuan.apiKey 填入密钥' })
      } else {
        write({ error: e.message || 'AI 服务调用失败，请稍后重试' })
      }
      res.end()
    }
  } catch (e) {
    next(e)
  }
})

/** 视觉识别：POST /api/ai/vision  body: { image }（base64，可含 data: 前缀） */
router.post('/vision', async (req, res, next) => {
  try {
    let image = (req.body && req.body.image) || ''
    if (!image) return fail(res, '请先拍照或选择图片')
    // 去掉可能的 data:image/...;base64, 前缀
    image = String(image).replace(/^data:image\/\w+;base64,/, '').trim()
    if (!image) return fail(res, '图片数据为空')
    const items = await recognizeFoodImage(image)
    const totalKcal = items.reduce((s, i) => s + (i.kcal || 0), 0)
    ok(res, { items, totalKcal })
  } catch (e) {
    if (e.code === 'NO_KEY') {
      return ok(res, { items: [], totalKcal: 0, configured: false })
    }
    next(e)
  }
})

/**
 * 首页 AI 营养师一句话建议：GET /api/ai/nutrition-tip
 * 优先用混元生成当日个性化提醒（如“晚餐建议补充蛋白质”）；
 * 任何失败（无 Key / 超时 / 上游错误）都回退到本地规则文案，保证首页永远有内容。
 */
router.get('/nutrition-tip', async (req, res, next) => {
  try {
    const [me] = await query(
      'SELECT gender, age, height, weight, activity_level, nickname FROM users WHERE id = ?',
      [req.user.id]
    )
    const day = todayStr()
    const [row] = await query('SELECT * FROM checkins WHERE user_id = ? AND date = ?', [req.user.id, day])
    const budget = me ? calcBudget(me) : 0
    const intake = row ? Number(row.intake) : 0
    const burn = row ? Number(row.burn) : 0
    const remaining = budget - intake
    const profile = me || {}
    const today = {
      intake, burn, tdee: me ? calcTdee(me) : 0, budget,
      remaining, percent: budget ? Math.round(intake / budget * 100) : 0
    }
    try {
      const tip = await quickTip(profile, today)
      return ok(res, { tip, source: 'ai' })
    } catch (e) {
      return ok(res, { tip: ruleTip(today), source: 'rule' })
    }
  } catch (e) { next(e) }
})

/** 本地规则兜底：无 Key / AI 失败时给出的当日建议 */
function ruleTip(today) {
  if (today.remaining < 0) {
    return '今天已超预算 ' + Math.abs(Math.round(today.remaining)) + ' 千卡，晚餐建议清淡少油 🥗'
  }
  if (today.remaining > 400) {
    return '今天热量还有富余，可以适量加餐补充蛋白质 🍗'
  }
  if (today.burn < 120) {
    return '今天运动消耗偏少，晚饭后散散步更助减脂 🚶'
  }
  return '保持节奏，今天营养与热量都在合理区间 👍'
}

/** 营养顾问：关键词匹配本地知识库（非云端大模型） */
router.get('/ask', async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim()
    if (!q) return fail(res, '请输入你的问题')
    const rows = await query('SELECT * FROM ai_qa')
    let best = null
    let bestScore = 0
    for (const r of rows) {
      const keys = r.keywords.split(',')
      const score = keys.reduce((s, k) => s + (q.includes(k.trim()) ? 1 : 0), 0)
      if (score > bestScore) { bestScore = score; best = r }
    }
    if (!best || bestScore === 0) {
      return ok(res, {
        answer: '这个问题我暂时没有收录哦～可以试试问「减脂期能吃西瓜吗」「每天要吃多少蛋白质」「为什么体重不掉」等。',
        article: null
      })
    }
    let article = null
    if (best.article_id) {
      const a = await query('SELECT id, title FROM articles WHERE id = ?', [best.article_id])
      if (a.length) article = a[0]
    }
    ok(res, { answer: best.answer, article })
  } catch (e) { next(e) }
})

// 理想供能比：蛋白 30% / 脂肪 25% / 碳水 45%
const IDEAL = { protein: 30, fat: 25, carb: 45 }

/** 餐盘分析：多食物 -> 营养素占比 / 均衡评分 / 建议 */
router.post('/analyze-plate', async (req, res, next) => {
  try {
    const items = (req.body && req.body.items) || []
    if (!Array.isArray(items) || !items.length) return fail(res, '请先添加食物')
    const ids = items.map(i => i.foodId).filter(Boolean)
    if (!ids.length) return fail(res, '请先添加食物')
    const rows = await query('SELECT * FROM foods WHERE id IN (' + ids.map(() => '?').join(',') + ')', ids)
    const byId = {}
    rows.forEach(r => { byId[r.id] = r })
    let p = 0, f = 0, c = 0
    items.forEach(it => {
      const fd = byId[it.foodId]
      const g = Number(it.grams) || 100
      if (!fd) return
      p += Number(fd.protein) * g / 100
      f += Number(fd.fat) * g / 100
      c += Number(fd.carb) * g / 100
    })
    const pK = p * 4, fK = f * 9, cK = c * 4
    const total = pK + fK + cK
    if (!total) return fail(res, '食物营养数据为空')
    const ratio = {
      protein: Math.round(pK / total * 100),
      fat: Math.round(fK / total * 100),
      carb: Math.round(cK / total * 100)
    }
    const dev = Math.abs(ratio.protein - IDEAL.protein) + Math.abs(ratio.fat - IDEAL.fat) + Math.abs(ratio.carb - IDEAL.carb)
    const score = Math.max(0, Math.min(100, Math.round(100 - dev * 1.2)))
    let advice = '整体搭配较为均衡，继续保持。'
    const tips = []
    if (ratio.protein < 25) tips.push('蛋白质偏少，建议加一份鸡胸肉、鱼虾或豆制品')
    if (ratio.carb > 55) tips.push('碳水占比偏高，可适当减少主食、增加蔬菜')
    if (ratio.fat > 35) tips.push('脂肪偏高，注意烹饪用油与酱料')
    if (ratio.protein >= 25 && ratio.carb <= 55 && ratio.fat <= 35) tips.push('三大营养素比例合理，饱腹感与减脂兼顾')
    if (tips.length) advice = tips.join('；') + '。'
    ok(res, {
      macros: {
        protein: Math.round(p * 10) / 10,
        fat: Math.round(f * 10) / 10,
        carb: Math.round(c * 10) / 10
      },
      ratio,
      score,
      advice
    })
  } catch (e) { next(e) }
})

module.exports = router
