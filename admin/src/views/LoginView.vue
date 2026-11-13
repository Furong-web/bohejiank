<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '@/store/auth'

const router = useRouter()
const username = ref('admin')
const password = ref('admin123456')
const err = ref('')
const loading = ref(false)

async function submit() {
  err.value = ''
  loading.value = true
  try {
    await login(username.value.trim(), password.value)
    router.push('/dashboard')
  } catch (e: any) {
    err.value = e.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="h-full flex items-center justify-center bg-gradient-to-br from-ink-800 via-ink-900 to-black">
    <div class="glass rounded-2xl p-8 w-80 float-in">
      <div class="text-center mb-6">
        <div class="text-3xl mb-2">🌿</div>
        <div class="text-lg font-bold text-mint">薄荷健康管理后台</div>
        <div class="text-xs text-white/40 mt-1">请输入管理员账号登录</div>
      </div>
      <div class="space-y-3">
        <input
          v-model="username"
          placeholder="用户名"
          class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-mint outline-none text-sm"
        />
        <input
          v-model="password"
          type="password"
          placeholder="密码"
          @keyup.enter="submit"
          class="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-mint outline-none text-sm"
        />
        <div v-if="err" class="text-xs text-red-400">{{ err }}</div>
        <button
          @click="submit"
          :disabled="loading"
          class="w-full py-2 rounded-lg bg-mint hover:bg-mint-light text-ink-900 font-semibold disabled:opacity-60"
        >
          {{ loading ? '登录中…' : '登 录' }}
        </button>
      </div>
      <div class="text-[11px] text-white/30 mt-4 text-center">默认账号 admin / admin123456</div>
    </div>
  </div>
</template>
