/**
 * B 端学员种子脚本（幂等）
 * ------------------------------------------------------------------
 * 为 B 端机构管理系统生成独立学员档案：
 *   - 30 个规范中文姓名（张伟/李娜…，不再是 testchat 之类的测试昵称）
 *   - 平均分到 3 个机构（fitpro / hrclub / nutri）
 *   - 尽量关联已有 seed_ 用户（复用其近 30 天真实打卡数据），
 *     不足时为学员新建专属账号并生成打卡数据
 *
 * 用法：
 *   npm run seed:students        灌入学员
 *   npm run seed:students clean  清空学员表
 */
const { query } = require('../db')
const bcrypt = require('bcryptjs')
const { calcTdee } = require('../utils/nutrition')

const ORGS = ['fitpro', 'hrclub', 'nutri']

// 规范中文姓名（15 男 15 女交替，贴近企业员工/健身会员真实名单）
const NAMES = [
  ['张伟', 1], ['李娜', 2], ['王强', 1], ['刘敏', 2], ['陈杰', 1],
  ['杨丽', 2], ['赵磊', 1], ['黄静', 2], ['周涛', 1], ['吴芳', 2],
  ['徐鹏', 1], ['孙燕', 2], ['马超', 1], ['朱婷', 2], ['胡军', 1],
  ['林秀英', 2], ['郭浩', 1], ['何秀兰', 2], ['高翔', 1], ['罗雪', 2],
  ['郑毅', 1], ['梁静', 2], ['谢峰', 1], ['宋佳', 2], ['唐辉', 1],
  ['许萍', 2], ['韩磊', 1], ['冯悦', 2], ['邓健', 1], ['曹颖', 2]
]

function dateStr(offsetDays) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const p = (n) => (n < 10 ? '0' + n : '' + n)
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate())
}

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS b_students (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL COMMENT '学员真实姓名',
      employee_no VARCHAR(30) NOT NULL COMMENT '学员编号/工号',
      gender TINYINT NOT NULL DEFAULT 1 COMMENT '1男 2女',
      age INT NOT NULL DEFAULT 28 COMMENT '年龄',
      height DECIMAL(5,1) NOT NULL DEFAULT 170 COMMENT '身高cm',
      weight DECIMAL(5,1) NULL COMMENT '当前体重kg',
      target_weight DECIMAL(5,1) NULL COMMENT '目标体重kg',
      activity_level TINYINT NOT NULL DEFAULT 2 COMMENT '1久坐 2轻度 3中度 4高强度',
      org_id VARCHAR(30) NOT NULL COMMENT '所属机构id',
      user_id INT UNSIGNED NULL COMMENT '关联C端用户id',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_org (org_id), KEY idx_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='B端学员表'
  `)
}

/** 生成某用户的近 30 天打卡（仅当该用户没有任何打卡时） */
async function ensureCheckins(uid, gender, age, height, weight, target, activity) {
  const [{ c }] = await query('SELECT COUNT(*) c FROM checkins WHERE user_id = ?', [uid])
  if (c > 0) return
  const budget = calcTdee({ gender, age, height, weight, activity_level: activity }) - 500
  let w = weight
  for (let d = 29; d >= 0; d--) {
    if (Math.random() < 0.15) continue
    const drop = Math.random() * 0.22 + 0.04
    w = Math.max(target, w - drop + (Math.random() * 0.4 - 0.2))
    const intake = Math.round(budget * (0.78 + Math.random() * 0.35))
    const burn = Math.round(180 + Math.random() * 420)
    await query(
      'INSERT INTO checkins (user_id, date, weight, intake, burn, note) VALUES (?, ?, ?, ?, ?, ?) ' +
      'ON DUPLICATE KEY UPDATE weight=VALUES(weight), intake=VALUES(intake), burn=VALUES(burn)',
      [uid, dateStr(-d), +w.toFixed(1), intake, burn, '']
    )
  }
}

async function seed() {
  await ensureTable()
  const [{ c }] = await query('SELECT COUNT(*) c FROM b_students')
  if (c > 0) {
    console.log('[学员种子] 已存在学员数据，跳过（如需重置请先 npm run seed:students clean）')
    return
  }

  // 优先复用 seed_ 用户（已有真实打卡），按 id 取；不足则新建
  const seedUsers = await query("SELECT id FROM users WHERE username LIKE 'seed_%' ORDER BY id")
  const hash = await bcrypt.hash('123456', 10)

  for (let i = 0; i < NAMES.length; i++) {
    const [name, gender] = NAMES[i]
    const org = ORGS[i % ORGS.length]
    const age = 24 + (i * 7) % 22
    const height = gender === 1 ? 170 + (i * 3) % 14 : 158 + (i * 5) % 12
    const target = +(height - 100 + (i % 5) - 2).toFixed(1)
    const startWeight = +(target + 3 + (i * 13 % 12)).toFixed(1)
    const activity = 1 + (i % 4)
    const employeeNo = (org === 'fitpro' ? 'FIT' : org === 'hrclub' ? 'HR' : 'NUT') + String(i + 1).padStart(3, '0')

    let uid = null
    if (seedUsers[i]) {
      uid = seedUsers[i].id
    } else {
      const r = await query(
        'INSERT INTO users (username, password_hash, nickname, gender, age, height, weight, target_weight, activity_level, role) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
        ['stu_' + String(i + 1).padStart(3, '0'), hash, name, gender, age, +height.toFixed(1), startWeight, target, activity]
      )
      uid = r.insertId
    }
    await ensureCheckins(uid, gender, age, +height.toFixed(1), startWeight, target, activity)

    await query(
      'INSERT INTO b_students (name, employee_no, gender, age, height, weight, target_weight, activity_level, org_id, user_id) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, employeeNo, gender, age, +height.toFixed(1), startWeight, target, activity, org, uid]
    )
    process.stdout.write(`\r[学员种子] 已生成 ${i + 1}/${NAMES.length} 名学员`)
  }
  console.log('\n[OK] B 端学员数据灌入完成（30 名，分属 3 个机构）')
}

async function clean() {
  await query('DELETE FROM b_students')
  console.log('[OK] 已清空 b_students 学员表')
}

const mode = process.argv[2]
;(mode === 'clean' ? clean() : seed())
  .then(() => process.exit(0))
  .catch((e) => { console.error('[失败] 学员种子脚本出错：', e.message); process.exit(1) })
