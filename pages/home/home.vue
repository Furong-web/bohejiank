<template>
	<view class="page">
		<!-- 顶部概览 -->
		<view class="hero">
			<view class="hero-top">
				<view class="hero-left">
					<view class="hero-hi">{{ greeting }}{{ nickname ? '，' + nickname : '' }}</view>
					<view class="hero-sub">坚持记录，见证更轻盈的自己</view>
				</view>
				<view class="avatar" @click="goMine">{{ avatarChar }}</view>
			</view>

			<view v-if="isLogin" class="hero-stats">
				<view class="ring-wrap">
					<view class="ring" :style="ringStyle">
						<view class="ring-mask">
							<view class="ring-val">{{ remainingText }}</view>
							<view class="ring-unit">千卡</view>
							<view class="ring-label">{{ overBudget ? '已超预算' : '今日还可摄入' }}</view>
						</view>
					</view>
				</view>

				<view class="hs-row">
					<view class="hs-item">
						<view class="hs-val">{{ today.intake || 0 }}</view>
						<view class="hs-key">已摄入</view>
					</view>
					<view class="hs-line"></view>
					<view class="hs-item">
						<view class="hs-val">{{ today.burn || 0 }}</view>
						<view class="hs-key">已消耗</view>
					</view>
					<view class="hs-line"></view>
					<view class="hs-item">
						<view class="hs-val">{{ today.budget || 0 }}</view>
						<view class="hs-key">今日预算</view>
					</view>
				</view>
			</view>

			<view v-else class="hero-login">
				<view class="hero-login-text">登录后开始记录你的减脂之旅</view>
				<button class="btn-ghost hero-login-btn" @click="go('/pages/login/login')">立即登录</button>
			</view>
		</view>

		<!-- AI 营养师一句话建议 -->
		<view class="card ai-tip" @click="go('/pages/food/ai')" v-if="isLogin">
			<view class="ai-tip-head">
				<view class="ai-tip-ico">🍃</view>
				<view class="ai-tip-title">小薄荷营养师</view>
				<view class="ai-tip-badge">{{ tipSource === 'ai' ? 'AI 实时' : '智能建议' }}</view>
			</view>
			<view class="ai-tip-text">{{ nutritionTip || '正在为你分析今日饮食…' }}</view>
			<view class="ai-tip-more">点击与营养师深聊 ›</view>
		</view>

		<!-- 快速通道 -->
		<view class="card">
			<view class="section-title">快速通道</view>
			<view class="grid">
				<view class="grid-item" v-for="item in entries" :key="item.name" @click="go(item.url)">
					<view class="grid-ico" :style="{ background: item.bg }">{{ item.char }}</view>
					<view class="grid-name">{{ item.name }}</view>
				</view>
			</view>
		</view>

		<!-- 本周战报横滑 -->
		<view class="card week-report" v-if="isLogin && weekly">
			<view class="section-title">本周战报</view>
			<scroll-view class="week-scroll" scroll-x :show-scrollbar="false">
				<view class="week-card" v-for="w in weekCards" :key="w.label" :class="w.good ? 'good' : 'warn'">
					<view class="week-label">{{ w.label }}</view>
					<view class="week-value">{{ w.value }}</view>
					<view class="week-delta">{{ w.deltaText }}</view>
				</view>
			</scroll-view>
		</view>

		<!-- 今日推荐 -->
		<view class="card">
			<view class="section-title">
				今日推荐
				<text class="more" @click="goTab">更多 ></text>
			</view>
			<view class="article-item" v-for="a in articles" :key="a.id" @click="go('/pages/knowledge/detail?id=' + a.id)">
				<view class="article-title">{{ a.title }}</view>
				<view class="article-meta">{{ a.category }} · {{ a.views }} 阅读</view>
			</view>
			<view v-if="!articles.length" class="empty">暂无文章，启动后端后自动加载</view>
		</view>
	</view>
</template>

<script>
import http from '@/utils/request'

