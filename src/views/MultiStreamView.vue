<template>
  <div 
    class="multi-stream-container"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  >
    <!-- Auto-hiding overlay controls -->
    <transition name="fade">
      <div v-show="showControls" class="overlay-controls">
        <!-- Back button -->
        <v-btn
          icon
          color="primary"
          class="back-btn"
          @click="goBack"
          elevation="4"
        >
          <v-icon>mdi-arrow-left</v-icon>
        </v-btn>
        
        <!-- Stream selector button -->
        <v-btn
          icon
          color="primary"
          class="stream-selector-btn"
          @click="showSelector = true"
          elevation="4"
        >
          <v-icon>mdi-view-grid-plus</v-icon>
        </v-btn>
      </div>
    </transition>

    <!-- Stream grid - optimal layout -->
    <div 
      v-if="selectedStreams.length > 0"
      class="streams-grid"
      :style="{
        gridTemplateColumns,
        gridTemplateRows,
      }"
    >
      <div
        v-for="(stream, index) in selectedStreams"
        :key="stream.name"
        class="stream-cell"
        :style="streamStyles[index]"
      >
        <div class="stream-cell-inner">
          <div class="stream-label">
            {{ stream.name }}
            <span v-if="stream.width && stream.height" class="stream-resolution">
              {{ stream.width }}x{{ stream.height }}
            </span>
          </div>
          <OvenPlayerComponent
            :stream-name="stream.name"
            :sources="getCachedSources(stream.name)"
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
          <!-- Selection mode buttons -->
          <div class="mb-4">
            <h3 class="text-subtitle-1 mb-2">Selection Mode</h3>
            <v-btn-toggle
              v-model="tempSelectionMode"
              color="primary"
              mandatory
              density="compact"
              class="mb-3"
            >
              <v-btn value="all">
                <v-icon icon="mdi-select-all" start></v-icon>
                All Streams
              </v-btn>
              <v-btn value="all-except">
                <v-icon icon="mdi-minus-circle" start></v-icon>
                All Except
              </v-btn>
              <v-btn value="custom">
                <v-icon icon="mdi-hand-pointing-up" start></v-icon>
                Custom
              </v-btn>
            </v-btn-toggle>
            
            <!-- Mode descriptions -->
            <v-alert
              v-if="tempSelectionMode === 'all'"
              type="info"
              variant="tonal"
              density="compact"
              class="mt-2"
            >
              All streams will be shown. New streams auto-added.
            </v-alert>
            <v-alert
              v-else-if="tempSelectionMode === 'all-except'"
              type="info"
              variant="tonal"
              density="compact"
              class="mt-2"
            >
              All streams shown except unchecked. New streams auto-added.
            </v-alert>
            <v-alert
              v-else
              type="info"
              variant="tonal"
              density="compact"
              class="mt-2"
            >
              Only checked streams shown. New streams NOT auto-added.
            </v-alert>
          </div>

          <v-divider class="my-4"></v-divider>

          <!-- Stream list with checkboxes -->
          <div v-if="availableStreams.length > 0">
            <h3 class="text-subtitle-1 mb-2">
              Available Streams ({{ availableStreams.length }})
              <span v-if="tempSelectionMode === 'all-except'" class="text-caption text-grey ml-2">
                (Uncheck to exclude)
              </span>
            </h3>
            <v-list>
              <v-list-item
                v-for="stream in availableStreams"
                :key="stream.name"
                @click="tempSelectionMode !== 'all' && toggleStream(stream.name)"
                :disabled="tempSelectionMode === 'all'"
              >
                <template v-slot:prepend>
                  <v-checkbox
                    :model-value="isSelected(stream)"
                    @click.stop="tempSelectionMode !== 'all' && toggleStream(stream.name)"
                    :disabled="tempSelectionMode === 'all'"
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
            Apply ({{ tempSelectedNames.length }})
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStreamStore } from '@/stores/streams'
import { generatePlaybackSources } from '@/services/api/endpoints'
import { useOptimalLayout } from '@/composables/useOptimalLayout'
import OvenPlayerComponent from '@/components/player/OvenPlayerComponent.vue'
import type { StreamInfo } from '@/services/api/types'

type SelectionMode = 'all' | 'all-except' | 'custom'

const router = useRouter()
const route = useRoute()
const streamStore = useStreamStore()

const showSelector = ref(false)
const showControls = ref(true)

const selectionMode = ref<SelectionMode>('all')
const excludedNames = ref<string[]>([])
const customNames = ref<string[]>([])

