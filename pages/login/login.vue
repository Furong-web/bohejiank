<template>
	<view class="page">
		<view class="head">
			<view class="head-logo">薄</view>
			<view class="head-title">欢迎回来</view>
			<view class="head-sub">登录薄荷健康，继续你的减脂计划</view>
		</view>

		<view class="card">
			<view class="form-item">
				<text class="form-label">用户名</text>
				<input class="form-input" :value="form.username" @input="onInput('username', $event)"
					placeholder="请输入用户名" placeholder-class="ph" confirm-type="next" />
			</view>
			<view class="form-item">
				<text class="form-label">密码</text>
				<input class="form-input" :value="form.password" @input="onInput('password', $event)"
					password placeholder="请输入密码" placeholder-class="ph" confirm-type="done" @confirm="submit" />
			</view>
			<button class="btn-primary submit" :loading="loading" @click="submit">登 录</button>

			<view class="links">
				<text class="link" @click="goRegister">没有账号？去注册</text>
				<text class="link" @click="browse">先随便逛逛</text>
			</view>
		</view>

		<view class="demo-tip">演示账号：demo / 123456</view>
	</view>
</template>

<script>
import http from '@/utils/request'

export default {
	data() {
		return {
			loading: false,
			form: { username: '', password: '' }
		}
	},
	methods: {
		onInput(key, e) {
			this.form[key] = e.detail.value
		},
		submit() {
			if (!this.form.username || !this.form.password) {
				uni.showToast({ title: '请输入用户名和密码', icon: 'none' })
				return
			}
			const that = this
			this.loading = true
			http.post('/api/auth/login', this.form).then(function (res) {
				http.setToken(res.token)
				uni.setStorageSync('mint_user', res.user)
				uni.showToast({ title: '登录成功', icon: 'success' })
				setTimeout(function () {
					uni.switchTab({ url: '/pages/home/home' })
				}, 600)
			}).catch(function () {
			}).then(function () {
				that.loading = false
			})
		},
		goRegister() {
			uni.navigateTo({ url: '/pages/register/register' })
		},
		browse() {
			uni.switchTab({ url: '/pages/knowledge/knowledge' })
		}
	}
}
</script>

<style>
.page {
	padding-top: 80rpx;
}

.head {
	text-align: center;
	margin-bottom: 50rpx;
}

.head-logo {
	width: 120rpx;
	height: 120rpx;
	margin: 0 auto;
	border-radius: 36rpx;
	background: linear-gradient(160deg, #2BB673, #1E9E60);
	color: #ffffff;
	font-size: 60rpx;
	font-weight: 700;
	display: flex;
	align-items: center;
	justify-content: center;
}

.head-title {
	font-size: 40rpx;
	font-weight: 700;
	margin-top: 28rpx;
}

.head-sub {
	font-size: 26rpx;
	color: #8A948D;
	margin-top: 10rpx;
}

.submit {
	margin-top: 16rpx;
}

.links {
	display: flex;
	justify-content: space-between;
	margin-top: 30rpx;
}

.link {
	font-size: 26rpx;
	color: #2BB673;
}

.ph {
	color: #B8C0BA;
}

.demo-tip {
	text-align: center;
	color: #9AA79F;
	font-size: 24rpx;
	margin-top: 40rpx;
}
</style>
