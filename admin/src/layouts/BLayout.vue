<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { orgStore } from '@/store/borg'
import { bApi } from '@/api'
import { getToken, clearToken } from '@/store/auth'

const route = useRoute()
const router = useRouter()

const navs = [
  { name: 'b-overview', path: '/b/overview', label: '数据总览', icon: '▦', desc: '群体健康画像' },
  { name: 'b-members', path: '/b/members', label: '学员管理', icon: '◉', desc: '个体数据与干预' },
  { name: 'b-pk', path: '/b/pk', label: '减脂 PK 赛', icon: '◆', desc: '团队激励排行榜' },
  { name: 'b-intervention', path: '/b/intervention', label: '专业干预', icon: '⚙', desc: '食谱 / 处方 / 禁忌' }
]

const orgs = ref<any[]>([])
const orgOpen = ref(false)
const currentOrg = computed(() => orgs.value.find((o) => o.id === orgStore.get()))
const orgName = computed(() => currentOrg.value?.name || '选择机构')
const orgType = computed(() => currentOrg.value?.type || '')

onMounted(async () => {
  try {
    const res: any = await bApi.orgs()
    if (res.code === 0) orgs.value = res.data.list
  } catch (e) { /* ignore */ }
})

function pickOrg(id: string) {
  orgStore.set(id)
  orgOpen.value = false
}

function onLogout() {
  clearToken()
  router.push('/login')
}
</script>

<template>
  <div class="fixed inset-0 flex text-slate-800" style="background:#f3f6fa; color-scheme: light; font-family:'PingFang SC','Microsoft YaHei',system-ui,sans-serif">
    <!-- 侧边栏 -->
    <aside class="w-60 flex flex-col shrink-0" style="background:linear-gradient(180deg,#132e4d 0%,#0e2238 100%)">
      <div class="h-16 flex items-center gap-2 px-5 text-white">
        <div class="w-8 h-8 rounded-lg flex items-center justify-center text-lg" style="background:#2563eb">✚</div>
        <div>
          <div class="font-bold text-[15px] leading-tight">健康管理 · B 端</div>
          <div class="text-[10px] text-blue-200/70">PROFESSIONAL CONSOLE</div>
        </div>
      </div>

      <nav class="flex-1 px-3 py-3 space-y-1">
        <div class="px-3 pt-2 pb-2 text-[10px] tracking-widest text-blue-300/50">工作台</div>
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
          <div class="text-[10px] text-blue-200/50 mb-1">当前服务闭环</div>
          <div class="text-[11px] text-blue-100/80 leading-relaxed">个人记录 → 专业指导 → 机构管理</div>
        </div>
        <div class="mt-3 text-[10px] text-blue-200/40 text-center">B 端管理系统 v1.0</div>
      </div>
    </aside>

    <!-- 主区域 -->
    <div class="flex-1 flex flex-col min-w-0">
      <header class="h-16 shrink-0 flex items-center justify-between px-6 bg-white border-b border-slate-200">
        <div class="relative">
          <button @click="orgOpen = !orgOpen" class="flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-200 hover:border-blue-300 transition bg-white">
            <span class="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs" style="background:#2563eb">机</span>
            <span class="text-left">
              <span class="block text-[13px] font-semibold text-slate-800 leading-tight">{{ orgName }}</span>
              <span class="block text-[10px] text-slate-400 leading-tight">{{ orgType }}</span>
            </span>
            <span class="text-slate-400 text-xs ml-2">▾</span>
          </button>
          <div v-if="orgOpen" class="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
            <div class="px-4 py-2 text-[10px] text-slate-400 bg-slate-50">切换机构 / 团队</div>
            <button
              v-for="o in orgs"
              :key="o.id"
              @click="pickOrg(o.id)"
              class="w-full text-left px-4 py-3 hover:bg-blue-50 flex items-center justify-between border-t border-slate-100"
            >
              <span>
                <span class="block text-[13px] font-medium text-slate-800">{{ o.name }}</span>
                <span class="block text-[11px] text-slate-400">{{ o.desc }}</span>
              </span>
              <span class="text-[11px] text-blue-600 shrink-0">{{ o.memberCount }} 人</span>
            </button>
          </div>
        </div>

        <div class="flex items-center gap-5">
          <h1 class="text-[15px] font-medium text-slate-700">{{ route.meta.title }}</h1>
          <div class="h-6 w-px bg-slate-200"></div>
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style="background:#64748b">管</div>
            <span class="text-[13px] text-slate-600">管理员</span>
          </div>
          <button @click="onLogout" class="text-[13px] text-slate-400 hover:text-red-500 transition">退出</button>
        </div>
      </header>

      <main class="flex-1 overflow-auto p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
