<template>
  <div class="multi-stream-container">
    <!-- Floating stream selector button -->
    <v-btn
      icon
      color="primary"
      class="stream-selector-fab"
      @click="showSelector = true"
      elevation="4"
    >
      <v-icon>mdi-view-grid-plus</v-icon>
    </v-btn>

    <!-- Stream grid - maximizes screen space -->
    <div 
      v-if="selectedStreams.length > 0"
      class="streams-grid"
      :class="gridClass"
    >
      <div
        v-for="stream in selectedStreams"
        :key="stream.name"
        class="stream-cell"
        :style="getStreamCellStyle(stream)"
      >
        <div class="stream-cell-inner">
          <div class="stream-label">
            {{ stream.name }}
            <span v-if="stream.width && stream.height" class="stream-resolution">
              {{ stream.width }}x{{ stream.height }}
            </span>
          </div>
          <OvenPlayerComponent
            :sources="generatePlaybackSources(stream.name)"
            :autoplay="false"
          />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="empty-state">
      <v-icon size="80" color="grey">mdi-television-off</v-icon>
      <h2 class="text-h5 mt-4">No Streams Selected</h2>
      <p class="text-body-1 text-grey mt-2">
        Click the button in the top-right to select streams to watch
      </p>
    </div>

    <!-- Stream selection dialog -->
    <v-dialog
      v-model="showSelector"
      max-width="600"
      scrollable
    >
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <span>Select Streams</span>
          <v-btn
            icon="mdi-close"
            variant="text"
            @click="showSelector = false"
          ></v-btn>
        </v-card-title>

        <v-divider></v-divider>

        <v-card-text class="pa-4">
          <!-- Quick selection options -->
          <div class="mb-4">
            <h3 class="text-subtitle-1 mb-2">Quick Select</h3>
            <div class="d-flex gap-2 flex-wrap">
              <v-btn
                variant="tonal"
                color="primary"
                @click="selectAll"
                prepend-icon="mdi-select-all"
              >
                All Streams
              </v-btn>
              <v-btn
                variant="tonal"
                @click="clearSelection"
                prepend-icon="mdi-close"
              >
                Clear All
              </v-btn>
            </div>
          </div>

          <v-divider class="my-4"></v-divider>

          <!-- Stream list with checkboxes -->
          <div v-if="availableStreams.length > 0">
            <h3 class="text-subtitle-1 mb-2">Available Streams ({{ availableStreams.length }})</h3>
            <v-list>
              <v-list-item
                v-for="stream in availableStreams"
                :key="stream.name"
                @click="toggleStream(stream)"
              >
                <template v-slot:prepend>
                  <v-checkbox
                    :model-value="isSelected(stream)"
                    @click.stop="toggleStream(stream)"
                    color="primary"
                    hide-details
                  ></v-checkbox>
                </template>

                <v-list-item-title>
                  {{ stream.name }}
                  <span v-if="stream.width && stream.height" class="text-caption text-grey ml-2">
                    ({{ stream.width }}x{{ stream.height }})
                  </span>
                </v-list-item-title>

                <template v-slot:append>
                  <v-chip size="small" color="success">
                    <v-icon icon="mdi-circle" size="x-small" start></v-icon>
                    LIVE
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
          </div>

          <!-- No streams available -->
          <div v-else class="text-center pa-8">
            <v-icon size="64" color="grey">mdi-video-off</v-icon>
            <p class="text-body-1 text-grey mt-4">No live streams available</p>
          </div>
        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            variant="text"
            @click="showSelector = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            @click="applySelection"
          >
            Apply ({{ tempSelectedStreams.length }})
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useStreamStore } from '@/stores/streams'
import { generatePlaybackSources } from '@/services/api/endpoints'
import OvenPlayerComponent from '@/components/player/OvenPlayerComponent.vue'
import type { StreamInfo } from '@/services/api/types'

const streamStore = useStreamStore()
const showSelector = ref(false)
const selectedStreams = ref<StreamInfo[]>([])
const tempSelectedStreams = ref<StreamInfo[]>([])

const availableStreams = computed(() => streamStore.liveStreams)

