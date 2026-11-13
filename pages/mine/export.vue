<template>
	<view class="page">
		<view class="card">
			<view class="section-title">导出我的打卡数据</view>
			<view class="desc">将打卡记录（日期、体重、摄入、消耗、备注）导出为 CSV 文件，可用 Excel 或 WPS 打开查看。</view>

			<view class="info-row" v-if="info">
				<text>共 <text class="info-num">{{ info.count }}</text> 条记录</text>
			</view>

			<button class="btn-primary action" :loading="loading" @click="exportAndShare">导出 CSV 并分享</button>
			<button class="copy-btn" @click="copyContent">复制内容到剪贴板</button>
		</view>

		<view class="card" v-if="info">
			<view class="section-title">数据预览</view>
			<scroll-view scroll-y class="preview">
				<view class="preview-line" v-for="(l, i) in previewLines" :key="i">{{ l }}</view>
			</scroll-view>
		</view>
	</view>
</template>

<script>
import http from '@/utils/request'

export default {
	data() {
		return {
			loading: false,
			info: null
		}
	},
	computed: {
		previewLines() {
			if (!this.info) return []
			return this.info.content.replace(/^\uFEFF/, '').split('\r\n').slice(0, 8)
		}
	},
	onLoad() {
		this.load()
	},
	methods: {
		load() {
			const that = this
			http.get('/api/checkins/export').then(function (res) {
				that.info = res
			})
		},
		copyContent() {
			if (!this.info) return
			uni.setClipboardData({
				data: this.info.content,
				success() {
					uni.showToast({ title: '已复制到剪贴板', icon: 'success' })
				}
			})
		},
		exportAndShare() {
			if (!this.info) return
			const that = this
			this.loading = true
			try {
				const filePath = wx.env.USER_DATA_PATH + '/' + this.info.filename
				const fs = wx.getFileSystemManager()
				fs.writeFile({
					filePath: filePath,
					data: this.info.content,
					encoding: 'utf8',
					success() {
						wx.shareFileMessage({
							filePath: filePath,
							fileName: that.info.filename,
							success() {
								that.loading = false
							},
							fail() {
								that.loading = false
								that.copyContent()
								uni.showToast({ title: '当前环境不支持分享，已改为复制', icon: 'none' })
							}
						})
					},
					fail() {
						that.loading = false
						uni.showToast({ title: '写入文件失败', icon: 'none' })
					}
				})
			} catch (e) {
				this.loading = false
				this.copyContent()
			}
		}
	}
}
</script>

<style>
.page {
	padding: 20rpx 0 40rpx;
}

.desc {
	font-size: 26rpx;
	color: #8A948D;
	line-height: 1.8;
}

.info-row {
	margin: 24rpx 0 8rpx;
	font-size: 26rpx;
	color: #555555;
}

.info-num {
	color: #2BB673;
	font-weight: 700;
	font-size: 32rpx;
}

.action {
	margin-top: 24rpx;
}

.copy-btn {
	margin-top: 20rpx;
	background: #F5F7F6;
	color: #555555;
	font-size: 28rpx;
	border-radius: 44rpx;
}

.copy-btn::after {
	border: none;
}

.preview {
	height: 320rpx;
	background: #F5F7F6;
	border-radius: 14rpx;
	padding: 20rpx;
}

.preview-line {
	font-size: 22rpx;
	color: #666666;
	line-height: 1.9;
	font-family: monospace;
}
</style>