const tempSelectionMode = ref<SelectionMode>('all')
const tempSelectedNames = ref<string[]>([])

const availableStreams = computed(() => streamStore.liveStreams)

const selectedStreams = computed<StreamInfo[]>(() => {
  const streams = availableStreams.value
  if (selectionMode.value === 'all') return streams

  const nameSet = new Set(
    selectionMode.value === 'all-except'
      ? streams.map(s => s.name).filter(name => !excludedNames.value.includes(name))
      : customNames.value
  )

  return streams.filter(stream => nameSet.has(stream.name))
})

const { gridTemplateColumns, gridTemplateRows, streamStyles } = useOptimalLayout(selectedStreams)

const sourcesCache = new Map<string, ReturnType<typeof generatePlaybackSources>>()

function getCachedSources(streamName: string) {
  if (!sourcesCache.has(streamName)) {
    sourcesCache.set(streamName, generatePlaybackSources(streamName))
  }
  return sourcesCache.get(streamName)!
}

let hideControlsTimer: number | undefined

function scheduleControlsHide() {
  if (hideControlsTimer) {
    clearTimeout(hideControlsTimer)
  }

  hideControlsTimer = window.setTimeout(() => {
    showControls.value = false
    hideControlsTimer = undefined
  }, 3000)
}

function handleMouseMove() {
  showControls.value = true
  scheduleControlsHide()
}

function handleMouseLeave() {
  showControls.value = false
  if (hideControlsTimer) {
    clearTimeout(hideControlsTimer)
    hideControlsTimer = undefined
  }
}

function goBack() {
  router.push('/')
}

function applyRouteState() {
  const mode = route.query.mode

  if (mode === 'all-except' && typeof route.query.exclude === 'string') {
    selectionMode.value = 'all-except'
    excludedNames.value = parseList(route.query.exclude)
    customNames.value = []
  } else if (mode === 'custom' && typeof route.query.streams === 'string') {
    selectionMode.value = 'custom'
    customNames.value = parseList(route.query.streams)
    excludedNames.value = []
  } else {
    selectionMode.value = 'all'
    excludedNames.value = []
    customNames.value = []
  }
}

function buildQuery(): Record<string, string> {
  if (selectionMode.value === 'all-except' && excludedNames.value.length > 0) {
    return {
      mode: 'all-except',
      exclude: excludedNames.value.join(','),
    }
  }

  if (selectionMode.value === 'custom' && customNames.value.length > 0) {
    return {
      mode: 'custom',
      streams: customNames.value.join(','),
    }
  }

  return {}
}

let suppressRouteWatch = false
let bootstrapping = true

function updateRouteQuery() {
  const nextQuery = buildQuery()
  if (isSameQuery(route.query, nextQuery)) return

  suppressRouteWatch = true
  router.replace({ query: nextQuery }).finally(() => {
    suppressRouteWatch = false
  })
}

function isSameQuery(current: Record<string, unknown>, next: Record<string, string>) {
  const normalize = (input: Record<string, unknown>) => {
    const entries = Object.entries(input)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => [key, String(value)] as const)
      .sort(([a], [b]) => (a > b ? 1 : a < b ? -1 : 0))
    return JSON.stringify(entries)
  }

  return normalize(current) === normalize(next)
}

function currentSelectionNames() {
  if (selectionMode.value === 'all') {
    return availableStreams.value.map(stream => stream.name)
  }

  if (selectionMode.value === 'all-except') {
    const excluded = new Set(excludedNames.value)
    return availableStreams.value
      .map(stream => stream.name)
      .filter(name => !excluded.has(name))
  }

  return customNames.value.filter(name =>
    availableStreams.value.some(stream => stream.name === name)
  )
}

watch(
  () => route.query,
  () => {
    if (suppressRouteWatch) return
    applyRouteState()
  }
)

watch(
  [selectionMode, excludedNames, customNames],
  () => {
    if (bootstrapping) return
    updateRouteQuery()
  },
  { deep: true }
)

watch(availableStreams, (streams) => {
  const names = new Set(streams.map(stream => stream.name))
  excludedNames.value = excludedNames.value.filter(name => names.has(name))
  customNames.value = customNames.value.filter(name => names.has(name))

  if (showSelector.value) {
    tempSelectedNames.value = tempSelectedNames.value.filter(name => names.has(name))
  }

  for (const key of [...sourcesCache.keys()]) {
    if (!names.has(key)) {
      sourcesCache.delete(key)
    }
  }
})

