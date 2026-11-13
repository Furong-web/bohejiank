<template>
	<view class="page">
		<view class="card">
			<view class="section-title">身体数据</view>

			<view class="form-item">
				<text class="form-label">性别</text>
				<view class="gender-row">
					<view class="gender-btn" :class="{ active: form.gender === 1 }" @click="form.gender = 1">男</view>
					<view class="gender-btn" :class="{ active: form.gender === 2 }" @click="form.gender = 2">女</view>
				</view>
			</view>

			<view class="form-row">
				<view class="form-item half">
					<text class="form-label">年龄</text>
					<input class="form-input" type="number" v-model="form.age" placeholder="岁" />
				</view>
				<view class="form-item half">
					<text class="form-label">身高 (cm)</text>
					<input class="form-input" type="digit" v-model="form.height" placeholder="如 165" />
				</view>
			</view>

			<view class="form-row">
				<view class="form-item half">
					<text class="form-label">体重 (kg)</text>
					<input class="form-input" type="digit" v-model="form.weight" placeholder="如 55.5" />
				</view>
				<view class="form-item half">
					<text class="form-label">目标体重 (kg)</text>
					<input class="form-input" type="digit" v-model="form.target" placeholder="选填" />
				</view>
			</view>

			<view class="form-item">
				<text class="form-label">日常活动量</text>
				<picker :range="activityLabels" :value="activityIndex" @change="onActivityChange">
					<view class="form-input picker-value">{{ activityLabels[activityIndex] }}</view>
				</picker>
			</view>

			<button class="btn-primary" @click="compute">开始测算</button>
		</view>

		<!-- 结果 -->
		<template v-if="result">
			<view class="card">
				<view class="section-title">BMI 指数</view>
				<view class="bmi-row">
					<view class="bmi-val" :style="{ color: result.bmiColor }">{{ result.bmi }}</view>
					<view class="bmi-badge" :style="{ background: result.bmiColor }">{{ result.bmiLabel }}</view>
				</view>
				<view class="bmi-scale">
					<view class="bmi-scale-bar">
						<view class="bmi-marker" :style="{ left: result.markerLeft }"></view>
					</view>
					<view class="bmi-scale-labels">
						<text>18.5</text>
						<text>24</text>
						<text>28</text>
					</view>
				</view>
				<view class="bmi-advice">{{ result.advice }}</view>
			</view>

			<view class="card">
				<view class="section-title">热量消耗</view>
				<view class="cal-row">
					<view class="cal-item">
						<view class="stat-num">{{ result.bmr }}</view>
						<view class="stat-label">基础代谢 BMR</view>
					</view>
					<view class="cal-item">
						<view class="stat-num" style="color:#FF9F43">{{ result.tdee }}</view>
						<view class="stat-label">每日总消耗 TDEE</view>
					</view>
					<view class="cal-item">
						<view class="stat-num" style="color:#4A90E2">{{ result.targetIntake }}</view>
						<view class="stat-label">建议摄入/日</view>
					</view>
				</view>
				<view class="plan" v-if="planText">{{ planText }}</view>
				<button class="btn-primary save-btn" @click="saveProfile">保存到我的资料</button>
			</view>
		</template>
	</view>
</template>

<script>
import http from '@/utils/request'
import { calcBmi, bmiInfo, calcBmr, calcTdee, ACTIVITIES } from '@/utils/util'

