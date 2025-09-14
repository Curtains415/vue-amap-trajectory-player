import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import TrajectoryPlayerV2Test from '@/pages/TrajectoryPlayerV2Test.vue'

// 定义路由配置
const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/trajectory-player-v2',
    name: 'trajectory-player-v2',
    component: TrajectoryPlayerV2Test,
  },
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
