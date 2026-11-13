<template>
	<view class="page">
		<view class="head">
			<view class="head-title">创建账号</view>
			<view class="head-sub">注册即代表你同意健康数据仅用于自身记录</view>
		</view>

		<view class="card">
			<view class="form-item">
				<text class="form-label">用户名（2-20 位字母、数字、下划线或中文）</text>
				<input class="form-input" v-model="form.username" placeholder="请输入用户名" placeholder-class="ph" />
			</view>
			<view class="form-item">
				<text class="form-label">昵称（选填）</text>
				<input class="form-input" v-model="form.nickname" placeholder="给自己起个可爱的名字" placeholder-class="ph" />
			</view>
			<view class="form-item">
				<text class="form-label">密码（6-20 位）</text>
				<input class="form-input" v-model="form.password" password placeholder="请输入密码" placeholder-class="ph" />
			</view>
			<view class="form-item">
				<text class="form-label">确认密码</text>
				<input class="form-input" v-model="form.confirm" password placeholder="请再次输入密码" placeholder-class="ph" />
			</view>
			<button class="btn-primary submit" :loading="loading" @click="submit">注 册</button>
			<view class="links">
				<text class="link" @click="goLogin">已有账号？去登录</text>
			</view>
		</view>
	</view>
</template>

<script>
import http from '@/utils/request'

export default {
	data() {
		return {
			loading: false,
			form: { username: '', nickname: '', password: '', confirm: '' }
		}
	},
	methods: {
		submit() {
			const f = this.form
			if (!f.username || f.username.length < 2) {
				uni.showToast({ title: '用户名至少 2 位', icon: 'none' })
				return
			}
			if (!f.password || f.password.length < 6) {
				uni.showToast({ title: '密码至少 6 位', icon: 'none' })
				return
			}
			if (f.password !== f.confirm) {
				uni.showToast({ title: '两次输入的密码不一致', icon: 'none' })
				return
			}
			const that = this
			this.loading = true
			http.post('/api/auth/register', {
				username: f.username,
				password: f.password,
				nickname: f.nickname
			}).then(function (res) {
				http.setToken(res.token)
				uni.setStorageSync('mint_user', res.user)
				uni.showToast({ title: '注册成功', icon: 'success' })
				setTimeout(function () {
					uni.switchTab({ url: '/pages/home/home' })
				}, 600)
			}).catch(function () {
			}).then(function () {
				that.loading = false
			})
		},
		goLogin() {
			uni.navigateBack()
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

.head-title {
	font-size: 40rpx;
	font-weight: 700;
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
	text-align: center;
	margin-top: 30rpx;
}

.link {
	font-size: 26rpx;
	color: #2BB673;
}

.ph {
	color: #B8C0BA;
}
</style>
