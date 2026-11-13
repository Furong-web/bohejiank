<template>
	<view class="page">
		<view class="card">
			<view class="form-item">
				<text class="form-label">昵称</text>
				<input class="form-input" v-model="form.nickname" placeholder="给自己起个可爱的名字" />
			</view>

			<view class="form-item">
				<text class="form-label">性别</text>
				<picker :range="genders" :value="form.gender - 1" @change="e => form.gender = Number(e.detail.value) + 1">
					<view class="form-input picker-value">{{ genders[form.gender - 1] }}</view>
				</picker>
			</view>

			<view class="form-item">
				<text class="form-label">年龄</text>
				<input class="form-input" type="number" v-model="form.age" placeholder="岁" />
			</view>

			<view class="form-item">
				<text class="form-label">身高 (cm)</text>
				<input class="form-input" type="digit" v-model="form.height" placeholder="如 165" />
			</view>

			<view class="form-item">
				<text class="form-label">当前体重 (kg)</text>
				<input class="form-input" type="digit" v-model="form.weight" placeholder="如 55.5" />
			</view>

			<view class="form-item">
				<text class="form-label">目标体重 (kg)</text>
				<input class="form-input" type="digit" v-model="form.target_weight" placeholder="如 50" />
			</view>

			<view class="form-item">
				<text class="form-label">日常活动量</text>
				<picker :range="activityLabels" :value="form.activity_level - 1" @change="e => form.activity_level = Number(e.detail.value) + 1">
					<view class="form-input picker-value">{{ activityLabels[form.activity_level - 1] }}</view>
				</picker>
			</view>

			<button class="btn-primary submit" :loading="loading" @click="save">保存资料</button>
		</view>
	</view>
</template>

<script>
import http from '@/utils/request'
import { ACTIVITIES } from '@/utils/util'

export default {
	data() {
		return {
			loading: false,
			genders: ['男', '女'],
			form: {
				nickname: '',
				gender: 1,
				age: '',
				height: '',
				weight: '',
				target_weight: '',
				activity_level: 2
			}
		}
	},
	computed: {
		activityLabels() {
			return ACTIVITIES.map(function (a) { return a.label })
		}
	},
	onLoad() {
		this.load()
	},
	methods: {
		load() {
			const that = this
			http.get('/api/auth/me').then(function (u) {
				that.form.nickname = u.nickname || ''
				that.form.gender = u.gender || 1
				that.form.age = u.age != null ? String(u.age) : ''
				that.form.height = u.height != null ? String(u.height) : ''
				that.form.weight = u.weight != null ? String(u.weight) : ''
				that.form.target_weight = u.target_weight != null ? String(u.target_weight) : ''
				that.form.activity_level = u.activity_level || 2
			})
		},
		save() {
			const f = this.form
			const data = {
				nickname: f.nickname,
				gender: f.gender,
				activity_level: f.activity_level
			}
			if (f.age !== '') data.age = Number(f.age)
			if (f.height !== '') data.height = Number(f.height)
			if (f.weight !== '') data.weight = Number(f.weight)
			if (f.target_weight !== '') data.target_weight = Number(f.target_weight)
			const that = this
			this.loading = true
			http.put('/api/user/profile', data).then(function (u) {
				uni.setStorageSync('mint_user', u)
				uni.showToast({ title: '保存成功', icon: 'success' })
				setTimeout(function () { uni.navigateBack() }, 600)
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

.picker-value {
	color: #333333;
}

.submit {
	margin-top: 20rpx;
}
</style>
