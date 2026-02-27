import axios, { type AxiosInstance } from 'axios'
import { config } from '@/config'
import {
  type StreamListResponse,
  type StreamStatsResponse,
  type StreamDetailsResponse,
  type StartRecordingRequest,
  type StopRecordingRequest,
  type RecordingStateRequest,
  type RecordingResponse,
  type RecordingTask,
  type PullStreamRequest,
  type PullStreamResponse,
  type MultiplexChannelRequest,
  type MultiplexChannelResponse,
  type MultiplexChannelListResponse
} from './types'
import { endpoints } from './endpoints'

function createApiClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      console.error('API Error:', error.message)
      if (error.response) {
        console.error('Response status:', error.response.status)
        console.error('Response data:', error.response.data)
      }
      return Promise.reject(error)
    }
  )

  return client
}

class OmeApiClient {
  /** Authenticated client — uses /omeapi (requires cookie auth) */
  private client: AxiosInstance
  /** Public client — uses /public-api (no auth, read-only GET) */
  private publicClient: AxiosInstance

  constructor() {
    this.client = createApiClient(config.api.baseUrl)
    this.publicClient = createApiClient(config.api.publicBaseUrl)
  }

  // ============================================
  // Main App Methods (Authenticated)
  // ============================================

  // Get all streams from the main app
  async getStreams(): Promise<string[]> {
    try {
      const response = await this.client.get<StreamListResponse>(endpoints.getStreams())
      return response.data.response || []
    } catch (error) {
      console.error('Failed to fetch streams:', error)
      return []
    }
  }

  // Get stream statistics
  async getStreamStats(streamName: string): Promise<StreamStatsResponse | null> {
    try {
      const response = await this.client.get<StreamStatsResponse>(
        endpoints.getStreamStats(streamName)
      )
      return response.data
    } catch (error) {
      console.error(`Failed to fetch stats for stream ${streamName}:`, error)
      return null
    }
  }

  // Get stream details including variants
  async getStreamDetails(streamName: string): Promise<StreamDetailsResponse | null> {
    try {
      const response = await this.client.get<StreamDetailsResponse>(
        endpoints.getStreamDetails(streamName)
      )
      return response.data
    } catch (error) {
      console.error(`Failed to fetch details for stream ${streamName}:`, error)
      return null
    }
  }

  // Start recording a stream
  async startRecording(request: StartRecordingRequest): Promise<RecordingTask | null> {
    try {
      const response = await this.client.post<RecordingResponse>(
        endpoints.startRecording(),
        request
      )
      return response.data.response as RecordingTask
    } catch (error) {
      console.error('Failed to start recording:', error)
      return null
    }
  }

  // Stop recording a stream
  async stopRecording(request: StopRecordingRequest): Promise<boolean> {
    try {
      const response = await this.client.post<RecordingResponse>(
        endpoints.stopRecording(),
        request
      )
      return response.data.statusCode === 200
    } catch (error) {
      console.error('Failed to stop recording:', error)
      return false
    }
  }

  // Get recording state(s)
  async getRecordingState(request?: RecordingStateRequest): Promise<RecordingTask[]> {
    try {
      const response = await this.client.post<RecordingResponse>(
        endpoints.getRecordingState(),
        request || {}
      )
      const data = response.data.response
      return Array.isArray(data) ? data : [data]
    } catch (error) {
      console.error('Failed to fetch recording state:', error)
      return []
    }
  }

  // Create a pulled stream (RTSP, OVT)
  async createPullStream(request: PullStreamRequest): Promise<boolean> {
    try {
      const response = await this.client.post<PullStreamResponse>(
        endpoints.createPullStream(),
        request
      )
      return response.data.statusCode === 201
    } catch (error) {
      console.error('Failed to create pull stream:', error)
      return false
    }
  }

  // Delete a stream (stops pulling)
  async deleteStream(streamName: string): Promise<boolean> {
    try {
      const response = await this.client.delete(
        endpoints.deleteStream(streamName)
      )
      return response.status === 200 || response.status === 204
    } catch (error) {
      console.error('Failed to delete stream:', error)
      return false
    }
  }

