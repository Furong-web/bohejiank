import { adminApi } from '@/api'

const TOKEN_KEY = 'mint_admin_token'

export const getToken = () => localStorage.getItem(TOKEN_KEY) || ''
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

export async function login(username: string, password: string) {
  const res = await adminApi.login(username, password)
  if (res.code === 0) {
    setToken(res.data.token)
    return res.data
  }
  throw new Error(res.msg || '登录失败')
}

export function logout() {
  clearToken()
}