// Initialize temp selection when dialog opens
watch(showSelector, (newValue) => {
  if (newValue) {
    tempSelectedStreams.value = [...selectedStreams.value]
  }
})

// Calculate optimal grid class based on number of streams
const gridClass = computed(() => {
  const count = selectedStreams.value.length
  if (count === 1) return 'grid-1'
  if (count === 2) return 'grid-2'
  if (count <= 4) return 'grid-4'
  if (count <= 6) return 'grid-6'
  if (count <= 9) return 'grid-9'
  if (count <= 12) return 'grid-12'
  return 'grid-16'
})

function toggleStream(stream: StreamInfo) {
  const index = tempSelectedStreams.value.findIndex(s => s.name === stream.name)
  if (index >= 0) {
    tempSelectedStreams.value.splice(index, 1)
  } else {
    tempSelectedStreams.value.push(stream)
  }
}

function isSelected(stream: StreamInfo) {
  return tempSelectedStreams.value.some(s => s.name === stream.name)
}

function selectAll() {
  tempSelectedStreams.value = [...availableStreams.value]
}

function clearSelection() {
  tempSelectedStreams.value = []
}

function applySelection() {
  selectedStreams.value = [...tempSelectedStreams.value]
  showSelector.value = false
}

// Calculate optimal style for each stream cell based on aspect ratio
function getStreamCellStyle(stream: StreamInfo) {
  // Use the aspectRatio from the stream info if available
  if (stream.aspectRatio) {
    return {
      aspectRatio: stream.aspectRatio.toString(),
    }
  }
  
  return {}
}

onMounted(async () => {
  // Fetch streams and start polling
  await streamStore.fetchStreams()
  streamStore.startPolling(5000)
  
  // Auto-select all streams on first load
  if (availableStreams.value.length > 0) {
    selectedStreams.value = [...availableStreams.value]
    tempSelectedStreams.value = [...availableStreams.value]
  }
})

onBeforeUnmount(() => {
  streamStore.stopPolling()
})
</script>

<style scoped>
.multi-stream-container {
  position: relative;
  width: 100vw;
  height: calc(100vh - 64px); /* Full viewport minus AppHeader */
  overflow: hidden;
  background: #000;
}

/* Floating action button for stream selection */
.stream-selector-fab {
  position: fixed;
  top: 80px;
  right: 16px;
  z-index: 1000;
}

/* Empty state */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #fff;
}

/* Grid layouts - no gaps, maximum screen usage */
.streams-grid {
  display: grid;
  width: 100%;
  height: 100%;
  gap: 0;
  padding: 0;
  margin: 0;
}

/* 1 stream - full screen */
.grid-1 {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
}

/* 2 streams - side by side */
.grid-2 {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr;
}

/* 3-4 streams - 2x2 grid */
.grid-4 {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
}

/* 5-6 streams - 2x3 grid */
.grid-6 {
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr;
}

/* 7-9 streams - 3x3 grid */
.grid-9 {
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
}

/* 10-12 streams - 3x4 grid */
.grid-12 {
  grid-template-columns: 1fr 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
}

/* 13-16 streams - 4x4 grid */
.grid-16 {
  grid-template-columns: 1fr 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr 1fr;
}

/* Stream cell - no padding/margin */
.stream-cell {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
  border: 1px solid #222; /* Minimal border for visibility */
  display: flex;
  align-items: center;
  justify-content: center;
}

.stream-cell-inner {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Stream label overlay */
.stream-label {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 10;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stream-resolution {
  font-size: 10px;
  opacity: 0.8;
}

/* Ensure OvenPlayer fills the cell while maintaining aspect ratio */
.stream-cell-inner :deep(.oven-player-wrapper) {
  width: 100% !important;
  height: 100% !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.stream-cell-inner :deep(.oven-player-container) {
  max-width: 100% !important;
  max-height: 100% !important;
  width: auto !important;
  height: auto !important;
}

.stream-cell-inner :deep(video) {
  object-fit: contain !important;
  max-width: 100% !important;
  max-height: 100% !important;
}

/* Dialog styling */
.gap-2 {
  gap: 8px;
}
</style>
