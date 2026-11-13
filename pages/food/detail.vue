<template>
	<view class="page" v-if="food">
		<view class="hero">
			<view class="hero-name">
				{{ food.name }}
				<text class="hero-tag">{{ food.category }}</text>
			</view>
			<view class="hero-cal">{{ food.calories }}</view>
			<view class="hero-unit">千卡 / 100克</view>
		</view>

		<view class="card">
			<view class="section-title">三大营养素（每100g）</view>
			<view class="macro" v-for="m in macros" :key="m.key">
				<view class="macro-top">
					<text class="macro-name">{{ m.label }}</text>
					<text class="macro-val">{{ food[m.key] }}g</text>
				</view>
				<view class="macro-bar">
					<view class="macro-bar-inner" :style="{ width: m.percent + '%', background: m.color }"></view>
				</view>
			</view>
		</view>

		<view class="card">
			<view class="section-title">按份计算</view>
			<view class="portion">
				<input class="portion-input" type="digit" v-model="grams" placeholder="请输入克数" />
				<view class="portion-unit">克</view>
				<view class="portion-eq">=</view>
				<view class="portion-kcal">{{ portionKcal }}</view>
				<view class="portion-unit">千卡</view>
			</view>
			<view class="quick-row">
				<view class="quick" v-for="g in quickGrams" :key="g.value" @click="grams = String(g.value)">
					{{ g.label }}
				</view>
			</view>

			<view class="budget" v-if="budget">
				<view class="budget-top">
					<text>这份占今日预算 {{ itemPercent }}%</text>
					<text class="budget-remain">剩余 {{ remaining }} 千卡</text>
				</view>
				<view class="budget-bar">
					<view class="budget-bar-inner" :style="{ width: barWidth }"></view>
				</view>
				<view class="budget-sub">今日已用 {{ todayPercent }}%（预算 {{ budget }} 千卡）</view>
			</view>

			<view class="food-desc">{{ food.description }}</view>
			<view class="btn-group">
				<button class="btn-ghost" @click="addToPlate">加入餐盘</button>
				<button class="btn-primary" @click="record">记录这份摄入</button>
			</view>
		</view>

		<view class="card" v-if="subs.length">
			<view class="section-title">低卡替代 · 同类更轻盈</view>
			<view class="sub-item" v-for="s in subs" :key="s.id" @click="goDetail(s.id)">
				<view class="sub-info">
					<view class="sub-name">{{ s.name }}</view>
					<view class="sub-meta">{{ s.serving_desc || '每100g' }}</view>
				</view>
				<view class="sub-cal">{{ s.calories }}<text class="sub-unit">千卡</text></view>
			</view>
		</view>
	</view>
</template>

<script>
import http from '@/utils/request'
import { addToPlate } from '@/utils/plate'

export default {
	data() {
		return {
			id: 0,
			food: null,
			grams: '100',
			subs: [],
			budget: 0,
			remaining: 0,
			todayPercent: 0
		}
	},
	computed: {
		quickGrams() {
			if (!this.food) return [{ value: 100, label: '100g' }]
			const set = []
			if (this.food.serving_grams && this.food.serving_desc) {
				set.push({ value: this.food.serving_grams, label: this.food.serving_desc })
			}
			;[50, 100, 200, 300].forEach(v => {
				if (!set.some(s => s.value === v)) set.push({ value: v, label: v + 'g' })
			})
			return set
		},
		portionKcal() {
			if (!this.food || !Number(this.grams)) return 0
			return Math.round(Number(this.food.calories) * Number(this.grams) / 100)
		},
		itemPercent() {
			return this.budget ? Math.round(this.portionKcal / this.budget * 100) : 0
		},
		barWidth() {
			const total = this.todayPercent + this.itemPercent
			return Math.min(100, total) + '%'
		},
		macros() {
			if (!this.food) return []
			const total = Number(this.food.protein) * 4 + Number(this.food.fat) * 9 + Number(this.food.carb) * 4
			return [
				{ key: 'protein', label: '蛋白质', color: '#4A90E2', percent: Math.round(Number(this.food.protein) * 4 / (total || 1) * 100) },
				{ key: 'fat', label: '脂肪', color: '#FF9F43', percent: Math.round(Number(this.food.fat) * 9 / (total || 1) * 100) },
				{ key: 'carb', label: '碳水化合物', color: '#2BB673', percent: Math.round(Number(this.food.carb) * 4 / (total || 1) * 100) }
			]
		}
	},
	onLoad(opt) {
		this.id = Number(opt.id) || 0
		this.load()
		this.loadToday()
	},
	methods: {
		load() {
			const that = this
			http.get('/api/foods/' + this.id).then(function (food) {
				that.food = food
				uni.setNavigationBarTitle({ title: food.name })
				if (food.serving_grams) that.grams = String(food.serving_grams)
				that.pushRecent(food)
			})
			http.get('/api/foods/' + this.id + '/substitute').then(function (res) {
				that.subs = res.list || []
			}).catch(function () {})
		},
		pushRecent(food) {
			let list = uni.getStorageSync('mint_recent') || []
			list = list.filter(i => i.id !== food.id)
			list.unshift({ id: food.id, name: food.name, calories: food.calories })
			if (list.length > 8) list = list.slice(0, 8)
			uni.setStorageSync('mint_recent', list)
		},
		loadToday() {
			const that = this
			http.get('/api/checkins/today').then(function (res) {
				if (!res) return
				that.budget = res.budget || 0
				that.remaining = res.remaining || 0
				that.todayPercent = res.percent || 0
			}).catch(function () {})
		},
		addToPlate() {
			if (!Number(this.grams)) {
				uni.showToast({ title: '请输入正确的克数', icon: 'none' })
				return
			}
			addToPlate({ foodId: this.id, name: this.food.name, grams: Number(this.grams), calories: this.food.calories })
			uni.showToast({ title: '已加入餐盘', icon: 'success' })
		},
		record() {
			if (!Number(this.grams)) {
				uni.showToast({ title: '请输入正确的克数', icon: 'none' })
				return
			}
			const that = this
			http.post('/api/checkins', { addIntake: this.portionKcal }).then(function () {
				uni.showToast({ title: '已记录 +' + that.portionKcal + ' 千卡', icon: 'success' })
				that.loadToday()
			})
		},
		goDetail(id) {
			uni.redirectTo({ url: '/pages/food/detail?id=' + id })
		}
	}
}
</script>

