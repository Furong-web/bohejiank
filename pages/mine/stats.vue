<template>
	<view class="page">
		<!-- 周期切换 -->
		<view class="period-row">
			<view class="period-btn" :class="{ active: days === 7 }" @click="switchDays(7)">近 7 天</view>
			<view class="period-btn" :class="{ active: days === 30 }" @click="switchDays(30)">近 30 天</view>
		</view>

		<!-- 汇总卡片 -->
		<view class="card" v-if="summary">
			<view class="grid-row">
				<view class="grid-cell">
					<view class="stat-num">{{ summary.currentWeight != null ? summary.currentWeight : '--' }}</view>
					<view class="stat-label">当前体重kg</view>
				</view>
				<view class="grid-cell">
					<view class="stat-num" :style="{ color: changeColor }">{{ changeText }}</view>
					<view class="stat-label">体重变化kg</view>
				</view>
			</view>
			<view class="grid-row">
				<view class="grid-cell">
					<view class="stat-num" style="color:#FF9F43">{{ summary.avgIntake }}</view>
					<view class="stat-label">日均摄入kcal</view>
				</view>
				<view class="grid-cell">
					<view class="stat-num" style="color:#4A90E2">{{ summary.avgBurn }}</view>
					<view class="stat-label">日均消耗kcal</view>
				</view>
			</view>
			<view class="grid-row">
				<view class="grid-cell">
					<view class="stat-num" style="color:#1E9E60">{{ summary.days }}</view>
					<view class="stat-label">打卡天数</view>
				</view>
				<view class="grid-cell">
					<view class="stat-num" style="color:#9B59B6">{{ summary.streak }}</view>
					<view class="stat-label">连续天数</view>
				</view>
			</view>
		</view>

		<!-- 体重折线图 -->
		<view class="card">
			<view class="section-title">体重变化趋势</view>
			<view class="legend" v-if="hasWeight">
				<view class="legend-item"><view class="dot" style="background:#2BB673"></view>体重 kg</view>
			</view>
			<mint-chart canvasId="weightChart" type="line" :labels="weightLabels" :series="weightSeries" :height="200" />
		</view>

		<!-- 摄入消耗柱状图 -->
		<view class="card">
			<view class="section-title">摄入 vs 消耗</view>
			<view class="legend" v-if="list.length">
				<view class="legend-item"><view class="dot" style="background:#FF9F43"></view>摄入</view>
				<view class="legend-item"><view class="dot" style="background:#4A90E2"></view>消耗</view>
			</view>
			<mint-chart canvasId="calChart" type="bar" :labels="labels" :series="calSeries" :height="200" />
		</view>

		<view class="card">
			<button class="btn-primary" @click="goExport">导出这些数据 (CSV)</button>
		</view>
	</view>
</template>

<script>
import http from '@/utils/request'
import mintChart from '@/components/mint-chart/mint-chart.vue'

export default {
	components: { mintChart },
	data() {
		return {
			days: 7,
			list: [],
			summary: null
		}
	},
	computed: {
		labels() {
			return this.list.map(function (r) { return String(r.date).slice(5) })
		},
		hasWeight() {
			return this.list.some(function (r) { return r.weight != null })
		},
		weightLabels() {
			return this.list.filter(function (r) { return r.weight != null })
				.map(function (r) { return String(r.date).slice(5) })
		},
		weightSeries() {
			return [{
				name: '体重',
				values: this.list.filter(function (r) { return r.weight != null }).map(function (r) { return Number(r.weight) }),
				color: '#2BB673'
			}]
		},
		calSeries() {
			const that = this
			return [
				{ name: '摄入', values: that.list.map(function (r) { return Number(r.intake) }), color: '#FF9F43' },
				{ name: '消耗', values: that.list.map(function (r) { return Number(r.burn) }), color: '#4A90E2' }
			]
		},
		changeText() {
			if (!this.summary || this.summary.weightChange == null) return '--'
			const v = this.summary.weightChange
			return v > 0 ? '+' + v : String(v)
		},
		changeColor() {
			if (!this.summary || this.summary.weightChange == null) return '#333333'
			return this.summary.weightChange <= 0 ? '#2BB673' : '#FF6B6B'
		}
	},
	onShow() {
		this.load()
	},
	methods: {
		switchDays(d) {
			this.days = d
			this.load()
		},
		load() {
			const that = this
			http.get('/api/checkins/stats', { days: this.days }).then(function (res) {
				that.list = res.list || []
				that.summary = res.summary || {}
			})
		},
		goExport() {
			uni.navigateTo({ url: '/pages/mine/export' })
		}
	}
}
</script>

<style>
.page {
	padding: 20rpx 0 40rpx;
}

.period-row {
	display: flex;
	margin: 0 24rpx 20rpx;
	background: #ffffff;
	border-radius: 40rpx;
	padding: 8rpx;
}

.period-btn {
	flex: 1;
	text-align: center;
	padding: 14rpx 0;
	font-size: 28rpx;
	color: #666666;
	border-radius: 40rpx;
}

.period-btn.active {
	background: #2BB673;
	color: #ffffff;
	font-weight: 600;
}

.grid-row {
	display: flex;
	text-align: center;
	margin-bottom: 26rpx;
}

.grid-row:last-child {
	margin-bottom: 0;
}

.grid-cell {
	flex: 1;
}

.legend {
	display: flex;
	gap: 30rpx;
	margin-bottom: 10rpx;
}

.legend-item {
	display: flex;
	align-items: center;
	font-size: 22rpx;
	color: #666666;
}

.dot {
	width: 18rpx;
	height: 18rpx;
	border-radius: 50%;
	margin-right: 8rpx;
}
</style>
