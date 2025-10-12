import { config } from '@/config'

export const endpoints = {
  // Get list of all streams
  getStreams: () => `/v1/vhosts/${config.ome.vhost}/apps/${config.ome.app}/streams`,
  
  // Get statistics for a specific stream
  getStreamStats: (streamName: string) => 
    `/v1/stats/current/vhosts/${config.ome.vhost}/apps/${config.ome.app}/streams/${streamName}`,
}

// Generate streaming URLs for a given stream name
export const generateStreamUrls = (streamName: string) => {
  return {
    srt: `${config.ome.srtUrl}?streamid=srt://${config.ome.srtUrl.replace('srt://', '')}/${config.ome.app}/${streamName}`,
    rtmp: `${config.ome.rtmpUrl}/${config.ome.app}/${streamName}`,
    webrtc: `${config.ome.webrtcUrl}/${config.ome.app}/${streamName}`,
    mpegts: config.ome.mpegtsUrl,
  }
}

// Generate playback URL for OvenPlayer
export const generatePlaybackUrl = (streamName: string) => {
  return `${config.ome.webrtcUrl}/${config.ome.app}/${streamName}`
}
