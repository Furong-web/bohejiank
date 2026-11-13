<template>
	<view class="page">
		<view class="card">
			<view class="section-title">项目简介</view>
			<view class="para">「薄荷健康」是一款面向减肥人群的一站式健康减脂小程序，采用前后端分离架构：前端基于 uni-app + Vue2，后端使用 Node.js + Express + MySQL，实现注册登录、数据持久化与用户鉴权。</view>
		</view>

		<view class="card">
			<view class="section-title">核心功能</view>
			<view class="func" v-for="f in funcs" :key="f.name">
				<view class="func-name">{{ f.name }}</view>
				<view class="func-desc">{{ f.desc }}</view>
			</view>
		</view>

		<view class="card">
			<view class="section-title">快速开始</view>
			<view class="step" v-for="(s, i) in steps" :key="i">
				<view class="step-no">{{ i + 1 }}</view>
				<view class="step-text">{{ s }}</view>
			</view>
		</view>

		<view class="card">
			<view class="section-title">注意事项</view>
			<view class="para">· 开发者工具调试：请在「详情-本地设置」勾选「不校验合法域名」。</view>
			<view class="para">· 真机预览：请将 utils/config.js 中的 BASE_URL 改为电脑局域网 IP，并保证手机与电脑在同一网络。</view>
			<view class="para">· 数据库默认连接 127.0.0.1:3306 root 空密码，请按需修改 server/config.js。</view>
		</view>

		<view class="version">薄荷健康 v1.0.0</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			funcs: [
				{ name: '热量查询', desc: '48 种常见食物热量与三大营养素速查，按克数精确计算' },
				{ name: 'BMI 自测 + 减脂工具', desc: 'BMI 分级评估、基础代谢 BMR、每日总消耗 TDEE 与达成周期估算' },
				{ name: '运动消耗', desc: '24 种运动 MET 值估算消耗，一键记录' },
				{ name: '每日打卡', desc: '体重、饮食摄入、运动消耗、备注，数据云端持久化' },
				{ name: '减肥知识库', desc: '科学减脂文章浏览、搜索、分类与收藏' },
				{ name: '数据统计与导出', desc: '体重折线图、摄入消耗柱状图、CSV 文件导出' }
			],
			steps: [
				'安装并启动 MySQL，在 server 目录执行 npm install',
				'执行 npm run init-db 初始化数据库与演示账号（demo / 123456）',
				'执行 npm start 启动后端服务（默认 3000 端口）',
				'用 HBuilderX 打开本项目根目录，运行到微信开发者工具',
				'在微信开发者工具中勾选「不校验合法域名」即可体验'
			]
		}
	}
}
</script>

<style>
.para {
	font-size: 26rpx;
	color: #666666;
	line-height: 1.9;
}

.func {
	padding: 16rpx 0;
	border-bottom: 1rpx solid #F0F3F1;
}

.func:last-child {
	border-bottom: none;
}

.func-name {
	font-size: 28rpx;
	font-weight: 600;
	color: #2BB673;
}

.func-desc {
	font-size: 24rpx;
	color: #8A948D;
	margin-top: 6rpx;
}

.step {
	display: flex;
	align-items: flex-start;
	margin-bottom: 20rpx;
}

.step-no {
	width: 40rpx;
	height: 40rpx;
	border-radius: 50%;
	background: #2BB673;
	color: #ffffff;
	font-size: 24rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 18rpx;
	flex-shrink: 0;
	margin-top: 4rpx;
}

.step-text {
	flex: 1;
	font-size: 26rpx;
	color: #555555;
	line-height: 1.7;
}

.version {
	text-align: center;
	color: #9AA79F;
	font-size: 24rpx;
	margin-top: 20rpx;
}
</style>
