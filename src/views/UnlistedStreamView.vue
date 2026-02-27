<template>
  <div class="stream-view-container">
    <!-- Loading state -->
    <div v-if="streamState === 'loading'" class="d-flex align-center justify-center" style="height: calc(100vh - 64px);">
      <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
    </div>

    <!-- Invalid / expired link -->
    <div v-else-if="streamState === 'not-found'" class="d-flex flex-column align-center justify-center" style="height: calc(100vh - 64px);">
      <v-icon icon="mdi-link-off" size="80" color="grey" class="mb-4"></v-icon>
      <h2 class="text-h5 mb-2">Link Not Available</h2>
      <p class="text-body-1 text-grey mb-6">This share link is invalid, has expired, or the stream is not currently live.</p>
      <v-btn color="primary" variant="flat" @click="router.push('/')">
        <v-icon icon="mdi-arrow-left" start></v-icon>
        Back to Streams
      </v-btn>
    </div>

    <!-- Stream content (accessible) -->
    <template v-else>
      <!-- Compact header -->
      <div class="stream-header">
        <v-btn
          variant="text"
          size="small"
          @click="router.push('/')"
          class="back-btn"
        >
          <v-icon icon="mdi-arrow-left" start></v-icon>
          Back
        </v-btn>
        <div class="stream-title">
          <v-chip color="error" size="small" class="live-badge">
            <v-icon icon="mdi-circle" size="x-small" class="mr-1"></v-icon>
            LIVE
          </v-chip>
          <h1 class="text-h6">{{ displayName }}</h1>
          <v-chip
            color="orange"
            size="small"
            variant="flat"
          >
            <v-icon icon="mdi-link-lock" size="x-small" class="mr-1"></v-icon>
            UNLISTED
          </v-chip>
        </div>
        <span></span>
      </div>

      <!-- Main content grid -->
      <div class="stream-content">
        <div class="player-wrapper">
          <v-card elevation="2" class="player-card">
            <OvenPlayerComponent
              :sources="playbackSources"
              :stream-name="channelName"
              :autoplay="true"
              :mute="false"
            />
          </v-card>
        </div>

        <div class="stats-wrapper">
          <StreamStats
            :stream-name="channelName"
            :stats="stats"
            :loading="statsLoading"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { config } from '@/config'
import { generatePlaybackSources } from '@/services/api/endpoints'
import { omeApi } from '@/services/api/omeApi'
import { parseUnlistedChannelName } from '@/utils/unlistedSecrets'
import OvenPlayerComponent from '@/components/player/OvenPlayerComponent.vue'
import StreamStats from '@/components/streams/StreamStats.vue'
import type { StreamStats as StreamStatsType } from '@/services/api/types'

const route = useRoute()
const router = useRouter()

const channelName = computed(() => route.params.channelName as string)

// Parse display name from channel name (strip __ul__{secret})
const displayName = computed(() => {
  const parsed = parseUnlistedChannelName(channelName.value)
  return parsed?.streamName ?? channelName.value
})

type StreamState = 'loading' | 'not-found' | 'accessible'
const streamState = ref<StreamState>('loading')
const stats = ref<StreamStatsType | null>(null)
const statsLoading = ref(false)

// Generate playback sources — no auth token needed, the secret is in the channel name
const playbackSources = computed(() => {
  return generatePlaybackSources(channelName.value, {
    app: config.ome.appUnlisted,
  })
})

async function checkStreamAccess() {
  streamState.value = 'loading'
  try {
    const details = await omeApi.getUnlistedStreamDetails(channelName.value)
    streamState.value = details ? 'accessible' : 'not-found'
  } catch {
    streamState.value = 'not-found'
  }
}

async function fetchStats() {
  statsLoading.value = true
  try {
    const statsResponse = await omeApi.getUnlistedStreamStats(channelName.value)
    if (statsResponse?.response) {
      stats.value = statsResponse.response
    }
  } catch (err) {
    console.error(`Error fetching stats for unlisted stream:`, err)
  } finally {
    statsLoading.value = false
  }
}

// Polling for stats
let pollInterval: number | null = null

function startPolling(intervalMs = 5000) {
  if (pollInterval) return
  pollInterval = window.setInterval(() => {
    fetchStats()
  }, intervalMs)
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

onMounted(async () => {
  await checkStreamAccess()
  if (streamState.value === 'accessible') {
    await fetchStats()
    startPolling(3000)
  }
})

onBeforeUnmount(() => {
  stopPolling()
})
</script>

<style scoped>
.stream-view-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  overflow: hidden;
}

.stream-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  flex-shrink: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.stream-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stream-title h1 {
  margin: 0;
  font-weight: 600;
}

.live-badge {
  margin-right: 0;
}

.stream-content {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 16px;
  padding: 16px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.player-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.player-card {
  max-width: 100%;
  max-height: 100%;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.player-card :deep(.oven-player-wrapper) {
  max-width: 100%;
  max-height: 100%;
  width: 100% !important;
  height: 100% !important;
}

.stats-wrapper {
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

@media (max-width: 1280px) {
  .stream-content {
    grid-template-columns: 1fr 340px;
  }
}

@media (max-width: 1024px) {
  .stream-content {
    grid-template-columns: 1fr 300px;
  }
}

@media (max-width: 768px) {
  .stream-content {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }

  .stats-wrapper {
    max-height: 400px;
  }
}
</style>
