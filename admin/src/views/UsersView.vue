<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { adminApi } from '@/api'

const page = ref(1)
const size = ref(10)
const keyword = ref('')
const onlyReal = ref(false)
const loading = ref(false)
const data = ref<any>({ total: 0, list: [], isSeededCount: 0 })

const GENDER = { 1: '男', 2: '女' }
const ACTIVITY = { 1: '久坐', 2: '轻度', 3: '中度', 4: '高强度' }
const levelColor: any = {
  优秀: 'bg-mint/15 text-mint-light',
  良好: 'bg-cyan-glow/15 text-cyan-glow',
  一般: 'bg-amber-400/15 text-amber-400',
  需关注: 'bg-red-400/15 text-red-400'
}

async function load() {
  loading.value = true
  try {
    const res = await adminApi.users({
      page: page.value,
      size: size.value,
      keyword: keyword.value,
      onlyReal: onlyReal.value ? '1' : '0'
    })
    if (res.code === 0) data.value = res.data
  } finally {
    loading.value = false
  }
}

function search() {
  page.value = 1
  load()
}
function toggleReal() {
  onlyReal.value = !onlyReal.value
  page.value = 1
  load()
}
function prev() {
  if (page.value > 1) {
    page.value--
    load()
  }
}
function next() {
  if (page.value * size.value < data.value.total) {
    page.value++
    load()
  }
}

onMounted(load)
watch(keyword, () => {})
</script>

<template>
  <AdminLayout>
    <div class="space-y-4">
      <!-- 工具栏 -->
      <div class="flex flex-wrap items-center gap-3">
        <input
          v-model="keyword"
          @keyup.enter="search"
          placeholder="搜索昵称 / 用户名"
          class="px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-mint outline-none text-sm w-60"
        />
        <button
          @click="search"
          class="px-4 py-2 rounded-lg bg-mint hover:bg-mint-light text-ink-900 text-sm font-medium"
        >
          搜索
        </button>
        <label class="flex items-center gap-2 text-sm text-white/70 cursor-pointer select-none">
          <input type="checkbox" :checked="onlyReal" @change="toggleReal" class="accent-mint" />
          仅看真实用户（排除演示数据）
        </label>
        <span class="text-xs text-white/40 ml-auto">
          共 {{ data.total }} 人 · 演示数据 {{ data.isSeededCount }} 人
        </span>
      </div>

      <!-- 表格 -->
      <div class="glass rounded-xl overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-white/50 text-left bg-white/5">
              <th class="px-4 py-3 font-medium">昵称</th>
              <th class="px-4 py-3 font-medium">用户名</th>
              <th class="px-4 py-3 font-medium">性别</th>
              <th class="px-4 py-3 font-medium">年龄</th>
              <th class="px-4 py-3 font-medium">身高</th>
              <th class="px-4 py-3 font-medium">体重 / 目标</th>
              <th class="px-4 py-3 font-medium">打卡</th>
              <th class="px-4 py-3 font-medium">打卡率</th>
              <th class="px-4 py-3 font-medium">健康分</th>
              <th class="px-4 py-3 font-medium">等级</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="u in data.list"
              :key="u.id"
              class="border-t border-white/5 hover:bg-white/5"
            >
              <td class="px-4 py-3 text-white/90">
                {{ u.nickname }}
                <span v-if="u.isSeeded" class="text-[10px] text-white/30 ml-1">演示</span>
              </td>
              <td class="px-4 py-3 text-white/50">{{ u.username }}</td>
              <td class="px-4 py-3">{{ GENDER[u.gender] || u.gender }}</td>
              <td class="px-4 py-3">{{ u.age }}</td>
              <td class="px-4 py-3">{{ u.height }} cm</td>
              <td class="px-4 py-3">{{ u.weight || '-' }} / {{ u.targetWeight || '-' }}</td>
              <td class="px-4 py-3">{{ u.checkinCnt }} 次</td>
              <td class="px-4 py-3">{{ u.checkinRate }}%</td>
              <td class="px-4 py-3 font-semibold text-mint-light">{{ u.score }}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-0.5 rounded text-xs" :class="levelColor[u.level]">{{ u.level }}</span>
              </td>
            </tr>
            <tr v-if="!loading && data.list.length === 0">
              <td colspan="10" class="px-4 py-8 text-center text-white/40">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div class="flex items-center justify-between text-sm text-white/60">
        <span>第 {{ page }} 页 · 每页 {{ size }} 条</span>
        <div class="flex gap-2">
          <button
            @click="prev"
            :disabled="page <= 1"
            class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40"
          >
            上一页
          </button>
          <button
            @click="next"
            :disabled="page * size >= data.total"
            class="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>
