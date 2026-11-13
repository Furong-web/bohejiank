<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = withDefaults(
  defineProps<{ value: number; decimals?: number; duration?: number }>(),
  { decimals: 0, duration: 1200 }
)

const display = ref('0')
let raf = 0

function format(n: number) {
  const fixed = n.toFixed(props.decimals)
  const [int, dec] = fixed.split('.')
  const withComma = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return dec ? withComma + '.' + dec : withComma
}
function animateTo(to: number) {
  const from = parseFloat(display.value.replace(/,/g, '')) || 0
  const start = performance.now()
  cancelAnimationFrame(raf)
  const tick = (now: number) => {
    const p = Math.min(1, (now - start) / props.duration)
    const eased = 1 - Math.pow(1 - p, 3) // easeOutCubic
    display.value = format(from + (to - from) * eased)
    if (p < 1) raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
}
onMounted(() => animateTo(props.value))
watch(() => props.value, (v) => animateTo(v))
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <span>{{ display }}</span>
</template>
