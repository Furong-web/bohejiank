<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EChart from '@/components/EChart.vue'
import { adminApi } from '@/api'
import { clearToken } from '@/store/auth'

const route = useRoute()
const router = useRouter()

// ===== 与 B 端一致的侧边导航（深蓝 SaaS 商务风） =====
const navs = [
  { name: 'dashboard', path: '/dashboard', label: '数据看板', icon: '▦', desc: '全量用户健康概览' },
  { name: 'users', path: '/users', label: '用户管理', icon: '◉', desc: 'C 端用户档案' },
  { name: 'screen', path: '/screen', label: '运营大屏', icon: '📺', desc: '实时数据可视化' }
]

function onLogout() {
  clearToken()
  router.push('/login')
}

// ===== 数据 =====
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

// ===== 顶部核心指标卡（带边框白色小卡片） =====
const cards = computed(() => [
  { label: '总用户', value: overview.value.totalUsers, unit: '人', icon: '◉', color: '#2563eb' },
  { label: '今日打卡', value: overview.value.todayCheckins, unit: '人', icon: '✓', color: '#10b981' },
  { label: '累计打卡', value: overview.value.totalCheckins, unit: '条', icon: '▦', color: '#0ea5e9' },
  { label: '平均摄入', value: overview.value.avgIntake, unit: 'kcal', icon: '▤', color: '#6366f1' },
  { label: '平均消耗', value: overview.value.avgBurn, unit: 'kcal', icon: '▣', color: '#f59e0b' },
  { label: '平均健康分', value: overview.value.avgScore, unit: '分', icon: '★', color: '#10b981' }
])

// ===== 中间图表：折线趋势 + 环形分布 =====
const BLUE = '#2563eb'
const GREEN = '#10b981'

const last7Option = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['新增用户', '打卡人数'], top: 0, textStyle: { color: '#64748b', fontSize: 11 } },
  grid: { left: 46, right: 16, top: 34, bottom: 24 },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: last7.value.map((d) => d.date.slice(5)),
    axisLine: { lineStyle: { color: '#e2e8f0' } },
    axisLabel: { color: '#94a3b8', fontSize: 10 }
  },
  yAxis: { type: 'value', axisLabel: { color: '#94a3b8', fontSize: 10 }, splitLine: { lineStyle: { color: '#eef2f7' } } },
  series: [
    {
      name: '新增用户',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      data: last7.value.map((d) => d.newUsers),
      lineStyle: { color: BLUE, width: 2 },
      itemStyle: { color: BLUE },
      areaStyle: { color: 'rgba(37,99,235,0.10)' }
    },
    {
      name: '打卡人数',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      data: last7.value.map((d) => d.checkins),
      lineStyle: { color: GREEN, width: 2 },
      itemStyle: { color: GREEN },
      areaStyle: { color: 'rgba(16,185,129,0.08)' }
    }
  ]
}))

const genderOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c} 人 ({d}%)' },
  legend: { bottom: 0, textStyle: { color: '#64748b', fontSize: 11 } },
  color: [BLUE, GREEN],
  series: [
    {
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '44%'],
      label: { color: '#475569', fontSize: 11 },
      data: genderDist.value.map((g) => ({ name: GENDER[g.gender] || g.gender, value: g.count }))
    }
  ]
}))

const activityOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 44, right: 16, top: 16, bottom: 24 },
  xAxis: {
    type: 'category',
    data: activityDist.value.map((a) => ACTIVITY[a.level] || a.level),
    axisLine: { lineStyle: { color: '#e2e8f0' } },
    axisLabel: { color: '#64748b', fontSize: 11 }
  },
  yAxis: { type: 'value', axisLabel: { color: '#94a3b8', fontSize: 10 }, splitLine: { lineStyle: { color: '#eef2f7' } } },
  series: [
    {
      type: 'bar',
      barWidth: '46%',
      data: activityDist.value.map((a) => a.count),
      itemStyle: { color: BLUE, borderRadius: [4, 4, 0, 0] },
      label: { show: true, position: 'top', color: '#475569', fontSize: 11 }
    }
  ]
}))

