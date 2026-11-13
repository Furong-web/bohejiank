<template>
	<view class="page">
		<view class="search-bar">
			<input class="search-input" v-model="keyword" placeholder="搜索运动，如：跑步 / 跳绳 / 瑜伽"
				placeholder-class="ph" confirm-type="search" @confirm="reload" />
			<button class="search-btn" @click="reload">搜索</button>
		</view>

		<view class="chips">
			<view class="chip" :class="{ active: category === '' }" @click="pickCategory('')">全部</view>
			<view class="chip" :class="{ active: category === c }" v-for="c in categories" :key="c"
				@click="pickCategory(c)">{{ c }}</view>
		</view>

		<view class="card list-card">
			<view class="ex-item" v-for="e in list" :key="e.id" @click="select(e)">
				<view class="ex-ico" :style="{ background: catBg(e.category) }">{{ e.category.slice(0, 1) }}</view>
				<view class="ex-info">
					<view class="ex-name">{{ e.name }}</view>
					<view class="ex-desc">{{ e.description }}</view>
				</view>
				<view class="ex-met">
					<text class="ex-met-num">{{ e.met }}</text>
					<text class="ex-met-unit">MET</text>
				</view>
			</view>
			<view v-if="!list.length && !loading" class="empty">没有找到相关运动</view>
			<view v-if="loading" class="load-tip">加载中...</view>
			<view v-else-if="list.length && finished" class="load-tip">没有更多了</view>
		</view>

		<!-- 选中运动的消耗计算面板 -->
		<view class="panel" v-if="selected">
			<view class="panel-title">
				{{ selected.name }}
				<view class="panel-close" @click="selected = null">×</view>
			</view>
			<view class="form-row">
				<view class="form-item half">
					<text class="form-label">运动时长（分钟）</text>
					<input class="form-input" type="number" v-model="minutes" placeholder="如 30" />
				</view>
				<view class="form-item half">
					<text class="form-label">体重 (kg)</text>
					<input class="form-input" type="digit" v-model="weight" placeholder="如 60" />
				</view>
			</view>
			<view class="kcal-result">
				预计消耗 <text class="kcal-num">{{ kcal }}</text> 千卡
			</view>
			<button class="btn-primary" @click="record">记录这次消耗</button>
		</view>
	</view>
</template>

<script>
import http from '@/utils/request'
import { exerciseKcal } from '@/utils/util'

export default {
	data() {
		return {
			keyword: '',
			category: '',
			categories: ['有氧', '力量', '球类', '柔韧'],
			list: [],
			total: 0,
			page: 1,
			pageSize: 20,
			loading: false,
			finished: false,
			selected: null,
			minutes: '30',
			weight: '60'
		}
	},
	computed: {
		kcal() {
			if (!this.selected) return 0
			return exerciseKcal(this.selected.met, Number(this.weight), Number(this.minutes))
		}
	},
	onLoad() {
		const user = uni.getStorageSync('mint_user')
		if (user && user.weight) this.weight = String(user.weight)
		this.reload()
	},
	onReachBottom() {
		this.loadMore()
	},
	methods: {
		reload() {
			this.page = 1
			this.list = []
			this.finished = false
			this.load()
		},
		load() {
			const that = this
			this.loading = true
			http.get('/api/exercises', {
				keyword: this.keyword.trim(),
				category: this.category,
				page: this.page,
				pageSize: this.pageSize
			}).then(function (res) {
				that.total = res.total
				that.list = that.list.concat(res.list || [])
				that.finished = that.list.length >= res.total
			}).catch(function () {
			}).then(function () {
				that.loading = false
			})
		},
		loadMore() {
			if (this.loading || this.finished) return
			this.page++
			this.load()
		},
		pickCategory(c) {
			this.category = c
			this.reload()
		},
		select(e) {
			this.selected = e
		},
		catBg(cat) {
			const map = { '有氧': '#E3F6EC', '力量': '#FFF1E0', '球类': '#E8F1FD', '柔韧': '#F1E8FD' }
			return map[cat] || '#F5F7F6'
		},
		record() {
			if (!Number(this.minutes)) {
				uni.showToast({ title: '请输入运动时长', icon: 'none' })
				return
			}
			const kcal = this.kcal
			http.post('/api/checkins', { addBurn: kcal }).then(function () {
				uni.showToast({ title: '已记录 ' + kcal + ' 千卡', icon: 'success' })
			})
		}
	}
}
</script>

<style>
.page {
	padding: 20rpx 0 300rpx;
}

.search-bar {
	display: flex;
	align-items: center;
	margin: 0 24rpx 20rpx;
}

.search-input {
	flex: 1;
	background: #ffffff;
	border-radius: 40rpx;
	padding: 18rpx 30rpx;
	font-size: 28rpx;
}

.search-btn {
	margin-left: 16rpx;
	background: #2BB673;
	color: #ffffff;
	font-size: 26rpx;
	border-radius: 40rpx;
	padding: 0 32rpx;
	line-height: 2.6;
}

.search-btn::after {
	border: none;
}

.list-card {
	padding: 10rpx 28rpx;
}

.ex-item {
	display: flex;
	align-items: center;
	padding: 26rpx 0;
	border-bottom: 1rpx solid #F0F3F1;
}

.ex-item:last-child {
	border-bottom: none;
}

.ex-ico {
	width: 80rpx;
	height: 80rpx;
	border-radius: 22rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 32rpx;
	color: #2BB673;
	font-weight: 600;
	margin-right: 22rpx;
	flex-shrink: 0;
}

.ex-info {
	flex: 1;
}

.ex-name {
	font-size: 30rpx;
	font-weight: 600;
}

.ex-desc {
	font-size: 22rpx;
	color: #9AA79F;
	margin-top: 6rpx;
}

.ex-met {
	text-align: right;
	flex-shrink: 0;
}

.ex-met-num {
	font-size: 36rpx;
	font-weight: 700;
	color: #2BB673;
}

.ex-met-unit {
	display: block;
	font-size: 20rpx;
	color: #9AA79F;
}

.panel {
	position: fixed;
	left: 24rpx;
	right: 24rpx;
	bottom: 24rpx;
	background: #ffffff;
	border-radius: 24rpx;
	padding: 30rpx;
	box-shadow: 0 -6rpx 40rpx rgba(0, 0, 0, 0.1);
}

.panel-title {
	font-size: 32rpx;
	font-weight: 700;
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 24rpx;
}

.panel-close {
	font-size: 44rpx;
	color: #9AA79F;
	line-height: 1;
}

.form-row {
	display: flex;
	justify-content: space-between;
}

.half {
	width: 48%;
}

.kcal-result {
	text-align: center;
	font-size: 28rpx;
	color: #555555;
	margin: 10rpx 0 26rpx;
}

.kcal-num {
	font-size: 52rpx;
	font-weight: 700;
	color: #FF9F43;
	margin: 0 8rpx;
}

.ph {
	color: #B8C0BA;
}
</style>
