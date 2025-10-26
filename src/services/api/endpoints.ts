import { config } from '@/config'

export const endpoints = {
  // Get list of all streams
  getStreams: () => `/v1/vhosts/${config.ome.vhost}/apps/${config.ome.app}/streams`,
  
  // Get statistics for a specific stream
  getStreamStats: (streamName: string) => 
    `/v1/stats/current/vhosts/${config.ome.vhost}/apps/${config.ome.app}/streams/${streamName}`,
  
  // Get detailed stream information including variants
  getStreamDetails: (streamName: string) =>
    `/v1/vhosts/${config.ome.vhost}/apps/${config.ome.app}/streams/${streamName}`,
  
  // Recording endpoints
  startRecording: () => `/v1/vhosts/${config.ome.vhost}/apps/${config.ome.app}:startRecord`,
  stopRecording: () => `/v1/vhosts/${config.ome.vhost}/apps/${config.ome.app}:stopRecord`,
  getRecordingState: () => `/v1/vhosts/${config.ome.vhost}/apps/${config.ome.app}:records`,
}

// Generate full URL for stream details (useful for opening in browser)
export const generateStreamDetailsUrl = (streamName: string) => {
  return `${config.api.baseUrl}${endpoints.getStreamDetails(streamName)}`
}

// Generate streaming URLs for a given stream name (for ingestion/providers)
export const generateStreamUrls = (streamName: string) => {
  // Extract host and port from URLs
  const srtHost = config.ome.providers.srtUrl.replace('srt://', '')
  
  return {
    // SRT: srt://host:port?streamid=default/app/streamname
    srt: `srt://${srtHost}?streamid=${config.ome.vhost}/${config.ome.app}/${streamName}`,
    
    // RTMP: rtmp://host:port/app/ (stream key is separate)
    rtmp: `${config.ome.providers.rtmpUrl}/${config.ome.app}/`,
    rtmpStreamKey: streamName,
    
    // WebRTC/WHIP: ws://host:port/app/streamname?direction=send (self-defined signaling)
    webrtc: `${config.ome.providers.webrtcUrl}/${config.ome.app}/${streamName}?direction=send`,
    
    // WHIP: http(s)://host:port/app/streamname?direction=whip
    whip: `${config.ome.providers.webrtcUrl.replace(/^ws/, 'http')}/${config.ome.app}/${streamName}?direction=whip`,
  }
}

// Generate playback URLs for OvenPlayer (multiple sources for protocol selection)
export const generatePlaybackSources = (streamName: string) => {
  // For WebRTC with transcodes, use the playlist name (multistream_webrtc) instead of just stream name
  const webrtcUrl = `${config.ome.publishers.webrtcUrl}/${config.ome.app}/${streamName}/multistream_webrtc`
  const llhlsUrl = `${config.ome.publishers.llhlsUrl}/${config.ome.app}/${streamName}/multistream_llhls.m3u8`

  console.log('WebRTC URL:', webrtcUrl);
  console.log('LLHLS URL:', llhlsUrl);
  
  return [
    {
      type: 'webrtc' as const,
      file: webrtcUrl,
      label: 'WebRTC'
    },
    {
      type: 'llhls' as const,
      file: llhlsUrl,
      label: 'LLHLS'
    }
  ]
}

// Generate thumbnail URL for a stream
// Example: /thumbnails/app/Devedse/thumb.png?t=1234567890
// Includes a timestamp parameter to prevent browser caching
export const generateThumbnailUrl = (streamName: string) => {
  // Add timestamp to prevent caching - thumbnails update frequently for live streams
  const timestamp = Date.now()
  return `${config.api.thumbnailUrl}/${config.ome.app}/${streamName}/thumb.png?t=${timestamp}`
}