watch(showSelector, (open) => {
  if (!open) return

  tempSelectionMode.value = selectionMode.value
  tempSelectedNames.value = currentSelectionNames()

  if (tempSelectionMode.value === 'all' && tempSelectedNames.value.length === 0) {
    tempSelectedNames.value = availableStreams.value.map(stream => stream.name)
  }
})

watch(tempSelectionMode, (mode) => {
  if (mode === 'all') {
    tempSelectedNames.value = availableStreams.value.map(stream => stream.name)
  } else if (mode === 'all-except' && tempSelectedNames.value.length === 0) {
    tempSelectedNames.value = availableStreams.value.map(stream => stream.name)
  }
})

function toggleStream(name: string) {
  const index = tempSelectedNames.value.indexOf(name)
  if (index >= 0) {
    tempSelectedNames.value.splice(index, 1)
  } else {
    tempSelectedNames.value.push(name)
  }
}

const tempSelectedNameSet = computed(() => new Set(tempSelectedNames.value))

function isSelected(stream: StreamInfo) {
  return tempSelectedNameSet.value.has(stream.name)
}

function applySelection() {
  selectionMode.value = tempSelectionMode.value

  const availableNameSet = new Set<string>(availableStreams.value.map(stream => stream.name))

  if (tempSelectionMode.value === 'all') {
    excludedNames.value = []
    customNames.value = []
  } else if (tempSelectionMode.value === 'all-except') {
    const included = tempSelectedNames.value.filter(name => availableNameSet.has(name))
    const includedSet = new Set(included)
    const availableNames = Array.from(availableNameSet)
    excludedNames.value = availableNames.filter(name => !includedSet.has(name))
    customNames.value = []
  } else {
    customNames.value = tempSelectedNames.value.filter(name => availableNameSet.has(name))
    excludedNames.value = []
  }

  showSelector.value = false
}

onMounted(async () => {
  applyRouteState()
  await streamStore.fetchStreams()
  streamStore.startPolling(5000)

  if (selectionMode.value === 'all' && availableStreams.value.length === 0) {
    tempSelectedNames.value = []
  }

  bootstrapping = false
  updateRouteQuery()
  scheduleControlsHide()
})

onBeforeUnmount(() => {
  streamStore.stopPolling()
  if (hideControlsTimer) {
    clearTimeout(hideControlsTimer)
    hideControlsTimer = undefined
  }
})

function parseList(value: string) {
  return value
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean)
}
</script>

<style scoped>
.multi-stream-container {
  position: relative;
  width: 100vw;
  height: 100vh; /* Full viewport - no header */
  overflow: hidden;
  background: #000;
}

/* Auto-hiding overlay controls */
.overlay-controls {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-between;
  padding: 16px;
  z-index: 1000;
  pointer-events: none;
}

.overlay-controls .back-btn,
.overlay-controls .stream-selector-btn {
  pointer-events: auto;
}

/* Fade transition for overlay controls */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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

/* Grid layouts - optimal dynamic layout */
.streams-grid {
  display: grid;
  gap: 2px;
  width: 100%;
  height: 100%;
  padding: 0;
  margin: 0;
  overflow: hidden;
  justify-content: center;
  align-content: center;
  /* grid-template-columns and grid-template-rows set dynamically via :style */
}

/* Stream cell */
.stream-cell {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
  border: 1px solid #222;
}

.stream-cell-inner {
  position: relative;
  width: 100%;
  height: 100%;
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

/* Ensure OvenPlayer fills the cell completely without black bars */
.stream-cell-inner :deep(.oven-player-wrapper) {
  width: 100% !important;
  height: 100% !important;
}

.stream-cell-inner :deep(.oven-player-container) {
  width: 100% !important;
  height: 100% !important;
}

.stream-cell-inner :deep(video) {
  object-fit: contain !important;
  width: 100% !important;
  height: 100% !important;
}

/* Ensure OvenPlayer controls overlay the video instead of adding height */
.stream-cell-inner :deep(.ovenplayer) {
  width: 100% !important;
  height: 100% !important;
}

.stream-cell-inner :deep(.op-wrapper) {
  width: 100% !important;
  height: 100% !important;
}

.stream-cell-inner :deep(.op-con) {
  width: 100% !important;
  height: 100% !important;
}

/* Dialog styling */
.gap-2 {
  gap: 8px;
}
</style>
