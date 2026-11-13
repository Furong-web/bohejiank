<template>
	<view class="mint-chart">
		<view v-if="!hasData" class="chart-empty">暂无数据，先去打卡记录吧</view>
		<canvas v-else class="chart-canvas" :canvas-id="canvasId" :id="canvasId"></canvas>
	</view>
</template>

<script>
/**
 * 轻量 Canvas 图表组件（折线图 / 柱状图）
 * props:
 *  - type: 'line' | 'bar'
 *  - canvasId: 画布 id（同一页面需唯一）
 *  - labels: x 轴标签数组，如 ['10-01', '10-02']
 *  - series: [{ name, values: [], color }]
 *  - height: 画布高度 px
 */
export default {
	name: 'mint-chart',
	props: {
		type: { type: String, default: 'line' },
		canvasId: { type: String, required: true },
		labels: { type: Array, default: function () { return [] } },
		series: { type: Array, default: function () { return [] } },
		height: { type: Number, default: 200 }
	},
	computed: {
		hasData() {
			return this.series.some(function (s) { return s.values && s.values.length > 0 })
		}
	},
	mounted() {
		this.render()
	},
	watch: {
		series: {
			deep: true,
			handler() { this.render() }
		}
	},
	methods: {
		render() {
			if (!this.hasData) return
			const that = this
			this.$nextTick(function () {
				setTimeout(function () { that.draw() }, 120)
			})
		},
		draw() {
			const that = this
			uni.createSelectorQuery().in(this)
				.select('.chart-canvas')
				.boundingClientRect(function (rect) {
					if (!rect || !rect.width) return
					const ctx = uni.createCanvasContext(that.canvasId, that)
					that.paint(ctx, rect.width, that.height)
					ctx.draw()
				})
				.exec()
		},
		paint(ctx, w, h) {
			const padL = 44, padR = 14, padT = 16, padB = 26
			const iw = w - padL - padR
			const ih = h - padT - padB
			const n = Math.max(1, this.labels.length)

			// 值范围
			let min = Infinity, max = -Infinity
			this.series.forEach(function (s) {
				s.values.forEach(function (v) {
					if (v !== null && v !== undefined && !isNaN(v)) {
						if (v < min) min = v
						if (v > max) max = v
					}
				})
			})
			if (min === Infinity) return
			if (this.type === 'bar') min = Math.min(0, min)
			if (max === min) { max = max + 1; min = min - 1 }
			let span = max - min
			max = max + span * 0.12
			if (this.type !== 'bar') min = min - span * 0.12
			span = max - min

			// 网格与 y 轴刻度
			ctx.setFontSize(10)
			for (let i = 0; i <= 4; i++) {
				const val = min + span * i / 4
				const y = padT + ih - ih * i / 4
				ctx.setStrokeStyle('#EAEEEB')
				ctx.setLineWidth(1)
				ctx.beginPath()
				ctx.moveTo(padL, y)
				ctx.lineTo(padL + iw, y)
				ctx.stroke()
				ctx.setFillStyle('#9AA79F')
				ctx.fillText(this.fmt(val), 4, y + 3)
			}

			// x 轴标签（最多显示 6 个）
			const step = Math.max(1, Math.ceil(n / 6))
			ctx.setFillStyle('#9AA79F')
			for (let i = 0; i < n; i += step) {
				const x = padL + (i + 0.5) * (iw / n)
				const label = String(this.labels[i] || '')
				ctx.fillText(label.length > 5 ? label.slice(-5) : label, x - 14, h - 8)
			}

			if (this.type === 'line') {
				this.series.forEach(function (s) {
					const color = s.color || '#2BB673'
					ctx.beginPath()
					s.values.forEach(function (v, i) {
						const x = padL + (i + 0.5) * (iw / n)
						const y = padT + ih - ih * ((v - min) / span)
						if (i === 0) ctx.moveTo(x, y)
						else ctx.lineTo(x, y)
					})
					ctx.setStrokeStyle(color)
					ctx.setLineWidth(2)
					ctx.stroke()
					s.values.forEach(function (v, i) {
						const x = padL + (i + 0.5) * (iw / n)
						const y = padT + ih - ih * ((v - min) / span)
						ctx.beginPath()
						ctx.arc(x, y, 3, 0, 2 * Math.PI)
						ctx.setFillStyle(color)
						ctx.fill()
					})
				})
			} else {
				const groupW = iw / n
				const barW = Math.max(4, Math.min(18, groupW * 0.6 / this.series.length))
				this.series.forEach(function (s, si) {
					const color = s.color || '#2BB673'
					s.values.forEach(function (v, i) {
						const cx = padL + (i + 0.5) * groupW
						const bh = ih * ((v - min) / span)
						const x = cx - (barW * that.seriesCountSafe()) / 2 + si * barW
						ctx.setFillStyle(color)
						ctx.fillRect(x, padT + ih - bh, barW - 2, Math.max(1, bh))
					})
				})
			}
		},
		seriesCountSafe() {
			return this.series.length || 1
		},
		fmt(v) {
			const n = Number(v)
			if (isNaN(n)) return ''
			return Math.abs(n) >= 100 ? String(Math.round(n)) : String(Math.round(n * 10) / 10)
		}
	}
}
</script>

<style>
.mint-chart {
	width: 100%;
}
.chart-canvas {
	width: 100%;
	height: 200px;
}
.chart-empty {
	text-align: center;
	color: #9AA79F;
	font-size: 24rpx;
	padding: 60rpx 0;
}
</style>
