/** B 端当前机构状态（跨页面共享 + 本地持久化） */
const KEY = 'mint_b_org'
let current = localStorage.getItem(KEY) || 'fitpro'
const listeners = new Set<(v: string) => void>()

export const orgStore = {
  get: () => current,
  set(v: string) {
    current = v
    localStorage.setItem(KEY, v)
    listeners.forEach((fn) => fn(v))
  },
  onChange(fn: (v: string) => void) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  }
}
