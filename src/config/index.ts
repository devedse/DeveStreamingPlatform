// Runtime environment variables (injected by Docker)
declare global {
  interface Window {
    ENV_CONFIG?: {
      OME_VHOST?: string
      OME_APP?: string
      // Provider URLs (for ingestion/pushing streams)
      OME_PROVIDER_WEBRTC_URL?: string
      OME_PROVIDER_RTMP_URL?: string
      OME_PROVIDER_SRT_URL?: string
      // Publisher URLs (for playback)
      OME_PUBLISHER_WEBRTC_URL?: string
      OME_PUBLISHER_LLHLS_URL?: string
      // Thumbnail URL
      OME_THUMBNAIL_URL?: string
    }
  }
}

// Helper to get environment variable from window (runtime) or import.meta.env (build-time)
const getEnv = (runtimeKey: keyof NonNullable<Window['ENV_CONFIG']>, buildKey: string) => {
  return window.ENV_CONFIG?.[runtimeKey] || import.meta.env[buildKey] || ''
}

export const config = {
  api: {
    // Always use the nginx proxy path
    // No token needed - handled by proxy (nginx in prod, vite in dev)
    baseUrl: '/omeapi',
  },
  ome: {
    vhost: getEnv('OME_VHOST', 'VITE_OME_VHOST') || 'default',
    app: getEnv('OME_APP', 'VITE_OME_APP') || 'app',
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
    // Thumbnail URL base (for fetching stream thumbnails)
    thumbnailUrl: getEnv('OME_THUMBNAIL_URL', 'VITE_THUMBNAIL_URL'),
  },
}
