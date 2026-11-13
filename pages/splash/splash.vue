<template>
	<view class="splash">
		<view class="logo">薄</view>
		<view class="name">薄荷健康</view>
		<view class="slogan">科学减脂 · 轻盈生活</view>

		<view class="features">
			<view class="f-item" v-for="f in features" :key="f.name">
				<view class="f-ico" :style="{ background: f.bg }">{{ f.char }}</view>
				<view class="f-text">
					<view class="f-name">{{ f.name }}</view>
					<view class="f-desc">{{ f.desc }}</view>
				</view>
			</view>
		</view>

		<view class="bottom">
			<button class="enter-btn" @click="enter">立即进入（{{ seconds }}s）</button>
			<view class="tips">面向减肥人群的一站式健康减脂助手</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			seconds: 3,
			timer: null,
			features: [
				{ char: '查', name: '热量查询', desc: '48 种常见食物热量速查', bg: 'rgba(255,255,255,0.18)' },
				{ char: '测', name: 'BMI 自测', desc: 'BMI / 基础代谢 / 每日消耗', bg: 'rgba(255,255,255,0.18)' },
				{ char: '记', name: '每日打卡', desc: '体重·饮食·运动全程记录', bg: 'rgba(255,255,255,0.18)' },
				{ char: '知', name: '减肥知识库', desc: '科学减脂知识持续更新', bg: 'rgba(255,255,255,0.18)' }
			]
		}
	},
	onLoad() {
		const that = this
		this.timer = setInterval(function () {
			that.seconds--
			if (that.seconds <= 0) that.enter()
		}, 1000)
	},
	onUnload() {
		if (this.timer) clearInterval(this.timer)
	},
	methods: {
		enter() {
			if (this.timer) clearInterval(this.timer)
			const token = uni.getStorageSync('mint_token')
			if (token) {
				uni.switchTab({ url: '/pages/home/home' })
			} else {
				uni.reLaunch({ url: '/pages/login/login' })
			}
		}
	}
}
</script>

<style>
.splash {
	min-height: 100vh;
	background: linear-gradient(160deg, #2BB673 0%, #1E9E60 55%, #128A52 100%);
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 120rpx 60rpx 60rpx;
}

.logo {
	width: 160rpx;
	height: 160rpx;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.95);
	color: #2BB673;
	font-size: 80rpx;
	font-weight: 700;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.12);
}

.name {
	color: #ffffff;
	font-size: 52rpx;
	font-weight: 700;
	margin-top: 36rpx;
	letter-spacing: 6rpx;
}

.slogan {
	color: rgba(255, 255, 255, 0.85);
	font-size: 28rpx;
	margin-top: 12rpx;
	letter-spacing: 2rpx;
}

.features {
	width: 100%;
	margin-top: 80rpx;
}

.f-item {
	display: flex;
	align-items: center;
	background: rgba(255, 255, 255, 0.1);
	border-radius: 20rpx;
	padding: 24rpx 28rpx;
	margin-bottom: 22rpx;
}

.f-ico {
	width: 84rpx;
	height: 84rpx;
	border-radius: 24rpx;
	color: #ffffff;
	font-size: 36rpx;
	font-weight: 600;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 24rpx;
	flex-shrink: 0;
}

.f-name {
	color: #ffffff;
	font-size: 30rpx;
	font-weight: 600;
}

.f-desc {
	color: rgba(255, 255, 255, 0.72);
	font-size: 24rpx;
	margin-top: 4rpx;
}

.bottom {
	margin-top: auto;
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-top: 60rpx;
}

.enter-btn {
	width: 100%;
	background: #ffffff;
	color: #1E9E60;
	border-radius: 48rpx;
	font-size: 32rpx;
	font-weight: 600;
}

.enter-btn::after {
	border: none;
}

.tips {
	color: rgba(255, 255, 255, 0.6);
	font-size: 22rpx;
	margin-top: 24rpx;
}
</style>
