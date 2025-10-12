export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://10.88.28.212:8081',
    accessToken: import.meta.env.VITE_API_ACCESS_TOKEN || 'ome-access-token',
  },
  ome: {
    vhost: import.meta.env.VITE_DEFAULT_VHOST || 'default',
    app: import.meta.env.VITE_DEFAULT_APP || 'app',
    webrtcUrl: import.meta.env.VITE_WEBRTC_URL || 'ws://10.88.28.212:3333',
    rtmpUrl: import.meta.env.VITE_RTMP_URL || 'rtmp://10.88.28.212:1935',
    srtUrl: import.meta.env.VITE_SRT_URL || 'srt://10.88.28.212:9999',
    mpegtsUrl: import.meta.env.VITE_MPEGTS_URL || 'udp://10.88.28.212:4000',
  },
}