export default {
	data() {
		return {
			today: {},
			streak: 0,
			articles: [],
			user: null,
			nutritionTip: '',
			tipSource: '',
			weekly: null,
			entries: [
				{ char: '查', name: '热量查询', url: '/pages/food/search', bg: '#E3F6EC' },
			{ char: 'AI', name: 'AI饮食助手', url: '/pages/food/ai', bg: '#FFE9CC' },
				{ char: '测', name: 'BMI自测', url: '/pages/tools/bmi', bg: '#E8F1FD' },
				{ char: '动', name: '运动消耗', url: '/pages/tools/exercise', bg: '#FFF1E0' },
				{ char: '记', name: '每日打卡', url: '/pages/record/checkin', bg: '#F1E8FD' },
				{ char: '统', name: '数据统计', url: '/pages/mine/stats', bg: '#E3F6EC' },
				{ char: '藏', name: '我的收藏', url: '/pages/knowledge/favorites', bg: '#E8F1FD' },
				{ char: '导', name: '导出数据', url: '/pages/mine/export', bg: '#FFF1E0' },
				{ char: '说', name: '使用说明', url: '/pages/mine/about', bg: '#F1E8FD' }
			]
		}
	},
	computed: {
		isLogin() { return http.isLogin() },
		nickname() {
			const u = this.user || uni.getStorageSync('mint_user')
			return u && u.nickname ? u.nickname : ''
		},
		avatarChar() {
			return this.nickname ? this.nickname.slice(0, 1) : '客'
		},
		todayWeight() {
			return this.today && this.today.weight != null ? this.today.weight : ''
		},
		budgetValid() {
			return this.today && this.today.budget > 0
		},
		remainingKcal() {
			if (!this.budgetValid) return 0
			return Math.round(this.today.remaining != null ? this.today.remaining : (this.today.budget - this.today.intake))
		},
		overBudget() {
			return this.remainingKcal < 0
		},
		remainingText() {
			if (!this.budgetValid) return '--'
			return Math.abs(this.remainingKcal)
		},
		ringPercent() {
			if (!this.budgetValid) return 0
			const p = (this.today.intake || 0) / this.today.budget * 100
			return Math.max(0, Math.min(100, p))
		},
		ringStyle() {
			const color = this.overBudget ? '#FF9F43' : '#ffffff'
			return {
				background: `conic-gradient(${color} 0%, ${color} ${this.ringPercent}%, rgba(255,255,255,0.22) ${this.ringPercent}%, rgba(255,255,255,0.22) 100%)`
			}
		},
		greeting() {
			const h = new Date().getHours()
			if (h < 11) return '早上好'
			if (h < 14) return '中午好'
			if (h < 18) return '下午好'
			return '晚上好'
		},
		weekCards() {
			if (!this.weekly) return []
			const c = this.weekly.compare
			const mk = function (label, value, diff, unit, lessGood) {
				const abs = Math.abs(diff)
				const deltaText = diff === 0 ? '与上周持平' : (diff > 0 ? '比上周多 ' : '比上周少 ') + abs + ' ' + unit
				return { label: label, value: value, deltaText: deltaText, good: lessGood ? diff < 0 : diff > 0 }
			}
			const tw = this.weekly.thisWeek
			const aw = Math.round(tw.avgWeight * 10) / 10
			return [
				mk('本周摄入', tw.intake + ' 千卡', c.intakeDiff, '千卡', true),
				mk('本周消耗', tw.burn + ' 千卡', c.burnDiff, '千卡', false),
				mk('本周打卡', tw.days + ' 天', c.daysDiff, '天', false),
				mk('平均体重', tw.avgWeight ? aw + ' kg' : '--', c.weightDiff, 'kg', true)
			]
		}
	},
	onShow() {
		this.refresh()
	},
	onPullDownRefresh() {
		this.refresh()
		uni.stopPullDownRefresh()
	},
	onShareAppMessage() {
		return { title: '薄荷健康 - 科学减脂，轻盈生活', path: '/pages/splash/splash' }
	},
	methods: {
		refresh() {
			this.user = uni.getStorageSync('mint_user') || null
			if (http.isLogin()) {
				this.loadToday()
				this.loadNutritionTip()
				this.loadWeekly()
			}
			this.loadArticles()
		},
		loadToday() {
			const that = this
			http.get('/api/checkins/today').then(function (rec) {
				that.today = rec || {}
			}).catch(function () {})
			http.get('/api/checkins/stats', { days: 7 }).then(function (res) {
				that.streak = res.summary ? res.summary.streak : 0
			}).catch(function () {})
		},
		loadNutritionTip() {
			const that = this
			http.get('/api/ai/nutrition-tip').then(function (res) {
				that.nutritionTip = res.tip || ''
				that.tipSource = res.source || 'rule'
			}).catch(function () {})
		},
		loadWeekly() {
			const that = this
			http.get('/api/checkins/weekly-report').then(function (res) {
				that.weekly = res || null
			}).catch(function () {})
		},
		loadArticles() {
			const that = this
			http.get('/api/articles', { page: 1, pageSize: 3 }).then(function (res) {
				that.articles = res.list || []
			}).catch(function () {})
		},
		go(url) {
			uni.navigateTo({ url: url })
		},
		goTab() {
			uni.switchTab({ url: '/pages/knowledge/knowledge' })
		},
		goMine() {
			uni.switchTab({ url: '/pages/mine/mine' })
		}
	}
}
</script>

<style>
.page {
	padding-bottom: 30rpx;
}

