import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables for the proxy configuration
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiTarget = env.VITE_API_BASE_URL
  
  if (!apiTarget) {
    console.error('❌ ERROR: VITE_API_BASE_URL is required in .env.development')
    process.exit(1)
  }
  
  return {
    plugins: [
      vue(),
      vuetify({ autoImport: true }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      proxy: {
        '/omeapi': {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/omeapi/, ''),
        }
      }
    }
  }
})
