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
  webrtc: string
  mpegts: string
}

// Stream Info (for UI)
export interface StreamInfo {
  name: string
  isLive: boolean
  viewerCount: number
  stats?: StreamStats
}
