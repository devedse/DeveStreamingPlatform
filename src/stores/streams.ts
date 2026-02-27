import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { omeApi } from '@/services/api/omeApi'
import { useAuthStore } from '@/stores/auth'
import { type StreamInfo, type StreamStats } from '@/services/api/types'

export const useStreamStore = defineStore('streams', () => {
  const authStore = useAuthStore()

  // State
  const streams = ref<StreamInfo[]>([])
  const activeStreamName = ref<string | null>(null)
  const activeStreamStats = ref<StreamStats | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  /** Names of streams that exist in the public app */
  const publicStreamNames = ref<Set<string>>(new Set())

  // Getters
  const activeStream = computed(() =>
    streams.value.find((s: StreamInfo) => s.name === activeStreamName.value)
  )

  /** All live streams (for authenticated view — shows everything) */
  const liveStreams = computed(() =>
    streams.value.filter((s: StreamInfo) => s.isLive)
  )

  /** Only public live streams (for unauthenticated view) */
  const publicLiveStreams = computed(() =>
    streams.value.filter((s: StreamInfo) => s.isLive && s.isPublic)
  )

  /** Streams to display based on auth state (excludes orphaned) */
  const visibleStreams = computed(() =>
    authStore.isAuthenticated ? liveStreams.value : publicLiveStreams.value
  )

  /** Orphaned public streams (MultiplexChannel with no matching source stream) */
  const orphanedStreams = computed(() =>
    streams.value.filter((s: StreamInfo) => s.isOrphaned)
  )

  const totalViewers = computed(() =>
    streams.value.reduce((total: number, stream: StreamInfo) => total + stream.viewerCount, 0)
  )

  // Actions
  async function fetchStreams() {
    loading.value = true
    error.value = null
    try {
      if (authStore.isAuthenticated) {
        await fetchAllStreams()
      } else {
        await fetchPublicStreamsOnly()
      }
    } catch (err) {
      error.value = 'Failed to fetch streams'
      console.error('Error fetching streams:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Fetch all streams from the main app + check which are public
   * (for authenticated users)
   */
  async function fetchAllStreams() {
    // Fetch main app streams and public app streams in parallel
    // Use multiplexChannels to determine which streams are configured as public
    // (this shows intent, even if the stream isn't live in app-public yet)
    const [streamNames, publicNames] = await Promise.all([
      omeApi.getStreams(),
      omeApi.getPublicMultiplexChannels(),
    ])

    publicStreamNames.value = new Set(publicNames)
    const existingMap = new Map(streams.value.map(stream => [stream.name, stream]))

    const nextStreams: StreamInfo[] = streamNames.map((name) => {
      const existing = existingMap.get(name)
      return {
        name,
        isLive: true,
        viewerCount: existing?.viewerCount ?? 0,
        isRecording: existing?.isRecording ?? false,
        isPublic: publicStreamNames.value.has(name),
        stats: existing?.stats,
        width: existing?.width,
        height: existing?.height,
        aspectRatio: existing?.aspectRatio,
      }
    })

    // Detect orphaned public streams (exist in public app but not in main app)
    const mainStreamSet = new Set(streamNames)
    const orphanedStreams: StreamInfo[] = publicNames
      .filter(name => !mainStreamSet.has(name))
      .map((name) => {
        const existing = existingMap.get(name)
        return {
          name,
          isLive: false,
          viewerCount: existing?.viewerCount ?? 0,
          isPublic: true,
          isOrphaned: true,
          stats: existing?.stats,
        }
      })

    streams.value = [...nextStreams, ...orphanedStreams]

    const recordings = await omeApi.getRecordingState()

    // Only fetch stats/details for non-orphaned streams (orphaned ones don't exist in the main app)
    await Promise.all(
      streams.value.filter(stream => !stream.isOrphaned).map(async (stream) => {
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

        if (detailsResponse?.response?.input.sourceType) {
          stream.sourceType = detailsResponse.response.input.sourceType
        }

        stream.isRecording = recordings.some((recording) =>
          recording.stream.name === stream.name &&
          ['recording', 'ready', 'stopping'].includes(recording.state)
        )
      })
    )
  }

  /**
   * Fetch only public streams from the public app
   * (for unauthenticated users)
   */
  async function fetchPublicStreamsOnly() {
    const publicNames = await omeApi.getPublicStreams()
    publicStreamNames.value = new Set(publicNames)
    const existingMap = new Map(streams.value.map(stream => [stream.name, stream]))

    const nextStreams: StreamInfo[] = publicNames.map((name) => {
      const existing = existingMap.get(name)
      return {
        name,
        isLive: true,
        viewerCount: existing?.viewerCount ?? 0,
        isPublic: true,
        stats: existing?.stats,
        width: existing?.width,
        height: existing?.height,
        aspectRatio: existing?.aspectRatio,
      }
    })

    streams.value = nextStreams

    // Fetch stats and details from public API
    await Promise.all(
      streams.value.map(async (stream) => {
        const [statsResponse, detailsResponse] = await Promise.all([
          omeApi.getPublicStreamStats(stream.name),
          omeApi.getPublicStreamDetails(stream.name),
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

        if (detailsResponse?.response?.input.sourceType) {
          stream.sourceType = detailsResponse.response.input.sourceType
        }
      })
    )
  }

  async function fetchStreamStats(streamName: string) {
    try {
      const statsResponse = authStore.isAuthenticated
        ? await omeApi.getStreamStats(streamName)
        : await omeApi.getPublicStreamStats(streamName)

      if (statsResponse?.response) {
        activeStreamStats.value = statsResponse.response

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

  // Public/Private toggle actions

  /**
   * Make a stream public by creating a MultiplexChannel in the public app
   */
  async function makeStreamPublic(streamName: string): Promise<boolean> {
    const success = await omeApi.makeStreamPublic(streamName)
    if (success) {
      publicStreamNames.value.add(streamName)
      const stream = streams.value.find(s => s.name === streamName)
      if (stream) {
        stream.isPublic = true
      }
    }
    return success
  }

  /**
   * Make a stream private by removing it from the public app
   */
  async function makeStreamPrivate(streamName: string): Promise<boolean> {
    const success = await omeApi.makeStreamPrivate(streamName)
    if (success) {
      publicStreamNames.value.delete(streamName)
      const stream = streams.value.find(s => s.name === streamName)
      if (stream) {
        stream.isPublic = false
      }
    }
    return success
  }

  /**
   * Delete an orphaned public stream (MultiplexChannel with no matching source stream)
   */
  async function deleteOrphanedStream(streamName: string): Promise<boolean> {
    const success = await omeApi.makeStreamPrivate(streamName)
    if (success) {
      publicStreamNames.value.delete(streamName)
      streams.value = streams.value.filter(s => !(s.name === streamName && s.isOrphaned))
    }
    return success
  }

  /**
   * Check if a specific stream exists in the public app.
   * Uses the public API client so it works for unauthenticated users too.
   */
  async function isStreamPublic(streamName: string): Promise<boolean> {
    const publicNames = await omeApi.getPublicStreams()
    return publicNames.includes(streamName)
  }

  // Helper function to calculate total viewer count from connections
  function calculateViewerCount(stats: StreamStats): number {
    return Object.values(stats.connections).reduce((sum: number, count: unknown) => sum + (count as number), 0)
  }

  // Default aspect ratio constant
  const DEFAULT_ASPECT_RATIO = 16 / 9

  // Polling
  let pollInterval: number | null = null

  function startPolling(intervalMs = 5000) {
    if (pollInterval) return

    pollInterval = window.setInterval(() => {
      if (!activeStreamName.value) {
        fetchStreams()
      } else {
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
    publicStreamNames,
    // Getters
    activeStream,
    liveStreams,
    publicLiveStreams,
    visibleStreams,
    orphanedStreams,
    totalViewers,
    // Actions
    fetchStreams,
    fetchStreamStats,
    setActiveStream,
    clearActiveStream,
    makeStreamPublic,
    makeStreamPrivate,
    deleteOrphanedStream,
    isStreamPublic,
    startPolling,
    stopPolling,
  }
})
