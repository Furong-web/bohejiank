<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import StatCard from '@/components/StatCard.vue'
import EChart from '@/components/EChart.vue'
import { adminApi } from '@/api'

const loading = ref(true)
const overview = ref<any>({})
const last7 = ref<any[]>([])
const genderDist = ref<any[]>([])
const activityDist = ref<any[]>([])
const recentUsers = ref<any[]>([])

onMounted(async () => {
  try {
    const res = await adminApi.dashboard()
    if (res.code === 0) {
      const d = res.data
      overview.value = d.overview
      last7.value = d.last7
      genderDist.value = d.genderDist
      activityDist.value = d.activityDist
      recentUsers.value = d.recentUsers
    }
  } finally {
    loading.value = false
  }
})

const GENDER = { 1: '男', 2: '女' }
const ACTIVITY = { 1: '久坐', 2: '轻度', 3: '中度', 4: '高强度' }

const last7Option = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { textStyle: { color: '#8FB7A6' }, top: 0 },
  grid: { left: 44, right: 16, top: 30, bottom: 24 },
  xAxis: {
    type: 'category',
    data: last7.value.map((d) => d.date.slice(5)),
    axisLine: { lineStyle: { color: '#2a4038' } },
    axisLabel: { color: '#8FB7A6' }
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: '#8FB7A6' },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
  },
  series: [
    {
      name: '新增用户',
      type: 'bar',
      data: last7.value.map((d) => d.newUsers),
      itemStyle: { color: '#36CFC9', borderRadius: [4, 4, 0, 0] },
      barWidth: '40%'
    },
    {
      name: '打卡人数',
      type: 'line',
      smooth: true,
      data: last7.value.map((d) => d.checkins),
      itemStyle: { color: '#2BB673' },
      areaStyle: { color: 'rgba(43,182,115,0.15)' }
    }
  ]
}))

const genderOption = computed(() => ({
  color: ['#2BB673', '#36CFC9'],
  tooltip: { trigger: 'item' },
  legend: { textStyle: { color: '#8FB7A6' }, bottom: 0 },
  series: [
    {
      type: 'pie',
      radius: ['45%', '70%'],
      data: genderDist.value.map((g) => ({ name: GENDER[g.gender] || g.gender, value: g.count })),
      label: { color: '#cfe' }
    }
  ]
}))

const activityOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 40, right: 16, top: 16, bottom: 24 },
  xAxis: {
    type: 'category',
    data: activityDist.value.map((a) => ACTIVITY[a.level] || a.level),
    axisLabel: { color: '#8FB7A6' }
  },
  yAxis: {
    type: 'value',
    axisLabel: { color: '#8FB7A6' },
    splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } }
  },
  series: [
    {
      type: 'bar',
      data: activityDist.value.map((a) => a.count),
      itemStyle: { color: '#2BB673', borderRadius: [4, 4, 0, 0] },
      barWidth: '45%'
    }
  ]
}))

const levelColor: any = { 优秀: 'text-mint', 良好: 'text-cyan-glow', 一般: 'text-amber-400', 需关注: 'text-red-400' }
</script>

<template>
  <AdminLayout>
    <div v-if="loading" class="text-white/40 text-sm">加载中…</div>
    <div v-else class="space-y-5">
      <!-- 指标卡 -->
      <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="总用户数" :value="overview.totalUsers" accent="bg-mint" />
        <StatCard label="今日打卡" :value="overview.todayCheckins" suffix="人" accent="bg-cyan-glow" />
        <StatCard label="累计打卡" :value="overview.totalCheckins" suffix="条" accent="bg-amber-400" />
        <StatCard label="平均摄入" :value="overview.avgIntake" suffix="kcal" accent="bg-orange-400" />
        <StatCard label="平均消耗" :value="overview.avgBurn" suffix="kcal" accent="bg-fuchsia-400" />
        <StatCard label="平均健康分" :value="overview.avgScore" suffix="分" accent="bg-mint" />
      </div>

      <!-- 图表区 -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="glass rounded-xl p-4 lg:col-span-2">
          <div class="text-sm text-white/70 mb-2">近 7 日 新增用户 / 打卡人数</div>
          <EChart :option="last7Option" height="280px" />
        </div>
        <div class="glass rounded-xl p-4">
          <div class="text-sm text-white/70 mb-2">用户性别分布</div>
          <EChart :option="genderOption" height="280px" />
        </div>
        <div class="glass rounded-xl p-4 lg:col-span-3">
          <div class="text-sm text-white/70 mb-2">用户活动水平分布</div>
          <EChart :option="activityOption" height="220px" />
        </div>
      </div>

      <!-- 最近用户 -->
      <div class="glass rounded-xl p-4">
        <div class="text-sm text-white/70 mb-3">最近注册用户</div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div
            v-for="u in recentUsers"
            :key="u.id"
            class="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2"
          >
            <div>
              <div class="text-sm text-white/90">{{ u.nickname }}</div>
              <div class="text-[11px] text-white/40">{{ u.createdAt }}</div>
            </div>
            <span class="text-sm font-semibold" :class="levelColor[u.level]">{{ u.score }}</span>
          </div>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
