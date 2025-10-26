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
  totalBytesIn: number
  totalBytesOut: number
  totalConnections: number
  avgThroughputIn: number
  avgThroughputOut: number
  maxThroughputIn: number
  maxThroughputOut: number
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
