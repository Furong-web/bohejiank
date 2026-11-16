import axios from 'axios'

const TOKEN_KEY = 'mint_admin_token'

const http = axios.create({
  baseURL: '/api',
  timeout: 10000
})

http.interceptors.request.use((cfg) => {
  const t = localStorage.getItem(TOKEN_KEY) || ''
  if (t) cfg.headers.Authorization = 'Bearer ' + t
  return cfg
})

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      if (location.pathname !== '/login') location.href = '/login'
    }
    return Promise.reject(err)
  }
)

function unwrap(p: Promise<any>) {
  return p.then((r) => r.data)
}

export const adminApi = {
  login: (username: string, password: string) =>
    unwrap(http.post('/admin/login', { username, password })),
  dashboard: () => unwrap(http.get('/admin/dashboard')),
  users: (params: any) => unwrap(http.get('/admin/users', { params })),
  screen: () => unwrap(http.get('/admin/screen'))
}

/** B 端机构管理系统接口 */
export const bApi = {
  orgs: () => unwrap(http.get('/b/orgs')),
  overview: (org: string) => unwrap(http.get('/b/overview', { params: { org } })),
  members: (org: string, keyword?: string) => unwrap(http.get('/b/members', { params: { org, keyword } })),
  pk: (org: string) => unwrap(http.get('/b/pk', { params: { org } })),
  intervention: (org: string) => unwrap(http.get('/b/intervention', { params: { org } })),
  saveIntervention: (data: any) => unwrap(http.post('/b/intervention', data)),
  sendAdvice: (userId: number) => unwrap(http.post('/b/advice', { userId })),
  assignPlan: (userId: number, plan: string) => unwrap(http.post('/b/plan', { userId, plan }))
}

export default adminApi
