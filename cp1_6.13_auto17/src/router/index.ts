import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'BookShelf',
    component: () => import('@/components/BookShelf.vue'),
    meta: { title: '我的虚拟书架' }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  const title = to.meta?.title as string | undefined
  if (title) {
    document.title = title
  }
  next()
})

export default router
