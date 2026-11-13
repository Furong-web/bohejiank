/**
 * 数据库初始化脚本：执行 database.sql 建库建表 + 种子数据，并创建演示账号
 * 用法：npm run init-db
 */
const fs = require('fs')
const path = require('path')
const mysql = require('mysql2/promise')
const bcrypt = require('bcryptjs')
const config = require('../config')

async function main() {
  const sqlPath = path.join(__dirname, '..', 'database.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true
  })

  console.log('正在执行建库、建表与种子数据...')
  await conn.query(sql)

  // 演示账号 demo / 123456（密码 bcrypt 加密存储）
  const hash = await bcrypt.hash('123456', 10)
  await conn.query(
    'INSERT INTO mint_health.users (username, password_hash, nickname) VALUES (?, ?, ?) ' +
    'ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)',
    ['demo', hash, '演示用户']
  )

  await conn.end()
  console.log('[OK] 数据库初始化完成：mint_health')
  console.log('[OK] 演示账号：demo / 123456')
}

main().catch(e => {
  console.error('[失败] 初始化出错：', e.message)
  process.exit(1)
})
