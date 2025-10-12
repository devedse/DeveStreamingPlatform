import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import StreamView from '@/views/StreamView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: {
        title: 'Stream Browser',
      },
    },
    {
      path: '/stream/:name',
      name: 'stream',
      component: StreamView,
      meta: {
        title: 'Watch Stream',
      },
    },
  ],
})

// Update document title on route change
router.beforeEach((to, _from, next) => {
  const title = to.meta.title as string
  if (title) {
    document.title = `${title} - Deve Streaming Platform`
  }
  next()
})

export default router
