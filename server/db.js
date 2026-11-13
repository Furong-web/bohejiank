const mysql = require('mysql2/promise')
const config = require('./config')

// 连接池：所有业务查询均使用参数化 execute，防止 SQL 注入
const pool = mysql.createPool({ ...config.db, multipleStatements: false })

async function query(sql, params) {
  const [rows] = await pool.execute(sql, params)
  return rows
}

module.exports = { pool, query }