const levelColor: any = { 优秀: 'text-emerald-600', 良好: 'text-blue-600', 一般: 'text-amber-600', 需关注: 'text-red-500' }
const levelBadge: any = {
  优秀: 'bg-emerald-50 text-emerald-600',
  良好: 'bg-blue-50 text-blue-600',
  一般: 'bg-amber-50 text-amber-600',
  需关注: 'bg-red-50 text-red-500'
}
</script>

<template>
  <!-- 与 B 端一致的浅色 SaaS 商务风外壳（深蓝侧栏 + 浅灰背景） -->
  <div class="fixed inset-0 flex text-slate-800" style="background:#f3f6fa; color-scheme: light; font-family:'PingFang SC','Microsoft YaHei',system-ui,sans-serif">
    <!-- 深蓝侧边栏 -->
    <aside class="w-60 flex flex-col shrink-0" style="background:linear-gradient(180deg,#132e4d 0%,#0e2238 100%)">
      <div class="h-16 flex items-center gap-2 px-5 text-white">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style="background:#2563eb">✚</div>
        <div>
          <div class="font-bold text-[15px] leading-tight">薄荷健康 · 运营台</div>
          <div class="text-[10px] text-blue-200/70">OPERATION CONSOLE</div>
        </div>
      </div>

      <nav class="flex-1 px-3 py-3 space-y-1">
        <div class="px-3 pt-2 pb-2 text-[10px] tracking-widest text-blue-300/50">运营工作台</div>
        <router-link
          v-for="n in navs"
          :key="n.name"
          :to="n.path"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition"
          :class="route.name === n.name ? 'bg-blue-500/20 text-white border border-blue-400/30' : 'text-blue-100/70 hover:bg-white/5 hover:text-white border border-transparent'"
        >
          <span class="w-5 text-center text-base">{{ n.icon }}</span>
          <span class="flex-1">
            <span class="block text-[13px] font-medium leading-tight">{{ n.label }}</span>
            <span class="block text-[10px] text-blue-200/40 leading-tight mt-0.5">{{ n.desc }}</span>
          </span>
        </router-link>
      </nav>

      <div class="p-4">
        <div class="rounded-xl p-3 border border-white/10" style="background:rgba(255,255,255,0.04)">
          <div class="text-[10px] text-blue-200/50 mb-1">数据来源</div>
          <div class="text-[11px] text-blue-100/80 leading-relaxed">C 端用户打卡 · 全量聚合</div>
        </div>
        <div class="mt-3 text-[10px] text-blue-200/40 text-center">管理后台 v1.0</div>
      </div>
    </aside>

    <!-- 主区域 -->
    <div class="flex-1 flex flex-col min-w-0">
      <header class="h-16 shrink-0 flex items-center justify-between px-6 bg-white border-b border-slate-200">
        <h1 class="text-[15px] font-medium text-slate-700">{{ route.meta.title }}</h1>
        <div class="flex items-center gap-5">
          <span class="text-[11px] text-slate-400 bg-white border border-slate-200 rounded-lg px-3 py-1.5">全量 C 端用户数据</span>
          <div class="h-6 w-px bg-slate-200"></div>
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style="background:#64748b">管</div>
            <span class="text-[13px] text-slate-600">管理员</span>
          </div>
          <button @click="onLogout" class="text-[13px] text-slate-400 hover:text-red-500 transition">退出</button>
        </div>
      </header>

      <main class="flex-1 overflow-auto p-6">
        <div v-if="loading" class="text-slate-400 text-sm">加载中…</div>
        <div v-else class="space-y-5">
          <!-- 顶部核心指标：带边框白色小卡片 -->
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

          <!-- 中间：折线趋势 + 环形分布 -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm lg:col-span-2">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-semibold text-slate-700">近 7 日 新增用户 / 打卡人数趋势</span>
                <span class="text-[11px] text-slate-400">人 / 日</span>
              </div>
              <EChart :option="last7Option" height="280px" />
            </div>
            <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div class="text-sm font-semibold text-slate-700 mb-2">用户性别分布</div>
              <EChart :option="genderOption" height="280px" />
            </div>
            <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm lg:col-span-2">
              <div class="text-sm font-semibold text-slate-700 mb-2">用户活动水平分布</div>
              <EChart :option="activityOption" height="220px" />
            </div>
            <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div class="text-sm font-semibold text-slate-700 mb-3">指标说明</div>
              <div class="space-y-3">
                <div class="rounded-lg p-3" style="background:#eff6ff">
                  <div class="text-xs text-blue-600 font-medium">总用户 {{ overview.totalUsers }} 人</div>
                  <div class="text-[11px] text-slate-500 mt-1">C 端注册用户总量，今日打卡 {{ overview.todayCheckins }} 人。</div>
                </div>
                <div class="rounded-lg p-3" style="background:#f0fdf4">
                  <div class="text-xs text-emerald-600 font-medium">平均摄入 {{ overview.avgIntake }} kcal</div>
                  <div class="text-[11px] text-slate-500 mt-1">全量用户近 30 天日均热量摄入，平均健康分 {{ overview.avgScore }}。</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 最近入组学员：独立学员库数据（表格化列表） -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <span class="w-1.5 h-4 rounded-full" style="background:#2563eb"></span>
                <span class="text-sm font-semibold text-slate-700">最近入组学员</span>
                <span class="text-[11px] text-slate-400 ml-2">独立学员库 · 最新 8 位</span>
              </div>
              <button
                @click="router.push('/b/members')"
                class="text-[12px] text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg px-3 py-1.5 hover:bg-blue-50 transition"
              >查看全部 →</button>
            </div>
            <div class="grid grid-cols-12 px-5 py-2.5 text-[11px] text-slate-400 border-b border-slate-100" style="background:#f8fafc">
              <span class="col-span-3">学员姓名</span>
              <span class="col-span-2">学员编号</span>
              <span class="col-span-3">所属机构</span>
              <span class="col-span-2">健康等级</span>
              <span class="col-span-2 text-right">健康分</span>
            </div>
            <div
              v-for="u in recentUsers"
              :key="u.id"
              class="grid grid-cols-12 items-center px-5 py-3 border-b border-slate-50 hover:bg-blue-50/40 transition"
            >
              <div class="col-span-3 flex items-center gap-3">
                <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style="background:#2563eb">
                  {{ (u.name || u.nickname || '学').slice(0, 1) }}
                </div>
                <div class="min-w-0">
                  <div class="text-[13px] font-medium text-slate-700">{{ u.name || u.nickname }}</div>
                  <div class="text-[10px] text-slate-400">{{ u.createdAt ? String(u.createdAt).slice(0, 10) : '' }} 入组</div>
                </div>
              </div>
              <div class="col-span-2 text-[12px] text-slate-500 font-mono">{{ u.employeeNo || '—' }}</div>
              <div class="col-span-3">
                <span class="text-[11px] text-slate-600 bg-slate-100 rounded-md px-2 py-1">{{ u.orgName || '—' }}</span>
              </div>
              <div class="col-span-2">
                <span
                  class="text-[11px] font-medium rounded-full px-2.5 py-1"
                  :class="levelBadge[u.level] || 'bg-slate-100 text-slate-500'"
                >{{ u.level || '一般' }}</span>
              </div>
              <div class="col-span-2 text-right">
                <span class="text-[15px] font-bold" :class="levelColor[u.level] || 'text-slate-600'">{{ u.score }}</span>
                <span class="text-[10px] text-slate-400 ml-0.5">分</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>
