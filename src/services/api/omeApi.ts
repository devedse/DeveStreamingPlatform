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
  type RecordingTask
} from './types'
import { endpoints } from './endpoints'

class OmeApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: config.api.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        // No Authorization header needed - handled by proxy
      },
    })

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log('API Request:', config.method?.toUpperCase(), config.url)
        return config
      },
      (error) => {
        return Promise.reject(error)
      }
    )

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        return response
      },
      (error) => {
        console.error('API Error:', error.message)
        if (error.response) {
          console.error('Response status:', error.response.status)
          console.error('Response data:', error.response.data)
        }
        return Promise.reject(error)
      }
    )
  }

  // Get all streams
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
      // Response is a single RecordingTask object
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
      // Response is always an array
      const data = response.data.response
      return Array.isArray(data) ? data : [data]
    } catch (error) {
      console.error('Failed to fetch recording state:', error)
      return []
    }
  }
}

// Export a singleton instance
export const omeApi = new OmeApiClient()
