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

app.use(createPinia())
app.use(router)
app.use(vuetify)

app.mount('#app')

