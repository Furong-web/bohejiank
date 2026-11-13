<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

interface RankItem {
  nickname: string
  score: number
  checkinDays: number
  streak: number
  level: string
}

const props = withDefaults(defineProps<{ list: RankItem[]; itemHeight?: number }>(), {
  itemHeight: 64
})
const h = props.itemHeight
const offset = ref(0)
let timer: any = null
let paused = false

function start() {
  stop()
  if (props.list.length <= 1) return
  timer = setInterval(() => {
    if (paused) return
    offset.value += 1
    if (offset.value >= props.list.length * h) offset.value = 0
  }, 40)
}
function stop() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
onMounted(start)
onBeforeUnmount(stop)
watch(
  () => props.list,
  () => {
    offset.value = 0
    start()
  }
)
</script>

<template>
  <div
    class="h-full overflow-hidden"
    @mouseenter="paused = true"
    @mouseleave="paused = false"
  >
    <div
      class="flex flex-col"
      :style="{ transform: `translateY(${-offset}px)`, transition: 'transform 0.04s linear' }"
    >
      <div
        v-for="(it, i) in list"
        :key="'a' + i"
        class="flex items-center gap-3 px-3 border-b border-white/5"
        :style="{ height: h + 'px' }"
      >
        <div
          class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
          :class="i === 0 ? 'bg-amber-400/90 text-ink-900' : i === 1 ? 'bg-slate-300/90 text-ink-900' : i === 2 ? 'bg-orange-500/80 text-white' : 'bg-white/10 text-mint-light'"
        >
          {{ i + 1 }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <span class="truncate text-mint-light font-medium">{{ it.nickname }}</span>
            <span class="text-cyan-glow font-bold text-sm">{{ it.score }}<span class="text-[10px] opacity-60 ml-0.5">分</span></span>
          </div>
          <div class="text-[11px] text-white/45">
            打卡 {{ it.checkinDays }} 天 · 连续 {{ it.streak }} 天 · {{ it.level }}
          </div>
        </div>
      </div>
      <!-- 复制一份实现无缝滚动 -->
      <div
        v-for="(it, i) in list"
        :key="'b' + i"
        class="flex items-center gap-3 px-3 border-b border-white/5"
        :style="{ height: h + 'px' }"
        aria-hidden="true"
      >
        <div
          class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
          :class="i === 0 ? 'bg-amber-400/90 text-ink-900' : i === 1 ? 'bg-slate-300/90 text-ink-900' : i === 2 ? 'bg-orange-500/80 text-white' : 'bg-white/10 text-mint-light'"
        >
          {{ i + 1 }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <span class="truncate text-mint-light font-medium">{{ it.nickname }}</span>
            <span class="text-cyan-glow font-bold text-sm">{{ it.score }}<span class="text-[10px] opacity-60 ml-0.5">分</span></span>
          </div>
          <div class="text-[11px] text-white/45">
            打卡 {{ it.checkinDays }} 天 · 连续 {{ it.streak }} 天 · {{ it.level }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
