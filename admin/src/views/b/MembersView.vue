<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import BLayout from '@/layouts/BLayout.vue'
import { bApi } from '@/api'
import { orgStore } from '@/store/borg'

const loading = ref(true)
const list = ref<any[]>([])
const keyword = ref('')
const toast = ref('')

const planModal = ref(false)
const planTarget = ref<any>(null)
const planText = ref('')
const planPresets = [
  '有氧慢跑 30 分钟 + 核心训练 15 分钟，每周 4 次',
  '力量训练：深蹲/硬拉/卧推 各 4 组 × 8 次，每周 3 次',
  'HIIT 间歇训练 20 分钟 + 拉伸 10 分钟，每周 3 次',
  '快走 6000 步 + 普拉提 20 分钟，每日'
]

async function load() {
  loading.value = true
  try {
    const res: any = await bApi.members(orgStore.get(), keyword.value)
    if (res.code === 0) list.value = res.data.list
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

let toastTimer: any = null
function showToast(msg: string) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2600)
}

async function sendAdvice(u: any) {
  try {
    const res: any = await bApi.sendAdvice(u.id)
    if (res.code === 0) showToast(`已向 ${u.nickname} 发送建议：${res.data.content}`)
    else showToast(res.msg || '发送失败')
  } catch (e) { showToast('网络异常，请重试') }
}

function openPlan(u: any) {
  planTarget.value = u
  planText.value = planPresets[0]
  planModal.value = true
}
async function submitPlan() {
  if (!planText.value.trim()) return showToast('请填写训练计划')
  try {
    const res: any = await bApi.assignPlan(planTarget.value.id, planText.value)
    if (res.code === 0) { showToast(`已为 ${planTarget.value.nickname} 布置训练计划`); planModal.value = false }
    else showToast(res.msg || '布置失败')
  } catch (e) { showToast('网络异常，请重试') }
}

const levelColor: any = { 优秀: '#10b981', 良好: '#2563eb', 一般: '#f59e0b', 需关注: '#ef4444' }
const genderText = (g: number) => (g === 1 ? '男' : '女')
</script>

<template>
  <BLayout>
    <div class="space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-800">学员 / 员工管理</h2>
          <p class="text-xs text-slate-400 mt-0.5">查看个体数据，一键发送饮食建议或布置训练计划</p>
        </div>
        <div class="flex items-center gap-3">
          <input
            v-model="keyword"
            @keyup.enter="load"
            placeholder="搜索昵称 / 账号"
            class="w-56 px-3 py-2 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-blue-400 transition"
          />
          <button @click="load" class="px-4 py-2 text-[13px] text-white rounded-lg" style="background:#2563eb">搜索</button>
        </div>
      </div>

      <div v-if="loading" class="text-slate-400 text-sm">加载中…</div>
      <div v-else-if="!list.length" class="text-slate-400 text-sm">暂无学员数据</div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <div v-for="u in list" :key="u.id" class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition">
          <!-- 头部 -->
          <div class="flex items-start gap-3">
            <div class="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shrink-0" :style="{ background: levelColor[u.level] }">
              {{ u.nickname?.slice(0, 1) || '学' }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-slate-800 truncate">{{ u.nickname }}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded" :style="{ color: levelColor[u.level], background: levelColor[u.level] + '18' }">{{ u.level }}</span>
              </div>
              <div class="text-[11px] text-slate-400 mt-0.5">{{ genderText(u.gender) }} · {{ u.age }} 岁 · BMI {{ u.bmi }} ({{ u.bmiLabel }})</div>
            </div>
            <div class="text-right shrink-0">
              <div class="text-lg font-bold" :style="{ color: levelColor[u.level] }">{{ u.score }}</div>
              <div class="text-[10px] text-slate-400">健康分</div>
            </div>
          </div>

          <!-- 关键指标 -->
          <div class="grid grid-cols-3 gap-2 mt-4">
            <div class="rounded-lg p-2 text-center" style="background:#f8fafc">
              <div class="text-[10px] text-slate-400">今日热量缺口</div>
              <div class="text-sm font-bold" :class="!u.hasToday ? 'text-slate-400' : u.intakeGap >= 0 ? 'text-emerald-600' : 'text-red-500'">
                {{ u.hasToday ? u.intakeGap : '—' }}
              </div>
              <div class="text-[9px] text-slate-400">{{ u.hasToday ? 'kcal' : '今日未打卡' }}</div>
            </div>
            <div class="rounded-lg p-2 text-center" style="background:#f8fafc">
              <div class="text-[10px] text-slate-400">蛋白质</div>
              <div class="text-sm font-bold" :class="u.proteinGood ? 'text-blue-600' : 'text-amber-600'">{{ u.protein }}%</div>
              <div class="text-[9px] text-slate-400">{{ u.proteinGood ? '已达标' : '偏低' }}</div>
            </div>
            <div class="rounded-lg p-2 text-center" style="background:#f8fafc">
              <div class="text-[10px] text-slate-400">运动达标</div>
              <div class="text-sm font-bold" :class="u.exerciseReached ? 'text-emerald-600' : 'text-slate-400'">{{ u.exerciseReached ? '是' : '否' }}</div>
              <div class="text-[9px] text-slate-400">消耗 {{ u.todayBurn }}</div>
            </div>
          </div>

          <!-- 蛋白质进度条 -->
          <div class="mt-3">
            <div class="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>蛋白质达标进度</span><span>目标 80%</span>
            </div>
            <div class="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div class="h-full rounded-full" :style="{ width: Math.min(100, u.protein) + '%', background: u.proteinGood ? '#2563eb' : '#f59e0b' }"></div>
            </div>
          </div>

          <!-- 快捷操作 -->
          <div class="flex gap-2 mt-4 pt-3 border-t border-slate-100">
            <button @click="sendAdvice(u)" class="flex-1 text-[12px] py-2 rounded-lg text-white transition hover:opacity-90" style="background:#2563eb">一键发送饮食建议</button>
            <button @click="openPlan(u)" class="flex-1 text-[12px] py-2 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition">布置训练计划</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="toast" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-lg text-white text-[13px] shadow-lg" style="background:#1e293b; max-width:80vw">
      {{ toast }}
    </div>

    <!-- 布置计划弹窗 -->
    <div v-if="planModal" class="fixed inset-0 z-[90] flex items-center justify-center" style="background:rgba(15,23,42,0.45)">
      <div class="bg-white rounded-2xl w-[480px] max-w-[92vw] p-6 shadow-2xl">
        <div class="flex items-center justify-between mb-1">
          <h3 class="text-base font-bold text-slate-800">布置训练计划</h3>
          <button @click="planModal = false" class="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <p class="text-xs text-slate-400 mb-4">学员：{{ planTarget?.nickname }}</p>
        <div class="space-y-2 mb-4">
          <div class="text-[11px] text-slate-500">快捷模板</div>
          <button
            v-for="p in planPresets"
            :key="p"
            @click="planText = p"
            class="w-full text-left text-[12px] px-3 py-2 rounded-lg border transition"
            :class="planText === p ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-blue-300'"
          >{{ p }}</button>
        </div>
        <textarea v-model="planText" rows="3" placeholder="或自定义训练计划…" class="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-blue-400 resize-none"></textarea>
        <div class="flex justify-end gap-3 mt-5">
          <button @click="planModal = false" class="px-5 py-2 text-[13px] rounded-lg border border-slate-200 text-slate-600">取消</button>
          <button @click="submitPlan" class="px-5 py-2 text-[13px] rounded-lg text-white" style="background:#2563eb">确认布置</button>
        </div>
      </div>
    </div>
  </BLayout>
</template>
