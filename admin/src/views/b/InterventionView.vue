<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import BLayout from '@/layouts/BLayout.vue'
import { bApi } from '@/api'
import { orgStore } from '@/store/borg'

const loading = ref(true)
const saving = ref(false)
const toast = ref('')
const org = ref('')
const updatedAt = ref('')

const recipes = ref<any[]>([])
const prescription = ref('')
const taboo = ref('')

async function load() {
  loading.value = true
  try {
    const res: any = await bApi.intervention(orgStore.get())
    if (res.code === 0) {
      const d = res.data
      org.value = d.org
      recipes.value = JSON.parse(JSON.stringify(d.recipes || []))
      prescription.value = d.prescription || ''
      taboo.value = d.taboo || ''
      updatedAt.value = d.updatedAt || ''
    }
  } finally {
    loading.value = false
  }
}
let off: (() => void) | null = null
onMounted(() => { load(); off = orgStore.onChange(() => load()) })
onBeforeUnmount(() => { off && off() })

let toastTimer: any = null
function showToast(msg: string) {
  toast.value = msg
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2600)
}

function addRecipe() {
  recipes.value.push({ name: '', kcal: 0, detail: '' })
}
function removeRecipe(i: number) {
  recipes.value.splice(i, 1)
}

async function save() {
  saving.value = true
  try {
    const res: any = await bApi.saveIntervention({
      org: org.value,
      recipes: recipes.value,
      prescription: prescription.value,
      taboo: taboo.value
    })
    if (res.code === 0) {
      updatedAt.value = res.data.updatedAt
      showToast('干预配置已保存')
    } else showToast(res.msg || '保存失败')
  } catch (e) { showToast('网络异常，请重试') } finally {
    saving.value = false
  }
}
</script>

<template>
  <BLayout>
    <div class="space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-bold text-slate-800">专业干预面板</h2>
          <p class="text-xs text-slate-400 mt-0.5">为机构配置定制食谱、医学营养处方与禁忌提醒，干预策略按机构隔离</p>
        </div>
        <div class="flex items-center gap-3">
          <span v-if="updatedAt" class="text-[11px] text-slate-400">上次保存 {{ updatedAt.slice(0, 16).replace('T', ' ') }}</span>
          <button @click="save" :disabled="saving" class="px-5 py-2 text-[13px] text-white rounded-lg disabled:opacity-50" style="background:#2563eb">
            {{ saving ? '保存中…' : '保存配置' }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="text-slate-400 text-sm">加载中…</div>
      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <!-- 定制食谱 -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 lg:col-span-2">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2">
              <span class="w-8 h-8 rounded-lg flex items-center justify-center text-white" style="background:#2563eb">🍽</span>
              <div>
                <div class="text-sm font-semibold text-slate-800">定制食谱</div>
                <div class="text-[11px] text-slate-400">为该机构学员推荐的标准化食谱模板</div>
              </div>
            </div>
            <button @click="addRecipe" class="text-[12px] px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition">+ 添加食谱</button>
          </div>
          <div class="space-y-3">
            <div v-for="(r, i) in recipes" :key="i" class="rounded-lg border border-slate-200 p-3" style="background:#f8fafc">
              <div class="flex gap-3">
                <div class="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input v-model="r.name" placeholder="食谱名称" class="px-3 py-2 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-blue-400" />
                  <input v-model.number="r.kcal" type="number" placeholder="热量 kcal" class="px-3 py-2 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-blue-400" />
                  <input v-model="r.detail" placeholder="食材与说明" class="px-3 py-2 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-blue-400" />
                </div>
                <button @click="removeRecipe(i)" class="text-slate-400 hover:text-red-500 text-xl leading-none px-2">×</button>
              </div>
            </div>
            <div v-if="!recipes.length" class="text-center text-slate-400 text-[12px] py-6">暂无食谱，点击「添加食谱」开始配置</div>
          </div>
        </div>

        <!-- 医学营养处方 -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div class="flex items-center gap-2 mb-4">
            <span class="w-8 h-8 rounded-lg flex items-center justify-center text-white" style="background:#0ea5e9">⚕</span>
            <div>
              <div class="text-sm font-semibold text-slate-800">医学营养处方</div>
              <div class="text-[11px] text-slate-400">热量与宏量营养素的专业配比建议</div>
            </div>
          </div>
          <textarea v-model="prescription" rows="8" placeholder="输入该机构的医学营养处方…" class="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-blue-400 resize-none leading-relaxed"></textarea>
        </div>

        <!-- 禁忌提醒 -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div class="flex items-center gap-2 mb-4">
            <span class="w-8 h-8 rounded-lg flex items-center justify-center text-white" style="background:#ef4444">⚠</span>
            <div>
              <div class="text-sm font-semibold text-slate-800">禁忌提醒</div>
              <div class="text-[11px] text-slate-400">过敏原、慢病与特殊人群的饮食禁忌</div>
            </div>
          </div>
          <textarea v-model="taboo" rows="8" placeholder="输入该机构的饮食禁忌提醒…" class="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg outline-none focus:border-blue-400 resize-none leading-relaxed"></textarea>
        </div>
      </div>

      <!-- 闭环说明 -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div class="text-sm font-semibold text-slate-800 mb-3">服务闭环：个人记录 → 专业指导 → 机构管理</div>
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex-1 min-w-[180px] rounded-lg p-3 border border-slate-100" style="background:#eff6ff">
            <div class="text-[12px] font-medium text-blue-700">① 个人记录</div>
            <div class="text-[11px] text-slate-500 mt-1">C 端用户持续沉淀饮食与运动数据</div>
          </div>
          <span class="text-slate-300">→</span>
          <div class="flex-1 min-w-[180px] rounded-lg p-3 border border-slate-100" style="background:#f0fdf4">
            <div class="text-[12px] font-medium text-emerald-700">② 专业指导</div>
            <div class="text-[11px] text-slate-500 mt-1">教练/营养师基于数据一键干预</div>
          </div>
          <span class="text-slate-300">→</span>
          <div class="flex-1 min-w-[180px] rounded-lg p-3 border border-slate-100" style="background:#fffbeb">
            <div class="text-[12px] font-medium text-amber-700">③ 机构管理</div>
            <div class="text-[11px] text-slate-500 mt-1">机构看板追踪群体健康成效</div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="toast" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-lg text-white text-[13px] shadow-lg" style="background:#1e293b">
      {{ toast }}
    </div>
  </BLayout>
</template>
