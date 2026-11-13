<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { logout } from '@/store/auth'

const route = useRoute()
const router = useRouter()

const navs = [
  { name: 'dashboard', path: '/dashboard', label: '数据看板', icon: '▦' },
  { name: 'users', path: '/users', label: '用户管理', icon: '👤' },
  { name: 'screen', path: '/screen', label: '运营大屏', icon: '📺' }
]

function onLogout() {
  logout()
  router.push('/login')
}
</script>

<template>
  <div class="flex h-full">
    <aside class="w-56 bg-ink-800 border-r border-white/5 flex flex-col">
      <div class="h-16 flex items-center gap-2 px-5 text-mint font-bold text-lg">
        <span class="text-2xl">🌿</span> 薄荷健康
      </div>
      <nav class="flex-1 px-3 py-4 space-y-1">
        <router-link
          v-for="n in navs"
          :key="n.name"
          :to="n.path"
          class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition"
          :class="
            route.name === n.name
              ? 'bg-mint/15 text-mint-light'
              : 'text-white/60 hover:text-white hover:bg-white/5'
          "
        >
          <span class="w-4 text-center">{{ n.icon }}</span>{{ n.label }}
        </router-link>
      </nav>
      <div class="p-4 text-xs text-white/30">管理后台 v1.0</div>
    </aside>
    <div class="flex-1 flex flex-col min-w-0">
      <header class="h-16 border-b border-white/5 flex items-center justify-between px-6">
        <h1 class="text-base font-medium text-white/90">{{ route.meta.title }}</h1>
        <button
          v-if="route.name === 'screen'"
          @click="router.push('/screen')"
          class="text-sm text-white/60 hover:text-mint-light"
        ></button>
        <button @click="onLogout" class="text-sm text-white/60 hover:text-mint-light">
          退出登录
        </button>
      </header>
      <main class="flex-1 overflow-auto p-6 bg-ink-900">
        <slot />
      </main>
    </div>
  </div>
</template>
