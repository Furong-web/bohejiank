/** 营养计算：与前端 utils/util.js 公式保持一致（Mifflin-St Jeor） */

// activity_level(1-4) -> 活动系数
const ACTIVITY_FACTOR = { 1: 1.2, 2: 1.375, 3: 1.55, 4: 1.725 }

function activityFactor(level) {
  return ACTIVITY_FACTOR[level] || 1.375
}

// 基础代谢率 BMR
function calcBmr(u) {
  const gender = u.gender != null ? u.gender : 1
  const age = u.age || 25
  const height = u.height || 170
  const weight = u.weight || 60
  const base = 10 * weight + 6.25 * height - 5 * age
  return Math.round(gender === 1 ? base + 5 : base - 161)
}

// 每日总消耗 TDEE
function calcTdee(u) {
  return Math.round(calcBmr(u) * activityFactor(u.activity_level))
}

// 建议每日摄入预算（制造约 500 千卡缺口，下限保护）
function calcBudget(u) {
  return Math.max(1000, calcTdee(u) - 500)
}

module.exports = { activityFactor, calcBmr, calcTdee, calcBudget }
