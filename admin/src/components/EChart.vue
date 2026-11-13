<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'

const props = defineProps<{ option: any; height?: string }>()
const el = ref<HTMLElement>()
let chart: any = null

function render() {
  if (!el.value) return
  if (!chart) {
    // 大屏使用 SVG 渲染器：矢量放大永远清晰，避免 CSS scale 后 canvas 发虚
    chart = echarts.init(el.value, null, { renderer: 'svg' })
  }
  chart.setOption(props.option, true)
}
function resize() {
  chart && chart.resize()
}
onMounted(() => {
  render()
  window.addEventListener('resize', resize)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  chart && chart.dispose()
  chart = null
})
watch(() => props.option, render, { deep: true })
</script>

<template>
  <div ref="el" :style="{ width: '100%', height: height || '100%' }"></div>
</template>
