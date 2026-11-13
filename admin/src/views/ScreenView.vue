<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import EChart from '@/components/EChart.vue'
import CountFlop from '@/components/CountFlop.vue'
import TopRankBoard from '@/components/TopRankBoard.vue'
import AIReport from '@/components/AIReport.vue'
import { adminApi } from '@/api'
import { useScreenScale, type ScreenMode } from '@/composables/useScreenScale'

const router = useRouter()
const stage = ref<HTMLElement | null>(null)
const savedMode = (localStorage.getItem('mint_screen_mode') as ScreenMode) || 'fit'
const mode = ref<ScreenMode>(savedMode)
useScreenScale(stage, mode)

const data = ref<any>(null)
const clock = ref('')

let clockTimer: any = null
let refreshTimer: any = null

function nowStr() {
  const d = new Date()
  const p = (n: number) => (n < 10 ? '0' + n : '' + n)
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

async function load() {
  try {
    const res = await adminApi.screen()
    if (res.code === 0) data.value = res.data
  } catch (e) {
    /* 保持上一次数据，避免闪烁 */
  }
}

function toggleMode() {
  mode.value = mode.value === 'fit' ? 'fill' : 'fit'
  localStorage.setItem('mint_screen_mode', mode.value)
}
function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.()
  else document.exitFullscreen?.()
}
function back() {
  router.push('/dashboard')
}

const ov = computed(() => data.value?.overview || {})
const trend = computed(() => data.value?.trend || [])
const topUsers = computed(() => data.value?.topUsers || [])
const scoreDist = computed(() => data.value?.scoreDist || {})
const recent = computed(() => data.value?.recent || [])
const summary = computed(() => data.value?.summary || '')

const trendOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { textStyle: { color: '#8FB7A6' }, top: 0 },
  grid: { left: 50, right: 50, top: 36, bottom: 28 },
  xAxis: {
    type: 'category',
    data: trend.value.map((d: any) => d.date.slice(5)),
    axisLabel: { color: '#8FB7A6', fontSize: 10, interval: 2 },
    axisLine: { lineStyle: { color: '#2a4038' } }
  },
  yAxis: [
    {
      type: 'value',
      name: '打卡人数',
      nameTextStyle: { color: '#8FB7A6' },
      axisLabel: { color: '#8FB7A6' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
    },
    {
      type: 'value',
      name: '平均体重',
      nameTextStyle: { color: '#8FB7A6' },
      axisLabel: { color: '#8FB7A6' },
      splitLine: { show: false }
    }
  ],
  series: [
    {
      name: '打卡人数',
      type: 'bar',
      data: trend.value.map((d: any) => d.checkinCount),
      itemStyle: { color: '#2BB673' },
      barWidth: '55%'
    },
    {
      name: '平均体重',
      type: 'line',
      yAxisIndex: 1,
      smooth: true,
      data: trend.value.map((d: any) => d.avgWeight),
      itemStyle: { color: '#36CFC9' },
      lineWidth: 2
    }
  ]
}))

const weekActiveOption = computed(() => {
  const w = trend.value.slice(-7)
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 40, right: 12, top: 24, bottom: 24 },
    xAxis: {
      type: 'category',
      data: w.map((d: any) => d.date.slice(5)),
      axisLabel: { color: '#8FB7A6', fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#8FB7A6' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
    },
    series: [
      {
        type: 'bar',
        data: w.map((d: any) => d.checkinCount),
        itemStyle: { color: '#36CFC9', borderRadius: [4, 4, 0, 0] },
        barWidth: '50%'
      }
    ]
  }
})

