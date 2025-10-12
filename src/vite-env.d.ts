/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_API_ACCESS_TOKEN: string
  readonly VITE_WEBRTC_URL: string
  readonly VITE_RTMP_URL: string
  readonly VITE_SRT_URL: string
  readonly VITE_MPEGTS_URL: string
  readonly VITE_DEFAULT_VHOST: string
  readonly VITE_DEFAULT_APP: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
