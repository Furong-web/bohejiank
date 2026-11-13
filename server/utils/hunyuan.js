/**
 * 腾讯混元大模型客户端（OpenAI 兼容 /chat/completions，流式 SSE）
 * - 使用 Node 内置 fetch，无需额外依赖
 * - 通过 onDelta 回调逐段输出内容，供下游转发给小程序
 */
const config = require('../config')

const SYSTEM_PROMPT =
  '你是「薄荷健康」小程序里的资深营养师与减脂顾问，名叫小薄荷。' +
  '请用亲切、专业、简洁的中文回答用户的饮食、减脂、营养、运动相关问题。' +
  '回答要具体可执行，给出份量、数字或替代方案，避免空泛说教。' +
  '涉及具体身体状况或疾病时，提醒用户咨询医生，不要给出医疗诊断。'

/**
 * 组装个性化上下文：把用户身体数据与今日摄入拼进系统提示词
 * @param {Object} profile { nickname, gender, age, height, weight, activity_level }
 * @param {Object} today { intake, burn, tdee, budget, remaining, percent }
 */
function buildContext(profile, today) {
  let ctx = SYSTEM_PROMPT
  if (profile && profile.weight) {
    const gender = profile.gender === 2 ? '女' : '男'
    ctx += ` 当前用户资料：${profile.nickname || '用户'}，${gender}，${profile.age || '未知'}岁，` +
      `${profile.height || '未知'}cm，${profile.weight}kg。`
  }
  if (today && today.budget) {
    ctx += ` 今日已摄入 ${today.intake || 0} 千卡，运动消耗 ${today.burn || 0} 千卡，` +
      `每日预算 ${today.budget} 千卡，剩余 ${today.remaining} 千卡（占比 ${today.percent}%）。` +
      ' 回答时结合这些数据给出针对性建议。'
  }
  return ctx
}

/**
 * 发起流式对话
 * @param {Array} messages [{ role, content }]
 * @param {Object} ctx 个性化上下文
 * @param {Function} onDelta (text) 每次增量内容
 * @returns {Promise<string>} 完整回复
 */
async function chatStream(messages, ctx, onDelta) {
  if (!config.hunyuan.apiKey) {
    const err = new Error('未配置混元 API Key')
    err.code = 'NO_KEY'
    throw err
  }

  const systemContent = buildContext(ctx.profile, ctx.today)
  const body = {
    model: config.hunyuan.model,
    stream: true,
    messages: [{ role: 'system', content: systemContent }].concat(messages)
  }

  const resp = await fetch(config.hunyuan.baseUrl + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + config.hunyuan.apiKey
    },
    body: JSON.stringify(body)
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    const err = new Error('混元接口错误 ' + resp.status + (text ? '：' + text.slice(0, 200) : ''))
    err.code = 'UPSTREAM'
    throw err
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let full = ''
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE 按行切分，一行可能是多个 data: 块
    const lines = buffer.split('\n')
    buffer = lines.pop() || '' // 保留最后一个不完整行

    for (const line of lines) {
      const s = line.trim()
      if (!s.startsWith('data:')) continue
      const payload = s.slice(5).trim()
      if (payload === '[DONE]') continue
      let json
      try { json = JSON.parse(payload) } catch (e) { continue }
      const delta = json.choices && json.choices[0] && json.choices[0].delta
      if (delta && delta.content) {
        full += delta.content
        if (onDelta) onDelta(delta.content)
      }
    }
  }

  return full
}

/**
 * 估算食物营养（非流式，要求模型返回结构化 JSON）
 * 用于「库里没有的食物」兜底：让混元按每100克给出热量与三大营养素，并缓存进库。
 * @param {string[]} names 食物名称数组（已剥离数量/量词，如 ['火龙果','牛油果']）
 * @returns {Promise<Array>} 与输入顺序一一对应的对象数组，每项含营养字段；估算失败返回空数组
 */
async function estimateFoods(names) {
  if (!config.hunyuan.apiKey) {
    const err = new Error('未配置混元 API Key')
    err.code = 'NO_KEY'
    throw err
  }
  if (!Array.isArray(names) || !names.length) return []

  const prompt =
    '你是营养数据库助手。请为下列食物逐一估算「每100克」的营养数据（参考常见食物成分表，取常见值）。\n' +
    '食物列表（JSON 数组）：' + JSON.stringify(names) + '\n' +
    '请严格只返回一个 JSON 数组（不要任何解释文字、不要 markdown 代码块），数组元素顺序与输入一一对应，每个元素格式为：\n' +
    '{"name":"食物名(必须与输入保持一致)","category":"分类(只能从 主食/肉蛋/蔬菜/水果/奶制品/零食/饮品/外卖/调味品/豆制品/其他 中选)","calories":数值,"protein":数值,"fat":数值,"carb":数值,"serving_desc":"常见份量描述 如 1个","serving_grams":数值}\n' +
    'calories/protein/fat/carb 均为每100克数值，calories 可含小数。'

  const body = {
    model: config.hunyuan.model,
    stream: false,
    messages: [
      { role: 'system', content: '你是一个严格输出 JSON 的营养数据助手，不输出多余文字与 markdown 代码块。' },
      { role: 'user', content: prompt }
    ]
  }

  const resp = await fetch(config.hunyuan.baseUrl + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + config.hunyuan.apiKey
    },
    body: JSON.stringify(body)
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    const err = new Error('混元接口错误 ' + resp.status + (text ? '：' + text.slice(0, 200) : ''))
    err.code = 'UPSTREAM'
    throw err
  }

  const data = await resp.json().catch(() => null)
  const content = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || ''
  return parseFoodArray(content, names)
}

