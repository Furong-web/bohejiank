<template>
	<view class="page">
		<view class="card">
			<view class="form-item">
				<text class="form-label">原密码</text>
				<input class="form-input" v-model="form.oldPassword" password placeholder="请输入原密码" />
			</view>
			<view class="form-item">
				<text class="form-label">新密码（6-20 位）</text>
				<input class="form-input" v-model="form.newPassword" password placeholder="请输入新密码" />
			</view>
			<view class="form-item">
				<text class="form-label">确认新密码</text>
				<input class="form-input" v-model="form.confirm" password placeholder="请再次输入新密码" />
			</view>
			<button class="btn-primary submit" :loading="loading" @click="submit">确认修改</button>
		</view>

		<view class="tips">密码使用 bcrypt 加密存储于服务端，修改后需重新登录。</view>
	</view>
</template>

<script>
import http from '@/utils/request'

export default {
	data() {
		return {
			loading: false,
			form: { oldPassword: '', newPassword: '', confirm: '' }
		}
	},
	methods: {
		submit() {
			const f = this.form
			if (!f.oldPassword || !f.newPassword) {
				uni.showToast({ title: '请填写完整', icon: 'none' })
				return
			}
			if (f.newPassword.length < 6) {
				uni.showToast({ title: '新密码至少 6 位', icon: 'none' })
				return
			}
			if (f.newPassword !== f.confirm) {
				uni.showToast({ title: '两次输入的新密码不一致', icon: 'none' })
				return
			}
			const that = this
			this.loading = true
			http.put('/api/user/password', {
				oldPassword: f.oldPassword,
				newPassword: f.newPassword
			}).then(function () {
				uni.showModal({
					title: '修改成功',
					content: '请使用新密码重新登录',
					showCancel: false,
					success() {
						http.setToken('')
						uni.removeStorageSync('mint_user')
						uni.reLaunch({ url: '/pages/login/login' })
					}
				})
			}).catch(function () {
			}).then(function () {
				that.loading = false
			})
		}
	}
}
</script>

<style>
.page {
	padding: 20rpx 0 40rpx;
}

.submit {
	margin-top: 20rpx;
}

.tips {
	text-align: center;
	color: #9AA79F;
	font-size: 24rpx;
	margin-top: 30rpx;
	padding: 0 40rpx;
}
</style>
