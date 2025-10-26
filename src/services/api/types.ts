// API Response Types
export interface StreamListResponse {
  statusCode: number
  message: string
  response: string[]
}

export interface StreamStatsResponse {
  statusCode: number
  message: string
  response: StreamStats
}

export interface StreamStats {
  connections: StreamConnections
  createdTime: string
  lastRecvTime?: string
  lastSentTime?: string
  totalBytesIn: number // bytes
  totalBytesOut: number // bytes
  totalConnections: number
  avgThroughputIn: number // bits per second
  avgThroughputOut: number // bits per second
  maxThroughputIn: number // bits per second
  maxThroughputOut: number // bits per second
}

export interface StreamConnections {
  file: number
  hlsv3: number
  llhls: number
  ovt: number
  push: number
  srt: number
  thumbnail: number
  webrtc: number
}

// Stream URL Configuration
export interface StreamUrls {
  srt: string
  rtmp: string
  rtmpStreamKey: string
  webrtc: string
  whip: string
}

// Stream Info (for UI)
export interface StreamInfo {
  name: string
  isLive: boolean
  viewerCount: number
  stats?: StreamStats
  isRecording?: boolean
}

// Stream Details with variants
export interface StreamDetailsResponse {
  statusCode: number
  message: string
  response: StreamDetails
}

export interface StreamDetails {
  name: string
  input: {
    createdTime: string
    sourceType: string
    sourceUrl: string
    tracks: Track[]
  }
  outputs: Output[]
}

export interface Track {
  id: number
  name: string
  type: 'Video' | 'Audio' | 'Data'
  video?: VideoTrack
  audio?: AudioTrack
}

export interface VideoTrack {
  bitrate?: number
  bypass: boolean
  codec?: string
  framerate?: number
  height?: number
  width?: number
}

export interface AudioTrack {
  bitrate?: number
  bypass: boolean
  codec?: string
  channel?: number
  samplerate?: number
}

export interface Output {
  name: string
  tracks: Track[]
  playlists: Playlist[]
}

export interface Playlist {
  fileName: string
  name: string
  options: {
    enableTsPackaging: boolean
    hlsChunklistPathDepth: number
    webrtcAutoAbr: boolean
  }
  renditions: Rendition[]
}

export interface Rendition {
  name: string
  videoVariantName: string
  audioVariantName: string
}

export interface VariantOption {
  name: string
  displayName: string
  type: 'Video' | 'Audio'
  description: string
}

// Recording types
export interface StartRecordingRequest {
  id: string
  stream: {
    name: string
    variantNames?: string[]
  }
  filePath?: string
  infoPath?: string
  interval?: number
  schedule?: string
  segmentationRule?: 'continuity' | 'discontinuity'
}

export interface StopRecordingRequest {
  id: string
}

export interface RecordingStateRequest {
  id?: string
}

export interface RecordingTask {
  id: string
  state: 'ready' | 'recording' | 'stopping' | 'stopped' | 'error'
  vhost: string
  app: string
  stream: {
    name: string
    trackIds: number[]
    variantNames: string[]
  }
  interval?: number
  schedule?: string
  segmentationRule?: 'continuity' | 'discontinuity'
  createdTime: string
  filePath?: string
  infoPath?: string
}

export interface RecordingResponse {
  statusCode: number
  message: string
  response: RecordingTask | RecordingTask[]
}
