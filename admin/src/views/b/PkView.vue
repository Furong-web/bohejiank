<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import BLayout from '@/layouts/BLayout.vue'
import { bApi } from '@/api'
import { orgStore } from '@/store/borg'

const loading = ref(true)
const data = ref<any>({})

async function load() {
  loading.value = true
  try {
    const res: any = await bApi.pk(orgStore.get())
    if (res.code === 0) data.value = res.data
  } finally {
    loading.value = false
  }
}
let off: (() => void) | null = null
onMounted(() => { load(); off = orgStore.onChange(() => load()) })
onBeforeUnmount(() => { off && off() })

const board = computed(() => data.value.board || [])
const top3 = computed(() => board.value.slice(0, 3))
// 领奖台顺序：第2名 - 第1名 - 第3名
const podium = computed(() => {
  const t = top3.value
  return [t[1], t[0], t[2]].filter(Boolean)
})
const maxPoints = computed(() => Math.max(1, ...board.value.map((b: any) => b.points)))

function podiumHeight(rank: number) {
  return rank === 1 ? 'h-28' : rank === 2 ? 'h-20' : 'h-16'
}
function podiumColor(rank: number) {
  return rank === 1 ? '#f59e0b' : rank === 2 ? '#94a3b8' : '#d97706'
}
function trendText(t: number) {
  return t > 0 ? '↑ ' + t : t < 0 ? '↓ ' + Math.abs(t) : '—'
}
function trendColor(t: number) {
  return t > 0 ? '#10b981' : t < 0 ? '#ef4444' : '#94a3b8'
}
</script>

<template>
  <BLayout>
    <div v-if="loading" class="text-slate-400 text-sm">加载中…</div>
    <div v-else class="space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-800">团队减脂 PK 赛</h2>
          <p class="text-xs text-slate-400 mt-0.5">{{ data.org?.name }} · 用数据激励，让坚持被看见</p>
        </div>
        <span class="text-[11px] text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-1.5">本期共 {{ data.total }} 人参与</span>
      </div>

      <!-- Banner -->
      <div class="rounded-2xl p-6 text-white relative overflow-hidden" style="background:linear-gradient(120deg,#1e3a8a 0%,#2563eb 55%,#3b82f6 100%)">
        <div class="relative z-10">
          <div class="text-[11px] tracking-widest text-blue-200 mb-1">WEEKLY FAT-LOSS CHALLENGE</div>
          <div class="text-2xl font-bold">本周减脂冲刺赛 · 排行榜</div>
          <p class="text-[12px] text-blue-100/80 mt-2">积分规则：减重(kg)×10 + 打卡天数×2 + 运动达标奖励 + 健康分÷10</p>
        </div>
        <div class="absolute -right-6 -top-8 text-white/10 text-[160px] leading-none font-bold">🏆</div>
      </div>

      <!-- 领奖台 -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <div class="text-sm font-semibold text-slate-700 text-center mb-5">本期前三名</div>
        <div class="flex items-end justify-center gap-4">
          <div v-for="p in podium" :key="p.id" class="flex flex-col items-center" style="width:120px">
            <div class="text-xl mb-1">{{ p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : '🥉' }}</div>
            <div class="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold border-4 border-white shadow" :style="{ background: podiumColor(p.rank) }">
              {{ p.avatar }}
            </div>
            <div class="text-[13px] font-semibold text-slate-800 mt-2">{{ p.nickname }}</div>
            <div class="text-[11px] text-slate-400">减重 {{ p.weightLoss }} kg</div>
            <div class="text-[13px] font-bold mt-1" style="color:#2563eb">{{ p.points }} 分</div>
            <div class="w-full rounded-t-lg mt-2 flex items-start justify-center pt-2" :class="podiumHeight(p.rank)" :style="{ background: podiumColor(p.rank) + '20', borderTop: '3px solid ' + podiumColor(p.rank) }">
              <span class="text-2xl font-bold" :style="{ color: podiumColor(p.rank) }">{{ p.rank }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 完整榜单 -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <span class="text-sm font-semibold text-slate-700">完整排行榜</span>
          <span class="text-[11px] text-slate-400">按综合积分排序</span>
        </div>
        <div class="divide-y divide-slate-100">
          <div v-for="b in board" :key="b.id" class="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition">
            <div class="w-7 text-center">
              <span v-if="b.rank <= 3" class="text-base">{{ b.rank === 1 ? '🥇' : b.rank === 2 ? '🥈' : '🥉' }}</span>
              <span v-else class="text-[13px] font-medium text-slate-400">{{ b.rank }}</span>
            </div>
            <div class="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style="background:#64748b">{{ b.avatar }}</div>
            <div class="w-28 shrink-0">
              <div class="text-[13px] font-medium text-slate-800">{{ b.nickname }}</div>
              <div class="text-[10px] text-slate-400">健康分 {{ b.score }}</div>
            </div>
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <div class="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div class="h-full rounded-full" style="background:linear-gradient(90deg,#2563eb,#60a5fa)" :style="{ width: (b.points / maxPoints * 100) + '%' }"></div>
                </div>
                <span class="text-[12px] font-semibold text-slate-700 w-12 text-right">{{ b.points }}</span>
              </div>
              <div class="text-[10px] text-slate-400 mt-1">减重 {{ b.weightLoss }}kg · 打卡 {{ b.checkinDays }} 天 · 蛋白质 {{ b.protein }}%</div>
            </div>
            <div class="w-12 text-right text-[12px] font-medium shrink-0" :style="{ color: trendColor(b.trend) }">{{ trendText(b.trend) }}</div>
          </div>
        </div>
      </div>
    </div>
  </BLayout>
</template>
