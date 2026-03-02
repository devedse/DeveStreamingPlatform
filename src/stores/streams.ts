import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { omeApi } from '@/services/api/omeApi'
import { useAuthStore } from '@/stores/auth'
import { type StreamInfo, type StreamStats } from '@/services/api/types'
import { parseUnlistedChannelName, generateSecret, buildUnlistedChannelName, buildShareUrl } from '@/utils/unlistedSecrets'

export const useStreamStore = defineStore('streams', () => {
  const authStore = useAuthStore()

  // State
  const streams = ref<StreamInfo[]>([])
  const activeStreamName = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  /** Names of streams that exist in the public app */
  const publicStreamNames = ref<Set<string>>(new Set())
  /** Map of streamName → full unlisted channel name (includes __ul__{secret}) */
  const unlistedChannelNames = ref<Map<string, string>>(new Map())

  // Getters
  const activeStream = computed(() =>
    streams.value.find((s: StreamInfo) => s.name === activeStreamName.value)
  )

  /** Stats for the active stream (derived from stream data, no separate state) */
  const activeStreamStats = computed(() => activeStream.value?.stats ?? null)

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

  /** Streams that have an unlisted share link */
  const unlistedStreams = computed(() =>
    streams.value.filter((s: StreamInfo) => s.isUnlisted)
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
    // Fetch main app streams, public app streams, and unlisted channels in parallel
    // Use multiplexChannels to determine which streams are configured as public
    // (this shows intent, even if the stream isn't live in app-public yet)
    const [streamNames, publicNames, unlistedNames] = await Promise.all([
      omeApi.getStreams(),
      omeApi.getPublicMultiplexChannels(),
      omeApi.getUnlistedMultiplexChannels(),
    ])

    publicStreamNames.value = new Set(publicNames)

    // Parse unlisted channel names to map streamName → full channel name
    unlistedChannelNames.value = new Map()
    for (const ch of unlistedNames) {
      const parsed = parseUnlistedChannelName(ch)
      if (parsed) {
        unlistedChannelNames.value.set(parsed.streamName, ch)
      }
    }

    const existingMap = new Map(streams.value.map(stream => [stream.name, stream]))

    const nextStreams: StreamInfo[] = streamNames.map((name) => {
      const existing = existingMap.get(name)
      return {
        name,
        isLive: true,
        viewerCount: existing?.viewerCount ?? 0,
        isRecording: existing?.isRecording ?? false,
        isPublic: publicStreamNames.value.has(name),
        isUnlisted: unlistedChannelNames.value.has(name),
        unlistedChannelName: unlistedChannelNames.value.get(name),
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

  /** Manual refresh of stats for a specific stream (used by StreamStats refresh button) */
  async function fetchStreamStats(streamName: string) {
    try {
      const statsResponse = authStore.isAuthenticated
        ? await omeApi.getStreamStats(streamName)
        : await omeApi.getPublicStreamStats(streamName)

      if (statsResponse?.response) {
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
  }

  function clearActiveStream() {
    activeStreamName.value = null
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

  // ============================================
  // Unlisted stream actions
  // ============================================

  /**
   * Create an unlisted share link for a stream.
   * Returns the share URL on success, or null on failure.
   */
  async function makeStreamUnlisted(streamName: string): Promise<string | null> {
    const secret = generateSecret()
    const channelName = buildUnlistedChannelName(streamName, secret)
    const success = await omeApi.makeStreamUnlisted(streamName, channelName)
    if (success) {
      unlistedChannelNames.value.set(streamName, channelName)
      const stream = streams.value.find(s => s.name === streamName)
      if (stream) {
        stream.isUnlisted = true
        stream.unlistedChannelName = channelName
      }
      return buildShareUrl(channelName)
    }
    return null
  }

  /**
   * Remove the unlisted share link for a stream.
   */
  async function removeUnlistedStream(streamName: string): Promise<boolean> {
    const channelName = unlistedChannelNames.value.get(streamName)
    if (!channelName) return false
    const success = await omeApi.removeUnlistedStream(channelName)
    if (success) {
      unlistedChannelNames.value.delete(streamName)
      const stream = streams.value.find(s => s.name === streamName)
      if (stream) {
        stream.isUnlisted = false
        stream.unlistedChannelName = undefined
      }
    }
    return success
  }

  /**
   * Regenerate the unlisted secret (old link stops working, new link is returned).
   */
  async function regenerateUnlistedSecret(streamName: string): Promise<string | null> {
    await removeUnlistedStream(streamName)
    return makeStreamUnlisted(streamName)
  }

  /**
   * Get the share URL for an unlisted stream (if it exists).
   */
  function getUnlistedShareUrl(streamName: string): string | null {
    const channelName = unlistedChannelNames.value.get(streamName)
    return channelName ? buildShareUrl(channelName) : null
  }

  // Helper function to calculate total viewer count from connections
  function calculateViewerCount(stats: StreamStats): number {
    return Object.values(stats.connections).reduce((sum: number, count: unknown) => sum + (count as number), 0)
  }

  // Default aspect ratio constant
  const DEFAULT_ASPECT_RATIO = 16 / 9

  // Polling
  let pollInterval: number | null = null

  function pollTick() {
    fetchStreams()
  }

  async function startPolling(intervalMs = 5000) {
    if (pollInterval) return

    // Immediate first fetch so callers don't need a separate fetchStreams() call
    await pollTick()

    pollInterval = window.setInterval(pollTick, intervalMs)
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
    unlistedChannelNames,
    // Getters
    activeStream,
    liveStreams,
    publicLiveStreams,
    visibleStreams,
    orphanedStreams,
    unlistedStreams,
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
    makeStreamUnlisted,
    removeUnlistedStream,
    regenerateUnlistedSecret,
    getUnlistedShareUrl,
    startPolling,
    stopPolling,
  }
})
