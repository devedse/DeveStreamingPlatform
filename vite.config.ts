import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

// Read version from package.json as fallback
const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables for the proxy configuration
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiTarget = env.VITE_API_BASE_URL
  const apiToken = env.VITE_API_ACCESS_TOKEN
  const thumbnailTarget = env.VITE_THUMBNAIL_URL
  const adminPassword = env.VITE_ADMIN_PASSWORD
  const streamAuthToken = env.VITE_STREAM_AUTH_TOKEN
  
  // Pre-compute hashes for dev auth middleware (only needed in dev mode)
  const adminPasswordHash = adminPassword ? createHash('sha256').update(adminPassword).digest('hex') : ''
  const authCookieHash = adminPassword ? createHash('sha256').update(`dsp-cookie:${adminPassword}`).digest('hex') : ''
  
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
  
  if (mode === 'development' && !adminPassword) {
    console.error('❌ ERROR: VITE_ADMIN_PASSWORD is required in .env.development')
    process.exit(1)
  }
  
  if (mode === 'development' && !streamAuthToken) {
    console.error('❌ ERROR: VITE_STREAM_AUTH_TOKEN is required in .env.development')
    process.exit(1)
  }
  
  if (mode === 'development' && !thumbnailTarget) {
    console.error('❌ ERROR: VITE_THUMBNAIL_URL is required in .env.development')
    process.exit(1)
  }
  
  return {
    plugins: [
      vue(),
      vuetify({ autoImport: true }),
      // Dev-only plugin to mock nginx auth endpoints
      ...(mode === 'development' ? [{
        name: 'dev-auth-middleware',
        configureServer(server: any) {
          // Helper to parse JSON body from request
          const parseBody = (req: any): Promise<any> => new Promise((resolve, reject) => {
            let body = ''
            req.on('data', (chunk: string) => body += chunk)
            req.on('end', () => { try { resolve(JSON.parse(body)) } catch { resolve({}) } })
            req.on('error', reject)
          })

          server.middlewares.use('/auth/login', async (req: any, res: any) => {
            if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
            const body = await parseBody(req)
            if (body.passwordHash === adminPasswordHash) {
              res.setHeader('Set-Cookie', `auth=${authCookieHash}; Path=/; HttpOnly; SameSite=Strict`)
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ status: 'ok' }))
            } else {
              res.statusCode = 401
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Invalid password' }))
            }
          })

          server.middlewares.use('/auth/logout', (_req: any, res: any) => {
            res.setHeader('Set-Cookie', 'auth=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0')
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ status: 'ok' }))
          })

          server.middlewares.use('/api/auth-status', (req: any, res: any) => {
            const cookies = (req.headers.cookie || '').split(';').reduce((acc: any, c: string) => {
              const [k, v] = c.trim().split('=')
              if (k) acc[k] = v
              return acc
            }, {} as Record<string, string>)
            const authenticated = cookies.auth === authCookieHash
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ authenticated }))
          })

          server.middlewares.use('/api/stream-token', (req: any, res: any) => {
            const cookies = (req.headers.cookie || '').split(';').reduce((acc: any, c: string) => {
              const [k, v] = c.trim().split('=')
              if (k) acc[k] = v
              return acc
            }, {} as Record<string, string>)
            if (cookies.auth !== authCookieHash) {
              res.statusCode = 401
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Not authenticated' }))
              return
            }
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ token: streamAuthToken }))
          })
        }
      }] : []),
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
            rewrite: (path: string) => path.replace(/^\/omeapi/, ''),
            configure: (proxy: any, _options: any) => {
              proxy.on('proxyReq', (proxyReq: any, _req: any, _res: any) => {
                // Inject Basic Auth header in the proxy
                const base64Auth = Buffer.from(apiToken).toString('base64')
                proxyReq.setHeader('Authorization', `Basic ${base64Auth}`)
              })
            }
          },
          // Public API proxy (same OME target, read-only in prod but proxied equally in dev)
          '/public-api': {
            target: apiTarget,
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\/public-api/, ''),
            configure: (proxy: any, _options: any) => {
              proxy.on('proxyReq', (proxyReq: any, _req: any, _res: any) => {
                const base64Auth = Buffer.from(apiToken).toString('base64')
                proxyReq.setHeader('Authorization', `Basic ${base64Auth}`)
              })
            }
          },
          // Unlisted API proxy (same OME target, specific-stream only in prod but proxied equally in dev)
          '/unlisted-api': {
            target: apiTarget,
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\/unlisted-api/, ''),
            configure: (proxy: any, _options: any) => {
              proxy.on('proxyReq', (proxyReq: any, _req: any, _res: any) => {
                const base64Auth = Buffer.from(apiToken).toString('base64')
                proxyReq.setHeader('Authorization', `Basic ${base64Auth}`)
              })
            }
          },
          '/thumbnails': {
            target: thumbnailTarget,
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\/thumbnails/, '')
          },
          '/public-thumbnails': {
            target: thumbnailTarget,
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\/public-thumbnails/, '')
          },
          '/unlisted-thumbnails': {
            target: thumbnailTarget,
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\/unlisted-thumbnails/, '')
          }
        }
      }
    })
  }
})
