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
  // Extract host and port from URLs
  const srtHost = config.ome.srtUrl.replace('srt://', '')
  
  return {
    // SRT: srt://host:port?streamid=default/app/streamname
    srt: `srt://${srtHost}?streamid=${config.ome.vhost}/${config.ome.app}/${streamName}`,
    
    // RTMP: rtmp://host:port/app/ (stream key is separate)
    rtmp: `${config.ome.rtmpUrl}/${config.ome.app}/`,
    rtmpStreamKey: streamName,
    
    // WebRTC/WHIP: ws://host:port/app/streamname?direction=send (self-defined signaling)
    webrtc: `${config.ome.webrtcUrl}/${config.ome.app}/${streamName}?direction=send`,
    
    // WHIP: http(s)://host:port/app/streamname?direction=whip
    whip: `${config.ome.webrtcUrl.replace(/^ws/, 'http')}/${config.ome.app}/${streamName}?direction=whip`,
  }
}

// Generate playback URLs for OvenPlayer (multiple sources for protocol selection)
export const generatePlaybackSources = (streamName: string) => {
  const webrtcUrl = `${config.ome.webrtcUrl}/${config.ome.app}/${streamName}`
  const llhlsUrl = `${config.ome.llhlsUrl}/${config.ome.app}/${streamName}/llhls.m3u8`

  console.log('WebRTC URL:', webrtcUrl);
  console.log('LLHLS URL:', llhlsUrl);
  
  return [
    {
      type: 'webrtc',
      file: webrtcUrl,
      label: 'WebRTC (Ultra Low Latency)'
    },
    {
      type: 'llhls',
      file: llhlsUrl,
      label: 'LLHLS (Low Latency)'
    }
  ]
}

// Generate playback URL for OvenPlayer (legacy, single source)
export const generatePlaybackUrl = (streamName: string) => {
  return `${config.ome.webrtcUrl}/${config.ome.app}/${streamName}`
}
