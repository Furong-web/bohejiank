<template>
	<view class="page">
		<!-- 用户信息头 -->
		<view class="head">
			<view class="head-row" @click="notLogin ? goLogin() : ''">
				<view class="avatar">{{ avatarChar }}</view>
				<view class="head-info">
					<view class="nickname">{{ nickname }}</view>
					<view class="username">{{ notLogin ? '点击登录 / 注册' : '用户名：' + username }}</view>
				</view>
			</view>
			<view class="body-row" v-if="!notLogin">
				<view class="body-item">
					<text class="body-val">{{ summary.currentWeight || '--' }}kg</text>
					<text class="body-key">当前体重</text>
				</view>
				<view class="body-item">
					<text class="body-val">{{ summary.targetWeight || '--' }}kg</text>
					<text class="body-key">目标体重</text>
				</view>
			</view>
		</view>

		<!-- 数据统计 -->
		<view class="card">
			<view class="stats-row">
				<view class="stats-item">
					<view class="stat-num">{{ summary.checkinDays }}</view>
					<view class="stat-label">累计打卡</view>
				</view>
				<view class="stats-item">
					<view class="stat-num" style="color:#FF9F43">{{ summary.streak }}</view>
					<view class="stat-label">连续天数</view>
				</view>
				<view class="stats-item">
					<view class="stat-num" style="color:#4A90E2">{{ summary.favoriteCount }}</view>
					<view class="stat-label">收藏文章</view>
				</view>
			</view>
		</view>

		<!-- 功能菜单 -->
		<view class="card menu-card">
			<view class="menu-item" v-for="m in menus" :key="m.name" @click="go(m.url)">
				<view class="menu-ico" :style="{ background: m.bg, color: m.color }">{{ m.char }}</view>
				<view class="menu-name">{{ m.name }}</view>
				<view class="menu-arrow">></view>
			</view>
		</view>

		<view class="card menu-card" v-if="!notLogin">
			<view class="menu-item" @click="logout">
				<view class="menu-ico" style="background:#FDE8E8;color:#FF6B6B">退</view>
				<view class="menu-name" style="color:#FF6B6B">退出登录</view>
			</view>
		</view>
	</view>
</template>

<script>
import http from '@/utils/request'

export default {
	data() {
		return {
			user: null,
			summary: {},
			menus: [
				{ char: '资', name: '编辑资料', url: '/pages/mine/profile', bg: '#E3F6EC', color: '#2BB673' },
				{ char: '密', name: '修改密码', url: '/pages/mine/password', bg: '#E8F1FD', color: '#4A90E2' },
				{ char: '藏', name: '我的收藏', url: '/pages/knowledge/favorites', bg: '#FFF1E0', color: '#FF9F43' },
				{ char: '统', name: '数据统计', url: '/pages/mine/stats', bg: '#F1E8FD', color: '#9B59B6' },
				{ char: '导', name: '导出数据', url: '/pages/mine/export', bg: '#E3F6EC', color: '#2BB673' },
				{ char: '说', name: '使用说明', url: '/pages/mine/about', bg: '#E8F1FD', color: '#4A90E2' }
			]
		}
	},
	computed: {
		notLogin() { return !http.isLogin() },
		nickname() {
			if (this.notLogin) return '未登录'
			const u = this.user || uni.getStorageSync('mint_user')
			return u && u.nickname ? u.nickname : '用户'
		},
		username() {
			const u = this.user || uni.getStorageSync('mint_user')
			return u && u.username ? u.username : ''
		},
		avatarChar() { return this.nickname.slice(0, 1) }
	},
	onShow() {
		this.refresh()
	},
	methods: {
		refresh() {
			if (this.notLogin) {
				this.user = null
				this.summary = {}
				return
			}
			const that = this
			http.get('/api/auth/me').then(function (u) {
				that.user = u
				uni.setStorageSync('mint_user', u)
			}).catch(function () {})
			http.get('/api/user/summary').then(function (s) {
				that.summary = s || {}
			}).catch(function () {})
		},
		goLogin() {
			uni.reLaunch({ url: '/pages/login/login' })
		},
		go(url) {
			uni.navigateTo({ url: url })
		},
		logout() {
			uni.showModal({
				title: '提示',
				content: '确定退出登录吗？',
				success(res) {
					if (res.confirm) {
						http.setToken('')
						uni.removeStorageSync('mint_user')
						uni.showToast({ title: '已退出登录', icon: 'success' })
					}
				}
			})
		}
	}
}
</script>

<style>
.head {
	background: linear-gradient(160deg, #2BB673, #1E9E60);
	padding: 44rpx 36rpx 34rpx;
	color: #ffffff;
}

.head-row {
	display: flex;
	align-items: center;
}

.avatar {
	width: 110rpx;
	height: 110rpx;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.25);
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 44rpx;
	font-weight: 600;
	margin-right: 26rpx;
	flex-shrink: 0;
}

.nickname {
	font-size: 38rpx;
	font-weight: 700;
}

.username {
	font-size: 24rpx;
	opacity: 0.85;
	margin-top: 8rpx;
}

.body-row {
	display: flex;
	margin-top: 30rpx;
}

.body-item {
	flex: 1;
	background: rgba(255, 255, 255, 0.14);
	border-radius: 16rpx;
	padding: 18rpx 0;
	text-align: center;
	margin-right: 20rpx;
}

.body-item:last-child {
	margin-right: 0;
}

.body-val {
	display: block;
	font-size: 32rpx;
	font-weight: 700;
}

.body-key {
	font-size: 22rpx;
	opacity: 0.85;
}

.stats-row {
	display: flex;
	text-align: center;
}

.stats-item {
	flex: 1;
}

.menu-card {
	padding: 10rpx 28rpx;
}

.menu-item {
	display: flex;
	align-items: center;
	padding: 26rpx 0;
	border-bottom: 1rpx solid #F0F3F1;
}

.menu-item:last-child {
	border-bottom: none;
}

.menu-ico {
	width: 64rpx;
	height: 64rpx;
	border-radius: 18rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 28rpx;
	font-weight: 600;
	margin-right: 22rpx;
	flex-shrink: 0;
}

.menu-name {
	flex: 1;
	font-size: 30rpx;
	color: #333333;
}

.menu-arrow {
	color: #C5CCC7;
	font-size: 28rpx;
}
</style>
