<template>
	<view class="page">
		<view class="hero">
			<view class="hero-title">今日餐盘</view>
			<view class="hero-sub">组合食物，看看营养搭得均不均衡</view>
		</view>

		<view class="card" v-if="items.length">
			<view class="plate-item" v-for="(it, idx) in items" :key="it.foodId">
				<view class="plate-info">
					<view class="plate-name">{{ it.name }}</view>
					<view class="plate-kcal" v-if="it.calories != null">{{ itemKcal(it) }} 千卡</view>
				</view>
				<view class="plate-grams">
					<input class="grams-input" type="digit" v-model="it.grams" @input="onChange" />
					<text class="grams-unit">g</text>
				</view>
				<view class="plate-del" @click="remove(idx)">删除</view>
			</view>

			<view class="plate-total">
				<text>合计</text>
				<text class="plate-total-num">{{ totalKcal }} 千卡</text>
			</view>
		</view>

		<view class="card empty-card" v-else>
			<view class="empty">餐盘还是空的</view>
			<button class="btn-primary add-btn" @click="goAdd">去添加食物</button>
		</view>

		<view class="card" v-if="items.length">
			<view class="section-title">营养素占比（按供能）</view>
			<view class="ratio-bar">
				<view class="ratio-seg" :style="{ width: (result.ratio.protein || 0) + '%', background: '#4A90E2' }"></view>
				<view class="ratio-seg" :style="{ width: (result.ratio.fat || 0) + '%', background: '#FF9F43' }"></view>
				<view class="ratio-seg" :style="{ width: (result.ratio.carb || 0) + '%', background: '#2BB673' }"></view>
			</view>
			<view class="ratio-legend">
				<text><i class="dot" style="background:#4A90E2"></i>蛋白 {{ result.ratio.protein || 0 }}%</text>
				<text><i class="dot" style="background:#FF9F43"></i>脂肪 {{ result.ratio.fat || 0 }}%</text>
				<text><i class="dot" style="background:#2BB673"></i>碳水 {{ result.ratio.carb || 0 }}%</text>
			</view>

			<view class="score-card" :style="{ background: scoreColor }">
				<view class="score-num">{{ result.score }}</view>
				<view class="score-label">均衡评分</view>
			</view>
			<view class="advice">{{ result.advice }}</view>

			<button class="btn-primary record-btn" @click="record">记录总摄入</button>
		</view>
	</view>
</template>

<script>
import http from '@/utils/request'
import { getPlate, removeFromPlate, clearPlate } from '@/utils/plate'

export default {
	data() {
		return {
			items: [],
			result: { ratio: { protein: 0, fat: 0, carb: 0 }, score: 0, advice: '' }
		}
	},
	computed: {
		totalKcal() {
			return this.items.reduce((s, i) => s + this.itemKcal(i), 0)
		},
		scoreColor() {
			const s = this.result.score
			if (s >= 80) return 'linear-gradient(135deg,#2BB673,#1E9E60)'
			if (s >= 60) return 'linear-gradient(135deg,#FFB020,#FF9F43)'
			return 'linear-gradient(135deg,#FF8A65,#FF6B6B)'
		}
	},
	onShow() {
		this.items = getPlate()
		this.analyze()
	},
	methods: {
		itemKcal(it) {
			if (it.calories == null) return 0
			return Math.round(Number(it.calories) * Number(it.grams || 0) / 100)
		},
		onChange() {
			this.analyze()
		},
		remove(idx) {
			const it = this.items[idx]
			this.items = removeFromPlate(it.foodId)
			this.analyze()
		},
		analyze() {
			const that = this
			const payload = { items: this.items.map(i => ({ foodId: i.foodId, grams: Number(i.grams) || 0 })) }
			http.post('/api/ai/analyze-plate', payload).then(function (res) {
				that.result = res
			}).catch(function () {})
		},
		record() {
			const that = this
			http.post('/api/checkins', { addIntake: this.totalKcal }).then(function () {
				clearPlate()
				uni.showToast({ title: '已记录 ' + that.totalKcal + ' 千卡', icon: 'success' })
				setTimeout(function () { uni.navigateBack() }, 600)
			})
		},
		goAdd() {
			uni.navigateTo({ url: '/pages/food/search' })
		}
	}
}
</script>

