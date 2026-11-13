<template>
	<view class="page">
		<view class="card list-card">
			<view class="fav-item" v-for="a in list" :key="a.id">
				<view class="fav-body" @click="goDetail(a.article_id)">
					<view class="fav-title">{{ a.title }}</view>
					<view class="fav-summary">{{ a.summary }}</view>
					<view class="fav-meta">{{ a.category }} · 收藏于 {{ shortDate(a.favorited_at) }}</view>
				</view>
				<view class="fav-remove" @click="remove(a)">取消收藏</view>
			</view>

			<view v-if="!list.length && !loading" class="empty">还没有收藏，去知识库看看吧</view>
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
			list: [],
			total: 0,
			page: 1,
			pageSize: 10,
			loading: false,
			finished: false
		}
	},
	onShow() {
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
		loadMore() {
			if (this.loading || this.finished) return
			this.page++
			this.load()
		},
		load() {
			const that = this
			this.loading = true
			http.get('/api/user/favorites', { page: this.page, pageSize: this.pageSize }).then(function (res) {
				that.total = res.total
				that.list = that.list.concat(res.list || [])
				that.finished = that.list.length >= res.total
			}).catch(function () {
			}).then(function () {
				that.loading = false
			})
		},
		goDetail(id) {
			uni.navigateTo({ url: '/pages/knowledge/detail?id=' + id })
		},
		remove(a) {
			const that = this
			http.post('/api/articles/' + a.article_id + '/favorite').then(function () {
				that.list = that.list.filter(function (x) { return x.id !== a.id })
			})
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

.list-card {
	padding: 10rpx 28rpx;
}

.fav-item {
	display: flex;
	align-items: center;
	padding: 28rpx 0;
	border-bottom: 1rpx solid #F0F3F1;
}

.fav-item:last-child {
	border-bottom: none;
}

.fav-body {
	flex: 1;
	min-width: 0;
}

.fav-title {
	font-size: 30rpx;
	font-weight: 600;
}

.fav-summary {
	font-size: 24rpx;
	color: #8A948D;
	margin-top: 8rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.fav-meta {
	font-size: 20rpx;
	color: #9AA79F;
	margin-top: 10rpx;
}

.fav-remove {
	font-size: 22rpx;
	color: #FF9F43;
	background: rgba(255, 159, 67, 0.1);
	border-radius: 10rpx;
	padding: 10rpx 18rpx;
	flex-shrink: 0;
	margin-left: 20rpx;
}
</style>
