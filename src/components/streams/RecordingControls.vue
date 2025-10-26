<template>
  <v-card elevation="2">
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon icon="mdi-record-circle" class="mr-2" :color="recordingStateColor"></v-icon>
        Recording
      </div>
      <v-btn
        v-if="recordingState"
        icon="mdi-refresh"
        size="small"
        variant="text"
        :loading="loading"
        @click="refreshRecordingState"
      ></v-btn>
    </v-card-title>

    <v-divider></v-divider>

    <v-card-text>
      <!-- Loading state -->
      <div v-if="loading && !recordingState" class="text-center pa-4">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
        <p class="text-body-2 text-grey mt-2">Loading recording status...</p>
      </div>

      <!-- Recording state display -->
      <div v-else class="recording-content">
        <!-- Status chip -->
        <div class="mb-4">
          <v-chip
            :color="recordingStateColor"
            variant="flat"
            size="large"
            class="status-chip"
          >
            <v-icon 
              :icon="recordingStateIcon" 
              start
              :class="{ 'pulse-animation': isRecording }"
            ></v-icon>
            {{ recordingStateText }}
          </v-chip>
        </div>

        <!-- Variant Selection (only show when not recording) -->
        <div v-if="!isRecordingActive && availableVariants.length > 0" class="mb-4">
          <v-select
            v-model="selectedVariant"
            :items="availableVariants"
            item-title="displayName"
            item-value="name"
            label="Recording Quality"
            hint="Select which video quality to record"
            persistent-hint
            variant="outlined"
            density="comfortable"
            :disabled="isRecordingActive || startLoading"
          >
            <template v-slot:item="{ item, props: itemProps }">
              <v-list-item v-bind="itemProps">
                <template v-slot:title>
                  <div class="font-weight-medium">{{ item.raw.displayName }}</div>
                </template>
                <template v-slot:subtitle>
                  <div class="text-caption">{{ item.raw.description }}</div>
                </template>
              </v-list-item>
            </template>
          </v-select>
        </div>

        <!-- Recording duration (when recording) -->
        <div v-if="isRecording" class="recording-duration mb-4">
          <div class="duration-display">
            <v-icon icon="mdi-timer-outline" class="mr-2" color="error"></v-icon>
            <span class="duration-text">{{ recordingDuration }}</span>
          </div>
        </div>

        <!-- Recording details (when recording) -->
        <div v-if="recordingState" class="recording-details mb-4">
          <div class="detail-item">
            <span class="text-caption text-grey">Recording ID:</span>
            <span class="text-body-2 font-weight-medium">{{ recordingState.id }}</span>
          </div>
          <div class="detail-item">
            <span class="text-caption text-grey">Started:</span>
            <span class="text-body-2">{{ formatTime(recordingState.createdTime) }}</span>
          </div>
          <div v-if="recordingState.stream.variantNames?.length > 0" class="detail-item">
            <span class="text-caption text-grey">Variants:</span>
            <div class="d-flex flex-wrap gap-1 mt-1">
              <v-chip
                v-for="variant in recordingState.stream.variantNames"
                :key="variant"
                size="x-small"
                color="primary"
                variant="tonal"
              >
                {{ variant }}
              </v-chip>
            </div>
          </div>
          <div v-if="recordingState.filePath" class="detail-item">
            <span class="text-caption text-grey">File:</span>
            <span class="text-body-2 mono-text">{{ recordingState.filePath }}</span>
          </div>
        </div>

        <!-- Control buttons - always show both -->
        <div class="recording-actions">
          <v-btn
            color="error"
            variant="flat"
            :loading="startLoading"
            :disabled="isRecordingActive || startLoading || stopLoading"
            @click="handleStartRecording"
            size="large"
            class="action-btn"
          >
            <v-icon icon="mdi-record" start></v-icon>
            Start
          </v-btn>

          <v-btn
            color="orange-darken-2"
            variant="flat"
            :loading="stopLoading"
            :disabled="!isRecordingActive || startLoading || stopLoading"
            @click="handleStopRecording"
            size="large"
            class="action-btn"
          >
            <v-icon icon="mdi-stop" start></v-icon>
            Stop
          </v-btn>
        </div>

        <!-- Error message -->
        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          closable
          class="mt-4"
          @click:close="error = null"
        >
          {{ error }}
        </v-alert>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { omeApi } from '@/services/api/omeApi'
