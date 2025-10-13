// Runtime environment variables (injected by Docker)
declare global {
  interface Window {
    ENV_CONFIG?: {
      OME_VHOST?: string
      OME_APP?: string
      OME_WEBRTC_URL?: string
      OME_RTMP_URL?: string
      OME_SRT_URL?: string
      OME_LLHLS_URL?: string
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
    webrtcUrl: getEnv('OME_WEBRTC_URL', 'VITE_WEBRTC_URL'),
    rtmpUrl: getEnv('OME_RTMP_URL', 'VITE_RTMP_URL'),
    srtUrl: getEnv('OME_SRT_URL', 'VITE_SRT_URL'),
    llhlsUrl: getEnv('OME_LLHLS_URL', 'VITE_LLHLS_URL'),
  },
}
