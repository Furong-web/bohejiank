/**
 * 演示数据种子脚本（幂等，仅生成 seed_ 前缀用户，绝不删除任何已有真实数据）
 *
 * 用法：
 *   npm run seed          灌入 30 个 seed_ 用户 + 每人近 30 天打卡
 *   npm run seed:clean    清除所有 seed_ 前缀用户及其打卡记录
 *
 * 数据合理性：
 *   - 体重按每天小幅下降 + 随机抖动，带平台期/反弹感
 *   - 摄入在每日预算的 75%~115% 浮动
 *   - 消耗 150~600 kcal
 *   - 约 20% 概率断卡，制造连续性差异
 */
const { query } = require('../db')
const bcrypt = require('bcryptjs')
const { calcTdee } = require('../utils/nutrition')

const NICK = ['小薄荷', '柠檬', '清风', '山楂', '燕麦', '柚子', '蓝莓', '青柠', '薄荷糖', '小麦',
  '椰子', '番茄', '黄瓜', '菠菜', '红豆', '黑豆', '苹果', '橙子', '葡萄', '蜜桃',
  '栗子', '杏仁', '芝麻', '薏米', '糙米', '芦笋', '紫薯', '南瓜', '冬瓜', '白菜']

function dateStr(offsetDays) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const p = n => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

async function seed() {
  const [{ c }] = await query("SELECT COUNT(*) AS c FROM users WHERE username LIKE 'seed_%'")
  if (c > 0) {
    console.log('[种子] 已存在 seed_ 数据，跳过（如需重置请先 npm run seed:clean）')
    return
  }

  const hash = await bcrypt.hash('123456', 10)
  const N = 30
  for (let i = 1; i <= N; i++) {
    const username = 'seed_u' + String(i).padStart(2, '0')
    const nickname = NICK[(i - 1) % NICK.length] + (i > NICK.length ? i : '')
    const gender = i % 2 === 1 ? 1 : 2
    const age = 20 + Math.floor(Math.random() * 25)
    const height = (gender === 1 ? 168 + Math.random() * 15 : 155 + Math.random() * 12)
    const target = +(height - 100 + (Math.random() * 8 - 4)).toFixed(1)
    const activity = 1 + Math.floor(Math.random() * 4)
    const startWeight = +(target + (4 + Math.random() * 12)).toFixed(1)

    const r = await query(
      'INSERT INTO users (username, password_hash, nickname, gender, age, height, weight, target_weight, activity_level, role) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
      [username, hash, nickname, gender, age, +height.toFixed(1), startWeight, target, activity]
    )
    const uid = r.insertId

    // 近 30 天打卡
    let w = startWeight
    const budget = calcTdee({ gender, age, height, weight: startWeight, activity_level: activity }) - 500
    for (let d = 29; d >= 0; d--) {
      if (Math.random() < 0.2) continue // 约 20% 断卡
      const drop = Math.random() * 0.25 + 0.05
      w = Math.max(target, w - drop + (Math.random() * 0.4 - 0.2))
      const intake = Math.round(budget * (0.75 + Math.random() * 0.4))
      const burn = Math.round(150 + Math.random() * 450)
      await query(
        'INSERT INTO checkins (user_id, date, weight, intake, burn, note) VALUES (?, ?, ?, ?, ?, ?) ' +
        'ON DUPLICATE KEY UPDATE weight=VALUES(weight), intake=VALUES(intake), burn=VALUES(burn)',
        [uid, dateStr(-d), +w.toFixed(1), intake, burn, '']
      )
    }
    process.stdout.write(`\r[种子] 已生成 ${i}/${N} 个用户`)
  }
  console.log('\n[OK] 演示数据灌入完成（30 个 seed_ 用户 × 近30天打卡）')
}

async function clean() {
  console.log('[清理] 删除 seed_ 用户及其打卡记录...')
  await query('DELETE c FROM checkins c JOIN users u ON u.id = c.user_id WHERE u.username LIKE ?', ['seed_%'])
  await query("DELETE FROM users WHERE username LIKE 'seed_%'")
  console.log('[OK] 已清除所有 seed_ 演示数据')
}

async function main() {
  const mode = process.argv[2]
  if (mode === 'clean') {
    await clean()
  } else {
    await seed()
  }
}

main()
  .then(() => process.exit(0))
  .catch(e => { console.error('[失败] 种子脚本出错：', e.message); process.exit(1) })
