<script>
export default {
	onLaunch() {
		console.log('薄荷健康小程序启动')
	}
}
</script>

<style>
/* ================= 全局基础样式（薄荷主题） ================= */
page {
	background: #F5F7F6;
	color: #333333;
	font-size: 28rpx;
	line-height: 1.6;
}

view, text, input, textarea, button {
	box-sizing: border-box;
}

/* 卡片 */
.card {
	background: #ffffff;
	border-radius: 20rpx;
	margin: 20rpx 24rpx;
	padding: 28rpx;
	box-shadow: 0 4rpx 16rpx rgba(43, 182, 115, 0.06);
}

/* 区块标题 */
.section-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #333333;
	margin-bottom: 20rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
}
.section-title .more {
	font-size: 24rpx;
	font-weight: 400;
	color: #8A948D;
}

/* 主按钮 */
.btn-primary {
	background: #2BB673;
	color: #ffffff;
	border-radius: 44rpx;
	font-size: 30rpx;
	font-weight: 500;
}
.btn-primary::after {
	border: none;
}
.btn-primary[disabled] {
	background: #9FD8BC;
	color: #ffffff;
}

/* 幽灵按钮 */
.btn-ghost {
	background: rgba(255, 255, 255, 0.2);
	color: #ffffff;
	border-radius: 44rpx;
	font-size: 28rpx;
}
.btn-ghost::after {
	border: none;
}

/* 表单 */
.form-item {
	margin-bottom: 26rpx;
}
.form-label {
	font-size: 26rpx;
	color: #666666;
	margin-bottom: 10rpx;
	display: block;
}
.form-input {
	background: #F5F7F6;
	border-radius: 14rpx;
	padding: 20rpx 24rpx;
	font-size: 28rpx;
	height: 84rpx;
	line-height: 44rpx;
	width: 100%;
	box-sizing: border-box;
}
.form-textarea {
	background: #F5F7F6;
	border-radius: 14rpx;
	padding: 20rpx 24rpx;
	font-size: 28rpx;
	width: 100%;
	min-height: 140rpx;
}

/* 标签 */
.tag {
	font-size: 20rpx;
	color: #2BB673;
	background: rgba(43, 182, 115, 0.1);
	border-radius: 8rpx;
	padding: 4rpx 12rpx;
	margin-right: 12rpx;
}

/* 分类筛选 chips */
.chips {
	display: flex;
	flex-wrap: wrap;
	gap: 14rpx;
	margin-bottom: 24rpx;
}
.chip {
	font-size: 24rpx;
	color: #666666;
	background: #F5F7F6;
	border-radius: 26rpx;
	padding: 8rpx 26rpx;
}
.chip.active {
	color: #ffffff;
	background: #2BB673;
}

/* 空状态 */
.empty {
	text-align: center;
	color: #9AA79F;
	padding: 70rpx 0;
	font-size: 26rpx;
}

/* 加载提示 */
.load-tip {
	text-align: center;
	color: #9AA79F;
	font-size: 24rpx;
	padding: 20rpx 0 30rpx;
}

/* 数字键值 */
.stat-num {
	font-size: 40rpx;
	font-weight: 700;
	color: #2BB673;
}
.stat-label {
	font-size: 22rpx;
	color: #8A948D;
}
</style>