.hero {
	background: linear-gradient(160deg, #2BB673, #1E9E60);
	margin: 20rpx 24rpx;
	border-radius: 24rpx;
	padding: 36rpx 32rpx;
	color: #ffffff;
}

.hero-top {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.hero-hi {
	font-size: 36rpx;
	font-weight: 700;
}

.hero-sub {
	font-size: 24rpx;
	opacity: 0.85;
	margin-top: 8rpx;
}

.avatar {
	width: 88rpx;
	height: 88rpx;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.25);
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 36rpx;
	font-weight: 600;
	flex-shrink: 0;
}

.hero-stats {
	margin-top: 30rpx;
}

.ring-wrap {
	display: flex;
	justify-content: center;
}

.ring {
	position: relative;
	width: 240rpx;
	height: 240rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.ring-mask {
	width: 188rpx;
	height: 188rpx;
	border-radius: 50%;
	background: linear-gradient(160deg, #2BB673, #1E9E60);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.ring-val {
	font-size: 56rpx;
	font-weight: 700;
	line-height: 1;
}

.ring-unit {
	font-size: 22rpx;
	opacity: 0.85;
	margin-top: 4rpx;
}

.ring-label {
	font-size: 20rpx;
	opacity: 0.85;
	margin-top: 10rpx;
}

.hs-row {
	display: flex;
	align-items: center;
	margin-top: 30rpx;
}

.hs-item {
	flex: 1;
	text-align: center;
}

.hs-val {
	font-size: 38rpx;
	font-weight: 700;
}

.hs-key {
	font-size: 22rpx;
	opacity: 0.8;
	margin-top: 6rpx;
}

.hs-line {
	width: 2rpx;
	height: 48rpx;
	background: rgba(255, 255, 255, 0.25);
}

.hero-login {
	margin-top: 30rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.hero-login-text {
	font-size: 26rpx;
	opacity: 0.9;
}

.hero-login-btn {
	font-size: 26rpx;
	padding: 0 36rpx;
	line-height: 2.4;
}

.grid {
	display: flex;
	flex-wrap: wrap;
}

.grid-item {
	width: 25%;
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 30rpx;
}

.grid-ico {
	width: 92rpx;
	height: 92rpx;
	border-radius: 28rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 38rpx;
	font-weight: 600;
	color: #2BB673;
}

.grid-name {
	font-size: 24rpx;
	color: #555555;
	margin-top: 12rpx;
}

.article-item {
	padding: 20rpx 0;
	border-bottom: 1rpx solid #F0F3F1;
}

.article-item:last-child {
	border-bottom: none;
}

.article-title {
	font-size: 30rpx;
	font-weight: 600;
	color: #333333;
}

.article-meta {
	font-size: 22rpx;
	color: #9AA79F;
	margin-top: 8rpx;
}

/* AI 营养师卡片 */
.ai-tip {
	background: linear-gradient(135deg, #EAF6EF, #F4FBF7);
	border: 1rpx solid #D6EFE0;
}

.ai-tip-head {
	display: flex;
	align-items: center;
}

.ai-tip-ico {
	font-size: 40rpx;
	margin-right: 14rpx;
}

.ai-tip-title {
	font-size: 30rpx;
	font-weight: 700;
	color: #1E9E60;
	flex: 1;
}

.ai-tip-badge {
	font-size: 20rpx;
	color: #1E9E60;
	background: #FFFFFF;
	border-radius: 20rpx;
	padding: 4rpx 16rpx;
}

.ai-tip-text {
	font-size: 28rpx;
	color: #2F3A34;
	line-height: 1.6;
	margin-top: 16rpx;
	min-height: 44rpx;
}

.ai-tip-more {
	font-size: 22rpx;
	color: #2BB673;
	margin-top: 14rpx;
}

/* 本周战报横滑 */
.week-scroll {
	white-space: nowrap;
	width: 100%;
	margin-top: 16rpx;
}

.week-card {
	display: inline-block;
	width: 220rpx;
	margin-right: 20rpx;
	padding: 24rpx 20rpx;
	border-radius: 20rpx;
	background: #F5F7F6;
	vertical-align: top;
}

.week-card:last-child {
	margin-right: 0;
}

.week-card.good {
	background: #EAF6EF;
}

.week-card.warn {
	background: #FFF3E6;
}

.week-label {
	font-size: 22rpx;
	color: #9AA79F;
}

.week-value {
	font-size: 36rpx;
	font-weight: 700;
	color: #333333;
	margin: 10rpx 0 8rpx;
}

.week-card.good .week-value {
	color: #1E9E60;
}

.week-card.warn .week-value {
	color: #FF9F43;
}

.week-delta {
	font-size: 20rpx;
	color: #6B756E;
}

.week-card.good .week-delta {
	color: #1E9E60;
}

.week-card.warn .week-delta {
	color: #FF9F43;
}
</style>
