import { onMounted, onBeforeUnmount, watch, type Ref } from 'vue'

export type ScreenMode = 'fit' | 'fill'

const DESIGN_W = 1920
const DESIGN_H = 1080

/**
 * 大屏等比适配：设计稿固定 1920×1080
 * - fit  ：等比缩放居中，任何分辨率不变形（宽屏两侧留黑边）
 * - fill ：X/Y 独立拉伸铺满（宽屏下轻微拉伸）
 * 容器需设置 position:absolute; left:50%; top:50%; width:1920px; height:1080px; transform-origin:center
 */
export function useScreenScale(elRef: Ref<HTMLElement | null>, mode: Ref<ScreenMode>) {
  function apply() {
    const el = elRef.value
    if (!el) return
    const w = window.innerWidth
    const h = window.innerHeight
    if (mode.value === 'fit') {
      const s = Math.min(w / DESIGN_W, h / DESIGN_H)
      el.style.transform = `translate(-50%, -50%) scale(${s})`
    } else {
      el.style.transform = `translate(-50%, -50%) scale(${w / DESIGN_W}, ${h / DESIGN_H})`
    }
  }
  onMounted(() => {
    apply()
    window.addEventListener('resize', apply)
  })
  onBeforeUnmount(() => window.removeEventListener('resize', apply))
  watch(mode, apply)
  return { apply }
}
