// Runtime environment variables (injected by Docker)
declare global {
  interface Window {
    ENV_CONFIG?: {
      OME_VHOST?: string
      OME_APP?: string
      OME_APP_PUBLIC?: string
      // Provider URLs (for ingestion/pushing streams)
      OME_PROVIDER_WEBRTC_URL?: string
      OME_PROVIDER_RTMP_URL?: string
      OME_PROVIDER_SRT_URL?: string
      // Publisher URLs (for playback)
      OME_PUBLISHER_WEBRTC_URL?: string
      OME_PUBLISHER_LLHLS_URL?: string

    }
  }
}

// Helper to get environment variable from window (runtime) or import.meta.env (build-time)
const getEnv = (runtimeKey: keyof NonNullable<Window['ENV_CONFIG']>, buildKey: string) => {
  return window.ENV_CONFIG?.[runtimeKey] || import.meta.env[buildKey] || ''
}

// Warn if ENV_CONFIG is not loaded (race condition detection)
if (typeof window !== 'undefined' && !window.ENV_CONFIG) {
  console.warn('⚠️ ENV_CONFIG not loaded yet! This may cause empty URLs. env-config.js should load before main.ts')
}

export const config = {
  api: {
    // Always use the nginx proxy path
    // No token needed - handled by proxy (nginx in prod, vite in dev)
    baseUrl: '/omeapi',
    // Public API path (read-only, no auth required)
    publicBaseUrl: '/public-api',
    // Thumbnail proxy path (handled by nginx in prod, vite in dev)
    thumbnailUrl: '/thumbnails',
    // Public thumbnail proxy path (no auth required)
    publicThumbnailUrl: '/public-thumbnails',
  },
  ome: {
    vhost: getEnv('OME_VHOST', 'VITE_OME_VHOST'),
    app: getEnv('OME_APP', 'VITE_OME_APP'),
    // Public app for streams visible to unauthenticated users
    appPublic: getEnv('OME_APP_PUBLIC', 'VITE_OME_APP_PUBLIC'),
    // Provider URLs (for stream ingestion)
    providers: {
      webrtcUrl: getEnv('OME_PROVIDER_WEBRTC_URL', 'VITE_PROVIDER_WEBRTC_URL'),
      rtmpUrl: getEnv('OME_PROVIDER_RTMP_URL', 'VITE_PROVIDER_RTMP_URL'),
      srtUrl: getEnv('OME_PROVIDER_SRT_URL', 'VITE_PROVIDER_SRT_URL'),
    },
    // Publisher URLs (for stream playback)
    publishers: {
      webrtcUrl: getEnv('OME_PUBLISHER_WEBRTC_URL', 'VITE_PUBLISHER_WEBRTC_URL'),
      llhlsUrl: getEnv('OME_PUBLISHER_LLHLS_URL', 'VITE_PUBLISHER_LLHLS_URL'),
    },
  },
}
