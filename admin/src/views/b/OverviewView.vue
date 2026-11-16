<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import BLayout from '@/layouts/BLayout.vue'
import EChart from '@/components/EChart.vue'
import { bApi } from '@/api'
import { orgStore } from '@/store/borg'

const loading = ref(true)
const data = ref<any>({})

async function load() {
  loading.value = true
  try {
    const res: any = await bApi.overview(orgStore.get())
    if (res.code === 0) data.value = res.data
  } finally {
    loading.value = false
  }
}

let off: (() => void) | null = null
onMounted(() => {
  load()
  off = orgStore.onChange(() => load())
})
onBeforeUnmount(() => { off && off() })

const ov = computed(() => data.value.overview || {})
const trend = computed(() => data.value.intakeTrend || [])
const burnTrend = computed(() => data.value.burnTrend || [])
const bmiDist = computed(() => data.value.bmiDist || {})
const scoreDist = computed(() => data.value.scoreDist || {})

const BLUE = '#2563eb'
const intakeOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['平均摄入', '平均消耗'], top: 0, textStyle: { color: '#64748b', fontSize: 11 } },
  grid: { left: 46, right: 16, top: 34, bottom: 24 },
  xAxis: { type: 'category', boundaryGap: false, data: trend.value.map((d: any) => d.date), axisLabel: { color: '#94a3b8', fontSize: 10 }, axisLine: { lineStyle: { color: '#e2e8f0' } } },
  yAxis: { type: 'value', axisLabel: { color: '#94a3b8', fontSize: 10 }, splitLine: { lineStyle: { color: '#eef2f7' } } },
  series: [
    { name: '平均摄入', type: 'line', smooth: true, symbol: 'none', data: trend.value.map((d: any) => d.value), lineStyle: { color: BLUE, width: 2 }, areaStyle: { color: 'rgba(37,99,235,0.12)' } },
    { name: '平均消耗', type: 'line', smooth: true, symbol: 'none', data: burnTrend.value.map((d: any) => d.value), lineStyle: { color: '#10b981', width: 2 }, areaStyle: { color: 'rgba(16,185,129,0.08)' } }
  ]
}))

const bmiOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} 人 ({d}%)' },
  legend: { bottom: 0, textStyle: { color: '#64748b', fontSize: 11 } },
  color: ['#60a5fa', '#2563eb', '#f59e0b', '#ef4444'],
  series: [{
    type: 'pie', radius: ['42%', '68%'], center: ['50%', '44%'],
    label: { color: '#475569', fontSize: 11 },
    data: ['偏瘦', '正常', '超重', '肥胖'].map((k) => ({ name: k, value: bmiDist.value[k] || 0 }))
  }]
}))

const scoreOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 44, right: 16, top: 16, bottom: 24 },
  xAxis: { type: 'category', data: ['优秀', '良好', '一般', '需关注'], axisLabel: { color: '#64748b', fontSize: 11 }, axisLine: { lineStyle: { color: '#e2e8f0' } } },
  yAxis: { type: 'value', axisLabel: { color: '#94a3b8', fontSize: 10 }, splitLine: { lineStyle: { color: '#eef2f7' } } },
  series: [{
    type: 'bar', barWidth: '46%',
    data: [
      { value: scoreDist.value['优秀'] || 0, itemStyle: { color: '#10b981' } },
      { value: scoreDist.value['良好'] || 0, itemStyle: { color: '#2563eb' } },
      { value: scoreDist.value['一般'] || 0, itemStyle: { color: '#f59e0b' } },
      { value: scoreDist.value['需关注'] || 0, itemStyle: { color: '#ef4444' } }
    ],
    itemStyle: { borderRadius: [4, 4, 0, 0] },
    label: { show: true, position: 'top', color: '#475569', fontSize: 11 }
  }]
}))

const cards = computed(() => [
  { label: '在管学员', value: ov.value.memberCount, unit: '人', icon: '◉', color: '#2563eb' },
  { label: '今日打卡', value: ov.value.todayCheckins, unit: '人', icon: '✓', color: '#0ea5e9' },
  { label: '人均日摄入', value: ov.value.avgIntake, unit: 'kcal', icon: '▤', color: '#6366f1' },
  { label: '人均热量缺口', value: ov.value.avgGap, unit: 'kcal', icon: '▣', color: '#10b981' },
  { label: '运动达标率', value: ov.value.exerciseRate, unit: '%', icon: '▲', color: '#f59e0b' },
  { label: '超重/肥胖率', value: ov.value.obeseRate, unit: '%', icon: '◇', color: '#ef4444' }
])
</script>

<template>
  <BLayout>
    <div v-if="loading" class="text-slate-400 text-sm">加载中…</div>
    <div v-else class="space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-800">{{ data.org?.name }}</h2>
          <p class="text-xs text-slate-400 mt-0.5">{{ data.org?.desc }} · 群体健康画像实时概览</p>
        </div>
        <span class="text-[11px] text-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-1.5">近 14 天数据</span>
      </div>

      <!-- 指标卡 -->
      <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <div v-for="c in cards" :key="c.label" class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-500">{{ c.label }}</span>
            <span class="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm" :style="{ background: c.color }">{{ c.icon }}</span>
          </div>
          <div class="mt-3">
            <span class="text-2xl font-bold text-slate-800">{{ c.value }}</span>
            <span class="text-xs text-slate-400 ml-1">{{ c.unit }}</span>
          </div>
        </div>
      </div>

      <!-- 图表区 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm lg:col-span-2">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-semibold text-slate-700">群体平均热量摄入 / 消耗趋势</span>
            <span class="text-[11px] text-slate-400">kcal / 日</span>
          </div>
          <EChart :option="intakeOption" height="280px" />
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div class="text-sm font-semibold text-slate-700 mb-2">BMI / 肥胖率分布</div>
          <EChart :option="bmiOption" height="280px" />
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div class="text-sm font-semibold text-slate-700 mb-2">健康分等级分布</div>
          <EChart :option="scoreOption" height="240px" />
        </div>
        <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm lg:col-span-2">
          <div class="text-sm font-semibold text-slate-700 mb-3">关键指标说明</div>
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-lg p-3" style="background:#eff6ff">
              <div class="text-xs text-blue-600 font-medium">运动达标率 {{ ov.exerciseRate }}%</div>
              <div class="text-[11px] text-slate-500 mt-1">以当日运动消耗 ≥ 300 kcal 为达标标准，反映群体活跃度。</div>
            </div>
            <div class="rounded-lg p-3" style="background:#fef2f2">
              <div class="text-xs text-red-600 font-medium">超重/肥胖率 {{ ov.obeseRate }}%</div>
              <div class="text-[11px] text-slate-500 mt-1">BMI ≥ 24 计为超重，≥ 28 计为肥胖，建议重点干预。</div>
            </div>
            <div class="rounded-lg p-3" style="background:#f0fdf4">
              <div class="text-xs text-emerald-600 font-medium">蛋白质达标率 {{ ov.proteinRate }}%</div>
              <div class="text-[11px] text-slate-500 mt-1">蛋白质摄入达标的学员占比，数据为演示估算值。</div>
            </div>
            <div class="rounded-lg p-3" style="background:#fffbeb">
              <div class="text-xs text-amber-600 font-medium">平均健康分 {{ ov.avgScore }}</div>
              <div class="text-[11px] text-slate-500 mt-1">综合摄入、消耗、打卡与体况计算的群体健康分。</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </BLayout>
</template>
