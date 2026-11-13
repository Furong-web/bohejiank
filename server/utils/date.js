/** 日期工具 */
function pad(n) { return n < 10 ? '0' + n : '' + n }

function todayStr() {
  const d = new Date()
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

/**
 * 计算连续打卡天数
 * @param {string[]} datesDesc 打卡日期（YYYY-MM-DD）倒序数组
 */
function calcStreak(datesDesc) {
  if (!datesDesc || !datesDesc.length) return 0
  const set = new Set(datesDesc)
  const cur = new Date()
  if (!set.has(todayStr())) cur.setDate(cur.getDate() - 1)
  let count = 0
  while (set.has(cur.getFullYear() + '-' + pad(cur.getMonth() + 1) + '-' + pad(cur.getDate()))) {
    count++
    cur.setDate(cur.getDate() - 1)
  }
  return count
}

module.exports = { todayStr, calcStreak }
