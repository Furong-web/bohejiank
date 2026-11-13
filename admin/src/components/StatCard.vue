<script setup lang="ts">
import CountFlop from './CountFlop.vue'

withDefaults(
  defineProps<{
    label: string
    value: number
    suffix?: string
    decimals?: number
    accent?: string // tailwind 颜色类前缀相关，仅用于左侧装饰条
  }>(),
  { suffix: '', decimals: 0, accent: 'bg-mint' }
)
</script>

<template>
  <div class="glass rounded-xl p-4 relative overflow-hidden float-in">
    <div class="absolute left-0 top-0 bottom-0 w-1" :class="accent"></div>
    <div class="text-xs text-white/55 mb-2">{{ label }}</div>
    <div class="flex items-baseline gap-1">
      <span class="text-2xl font-bold text-white">
        <CountFlop :value="value" :decimals="decimals" />
      </span>
      <span v-if="suffix" class="text-xs text-white/50">{{ suffix }}</span>
    </div>
  </div>
</template>
