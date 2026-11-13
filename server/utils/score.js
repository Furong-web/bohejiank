/**
 * 健康分规则评分（纯函数，与前端大屏/看板共用同一套口径）
 *
 * 输入 stats：
 *   { weight, target, budget, avgIntake, avgBurn, checkinRate }
 *   - weight     : 当前体重(kg)，可为 null
 *   - target     : 目标体重(kg)，可为 null
 *   - budget     : 每日建议摄入预算(kcal)
 *   - avgIntake  : 近30天平均摄入(kcal)
 *   - avgBurn    : 近30天平均消耗(kcal)
 *   - checkinRate: 近30天打卡率 0~1
 *
 * 输出：{ score, level, parts:{trend,regular,diet,sport} }
 *   score 0~100，level ∈ 优秀/良好/一般/需关注
 */

const { calcBudget } = require('./nutrition')

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

/**
 * 根据单个用户基础信息 + 近期统计计算健康分
 * @param {Object} u  用户基础信息（供缺省值兜底）
 * @param {Object} stats 见上
 */
function calcHealthScore(u, stats) {
  const weight = stats.weight != null ? Number(stats.weight) : (u && u.weight ? Number(u.weight) : null)
  const target = stats.target != null ? Number(stats.target) : (u && u.target_weight ? Number(u.target_weight) : null)
  const budget = stats.budget != null ? Number(stats.budget) : (u ? calcBudget(u) : 1500)
  const avgIntake = stats.avgIntake != null ? Number(stats.avgIntake) : 0
  const avgBurn = stats.avgBurn != null ? Number(stats.avgBurn) : 0
  const checkinRate = stats.checkinRate != null ? Number(stats.checkinRate) : 0

  // 1) 趋势分：当前体重与目标体重的接近程度
  let trend = 60
  if (weight && target) {
    if (weight <= target) {
      trend = 100 // 已达成目标
    } else {
      const over = (weight - target) / target           // 超出比例
      trend = clamp(100 - over * 220, 0, 100)            // 超出约 45% 时归零
    }
  }

  // 2) 规律性分：近30天打卡率直接映射
  const regular = clamp(checkinRate * 100, 0, 100)

  // 3) 饮食分：平均摄入与预算的贴合度（偏离越大越低）
  let diet = 60
  if (avgIntake > 0 && budget > 0) {
    const dev = Math.abs(avgIntake - budget) / budget   // 偏离比例
    diet = clamp(100 - dev * 130, 0, 100)               // 偏离约 77% 时归零
  }

  // 4) 运动分：平均消耗，300kcal 视为满分基准
  const sport = clamp((avgBurn / 300) * 100, 0, 100)

  const score = Math.round(
    trend * 0.25 + regular * 0.30 + diet * 0.30 + sport * 0.15
  )

  return { score: clamp(score, 0, 100), level: levelOf(score), parts: { trend, regular, diet, sport } }
}

function levelOf(score) {
  if (score >= 85) return '优秀'
  if (score >= 70) return '良好'
  if (score >= 55) return '一般'
  return '需关注'
}

module.exports = { calcHealthScore, levelOf, clamp }
