import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { omeApi } from '@/services/api/omeApi'
import { type StreamInfo, type StreamStats } from '@/services/api/types'

export const useStreamStore = defineStore('streams', () => {
  // State
  const streams = ref<StreamInfo[]>([])
  const activeStreamName = ref<string | null>(null)
  const activeStreamStats = ref<StreamStats | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const activeStream = computed(() => 
    streams.value.find(s => s.name === activeStreamName.value)
  )

  const liveStreams = computed(() => 
    streams.value.filter(s => s.isLive)
  )

  const totalViewers = computed(() => 
    streams.value.reduce((total, stream) => total + stream.viewerCount, 0)
  )

  // Actions
  async function fetchStreams() {
    loading.value = true
    error.value = null
    try {
      const streamNames = await omeApi.getStreams()
      
      // Create StreamInfo objects for each stream
      streams.value = streamNames.map(name => ({
        name,
        isLive: true, // If it's in the list, it's live
        viewerCount: 0,
      }))

      // Fetch stats for each stream to get viewer counts
      await Promise.all(
        streams.value.map(async (stream) => {
          const statsResponse = await omeApi.getStreamStats(stream.name)
          if (statsResponse?.response) {
            stream.stats = statsResponse.response
            stream.viewerCount = calculateViewerCount(statsResponse.response)
          }
        })
      )
    } catch (err) {
      error.value = 'Failed to fetch streams'
      console.error('Error fetching streams:', err)
    } finally {
      loading.value = false
    }
  }

  async function fetchStreamStats(streamName: string) {
    try {
      const statsResponse = await omeApi.getStreamStats(streamName)
      if (statsResponse?.response) {
        activeStreamStats.value = statsResponse.response
        
        // Update the stream in the list
        const stream = streams.value.find((s: StreamInfo) => s.name === streamName)
        if (stream) {
          stream.stats = statsResponse.response
          stream.viewerCount = calculateViewerCount(statsResponse.response)
        }
      }
    } catch (err) {
      console.error(`Error fetching stats for ${streamName}:`, err)
    }
  }

  function setActiveStream(streamName: string) {
    activeStreamName.value = streamName
    fetchStreamStats(streamName)
  }

  function clearActiveStream() {
    activeStreamName.value = null
    activeStreamStats.value = null
  }

  // Helper function to calculate total viewer count from connections
  function calculateViewerCount(stats: StreamStats): number {
    return Object.values(stats.connections).reduce((sum, count) => sum + count, 0)
  }

  // Start polling for updates (optional, for real-time updates)
  let pollInterval: number | null = null

  function startPolling(intervalMs = 5000) {
    if (pollInterval) return
    
    pollInterval = window.setInterval(() => {
      // Only fetch streams list on home page, not when viewing a stream
      if (!activeStreamName.value) {
        fetchStreams()
      } else {
        // When viewing a stream, only update that stream's stats
        fetchStreamStats(activeStreamName.value)
      }
    }, intervalMs)
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval)
      pollInterval = null
    }
  }

  return {
    // State
    streams,
    activeStreamName,
    activeStreamStats,
    loading,
    error,
    // Getters
    activeStream,
    liveStreams,
    totalViewers,
    // Actions
    fetchStreams,
    fetchStreamStats,
    setActiveStream,
    clearActiveStream,
    startPolling,
    stopPolling,
  }
})
