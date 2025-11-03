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
    streams.value.find((s: StreamInfo) => s.name === activeStreamName.value)
  )

  const liveStreams = computed(() => 
    streams.value.filter((s: StreamInfo) => s.isLive)
  )

  const totalViewers = computed(() => 
    streams.value.reduce((total: number, stream: StreamInfo) => total + stream.viewerCount, 0)
  )

  // Actions
  async function fetchStreams() {
    loading.value = true
    error.value = null
    try {
      const streamNames = await omeApi.getStreams()
      const existingMap = new Map(streams.value.map(stream => [stream.name, stream]))

      const nextStreams: StreamInfo[] = streamNames.map((name) => {
        const existing = existingMap.get(name)
        return {
          name,
          isLive: true,
          viewerCount: existing?.viewerCount ?? 0,
          isRecording: existing?.isRecording ?? false,
          stats: existing?.stats,
          width: existing?.width,
          height: existing?.height,
          aspectRatio: existing?.aspectRatio,
        }
      })

      streams.value = nextStreams

      const recordings = await omeApi.getRecordingState()

      await Promise.all(
        streams.value.map(async (stream) => {
          const [statsResponse, detailsResponse] = await Promise.all([
            omeApi.getStreamStats(stream.name),
            omeApi.getStreamDetails(stream.name),
          ])

          if (statsResponse?.response) {
            stream.stats = statsResponse.response
            stream.viewerCount = calculateViewerCount(statsResponse.response)
          }

          const videoTrack = detailsResponse?.response?.input.tracks.find(
            (track) => track.type === 'Video' && track.video
          )

          if (videoTrack?.video) {
            const { width, height } = videoTrack.video
            stream.width = width
            stream.height = height
            stream.aspectRatio = width && height ? width / height : DEFAULT_ASPECT_RATIO
          }

          stream.isRecording = recordings.some((recording) =>
            recording.stream.name === stream.name &&
            ['recording', 'ready', 'stopping'].includes(recording.state)
          )
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
    return Object.values(stats.connections).reduce((sum: number, count: unknown) => sum + (count as number), 0)
  }

  // Default aspect ratio constant
  const DEFAULT_ASPECT_RATIO = 16 / 9

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
