import axios, { type AxiosInstance } from 'axios'
import { config } from '@/config'
import { type StreamListResponse, type StreamStatsResponse } from './types'
import { endpoints } from './endpoints'

class OmeApiClient {
  private client: AxiosInstance

  constructor() {
    // Create base64 encoded auth token from config
    const base64Auth = btoa(config.api.accessToken)
    
    this.client = axios.create({
      baseURL: config.api.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${base64Auth}`,
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
}

// Export a singleton instance
export const omeApi = new OmeApiClient()
