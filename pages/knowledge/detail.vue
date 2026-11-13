<template>
	<view class="page" v-if="article">
		<view class="head">
			<view class="head-cat" :style="{ color: catColor, background: catBg }">{{ article.category }}</view>
			<view class="head-title">{{ article.title }}</view>
			<view class="head-meta">{{ dateStr }} · {{ article.views }} 阅读</view>
		</view>

		<view class="card">
			<view class="para" v-for="(p, i) in paragraphs" :key="i">{{ p }}</view>
		</view>

		<view class="footer-safe"></view>

		<view class="footer">
			<button class="fav-btn" :class="{ active: article.isFavorite }" @click="toggleFav">
				{{ article.isFavorite ? '已收藏' : '收藏本文' }}
			</button>
			<button class="share-btn" open-type="share">分享给好友</button>
		</view>
	</view>
</template>

<script>
import http from '@/utils/request'
import { categoryColor } from '@/utils/util'

export default {
	data() {
		return {
			id: 0,
			article: null
		}
	},
	computed: {
		paragraphs() {
			if (!this.article || !this.article.content) return []
			return this.article.content.split('\n').map(function (s) { return s.trim() }).filter(function (s) { return s })
		},
		catColor() { return categoryColor(this.article ? this.article.category : '') },
		catBg() {
			const c = categoryColor(this.article ? this.article.category : '')
			return c + '1A'
		},
		dateStr() {
			return this.article && this.article.created_at ? String(this.article.created_at).slice(0, 10) : ''
		}
	},
	onLoad(opt) {
		this.id = Number(opt.id) || 0
		this.load()
	},
	onShareAppMessage() {
		return {
			title: this.article ? this.article.title : '薄荷健康',
			path: '/pages/knowledge/detail?id=' + this.id
		}
	},
	methods: {
		load() {
			const that = this
			http.get('/api/articles/' + this.id).then(function (a) {
				that.article = a
			})
		},
		toggleFav() {
			const that = this
			http.post('/api/articles/' + this.id + '/favorite').then(function (res) {
				that.article.isFavorite = res.favorited
			})
		}
	}
}
</script>

<style>
.head {
	background: #ffffff;
	padding: 40rpx 32rpx 30rpx;
}

.head-cat {
	display: inline-block;
	font-size: 22rpx;
	border-radius: 8rpx;
	padding: 4rpx 14rpx;
	margin-bottom: 16rpx;
}

.head-title {
	font-size: 40rpx;
	font-weight: 700;
	line-height: 1.4;
}

.head-meta {
	font-size: 22rpx;
	color: #9AA79F;
	margin-top: 16rpx;
}

.para {
	font-size: 30rpx;
	color: #444444;
	line-height: 1.9;
	margin-bottom: 28rpx;
	text-align: justify;
}

.para:last-child {
	margin-bottom: 0;
}

.footer-safe {
	height: 140rpx;
}

.footer {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	background: #ffffff;
	padding: 20rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
	display: flex;
	box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.04);
}

.fav-btn {
	flex: 1;
	background: rgba(43, 182, 115, 0.1);
	color: #2BB673;
	font-size: 28rpx;
	border-radius: 40rpx;
	margin-right: 20rpx;
}

.fav-btn::after {
	border: none;
}

.fav-btn.active {
	background: #2BB673;
	color: #ffffff;
}

.share-btn {
	flex: 1;
	background: #F5F7F6;
	color: #555555;
	font-size: 28rpx;
	border-radius: 40rpx;
}

.share-btn::after {
	border: none;
}
</style>
