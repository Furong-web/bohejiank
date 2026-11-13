<template>
	<view class="page">
		<view class="search-bar">
			<input class="search-input" v-model="keyword" placeholder="搜索感兴趣的减脂知识"
				placeholder-class="ph" confirm-type="search" @confirm="reload" />
			<button class="search-btn" @click="reload">搜索</button>
		</view>

		<view class="chips">
			<view class="chip" :class="{ active: category === '' }" @click="pickCategory('')">全部</view>
			<view class="chip" :class="{ active: category === c }" v-for="c in categories" :key="c"
				@click="pickCategory(c)">{{ c }}</view>
		</view>

		<view class="card list-card">
			<view class="art-item" v-for="a in list" :key="a.id" @click="goDetail(a.id)">
				<view class="art-cover" :style="{ background: coverBg(a.category) }">{{ a.category.slice(0, 1) }}</view>
				<view class="art-info">
					<view class="art-title">{{ a.title }}</view>
					<view class="art-summary">{{ a.summary }}</view>
					<view class="art-meta">
						<text>{{ a.category }}</text>
						<text>{{ a.views }} 阅读</text>
						<text>{{ shortDate(a.created_at) }}</text>
					</view>
				</view>
			</view>

			<view v-if="!list.length && !loading" class="empty">暂无文章</view>
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
			category: '',
			categories: ['饮食', '运动', '科普', '心态'],
			list: [],
			total: 0,
			page: 1,
			pageSize: 10,
			loading: false,
			finished: false
		}
	},
	onShow() {
		if (!this.list.length) this.reload()
	},
	onPullDownRefresh() {
		this.reload()
		uni.stopPullDownRefresh()
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
		loadMore() {
			if (this.loading || this.finished) return
			this.page++
			this.load()
		},
		load() {
			const that = this
			this.loading = true
			http.get('/api/articles', {
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
		pickCategory(c) {
			this.category = c
			this.reload()
		},
		goDetail(id) {
			uni.navigateTo({ url: '/pages/knowledge/detail?id=' + id })
		},
		coverBg(cat) {
			const map = { '饮食': '#E3F6EC', '运动': '#FFF1E0', '科普': '#E8F1FD', '心态': '#F1E8FD' }
			return map[cat] || '#F5F7F6'
		},
		shortDate(d) {
			return d ? String(d).slice(0, 10) : ''
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

.art-item {
	display: flex;
	padding: 28rpx 0;
	border-bottom: 1rpx solid #F0F3F1;
}

.art-item:last-child {
	border-bottom: none;
}

.art-cover {
	width: 110rpx;
	height: 110rpx;
	border-radius: 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 44rpx;
	font-weight: 700;
	color: #2BB673;
	flex-shrink: 0;
	margin-right: 24rpx;
}

.art-info {
	flex: 1;
	min-width: 0;
}

.art-title {
	font-size: 30rpx;
	font-weight: 600;
	color: #333333;
}

.art-summary {
	font-size: 24rpx;
	color: #8A948D;
	margin-top: 8rpx;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
}

.art-meta {
	display: flex;
	gap: 24rpx;
	font-size: 20rpx;
	color: #9AA79F;
	margin-top: 10rpx;
}

.ph {
	color: #B8C0BA;
}
</style>
