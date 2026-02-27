<template>
  <v-card
    class="stream-card"
    :class="{ 'orphaned-card': stream.isOrphaned }"
    hover
    elevation="4"
    rounded="lg"
    @click="handleCardClick"
    @mouseup="handleMouseUp"
  >
    <div class="thumbnail-wrapper">
      <transition-group name="crossfade" tag="div" class="image-container">
        <v-img
          :src="displayedThumbnail"
          :key="displayedThumbnail"
          height="200"
          cover
          class="stream-thumbnail"
        >
          <!-- Dark overlay for better text readability -->
          <div class="thumbnail-overlay"></div>
        
        <!-- Live badge overlay -->
        <div class="stream-overlay">
          <div class="left-badges">
            <!-- Orphaned badge -->
            <v-chip
              v-if="stream.isOrphaned"
              color="warning"
              size="small"
              class="live-badge elevation-3"
            >
              <v-icon icon="mdi-alert" size="x-small" class="mr-1"></v-icon>
              ORPHANED
            </v-chip>
            <!-- Live badge -->
            <v-chip
              v-else
              color="error"
              size="small"
              class="live-badge elevation-3"
            >
              <v-icon icon="mdi-circle" size="x-small" class="mr-1 pulse-animation"></v-icon>
              LIVE
            </v-chip>
            
            <!-- Recording indicator -->
            <v-chip
              v-if="stream.isRecording"
              color="red-darken-2"
              size="small"
              class="recording-badge elevation-3"
            >
              <v-icon icon="mdi-record-rec" size="x-small" class="mr-1 pulse-animation"></v-icon>
              REC
            </v-chip>
            
            <!-- Pulled stream indicator -->
            <v-chip
              v-if="isPulledStream"
              color="secondary"
              size="small"
              class="pulled-badge elevation-3"
            >
              <v-icon icon="mdi-download-network" size="x-small" class="mr-1"></v-icon>
              PULL
            </v-chip>
          </div>
          
          <!-- Viewer count badge -->
          <v-chip
            v-if="stream.viewerCount > 0"
            color="rgba(0,0,0,0.8)"
            size="small"
            class="viewer-badge elevation-2"
          >
            <v-icon icon="mdi-eye" size="small" class="mr-1"></v-icon>
            {{ stream.viewerCount }}
          </v-chip>
        </div>
      </v-img>
      </transition-group>
    </div>

    <v-card-title class="stream-title">
      <v-icon icon="mdi-video" size="small" class="mr-2" color="primary"></v-icon>
      <span class="text-truncate">{{ stream.name }}</span>
      <!-- Public badge -->
      <v-chip
        v-if="stream.isPublic"
        color="success"
        size="x-small"
        variant="flat"
        class="ml-2"
      >
        <v-icon icon="mdi-earth" size="x-small" start></v-icon>
        PUBLIC
      </v-chip>
    </v-card-title>

    <v-card-actions>
      <template v-if="stream.isOrphaned">
        <!-- Delete orphaned stream -->
        <v-btn
          color="warning"
          variant="flat"
          class="flex-grow-1"
          :loading="deletingOrphan"
          @click.stop="deleteOrphan"
        >
          <v-icon icon="mdi-delete" start></v-icon>
          Delete Orphaned Stream
        </v-btn>
      </template>
      <template v-else>
        <v-btn
          color="primary"
          variant="flat"
          class="flex-grow-1"
          @click="goToStream"
          @mouseup.stop="handleMouseUp"
        >
          <v-icon icon="mdi-play" start></v-icon>
          Watch Now
        </v-btn>
      </template>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { type StreamInfo } from '@/services/api/types'
import { generateThumbnailUrl } from '@/services/api/endpoints'
import { useAuthStore } from '@/stores/auth'
import { useStreamStore } from '@/stores/streams'

interface Props {
  stream: StreamInfo
}

const props = defineProps<Props>()
const router = useRouter()
const authStore = useAuthStore()
const streamStore = useStreamStore()
const displayedThumbnail = ref<string>('')
const deletingOrphan = ref(false)

// Check if this is a pulled stream (RtspPull, OvtPull, etc.)
const isPulledStream = computed(() => {
  const sourceType = props.stream.sourceType?.toLowerCase() || ''
  return sourceType.includes('pull')
})