<style>
.page {
	padding: 20rpx 0 40rpx;
}

.hero {
	background: linear-gradient(160deg, #2BB673, #1E9E60);
	padding: 46rpx 40rpx;
	color: #ffffff;
}

.hero-title {
	font-size: 40rpx;
	font-weight: 700;
}

.hero-sub {
	font-size: 24rpx;
	opacity: 0.85;
	margin-top: 8rpx;
}

.card {
	background: #ffffff;
	border-radius: 24rpx;
	padding: 28rpx;
	margin: 20rpx 24rpx;
	box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.04);
}

.plate-item {
	display: flex;
	align-items: center;
	padding: 22rpx 0;
	border-bottom: 1rpx solid #F0F3F1;
}

.plate-info {
	flex: 1;
}

.plate-name {
	font-size: 28rpx;
	color: #333333;
	font-weight: 600;
}

.plate-kcal {
	font-size: 22rpx;
	color: #FF9F43;
	margin-top: 6rpx;
}

.plate-grams {
	display: flex;
	align-items: center;
	margin: 0 16rpx;
}

.grams-input {
	width: 110rpx;
	background: #F5F7F6;
	border-radius: 12rpx;
	padding: 10rpx;
	text-align: center;
	font-size: 26rpx;
}

.grams-unit {
	font-size: 24rpx;
	color: #8A948D;
	margin-left: 6rpx;
}

.plate-del {
	font-size: 24rpx;
	color: #FF6B6B;
	padding: 8rpx 12rpx;
}

.plate-total {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-top: 18rpx;
	font-size: 26rpx;
	color: #555555;
}

.plate-total-num {
	font-size: 36rpx;
	font-weight: 700;
	color: #FF9F43;
}

.empty-card {
	text-align: center;
}

.empty {
	color: #9AA79F;
	font-size: 26rpx;
	padding: 20rpx 0;
}

.add-btn {
	margin-top: 16rpx;
	background: #2BB673;
	color: #ffffff;
	font-size: 26rpx;
	border-radius: 40rpx;
	line-height: 2.8;
}

.add-btn::after {
	border: none;
}

.section-title {
	font-size: 28rpx;
	font-weight: 600;
	color: #333333;
	margin-bottom: 18rpx;
}

.ratio-bar {
	display: flex;
	height: 28rpx;
	border-radius: 14rpx;
	overflow: hidden;
	background: #F0F3F1;
}

.ratio-seg {
	height: 100%;
	transition: width 0.3s ease;
}

.ratio-legend {
	display: flex;
	justify-content: space-around;
	margin-top: 18rpx;
	font-size: 24rpx;
	color: #555555;
}

.dot {
	display: inline-block;
	width: 16rpx;
	height: 16rpx;
	border-radius: 50%;
	margin-right: 8rpx;
	vertical-align: 2rpx;
}

.score-card {
	margin-top: 26rpx;
	border-radius: 20rpx;
	padding: 28rpx;
	text-align: center;
	color: #ffffff;
}

.score-num {
	font-size: 72rpx;
	font-weight: 700;
	line-height: 1;
}

.score-label {
	font-size: 24rpx;
	opacity: 0.9;
	margin-top: 6rpx;
}

.advice {
	font-size: 26rpx;
	color: #555555;
	line-height: 1.6;
	margin-top: 22rpx;
	padding: 20rpx;
	background: #F5F7F6;
	border-radius: 16rpx;
}

.record-btn {
	margin-top: 28rpx;
	background: #2BB673;
	color: #ffffff;
	font-size: 28rpx;
	border-radius: 40rpx;
	line-height: 2.8;
}

.record-btn::after {
	border: none;
}
</style>