<style>
.hero {
	background: linear-gradient(160deg, #2BB673, #1E9E60);
	padding: 50rpx 40rpx;
	text-align: center;
	color: #ffffff;
}

.hero-name {
	font-size: 40rpx;
	font-weight: 700;
}

.hero-tag {
	font-size: 22rpx;
	background: rgba(255, 255, 255, 0.22);
	border-radius: 10rpx;
	padding: 4rpx 14rpx;
	margin-left: 14rpx;
	font-weight: 400;
	vertical-align: 6rpx;
}

.hero-cal {
	font-size: 96rpx;
	font-weight: 700;
	margin-top: 20rpx;
	line-height: 1.2;
}

.hero-unit {
	font-size: 24rpx;
	opacity: 0.85;
}

.section-title {
	font-size: 28rpx;
	font-weight: 600;
	color: #333333;
	margin-bottom: 18rpx;
}

.card {
	background: #ffffff;
	border-radius: 24rpx;
	padding: 28rpx;
	margin: 20rpx 24rpx;
	box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.04);
}

.macro {
	margin-bottom: 26rpx;
}

.macro-top {
	display: flex;
	justify-content: space-between;
	font-size: 26rpx;
	color: #555555;
	margin-bottom: 10rpx;
}

.macro-bar {
	height: 14rpx;
	background: #F0F3F1;
	border-radius: 8rpx;
	overflow: hidden;
}

.macro-bar-inner {
	height: 100%;
	border-radius: 8rpx;
}

.portion {
	display: flex;
	align-items: center;
}

.portion-input {
	width: 200rpx;
	background: #F5F7F6;
	border-radius: 14rpx;
	padding: 16rpx 20rpx;
	font-size: 30rpx;
	text-align: center;
}

.portion-unit {
	margin-left: 12rpx;
	color: #8A948D;
	font-size: 26rpx;
}

.portion-eq {
	margin: 0 24rpx;
	color: #8A948D;
}

.portion-kcal {
	font-size: 48rpx;
	font-weight: 700;
	color: #FF9F43;
}

.quick-row {
	display: flex;
	margin-top: 24rpx;
}

.quick {
	flex: 1;
	text-align: center;
	background: #F5F7F6;
	border-radius: 12rpx;
	padding: 12rpx 0;
	margin-right: 16rpx;
	font-size: 24rpx;
	color: #555555;
}

.quick:last-child {
	margin-right: 0;
}

.quick.active {
	background: #EAF6EF;
	color: #2BB673;
}

.budget {
	margin-top: 26rpx;
	padding-top: 24rpx;
	border-top: 1rpx solid #F0F3F1;
}

.budget-top {
	display: flex;
	justify-content: space-between;
	font-size: 24rpx;
	color: #555555;
}

.budget-remain {
	color: #2BB673;
}

.budget-bar {
	height: 16rpx;
	background: #F0F3F1;
	border-radius: 8rpx;
	overflow: hidden;
	margin-top: 12rpx;
}

.budget-bar-inner {
	height: 100%;
	background: linear-gradient(90deg, #2BB673, #FF9F43);
	border-radius: 8rpx;
	transition: width 0.3s ease;
}

.budget-sub {
	font-size: 22rpx;
	color: #9AA79F;
	margin-top: 10rpx;
}

.food-desc {
	font-size: 24rpx;
	color: #9AA79F;
	margin-top: 24rpx;
}

.btn-group {
	display: flex;
	margin-top: 30rpx;
}

.btn-primary {
	flex: 1;
	background: #2BB673;
	color: #ffffff;
	font-size: 28rpx;
	border-radius: 40rpx;
	line-height: 2.8;
	margin-left: 16rpx;
}

.btn-ghost {
	background: #EAF6EF;
	color: #2BB673;
	font-size: 28rpx;
	border-radius: 40rpx;
	line-height: 2.8;
	padding: 0 30rpx;
	margin: 0;
}

.btn-ghost::after,
.btn-primary::after {
	border: none;
}

.sub-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 22rpx 0;
	border-bottom: 1rpx solid #F0F3F1;
}

.sub-item:last-child {
	border-bottom: none;
}

.sub-name {
	font-size: 28rpx;
	color: #333333;
	font-weight: 600;
}

.sub-meta {
	font-size: 22rpx;
	color: #9AA79F;
	margin-top: 6rpx;
}

.sub-cal {
	font-size: 32rpx;
	font-weight: 700;
	color: #FF9F43;
}

.sub-unit {
	font-size: 20rpx;
	color: #9AA79F;
	margin-left: 4rpx;
}
</style>