const weekIBOption = computed(() => {
  const w = trend.value.slice(-7)
  return {
    tooltip: { trigger: 'axis' },
    legend: { textStyle: { color: '#8FB7A6' }, top: 0 },
    grid: { left: 44, right: 12, top: 30, bottom: 24 },
    xAxis: {
      type: 'category',
      data: w.map((d: any) => d.date.slice(5)),
      axisLabel: { color: '#8FB7A6', fontSize: 10 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#8FB7A6' },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
    },
    series: [
      {
        name: '摄入',
        type: 'bar',
        data: w.map((d: any) => d.avgIntake),
        itemStyle: { color: '#F6A23C' },
        barWidth: '32%'
      },
      {
        name: '消耗',
        type: 'bar',
        data: w.map((d: any) => d.avgBurn),
        itemStyle: { color: '#2BB673' },
        barWidth: '32%'
      }
    ]
  }
})

const scoreOption = computed(() => {
  const d = scoreDist.value
  const palette: any = { 优秀: '#2BB673', 良好: '#36CFC9', 一般: '#F6A23C', 需关注: '#E8584F' }
  const keys = Object.keys(d)
  return {
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', right: 6, top: 'center', textStyle: { color: '#cfe', fontSize: 12 } },
    series: [
      {
        type: 'pie',
        radius: ['48%', '72%'],
        center: ['38%', '50%'],
        data: keys.map((k) => ({ name: k, value: d[k], itemStyle: { color: palette[k] } })),
        label: { color: '#cfe', formatter: '{b}\n{c}' }
      }
    ]
  }
})

const metrics = computed(() => [
  { label: '总用户数', value: ov.value.totalUsers || 0, suffix: '人', accent: 'bg-mint' },
  { label: '今日打卡', value: ov.value.todayCheckins || 0, suffix: '人', accent: 'bg-cyan-glow' },
  { label: '累计打卡', value: ov.value.totalCheckins || 0, suffix: '条', accent: 'bg-amber-400' },
  { label: '平均摄入', value: ov.value.avgIntake || 0, suffix: 'kcal', accent: 'bg-orange-400' },
  { label: '平均消耗', value: ov.value.avgBurn || 0, suffix: 'kcal', accent: 'bg-fuchsia-400' },
  { label: '达标率', value: ov.value.checkinRate || 0, suffix: '%', accent: 'bg-mint' }
])

onMounted(() => {
  clock.value = nowStr()
  clockTimer = setInterval(() => (clock.value = nowStr()), 1000)
  load()
  refreshTimer = setInterval(load, 30000)
})
onBeforeUnmount(() => {
  clearInterval(clockTimer)
  clearInterval(refreshTimer)
})
</script>

<template>
  <div class="fixed inset-0 overflow-hidden bg-ink-900">
    <div
      ref="stage"
      class="screen-grid absolute left-1/2 top-1/2 w-[1920px] h-[1080px] -translate-x-1/2 -translate-y-1/2"
      style="transform-origin: center"
    >
      <!-- 标题条 -->
      <div class="h-[90px] flex items-center justify-between px-8 border-b border-mint/15">
        <div class="flex items-center gap-4">
          <span class="text-3xl">🌿</span>
          <div>
            <div class="text-2xl font-bold text-mint tracking-wide">薄荷健康 · 运营数据大屏</div>
            <div class="text-xs text-white/40 mt-1">MINT HEALTH OPERATION DASHBOARD</div>
          </div>
        </div>
        <div class="flex items-center gap-4">
          <span class="text-cyan-glow font-mono text-lg">{{ clock }}</span>
          <button
            @click="toggleMode"
            class="px-3 py-1.5 rounded-lg border border-mint/40 text-mint-light text-sm hover:bg-mint/10"
          >
            {{ mode === 'fit' ? '等比适配' : '铺满全屏' }}
          </button>
          <button
            @click="toggleFullscreen"
            class="px-3 py-1.5 rounded-lg border border-mint/40 text-mint-light text-sm hover:bg-mint/10"
          >
            ⛶ 全屏
          </button>
          <button
            @click="back"
            class="px-3 py-1.5 rounded-lg border border-white/15 text-white/70 text-sm hover:bg-white/10"
          >
            ← 返回
          </button>
        </div>
      </div>

      <!-- 主体 -->
      <div v-if="data" class="flex h-[900px] gap-5 p-6">
        <!-- 左：指标卡 -->
        <div class="w-[400px] flex flex-col gap-4">
          <div class="grid grid-cols-2 gap-4 flex-1">
            <div
              v-for="m in metrics"
              :key="m.label"
              class="glass rounded-xl p-4 relative overflow-hidden float-in flex flex-col justify-center"
            >
              <div class="absolute left-0 top-0 bottom-0 w-1" :class="m.accent"></div>
              <div class="text-xs text-white/55 mb-1">{{ m.label }}</div>
              <div class="flex items-baseline gap-1">
                <span class="text-3xl font-bold text-white">
                  <CountFlop :value="m.value" />
                </span>
                <span class="text-xs text-white/50">{{ m.suffix }}</span>
              </div>
            </div>
          </div>
          <div class="glass rounded-xl p-4 h-[150px] flex items-center justify-between">
            <div>
              <div class="text-xs text-white/55 mb-1">平均健康分</div>
              <div class="text-4xl font-bold text-mint">
                <CountFlop :value="ov.avgScore || 0" />
              </div>
            </div>
            <div class="w-24 h-24 rounded-full border-4 border-mint/30 flex items-center justify-center">
              <span class="text-mint-light text-sm">综合评分</span>
            </div>
          </div>
        </div>

        <!-- 中：趋势 + 对比 -->
        <div class="flex-1 flex flex-col gap-5 min-w-0">
          <div class="glass rounded-xl p-4 flex-[3]">
            <div class="text-sm text-white/70 mb-2">近 30 天 打卡人数 / 平均体重趋势</div>
            <EChart :option="trendOption" height="100%" />
          </div>
          <div class="flex gap-5 flex-[2]">
            <div class="glass rounded-xl p-4 flex-1">
              <div class="text-sm text-white/70 mb-2">近 7 日活跃打卡</div>
              <EChart :option="weekActiveOption" height="100%" />
            </div>
            <div class="glass rounded-xl p-4 flex-1">
              <div class="text-sm text-white/70 mb-2">近 7 日 摄入 / 消耗对比</div>
              <EChart :option="weekIBOption" height="100%" />
            </div>
          </div>
        </div>

        <!-- 右：分布 + 排行 + 动态 -->
        <div class="w-[460px] flex flex-col gap-5">
          <div class="glass rounded-xl p-4 h-[320px]">
            <div class="text-sm text-white/70 mb-2">健康分分布</div>
            <EChart :option="scoreOption" height="100%" />
          </div>
          <div class="glass rounded-xl p-4 flex-1 min-h-0">
            <div class="text-sm text-white/70 mb-2">打卡 TOP5 排行榜</div>
            <TopRankBoard :list="topUsers" />
          </div>
          <div class="glass rounded-xl p-4 h-[230px]">
            <div class="text-sm text-white/70 mb-2">最近打卡动态</div>
            <div class="space-y-1.5 overflow-auto h-[180px]">
              <div
                v-for="r in recent"
                :key="r.id"
                class="flex items-center justify-between text-sm bg-white/5 rounded px-2.5 py-1.5"
              >
                <span class="text-mint-light">{{ r.nickname }}</span>
                <span class="text-white/45 text-xs">{{ r.date.slice(5) }}</span>
                <span class="text-white/70">{{ r.weight }}kg</span>
                <span class="text-orange-300/80 text-xs">摄{{ r.intake }}</span>
                <span class="text-mint-light text-xs">耗{{ r.burn }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部 AI 总结 -->
      <div v-if="data" class="h-[78px] px-6">
        <div class="glass rounded-xl px-5 py-3 h-full">
          <AIReport :text="summary" :updated-at="data.updatedAt" />
        </div>
      </div>

      <div v-if="!data" class="flex items-center justify-center h-[900px] text-white/40">
        数据加载中…
      </div>
    </div>
  </div>
</template>
