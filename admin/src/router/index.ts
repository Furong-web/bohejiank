import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/store/auth'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true, title: '管理员登录' }
  },
  { path: '/', redirect: '/dashboard' },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { title: '数据看板' }
  },
  {
    path: '/users',
    name: 'users',
    component: () => import('@/views/UsersView.vue'),
    meta: { title: '用户管理' }
  },
  {
    path: '/screen',
    name: 'screen',
    component: () => import('@/views/ScreenView.vue'),
    meta: { title: '运营数据大屏', fullscreen: true }
  },
  // ===== B 端机构管理系统（浅色蓝灰商务风，独立布局） =====
  { path: '/b', redirect: '/b/overview' },
  {
    path: '/b/overview',
    name: 'b-overview',
    component: () => import('@/views/b/OverviewView.vue'),
    meta: { title: '群体健康画像' }
  },
  {
    path: '/b/members',
    name: 'b-members',
    component: () => import('@/views/b/MembersView.vue'),
    meta: { title: '学员 / 员工管理' }
  },
  {
    path: '/b/pk',
    name: 'b-pk',
    component: () => import('@/views/b/PkView.vue'),
    meta: { title: '团队减脂 PK 赛' }
  },
  {
    path: '/b/intervention',
    name: 'b-intervention',
    component: () => import('@/views/b/InterventionView.vue'),
    meta: { title: '专业干预面板' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  const token = getToken()
  if (!to.meta.public && !token) return '/login'
  if (to.name === 'login' && token) return '/dashboard'
  return true
})


export default router
