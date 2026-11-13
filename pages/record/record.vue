<template>
	<view class="page">
		<!-- 今日概览 -->
		<view class="today-card">
			<view class="today-head">
				<view>
					<view class="today-title">今日记录</view>
					<view class="today-date">{{ todayStr }}</view>
				</view>
				<button class="btn-ghost today-btn" @click="goCheckin">{{ today.id ? '修改打卡' : '去打卡' }}</button>
			</view>
			<view class="today-stats">
				<view class="ts-item">
					<view class="ts-val">{{ today.weight != null ? today.weight : '--' }}</view>
					<view class="ts-key">体重kg</view>
				</view>
				<view class="ts-item">
					<view class="ts-val orange">{{ today.intake || 0 }}</view>
					<view class="ts-key">摄入kcal</view>
				</view>
				<view class="ts-item">
					<view class="ts-val blue">{{ today.burn || 0 }}</view>
					<view class="ts-key">消耗kcal</view>
				</view>
				<view class="ts-item">
					<view class="ts-val" :class="{ red: net > 0 }">{{ net }}</view>
					<view class="ts-key">净热量</view>
				</view>
			</view>
			<view class="quick-actions">
				<view class="qa-btn" @click="go('/pages/food/search')">记录饮食</view>
				<view class="qa-btn" @click="go('/pages/tools/exercise')">记录运动</view>
			</view>
		</view>

		<!-- 近 7 天 -->
		<view class="card">
			<view class="section-title">
				近 7 天记录
				<text class="more" @click="go('/pages/record/history')">全部记录 ></text>
			</view>
			<view class="day-item" v-for="r in recent" :key="r.id">
				<view class="day-date">{{ shortDate(r.date) }}</view>
				<view class="day-vals">
					<text class="day-v">体重 {{ r.weight != null ? r.weight : '--' }}kg</text>
					<text class="day-v orange">摄入 {{ r.intake }}</text>
					<text class="day-v blue">消耗 {{ r.burn }}</text>
				</view>
			</view>
			<view v-if="!recent.length" class="empty">还没有记录，点击右上角开始打卡</view>
		</view>
	</view>
</template>

<script>
import http from '@/utils/request'
import { todayStr } from '@/utils/util'

export default {
	data() {
		return {
			today: {},
			recent: [],
			todayDate: todayStr()
		}
	},
	computed: {
		todayStr() { return this.todayDate },
		net() {
			return (Number(this.today.intake) || 0) - (Number(this.today.burn) || 0)
		}
	},
	onShow() {
		this.refresh()
	},
	onPullDownRefresh() {
		this.refresh()
		uni.stopPullDownRefresh()
	},
	methods: {
		refresh() {
			if (!http.isLogin()) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				return
			}
			const that = this
			http.get('/api/checkins/today').then(function (rec) {
				that.today = rec || {}
			}).catch(function () {})
			http.get('/api/checkins/stats', { days: 7 }).then(function (res) {
				that.recent = (res.list || []).slice().reverse()
			}).catch(function () {})
		},
		shortDate(d) {
			return d ? String(d).slice(5) : ''
		},
		goCheckin() {
			uni.navigateTo({ url: '/pages/record/checkin' })
		},
		go(url) {
			uni.navigateTo({ url: url })
		}
	}
}
</script>

<style>
.today-card {
	background: linear-gradient(160deg, #2BB673, #1E9E60);
	margin: 20rpx 24rpx;
	border-radius: 24rpx;
	padding: 34rpx 32rpx;
	color: #ffffff;
}

.today-head {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.today-title {
	font-size: 36rpx;
	font-weight: 700;
}

.today-date {
	font-size: 24rpx;
	opacity: 0.8;
	margin-top: 6rpx;
}

.today-btn {
	font-size: 26rpx;
	padding: 0 32rpx;
	line-height: 2.4;
}

.today-stats {
	display: flex;
	margin-top: 34rpx;
}

.ts-item {
	flex: 1;
	text-align: center;
}

.ts-val {
	font-size: 38rpx;
	font-weight: 700;
}

.ts-key {
	font-size: 22rpx;
	opacity: 0.8;
	margin-top: 6rpx;
}

.orange {
	color: #FFE3B3;
}

.blue {
	color: #CDE4FF;
}

.red {
	color: #FFD5D5;
}

.quick-actions {
	display: flex;
	margin-top: 30rpx;
}

.qa-btn {
	flex: 1;
	text-align: center;
	background: rgba(255, 255, 255, 0.16);
	border-radius: 14rpx;
	padding: 16rpx 0;
	font-size: 26rpx;
	margin-right: 20rpx;
}

.qa-btn:last-child {
	margin-right: 0;
}

.day-item {
	display: flex;
	align-items: center;
	padding: 22rpx 0;
	border-bottom: 1rpx solid #F0F3F1;
}

.day-item:last-child {
	border-bottom: none;
}

.day-date {
	width: 110rpx;
	font-size: 26rpx;
	font-weight: 600;
	color: #555555;
}

.day-vals {
	flex: 1;
	display: flex;
	justify-content: space-between;
}

.day-v {
	font-size: 24rpx;
	color: #666666;
}
</style>