// 从模型可能夹带的多余文字/代码块中解析出 JSON 数组，并按输入名称对齐
function parseFoodArray(content, names) {
  if (!content) return []
  let s = content.trim()
  s = s.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const start = s.indexOf('[')
  const end = s.lastIndexOf(']')
  if (start === -1 || end === -1) return []
  let arr
  try {
    arr = JSON.parse(s.slice(start, end + 1))
  } catch (e) {
    return []
  }
  if (!Array.isArray(arr)) return []
  if (!Array.isArray(names)) return arr.filter(Boolean)
  const byName = {}
  arr.forEach(a => { if (a && a.name) byName[a.name] = a })
  return names.map((n, i) => byName[n] || arr[i] || null).filter(Boolean)
}

/**
 * 视觉识别：识别食物图片，返回结构化营养明细（走混元视觉免费额度）
 * @param {string} imageBase64 图片 base64（不含 data: 前缀）
 * @returns {Promise<Array>} [{ name, grams, kcal }]；未配置 key 时抛 NO_KEY
 */
async function recognizeFoodImage(imageBase64) {
  if (!config.vision.apiKey) {
    const err = new Error('未配置混元视觉 API Key')
    err.code = 'NO_KEY'
    throw err
  }
  if (!imageBase64) {
    const err = new Error('缺少图片数据')
    err.code = 'BAD_INPUT'
    throw err
  }

  const prompt =
    '你是营养识别助手。请识别图片中的食物，估算每样食物的份量（克）和热量（千卡）。\n' +
    '只返回一个 JSON 数组（不要解释、不要 markdown），每个元素格式：\n' +
    '{"name":"食物名","grams":份量克数,"kcal":热量千卡}\n' +
    '若无法识别，返回空数组 []。'

  const body = {
    model: config.vision.model,
    stream: false,
    messages: [
      { role: 'system', content: '你严格输出 JSON，不输出多余文字。' },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + imageBase64 } }
        ]
      }
    ]
  }

  const resp = await fetch(config.vision.baseUrl + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + config.vision.apiKey
    },
    body: JSON.stringify(body)
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    const err = new Error('视觉接口错误 ' + resp.status + (text ? '：' + text.slice(0, 200) : ''))
    err.code = 'UPSTREAM'
    throw err
  }

  const data = await resp.json().catch(() => null)
  const content = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || ''
  const arr = parseFoodArray(content, null)
  if (!arr.length) return []
  return arr.map(a => ({
    name: String(a.name || '未知食物'),
    grams: Math.max(1, Math.round(Number(a.grams) || 100)),
    kcal: Math.round(Number(a.kcal) || 0)
  }))
}

/**
 * 生成当日一句话营养建议（非流式，限制长度）
 * 用于首页 AI 营养师卡片；无 Key 时抛 NO_KEY 由路由回退规则
 * @returns {Promise<string>} 不超过 38 字的当日建议
 */
async function quickTip(profile, today) {
  if (!config.hunyuan.apiKey) {
    const err = new Error('未配置混元 API Key')
    err.code = 'NO_KEY'
    throw err
  }
  const ctx = buildContext(profile, today)
  const prompt =
    ctx +
    ' 请基于以上数据，给用户一句今天（当前时段）的饮食或运动提醒，像贴心的朋友随口一说，' +
    '例如“晚餐建议补充蛋白质”“今天热量还有富余，加个橙子吧”“刚才运动消耗不错，继续保持”。' +
    '只输出这一句话，不要标点以外的解释，不超过 35 个字。'
  const body = {
    model: config.hunyuan.model,
    stream: false,
    messages: [
      { role: 'system', content: '你是「小薄荷」营养师，语气亲切，只输出一句建议，不加解释。' },
      { role: 'user', content: prompt }
    ]
  }
  const resp = await fetch(config.hunyuan.baseUrl + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + config.hunyuan.apiKey
    },
    body: JSON.stringify(body)
  })
  if (!resp.ok) {
    const err = new Error('混元接口错误 ' + resp.status)
    err.code = 'UPSTREAM'
    throw err
  }
  const data = await resp.json().catch(() => null)
  const content = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || ''
  let tip = content.trim()
  const idx = tip.search(/[。！!？?.?]/)
  if (idx !== -1) tip = tip.slice(0, idx)
  tip = tip.replace(/^["'「『]+/, '').replace(/["'」』]+$/, '')
  if (tip.length > 38) tip = tip.slice(0, 38)
  return tip || '保持节奏，今天营养与热量都在合理区间'
}

module.exports = { chatStream, buildContext, SYSTEM_PROMPT, estimateFoods, recognizeFoodImage, quickTip }
