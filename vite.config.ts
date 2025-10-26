import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'

// Read version from package.json as fallback
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables for the proxy configuration
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiTarget = env.VITE_API_BASE_URL
  const apiToken = env.VITE_API_ACCESS_TOKEN
  const thumbnailTarget = env.VITE_THUMBNAIL_URL
  
  // Use VITE_APP_VERSION from environment (set by Docker build), or fall back to package.json version
  const version = env.VITE_APP_VERSION || process.env.VITE_APP_VERSION || packageJson.version
  
  // Only require VITE_API_BASE_URL in development mode (for proxy)
  if (mode === 'development' && !apiTarget) {
    console.error('❌ ERROR: VITE_API_BASE_URL is required in .env.development')
    process.exit(1)
  }
  
  if (mode === 'development' && !apiToken) {
    console.error('❌ ERROR: VITE_API_ACCESS_TOKEN is required in .env.development')
    process.exit(1)
  }
  
  return {
    plugins: [
      vue(),
      vuetify({ autoImport: true }),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(version),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    ...(mode === 'development' && {
      server: {
        proxy: {
          '/omeapi': {
            target: apiTarget,
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/omeapi/, ''),
            configure: (proxy, _options) => {
              proxy.on('proxyReq', (proxyReq, _req, _res) => {
                // Inject Basic Auth header in the proxy
                const base64Auth = Buffer.from(apiToken).toString('base64')
                proxyReq.setHeader('Authorization', `Basic ${base64Auth}`)
              })
            }
          },
          '/thumbnails': {
            target: thumbnailTarget || 'http://localhost:20080',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/thumbnails/, '')
          }
        }
      }
    })
  }
})
