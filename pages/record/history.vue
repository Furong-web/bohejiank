<template>
	<view class="page">
		<view class="card list-card">
			<view class="rec-item" v-for="r in list" :key="r.id">
				<view class="rec-left">
					<view class="rec-date">{{ r.date }}</view>
					<view class="rec-vals">
						<text>体重 {{ r.weight != null ? r.weight : '--' }}kg</text>
						<text class="orange">摄入 {{ r.intake }}</text>
						<text class="blue">消耗 {{ r.burn }}</text>
					</view>
					<view class="rec-note" v-if="r.note">{{ r.note }}</view>
				</view>
				<view class="rec-del" @click="del(r)">删除</view>
			</view>

			<view v-if="!list.length && !loading" class="empty">暂无打卡记录</view>
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
			http.get('/api/checkins', { page: this.page, pageSize: this.pageSize }).then(function (res) {
				that.total = res.total
				that.list = that.list.concat(res.list || [])
				that.finished = that.list.length >= res.total
			}).catch(function () {
			}).then(function () {
				that.loading = false
			})
		},
		del(r) {
			const that = this
			uni.showModal({
				title: '提示',
				content: '确定删除 ' + r.date + ' 的打卡记录吗？',
				success(res) {
					if (res.confirm) {
						http.delete('/api/checkins/' + r.id).then(function () {
							that.list = that.list.filter(function (x) { return x.id !== r.id })
						})
					}
				}
			})
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

.rec-item {
	display: flex;
	align-items: center;
	padding: 26rpx 0;
	border-bottom: 1rpx solid #F0F3F1;
}

.rec-item:last-child {
	border-bottom: none;
}

.rec-left {
	flex: 1;
}

.rec-date {
	font-size: 30rpx;
	font-weight: 600;
}

.rec-vals {
	display: flex;
	gap: 26rpx;
	font-size: 24rpx;
	color: #666666;
	margin-top: 8rpx;
}

.orange {
	color: #FF9F43;
}

.blue {
	color: #4A90E2;
}

.rec-note {
	font-size: 22rpx;
	color: #9AA79F;
	margin-top: 8rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.rec-del {
	font-size: 24rpx;
	color: #FF6B6B;
	background: rgba(255, 107, 107, 0.08);
	border-radius: 10rpx;
	padding: 10rpx 22rpx;
	flex-shrink: 0;
	margin-left: 20rpx;
}
</style>
