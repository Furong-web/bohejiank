<template>
	<view class="page">
		<view class="card">
			<view class="form-item">
				<text class="form-label">打卡日期</text>
				<picker mode="date" :end="todayDate" :value="form.date" @change="onDateChange">
					<view class="form-input picker-value">{{ form.date }}</view>
				</picker>
			</view>

			<view class="form-item">
				<text class="form-label">今日体重 (kg)</text>
				<input class="form-input" type="digit" v-model="form.weight" placeholder="如 55.5，建议晨起空腹称量" />
			</view>

			<view class="form-item">
				<text class="form-label">饮食摄入 (千卡)</text>
				<input class="form-input" type="number" v-model="form.intake" placeholder="可在热量查询页快速累计" />
			</view>

			<view class="form-item">
				<text class="form-label">运动消耗 (千卡)</text>
				<input class="form-input" type="number" v-model="form.burn" placeholder="可在运动消耗页快速累计" />
			</view>

			<view class="form-item">
				<text class="form-label">备注</text>
				<textarea class="form-textarea" v-model="form.note" placeholder="今天的心情、三餐内容或运动情况..." />
			</view>

			<button class="btn-primary submit" :loading="loading" @click="submit">保存打卡</button>
		</view>

		<view class="tips">
			<view class="tips-title">小贴士</view>
			<view class="tips-line">· 每天固定时间称重，对比周平均值更准确</view>
			<view class="tips-line">· 摄入 = 三餐 + 零食饮料，可在热量查询中累计</view>
			<view class="tips-line">· 消耗 = 运动估算，可在运动消耗页一键记录</view>
		</view>
	</view>
</template>

<script>
import http from '@/utils/request'
import { todayStr } from '@/utils/util'

export default {
	data() {
		return {
			loading: false,
			todayDate: todayStr(),
			form: { date: todayStr(), weight: '', intake: '', burn: '', note: '' }
		}
	},
	onLoad() {
		this.loadDay(this.form.date)
	},
	methods: {
		onDateChange(e) {
			this.form.date = e.detail.value
			this.loadDay(this.form.date)
		},
		loadDay(day) {
			const that = this
			http.get('/api/checkins/bydate', { date: day }).then(function (rec) {
				if (rec) {
					that.form.weight = rec.weight != null ? String(rec.weight) : ''
					that.form.intake = rec.intake != null ? String(rec.intake) : ''
					that.form.burn = rec.burn != null ? String(rec.burn) : ''
					that.form.note = rec.note || ''
				} else {
					that.form.weight = ''
					that.form.intake = ''
					that.form.burn = ''
					that.form.note = ''
				}
			})
		},
		submit() {
			const f = this.form
			const data = { date: f.date, note: f.note }
			if (f.weight !== '') data.weight = Number(f.weight)
			if (f.intake !== '') data.intake = Number(f.intake)
			if (f.burn !== '') data.burn = Number(f.burn)
			if (data.weight == null && data.intake == null && data.burn == null && !data.note) {
				uni.showToast({ title: '请至少填写一项内容', icon: 'none' })
				return
			}
			const that = this
			this.loading = true
			http.post('/api/checkins', data).then(function () {
				uni.showToast({ title: '打卡成功', icon: 'success' })
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

.tips {
	background: #ffffff;
	border-radius: 20rpx;
	margin: 0 24rpx;
	padding: 26rpx 30rpx;
}

.tips-title {
	font-size: 26rpx;
	font-weight: 600;
	color: #2BB673;
	margin-bottom: 12rpx;
}

.tips-line {
	font-size: 24rpx;
	color: #8A948D;
	line-height: 1.9;
}
</style>