import type { RecordingTask, VariantOption } from '@/services/api/types'

interface Props {
  streamName: string
}

const props = defineProps<Props>()

const recordingState = ref<RecordingTask | null>(null)
const loading = ref(false)
const startLoading = ref(false)
const stopLoading = ref(false)
const error = ref<string | null>(null)
const recordingDuration = ref('00:00:00')
const availableVariants = ref<VariantOption[]>([])
const selectedVariant = ref<string>('')
const audioVariant = ref<string>('')
let pollingInterval: number | null = null
let durationInterval: number | null = null

const isRecording = computed(() => recordingState.value?.state === 'recording')
const isRecordingActive = computed(() => {
  const state = recordingState.value?.state
  return state === 'recording' || state === 'ready' || state === 'stopping'
})

const recordingStateColor = computed(() => {
  if (!recordingState.value) return 'grey'
  
  switch (recordingState.value.state) {
    case 'recording':
      return 'error'
    case 'ready':
      return 'warning'
    case 'stopping':
      return 'orange'
    case 'stopped':
      return 'success'
    case 'error':
      return 'error'
    default:
      return 'grey'
  }
})

const recordingStateIcon = computed(() => {
  if (!recordingState.value) return 'mdi-record-circle-outline'
  
  switch (recordingState.value.state) {
    case 'recording':
      return 'mdi-record-rec'
    case 'ready':
      return 'mdi-clock-outline'
    case 'stopping':
      return 'mdi-stop-circle-outline'
    case 'stopped':
      return 'mdi-check-circle'
    case 'error':
      return 'mdi-alert-circle'
    default:
      return 'mdi-record-circle-outline'
  }
})

const recordingStateText = computed(() => {
  if (!recordingState.value) return 'Not Recording'
  
  switch (recordingState.value.state) {
    case 'recording':
      return 'Recording'
    case 'ready':
      return 'Ready'
    case 'stopping':
      return 'Stopping...'
    case 'stopped':
      return 'Stopped'
    case 'error':
      return 'Error'
    default:
      return 'Unknown'
  }
})

function updateDuration() {
  if (!recordingState.value?.createdTime) {
    recordingDuration.value = '00:00:00'
    return
  }
  
  const startTime = new Date(recordingState.value.createdTime).getTime()
  const now = Date.now()
  const diffMs = now - startTime
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000)
  
  recordingDuration.value = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function startDurationCounter() {
  stopDurationCounter() // Clear any existing interval
  updateDuration() // Update immediately
  durationInterval = window.setInterval(() => {
    updateDuration()
  }, 1000)
}

function stopDurationCounter() {
  if (durationInterval !== null) {
    clearInterval(durationInterval)
    durationInterval = null
  }
  recordingDuration.value = '00:00:00'
}

async function fetchRecordingState() {
  try {
    error.value = null
    
    // Get all recording states and find the one for this stream
    const recordings = await omeApi.getRecordingState()
    const activeRecording = recordings.find(r => 
      r.stream.name === props.streamName && 
      (r.state === 'recording' || r.state === 'ready' || r.state === 'stopping')
    )
    
    recordingState.value = activeRecording || null
    
    // Start or stop duration counter based on recording state
    if (activeRecording?.state === 'recording') {
      startDurationCounter()
    } else {
      stopDurationCounter()
    }
  } catch (e) {
    console.error('Failed to fetch recording state:', e)
    error.value = 'Failed to fetch recording status'
  }
}

