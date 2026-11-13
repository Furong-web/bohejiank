<script setup lang="ts">
defineProps<{ text: string; updatedAt?: string }>()
</script>

<template>
  <div class="h-full flex flex-col">
    <div class="flex items-center gap-2 mb-2">
      <span class="i-leaf text-mint">❖</span>
      <span class="text-mint-light font-semibold tracking-wide">AI 智能运营总结</span>
    </div>
    <div class="flex-1 overflow-auto text-sm leading-relaxed text-white/80 pr-1">
      {{ text || '数据加载中…' }}
    </div>
    <div v-if="updatedAt" class="text-[11px] text-white/35 mt-2">
      更新于 {{ updatedAt }}
    </div>
  </div>
</template>
