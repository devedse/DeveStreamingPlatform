import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import './style.css'

// Make hls.js available globally for OvenPlayer
import Hls from 'hls.js'
;(window as any).Hls = Hls

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(vuetify)

// Check auth status before mounting (non-blocking)
import { useAuthStore } from './stores/auth'
const authStore = useAuthStore(pinia)
authStore.checkAuth().then(() => {
  console.log('Auth status:', authStore.isAuthenticated ? 'authenticated' : 'not authenticated')
})

app.mount('#app')

