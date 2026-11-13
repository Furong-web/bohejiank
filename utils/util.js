/**
 * 通用工具：日期格式化、BMI/BMR/TDEE 计算、运动消耗估算
 */

export function formatDate(date) {
	const d = date ? new Date(date) : new Date()
	const m = d.getMonth() + 1
	const day = d.getDate()
	return d.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day)
}

export function todayStr() {
	return formatDate()
}

/** BMI = 体重kg / 身高m^2 */
export function calcBmi(weightKg, heightCm) {
	if (!weightKg || !heightCm) return 0
	const h = heightCm / 100
	if (h <= 0) return 0
	return Math.round((weightKg / (h * h)) * 10) / 10
}

/** 中国成人 BMI 标准 */
export function bmiInfo(bmi) {
	if (!bmi) return { label: '未知', color: '#9CA39E' }
	if (bmi < 18.5) return { label: '偏瘦', color: '#4A90E2', advice: '适当增加营养摄入，配合力量训练增肌' }
	if (bmi < 24) return { label: '正常', color: '#2BB673', advice: '身材保持得很好，继续保持当前生活方式' }
	if (bmi < 28) return { label: '超重', color: '#FF9F43', advice: '建议制造 300-500 千卡热量缺口，加强运动' }
	return { label: '肥胖', color: '#FF6B6B', advice: '建议在医生或营养师指导下科学减重' }
}

/** BMR：Mifflin-St Jeor 公式 */
export function calcBmr(opts) {
	const gender = opts.gender != null ? opts.gender : 1
	const age = opts.age || 25
	const height = opts.height || 170
	const weight = opts.weight || 60
	const base = 10 * weight + 6.25 * height - 5 * age
	return Math.round(gender === 1 ? base + 5 : base - 161)
}

/** 活动系数 */
export const ACTIVITIES = [
	{ value: 1.2, label: '久坐少动（几乎不运动）' },
	{ value: 1.375, label: '轻度活动（每周运动1-3次）' },
	{ value: 1.55, label: '中度活动（每周运动3-5次）' },
	{ value: 1.725, label: '高强度（每周运动6-7次）' }
]

/** TDEE = BMR x 活动系数 */
export function calcTdee(bmr, activityValue) {
	return Math.round(bmr * activityValue)
}

/** 运动消耗估算：kcal = MET x 3.5 x 体重kg / 200 x 分钟 */
export function exerciseKcal(met, weightKg, minutes) {
	if (!met || !weightKg || !minutes) return 0
	return Math.round(met * 3.5 * weightKg / 200 * minutes)
}

/** 文章分类对应色 */
export function categoryColor(cat) {
	const map = {
		'饮食': '#2BB673',
		'运动': '#FF9F43',
		'科普': '#4A90E2',
		'心态': '#9B59B6'
	}
	return map[cat] || '#8A948D'
}