// Get the thumbnail URL from OME
// Note: Thumbnails are always served from the main app because the public app
// uses bypass_video (passthrough) which the Thumbnail Publisher cannot decode.
const thumbnailUrl = computed(() => {
  // Orphaned streams have no source — no thumbnail to fetch
  if (props.stream.isOrphaned) return null

  if (!authStore.isAuthenticated) {
    // Unauthenticated → use public thumbnail proxy (still fetches from main app)
    return generateThumbnailUrl(props.stream.name, {
      usePublicProxy: true,
    })
  }
  // Authenticated → use main thumbnail proxy with auth token
  return generateThumbnailUrl(props.stream.name, {
    authToken: authStore.streamAuthToken,
  })
})

// Use a simple gradient placeholder as fallback
const placeholderImage = computed(() => {
  // Generate a gradient based on the stream name (simple hash for variety)
  const hash = props.stream.name.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
  const hue = hash % 360
  return `data:image/svg+xml,%3Csvg width='400' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:hsl(${hue},70%25,50%25);stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:hsl(${(hue + 60) % 360},70%25,30%25);stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='200' fill='url(%23grad)' /%3E%3C/svg%3E`
})

// Initialize with placeholder — only switch to real thumbnail after successful preload
if (!displayedThumbnail.value) {
  displayedThumbnail.value = placeholderImage.value
}

// Preload thumbnail before displaying — only switch on success to avoid black blink.
// On failure, keep the current image (placeholder or last good thumbnail).
// The browser caches the preloaded image, so v-img won't make a second request.
watch(thumbnailUrl, (newUrl) => {
  if (newUrl) {
    const img = new Image()
    img.onload = () => {
      displayedThumbnail.value = newUrl
    }
    // On error: silently keep current displayedThumbnail; next poll cycle retries
    img.src = newUrl
  } else {
    displayedThumbnail.value = placeholderImage.value
  }
}, { immediate: true })

async function deleteOrphan() {
  deletingOrphan.value = true
  try {
    await streamStore.deleteOrphanedStream(props.stream.name)
  } catch (err) {
    console.error('Failed to delete orphaned stream:', err)
  } finally {
    deletingOrphan.value = false
  }
}

function handleCardClick(event?: MouseEvent) {
  if (props.stream.isOrphaned) return
  goToStream(event)
}

function goToStream(event?: MouseEvent) {
  // Handle Ctrl/Cmd+click to open in new tab
  if (event && (event.ctrlKey || event.metaKey)) {
    const route = router.resolve({ name: 'stream', params: { name: props.stream.name } })
    window.open(route.href, '_blank')
  } else {
    router.push({ name: 'stream', params: { name: props.stream.name } })
  }
}

function handleMouseUp(event: MouseEvent) {
  // Handle middle mouse button (button 1)
  if (event.button === 1) {
    event.preventDefault()
    const route = router.resolve({ name: 'stream', params: { name: props.stream.name } })
    window.open(route.href, '_blank')
  }
}
</script>

<style scoped>
.stream-card {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.stream-card.orphaned-card {
  border: 2px solid rgb(var(--v-theme-warning));
  opacity: 0.85;
  cursor: default;
}

.stream-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3) !important;
}

.thumbnail-wrapper {
  position: relative;
  overflow: hidden;
}

.image-container {
  position: relative;
  width: 100%;
  height: 200px;
}

.stream-thumbnail {
  position: absolute !important;
  top: 0;
  left: 0;
  width: 100%;
  transition: transform 0.3s ease;
}

/* Crossfade transition */
.crossfade-enter-active,
.crossfade-leave-active {
  transition: opacity 2s ease-in-out;
}

.crossfade-enter-from {
  opacity: 0;
}

.crossfade-leave-to {
  opacity: 0;
}

.crossfade-enter-to,
.crossfade-leave-from {
  opacity: 1;
}

.stream-card:hover .stream-thumbnail {
  transform: scale(1.05);
}

.thumbnail-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 100%);
  pointer-events: none;
}

.stream-overlay {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  z-index: 1;
}

.left-badges {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
}

.live-badge {
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.recording-badge {
  font-weight: bold;
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

.viewer-badge {
  backdrop-filter: blur(10px);
  font-weight: 500;
}

.stream-title {
  padding: 16px;
  display: flex;
  align-items: center;
  font-weight: 500;
}

.watch-button {
  margin: 8px;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.watch-button:hover {
  transform: scale(1.02);
}
</style>
