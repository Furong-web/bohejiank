const express = require('express')
const cors = require('cors')
const config = require('./config')
const { query } = require('./db')

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

// 启动自愈：确保 foods 表具备 common 字段并标记常用食物（幂等，失败仅告警不阻塞启动）
async function ensureSchema() {
  try {
    const dbName = config.db.database
    const [{ c }] = await query(
      'SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = \'foods\' AND COLUMN_NAME = \'common\'',
      [dbName]
    )
    if (!c) {
      await query('ALTER TABLE foods ADD COLUMN common TINYINT NOT NULL DEFAULT 0 COMMENT \'是否为常用食物\'')
    }
    await query(
      'UPDATE foods SET common = 1 WHERE name IN (\'米饭\',\'全麦面包\',\'燕麦片\',\'红薯\',\'鸡蛋\',\'鸡胸肉\',\'牛肉(瘦)\',\'豆腐\',\'西兰花\',\'番茄\',\'苹果\',\'香蕉\',\'纯牛奶\',\'无糖酸奶\',\'可乐\',\'全糖奶茶\')'
    )
  } catch (e) {
    console.warn('[迁移] common 字段检查跳过:', e.message)
  }
}
ensureSchema().catch(e => console.warn('[迁移]', e.message))

// 服务健康检查
app.get('/', (req, res) => res.json({ name: '薄荷健康 API', status: 'running', time: new Date().toISOString() }))

app.use('/api/auth', require('./routes/auth'))
app.use('/api/user', require('./routes/user'))
app.use('/api/foods', require('./routes/foods'))
app.use('/api/exercises', require('./routes/exercises'))
app.use('/api/articles', require('./routes/articles'))
app.use('/api/checkins', require('./routes/checkins'))
app.use('/api/ai', require('./routes/ai'))
app.use('/api/admin', require('./routes/admin'))
app.use('/api/b', require('./routes/b'))

// 404
app.use((req, res) => res.status(404).json({ code: 1, msg: '接口不存在: ' + req.method + ' ' + req.path }))

// 统一错误处理：把数据库等常见错误翻译成可读提示
app.use((err, req, res, next) => {
  console.error('[服务错误]', err.code || '', err.message)
  let msg = '服务器内部错误'
  if (err.code === 'ECONNREFUSED') msg = '无法连接 MySQL，请先启动数据库服务'
  else if (err.code === 'ER_ACCESS_DENIED_ERROR') msg = 'MySQL 账号或密码错误，请检查 server/config.js'
  else if (err.code === 'ER_BAD_DB_ERROR') msg = '数据库不存在，请先在 server 目录执行 npm run init-db'
  else if (err.code === 'ER_NO_SUCH_TABLE') msg = '数据表不存在，请先在 server 目录执行 npm run init-db'
  res.status(500).json({ code: 1, msg })
})

app.listen(config.port, () => {
  console.log('')
  console.log('==============================================')
  console.log('  薄荷健康后端服务已启动')
  console.log('  地址: http://127.0.0.1:' + config.port)
  console.log('  微信开发者工具请勾选「不校验合法域名」')
  console.log('  真机调试请将前端 BASE_URL 改为电脑局域网 IP')
  console.log('==============================================')
  console.log('')
})