async function fetchStreamVariants() {
  try {
    const streamDetails = await omeApi.getStreamDetails(props.streamName)
    if (!streamDetails?.response?.outputs?.[0]?.tracks) {
      return
    }

    const tracks = streamDetails.response.outputs[0].tracks
    const videoVariants: VariantOption[] = []

    // Find all video tracks (variants)
    for (const track of tracks) {
      if (track.type === 'Video' && track.video) {
        let displayName = track.name
        let description = ''

        if (track.video.bypass) {
          displayName = 'Source (Original Quality)'
          description = 'Original stream quality without transcoding'
        } else if (track.video.height) {
          const height = track.video.height
          const fps = track.video.framerate ? Math.round(track.video.framerate) : 0
          const bitrate = track.video.bitrate ? Math.round(track.video.bitrate / 1000) : 0
          displayName = `${height}p${fps > 0 ? ` @ ${fps}fps` : ''}`
          description = `${track.video.width}x${height}${bitrate > 0 ? `, ${bitrate} kbps` : ''}`
        }

        videoVariants.push({
          name: track.name,
          displayName,
          type: 'Video',
          description
        })
      } else if (track.type === 'Audio' && track.audio?.bypass) {
        // Find the bypass audio track (source audio format)
        audioVariant.value = track.name
      }
    }

    availableVariants.value = videoVariants

    // Set default selection to bypass_video (source quality)
    if (videoVariants.length > 0) {
      const bypassVariant = videoVariants.find(v => v.name === 'bypass_video')
      selectedVariant.value = bypassVariant ? bypassVariant.name : (videoVariants[0]?.name || '')
    }
  } catch (e) {
    console.error('Failed to fetch stream variants:', e)
  }
}

async function handleStartRecording() {
  try {
    startLoading.value = true
    error.value = null
    
    // Generate a unique ID for this recording
    const recordingId = `rec_${props.streamName}_${Date.now()}`
    
    // Build variant names array - always include source audio if available
    const variantNames: string[] = []
    if (selectedVariant.value) {
      variantNames.push(selectedVariant.value)
    }
    if (audioVariant.value) {
      variantNames.push(audioVariant.value)
    }
    
    const result = await omeApi.startRecording({
      id: recordingId,
      stream: {
        name: props.streamName,
        variantNames: variantNames.length > 0 ? variantNames : undefined,
      },
    })
    
    if (result) {
      recordingState.value = result
      if (result.state === 'recording') {
        startDurationCounter()
      }
    } else {
      error.value = 'Failed to start recording'
    }
  } catch (e) {
    console.error('Failed to start recording:', e)
    error.value = 'Failed to start recording'
  } finally {
    startLoading.value = false
  }
}

async function handleStopRecording() {
  if (!recordingState.value) return
  
  try {
    stopLoading.value = true
    error.value = null
    
    const success = await omeApi.stopRecording({
      id: recordingState.value.id,
    })
    
    if (success) {
      stopDurationCounter()
      // Refresh the state after a short delay
      setTimeout(() => {
        fetchRecordingState()
      }, 1000)
    } else {
      error.value = 'Failed to stop recording'
    }
  } catch (e) {
    console.error('Failed to stop recording:', e)
    error.value = 'Failed to stop recording'
  } finally {
    stopLoading.value = false
  }
}

async function refreshRecordingState() {
  loading.value = true
  try {
    await fetchRecordingState()
  } finally {
    loading.value = false
  }
}

function startPolling() {
  // Poll for recording state every 5 seconds
  pollingInterval = window.setInterval(() => {
    fetchRecordingState()
  }, 5000)
}

function stopPolling() {
  if (pollingInterval !== null) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    return date.toLocaleString()
  } catch {
    return timestamp
  }
}

onMounted(() => {
  fetchRecordingState()
  fetchStreamVariants()
  startPolling()
})

onBeforeUnmount(() => {
  stopPolling()
  stopDurationCounter()
})
</script>

<style scoped>
.recording-content {
  min-height: 200px;
}

.status-chip {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.pulse-animation {
  animation: pulse 1.5s ease-in-out infinite;
}

.recording-duration {
  background: rgba(244, 67, 54, 0.1);
  border: 2px solid rgba(244, 67, 54, 0.3);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}

.duration-display {
  display: flex;
  align-items: center;
  justify-content: center;
}

.duration-text {
  font-size: 1.5rem;
  font-weight: 700;
  font-family: 'Courier New', monospace;
  color: rgb(244, 67, 54);
  letter-spacing: 2px;
}

.recording-details {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.mono-text {
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  word-break: break-all;
}

.recording-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.action-btn {
  font-weight: 600;
  letter-spacing: 0.5px;
}
</style>
