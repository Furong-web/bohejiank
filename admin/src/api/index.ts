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

export default adminApi
