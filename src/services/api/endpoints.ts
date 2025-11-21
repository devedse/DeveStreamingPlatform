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
  // Validate that publisher URLs are configured
  if (!config.ome.publishers.webrtcUrl) {
    console.error('❌ ERROR: OME_PUBLISHER_WEBRTC_URL is not configured!');
    console.error('ENV_CONFIG:', window.ENV_CONFIG);
    console.error('This is likely a race condition - env-config.js may not have loaded before the app initialized.');
    throw new Error('Publisher WebRTC URL is not configured. Check console for details.');
  }

  if (!config.ome.publishers.llhlsUrl) {
    console.error('❌ ERROR: OME_PUBLISHER_LLHLS_URL is not configured!');
    console.error('ENV_CONFIG:', window.ENV_CONFIG);
    throw new Error('Publisher LLHLS URL is not configured. Check console for details.');
  }

  // For WebRTC with transcodes, use the playlist name (multistream_webrtc) instead of just stream name
  const webrtcBaseUrl = `${config.ome.publishers.webrtcUrl}/${config.ome.app}/${streamName}/multistream_webrtc`
  const llhlsBaseUrl = `${config.ome.publishers.llhlsUrl}/${config.ome.app}/${streamName}/multistream_llhls.m3u8`

  // Add auth token to URLs for admission webhook validation
  const webrtcUrl = `${webrtcBaseUrl}?auth=${config.ome.streamAuthToken}`
  const llhlsUrl = `${llhlsBaseUrl}?auth=${config.ome.streamAuthToken}`

  console.log('Please do not share this auth secret');
  console.log('WebRTC URL (with auth):', webrtcUrl);
  console.log('LLHLS URL (with auth):', llhlsUrl);
  
  // Check if running locally (localhost or 127.0.0.1)
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  
  // For local development, prefer LLHLS first (better for debugging multiple streams)
  // For production, prefer WebRTC first (lower latency)
  if (isLocal) {
    return [
      {
        type: 'llhls' as const,
        file: llhlsUrl,
        label: 'LLHLS'
      },
      {
        type: 'webrtc' as const,
        file: webrtcUrl,
        label: 'WebRTC'
      }
    ]
  }
  
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
  const base = `${config.api.thumbnailUrl}/${config.ome.app}/${streamName}/thumb.png`
  const token = config.ome.streamAuthToken
  // Only append auth when token is set and not the sentinel 'noauth'
  if (token && token !== 'noauth') {
    return `${base}?t=${timestamp}&auth=${encodeURIComponent(token)}`
  }
  return `${base}?t=${timestamp}`
}