  // ============================================
  // Public App Methods (No Auth Required)
  // ============================================

  // Get all streams from the public app (visible to unauthenticated users)
  async getPublicStreams(): Promise<string[]> {
    try {
      const response = await this.publicClient.get<StreamListResponse>(
        endpoints.getStreams(config.ome.appPublic)
      )
      return response.data.response || []
    } catch (error) {
      console.error('Failed to fetch public streams:', error)
      return []
    }
  }

  // Get multiplex channels from the public app (no auth required)
  // These represent streams configured as public, even if not currently live
  async getPublicMultiplexChannels(): Promise<string[]> {
    try {
      const response = await this.publicClient.get<MultiplexChannelListResponse>(
        endpoints.getMultiplexChannels(config.ome.appPublic)
      )
      return response.data.response || []
    } catch (error) {
      console.error('Failed to fetch multiplex channels:', error)
      return []
    }
  }

  // Get public stream statistics
  async getPublicStreamStats(streamName: string): Promise<StreamStatsResponse | null> {
    try {
      const response = await this.publicClient.get<StreamStatsResponse>(
        endpoints.getStreamStats(streamName, config.ome.appPublic)
      )
      return response.data
    } catch (error) {
      console.error(`Failed to fetch public stats for stream ${streamName}:`, error)
      return null
    }
  }

  // Get public stream details
  async getPublicStreamDetails(streamName: string): Promise<StreamDetailsResponse | null> {
    try {
      const response = await this.publicClient.get<StreamDetailsResponse>(
        endpoints.getStreamDetails(streamName, config.ome.appPublic)
      )
      return response.data
    } catch (error) {
      console.error(`Failed to fetch public details for stream ${streamName}:`, error)
      return null
    }
  }

  // ============================================
  // Public/Private Toggle (Authenticated)
  // Uses MultiplexChannel / stream:// protocol for zero-copy internal relay
  // ============================================

  /**
   * Make a stream public by creating a MultiplexChannel in the public app.
   * Uses stream:// protocol for zero-copy internal relay.
   */
  async makeStreamPublic(streamName: string): Promise<boolean> {
    try {
      const request: MultiplexChannelRequest = {
        outputStream: {
          name: streamName,
        },
        sourceStreams: [
          {
            name: streamName,
            url: `stream://${config.ome.vhost}/${config.ome.app}/${streamName}`,
            trackMap: [
              {
                sourceTrackName: 'bypass_video',
                newTrackName: 'video',
              },
              {
                sourceTrackName: 'bypass_audio',
                newTrackName: 'audio',
              },
              {
                sourceTrackName: 'opus_audio',
                newTrackName: 'opus_audio',
              },
            ],
          },
        ],
        playlists: [
          {
            name: 'for LLHLS',
            fileName: 'multistream_llhls',
            renditions: [
              {
                name: 'Source',
                video: 'video',
                audio: 'audio',
              },
            ],
          },
          {
            name: 'for WebRTC',
            fileName: 'multistream_webrtc',
            renditions: [
              {
                name: 'Source',
                video: 'video',
                audio: 'opus_audio',
              },
            ],
          },
        ],
      }
      const response = await this.client.post<MultiplexChannelResponse>(
        endpoints.createMultiplexChannel(config.ome.appPublic),
        request
      )
      return response.data.statusCode === 200 || response.data.statusCode === 201
    } catch (error) {
      console.error(`Failed to make stream public: ${streamName}`, error)
      return false
    }
  }

  /**
   * Make a stream private by deleting its MultiplexChannel from the public app.
   */
  async makeStreamPrivate(streamName: string): Promise<boolean> {
    try {
      const response = await this.client.delete(
        endpoints.deleteMultiplexChannel(streamName, config.ome.appPublic)
      )
      return response.status === 200 || response.status === 204
    } catch (error) {
      console.error(`Failed to make stream private: ${streamName}`, error)
      return false
    }
  }
}

// Export a singleton instance
export const omeApi = new OmeApiClient()
