/**
 * 管理员迁移脚本（幂等，可重复执行）
 * 1. 给 users 表补充 role 字段（1普通用户 / 2管理员）
 * 2. 创建管理员账号 admin / admin123456（role=2）
 * 用法：npm run migrate
 */
const mysql = require('mysql2/promise')
const bcrypt = require('bcryptjs')
const config = require('../config')

const ADMIN_USER = 'admin'
const ADMIN_PASS = 'admin123456'

async function main() {
  const conn = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    multipleStatements: true
  })

  // 1. 补充 role 字段
  const dbName = config.db.database
  const [{ c }] = await conn.query(
    'SELECT COUNT(*) AS c FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = \'users\' AND COLUMN_NAME = \'role\'',
    [dbName]
  )
  if (!c) {
    console.log('[迁移] 为 users 表添加 role 字段...')
    await conn.query(
      "ALTER TABLE users ADD COLUMN role TINYINT NOT NULL DEFAULT 1 COMMENT '1普通用户 2管理员'"
    )
  } else {
    console.log('[迁移] role 字段已存在，跳过')
  }

  // 2. 创建管理员账号
  const hash = await bcrypt.hash(ADMIN_PASS, 10)
  await conn.query(
    'INSERT INTO users (username, password_hash, nickname, role) VALUES (?, ?, ?, 2) ' +
    'ON DUPLICATE KEY UPDATE role = 2',
    [ADMIN_USER, hash, '系统管理员']
  )

  await conn.end()
  console.log('[OK] 迁移完成')
  console.log(`[OK] 管理员账号：${ADMIN_USER} / ${ADMIN_PASS}（角色：管理员）`)
}

main().catch(e => {
  console.error('[失败] 迁移出错：', e.message)
  process.exit(1)
})
