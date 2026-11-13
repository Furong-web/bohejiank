<template>
	<view class="page">
		<view class="search-bar">
			<input class="search-input" :value="keyword" placeholder="搜食物，如：米饭 / 苹果 / 奶茶"
				placeholder-class="ph" confirm-type="search" @input="onInput" @confirm="reload" />
			<button class="search-btn" @click="reload">搜索</button>
		</view>

		<view class="ai-entry" @click="goAi">
			<text class="ai-entry-text">算不准？</text>
			<text class="ai-entry-link">一句话问 AI ›</text>
		</view>

		<view class="card list-card">
			<view class="food-item" v-for="f in list" :key="f.id" @click="goDetail(f.id)">
				<view class="food-name">{{ f.name }}</view>
				<view class="food-cal">
					<text class="food-cal-num">{{ f.calories }}</text>
					<text class="food-cal-unit">千卡/100g</text>
				</view>
			</view>

			<view v-if="!list.length && !loading" class="empty">没有找到相关食物</view>
			<view v-if="loading" class="load-tip">加载中...</view>
			<view v-else-if="list.length && finished" class="load-tip">没有更多了</view>
		</view>
	</view>
</template>

<script>
import http from '@/utils/request'

export default {
	data() {
		return {
			keyword: '',
			list: [],
			total: 0,
			page: 1,
			pageSize: 15,
			loading: false,
			finished: false
		}
	},
	onLoad() {
		this.reload()
	},
	onReachBottom() {
		this.loadMore()
	},
	methods: {
		onInput(e) {
			this.keyword = e && e.detail ? e.detail.value : e
		},
		reload() {
			this.page = 1
			this.list = []
			this.finished = false
			this.load()
		},
		loadMore() {
			if (this.loading || this.finished) return
			this.page++
			this.load()
		},
		load() {
			const that = this
			this.loading = true
			http.get('/api/foods', {
				keyword: this.keyword.trim(),
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
		goDetail(id) {
			uni.navigateTo({ url: '/pages/food/detail?id=' + id })
		},
		goAi() {
			const kw = this.keyword.trim()
			const url = kw ? ('/pages/food/ai?q=' + encodeURIComponent(kw)) : '/pages/food/ai'
			uni.navigateTo({ url })
		}
	}
}
</script>

<style>
.page {
	padding: 20rpx 0 30rpx;
}

.search-bar {
	display: flex;
	align-items: center;
	margin: 0 24rpx 16rpx;
}

.search-input {
	flex: 1;
	background: #ffffff;
	border-radius: 40rpx;
	padding: 18rpx 30rpx;
	font-size: 28rpx;
	height: 76rpx;
	box-sizing: border-box;
}

/* H5 下 uni-input 内部真实输入框默认高度塌陷，强制撑满 */
.search-input .uni-input-input,
.search-input /deep/ input {
	height: 100% !important;
	font-size: 28rpx !important;
	line-height: normal !important;
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

.ai-entry {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin: 0 24rpx 20rpx;
	background: #EAF6EF;
	border-radius: 16rpx;
	padding: 18rpx 28rpx;
}

.ai-entry-text {
	font-size: 24rpx;
	color: #5A655E;
}

.ai-entry-link {
	font-size: 26rpx;
	color: #2BB673;
	font-weight: 600;
}

.list-card {
	margin: 0 24rpx;
	padding: 10rpx 28rpx;
}

.food-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 28rpx 0;
	border-bottom: 1rpx solid #F0F3F1;
}

.food-item:last-child {
	border-bottom: none;
}

.food-name {
	font-size: 30rpx;
	font-weight: 600;
	color: #333333;
}

.food-cal {
	text-align: right;
	flex-shrink: 0;
}

.food-cal-num {
	font-size: 36rpx;
	font-weight: 700;
	color: #FF9F43;
}

.food-cal-unit {
	display: block;
	font-size: 20rpx;
	color: #9AA79F;
	margin-top: 4rpx;
}

.empty {
	text-align: center;
	color: #9AA79F;
	font-size: 26rpx;
	padding: 60rpx 0;
}

.load-tip {
	text-align: center;
	color: #B8C0BA;
	font-size: 24rpx;
	padding: 20rpx 0;
}

.ph {
	color: #B8C0BA;
}
</style>
