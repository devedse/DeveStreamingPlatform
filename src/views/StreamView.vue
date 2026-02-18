<template>
  <div class="stream-view-container">
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
        <h1 class="text-h6">{{ streamName }}</h1>
      </div>
      <v-btn
        variant="tonal"
        size="small"
        color="grey"
        @click="openStreamDetailsDebug"
        class="debug-btn"
      >
        <v-icon icon="mdi-cog" start></v-icon>
        Advanced Stream Details
      </v-btn>
    </div>

    <!-- Main content grid -->
    <div class="stream-content">
      <div class="player-wrapper">
        <v-card elevation="2" class="player-card">
          <OvenPlayerComponent
            :sources="playbackSources"
            :stream-name="streamName"
            :autoplay="true"
            :mute="false"
          />
        </v-card>
      </div>

      <div class="stats-wrapper">
        <StreamStats 
          :stream-name="streamName"
          :stats="stats" 
          :loading="statsLoading"
        />
        
        <div class="mt-4">
          <RecordingControls :stream-name="streamName" />
        </div>
        
        <!-- Stop pulling stream button -->
        <div v-if="isPulledStream" class="mt-4">
          <v-card elevation="2">
            <v-card-title class="text-subtitle-1">
              <v-icon icon="mdi-download-network" start color="secondary"></v-icon>
              Pulled Stream
            </v-card-title>
            <v-card-text>
              <p class="text-body-2 mb-3">
                This stream is being pulled from an external source.
              </p>
              <v-btn
                color="error"
                variant="flat"
                block
                @click="showStopDialog = true"
                :loading="deletingStream"
              >
                <v-icon icon="mdi-stop-circle" start></v-icon>
                Stop Pulling Stream
              </v-btn>
            </v-card-text>
          </v-card>
        </div>
      </div>
    </div>
    
    <!-- Confirmation dialog -->
    <v-dialog v-model="showStopDialog" max-width="450">
      <v-card>
        <v-card-title class="text-h6">
          <v-icon icon="mdi-alert" color="error" class="mr-2"></v-icon>
          Stop Pulling Stream?
        </v-card-title>
        <v-card-text>
          <p>Are you sure you want to stop pulling <strong>{{ streamName }}</strong>?</p>
          <p class="text-body-2 text-grey mt-2">This will terminate the stream and disconnect all viewers.</p>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showStopDialog = false" :disabled="deletingStream">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="stopPulling" :loading="deletingStream">
            Stop Stream
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStreamStore } from '@/stores/streams'
import { generatePlaybackSources, generateStreamDetailsUrl } from '@/services/api/endpoints'
import { omeApi } from '@/services/api/omeApi'
import OvenPlayerComponent from '@/components/player/OvenPlayerComponent.vue'
import StreamStats from '@/components/streams/StreamStats.vue'
import RecordingControls from '@/components/streams/RecordingControls.vue'

const route = useRoute()
const router = useRouter()
const streamStore = useStreamStore()

const streamName = computed(() => route.params.name as string)
const playbackSources = computed(() => generatePlaybackSources(streamName.value))
const stats = computed(() => streamStore.activeStreamStats)
const statsLoading = computed(() => streamStore.loading)

const showStopDialog = ref(false)
const deletingStream = ref(false)

// Check if this is a pulled stream
const isPulledStream = computed(() => {
  const stream = streamStore.streams.find(s => s.name === streamName.value)
  const sourceType = stream?.sourceType?.toLowerCase() || ''
  return sourceType.includes('pull')
})

function openStreamDetailsDebug() {
  const url = generateStreamDetailsUrl(streamName.value)
  window.open(url, '_blank')
}

async function stopPulling() {
  deletingStream.value = true
  try {
    const success = await omeApi.deleteStream(streamName.value)
    if (success) {
      showStopDialog.value = false
      // Navigate back to home after stopping
      router.push('/')
    } else {
      alert('Failed to stop pulling stream. Please try again.')
    }
  } catch (error) {
    console.error('Error stopping stream:', error)
    alert('Error stopping stream. Please check console for details.')
  } finally {
    deletingStream.value = false
  }
}

onMounted(async () => {
  // Set active stream and fetch initial stats
  streamStore.setActiveStream(streamName.value)
  
  // Start polling for stats updates
  streamStore.startPolling(3000)
})

onBeforeUnmount(() => {
  // Clear active stream and stop polling
  streamStore.clearActiveStream()
  streamStore.stopPolling()
})
</script>

<style scoped>
.stream-view-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px); /* Full viewport minus AppHeader */
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
  min-height: 0; /* Important for nested scrolling */
  overflow: hidden;
}

/* Player wrapper - contains and centers the player */
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
  /* Constrain to container - will scale down in both directions */
  max-width: 100%;
  max-height: 100%;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.player-card :deep(.oven-player-wrapper) {
  /* Ensure OvenPlayer wrapper also respects max dimensions */
  max-width: 100%;
  max-height: 100%;
  width: 100% !important;
  height: 100% !important;
}


/* Stats sidebar - scrollable */
.stats-wrapper {
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

/* Responsive breakpoints - like Twitch */
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