export default {
	data() {
		return {
			form: { gender: 1, age: '', height: '', weight: '', target: '' },
			activityIndex: 1,
			result: null
		}
	},
	computed: {
		activityLabels() {
			return ACTIVITIES.map(function (a) { return a.label })
		},
		planText() {
			if (!this.result || !this.result.plan) return ''
			return this.result.plan
		}
	},
	onLoad() {
		const user = uni.getStorageSync('mint_user')
		if (user) {
			this.form.gender = user.gender || 1
			this.form.age = user.age || ''
			this.form.height = user.height || ''
			this.form.weight = user.weight || ''
			this.form.target = user.target_weight || ''
			this.activityIndex = Math.min(3, Math.max(0, (user.activity_level || 2) - 1))
		}
	},
	methods: {
		onActivityChange(e) {
			this.activityIndex = Number(e.detail.value)
		},
		compute() {
			const f = this.form
			if (!f.height || !f.weight || !f.age) {
				uni.showToast({ title: '请填写年龄、身高和体重', icon: 'none' })
				return
			}
			const bmi = calcBmi(Number(f.weight), Number(f.height))
			const info = bmiInfo(bmi)
			const bmr = calcBmr({ gender: f.gender, age: Number(f.age), height: Number(f.height), weight: Number(f.weight) })
			const tdee = calcTdee(bmr, ACTIVITIES[this.activityIndex].value)
			const targetIntake = Math.max(1200, tdee - 400)

			let plan = ''
			if (f.target && Number(f.target) < Number(f.weight)) {
				const weekly = (tdee - targetIntake) * 7 / 7700
				if (weekly > 0.05) {
					const weeks = Math.ceil((Number(f.weight) - Number(f.target)) * 7700 / ((tdee - targetIntake) * 7))
					plan = '按建议摄入执行，预计约 ' + weeks + ' 周达到目标体重 ' + f.target + 'kg（约每周减 ' + weekly.toFixed(2) + 'kg）'
				}
			} else if (f.target && Number(f.target) <= Number(f.weight)) {
				plan = '当前体重已不超过目标，保持现有习惯即可'
			}

			this.result = {
				bmi: bmi,
				bmiLabel: info.label,
				bmiColor: info.color,
				advice: info.advice,
				markerLeft: Math.min(100, Math.max(0, (bmi - 14) / (34 - 14) * 100)) + '%',
				bmr: bmr,
				tdee: tdee,
				targetIntake: targetIntake,
				plan: plan
			}
		},
		saveProfile() {
			const f = this.form
			const data = {
				gender: f.gender,
				age: Number(f.age) || 25,
				height: Number(f.height) || 170,
				weight: Number(f.weight) || 60,
				target_weight: f.target ? Number(f.target) : null,
				activity_level: this.activityIndex + 1
			}
			http.put('/api/user/profile', data).then(function (user) {
				uni.setStorageSync('mint_user', user)
				uni.showToast({ title: '已保存到我的资料', icon: 'success' })
			})
		}
	}
}
</script>

<style>
.form-row {
	display: flex;
	justify-content: space-between;
}

.half {
	width: 48%;
}

.gender-row {
	display: flex;
}

.gender-btn {
	flex: 1;
	text-align: center;
	background: #F5F7F6;
	border-radius: 14rpx;
	padding: 18rpx 0;
	font-size: 28rpx;
	color: #666666;
	margin-right: 20rpx;
}

.gender-btn:last-child {
	margin-right: 0;
}

.gender-btn.active {
	background: rgba(43, 182, 115, 0.12);
	color: #2BB673;
	font-weight: 600;
}

.picker-value {
	color: #333333;
}

.bmi-row {
	display: flex;
	align-items: center;
	justify-content: center;
	margin: 20rpx 0 30rpx;
}

.bmi-val {
	font-size: 88rpx;
	font-weight: 700;
	margin-right: 20rpx;
}

.bmi-badge {
	color: #ffffff;
	font-size: 26rpx;
	border-radius: 24rpx;
	padding: 8rpx 26rpx;
}

.bmi-scale {
	padding: 0 20rpx;
}

.bmi-scale-bar {
	position: relative;
	height: 16rpx;
	border-radius: 10rpx;
	background: linear-gradient(90deg, #4A90E2 0%, #2BB673 35%, #FF9F43 70%, #FF6B6B 100%);
}

.bmi-marker {
	position: absolute;
	top: -8rpx;
	width: 8rpx;
	height: 32rpx;
	background: #333333;
	border-radius: 4rpx;
	margin-left: -4rpx;
}

.bmi-scale-labels {
	display: flex;
	justify-content: space-between;
	font-size: 20rpx;
	color: #9AA79F;
	margin-top: 10rpx;
	padding: 0 40rpx;
}

.bmi-advice {
	margin-top: 26rpx;
	background: #F5F7F6;
	border-radius: 14rpx;
	padding: 20rpx 24rpx;
	font-size: 24rpx;
	color: #666666;
}

.cal-row {
	display: flex;
	text-align: center;
	margin: 16rpx 0;
}

.cal-item {
	flex: 1;
}

.plan {
	background: rgba(255, 159, 67, 0.1);
	border-radius: 14rpx;
	padding: 20rpx 24rpx;
	font-size: 24rpx;
	color: #D4820A;
	margin-top: 10rpx;
}

.save-btn {
	margin-top: 30rpx;
}
</style>
