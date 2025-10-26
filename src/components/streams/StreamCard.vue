<template>
  <v-card
    class="stream-card"
    hover
    elevation="4"
    rounded="lg"
    @click="goToStream"
  >
    <div class="thumbnail-wrapper">
      <v-img
        :src="displayImage"
        height="200"
        cover
        @error="handleThumbnailError"
        class="stream-thumbnail"
      >
        <!-- Dark overlay for better text readability -->
        <div class="thumbnail-overlay"></div>
        
        <!-- Live badge overlay -->
        <div class="stream-overlay">
          <v-chip
            color="error"
            size="small"
            class="live-badge elevation-3"
          >
            <v-icon icon="mdi-circle" size="x-small" class="mr-1 pulse-animation"></v-icon>
            LIVE
          </v-chip>
          
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
    </div>

    <v-card-title class="stream-title">
      <v-icon icon="mdi-video" size="small" class="mr-2" color="primary"></v-icon>
      <span class="text-truncate">{{ stream.name }}</span>
    </v-card-title>

    <v-card-actions>
      <v-btn
        color="primary"
        variant="flat"
        block
        @click="goToStream"
        class="watch-button"
      >
        <v-icon icon="mdi-play" start></v-icon>
        Watch Now
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { type StreamInfo } from '@/services/api/types'
import { generateThumbnailUrl } from '@/services/api/endpoints'

interface Props {
  stream: StreamInfo
}

const props = defineProps<Props>()
const router = useRouter()
const thumbnailError = ref(false)

// Get the thumbnail URL from OME
const thumbnailUrl = computed(() => {
  if (thumbnailError.value) {
    return null
  }
  return generateThumbnailUrl(props.stream.name)
})

// Use a simple gradient placeholder as fallback
const placeholderImage = computed(() => {
  // Generate a gradient based on the stream name (simple hash for variety)
  const hash = props.stream.name.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
  const hue = hash % 360
  return `data:image/svg+xml,%3Csvg width='400' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:hsl(${hue},70%25,50%25);stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:hsl(${(hue + 60) % 360},70%25,30%25);stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='200' fill='url(%23grad)' /%3E%3C/svg%3E`
})

// Use thumbnail if available, otherwise use placeholder
const displayImage = computed(() => {
  return thumbnailUrl.value || placeholderImage.value
})

function handleThumbnailError() {
  thumbnailError.value = true
}

function goToStream() {
  router.push({ name: 'stream', params: { name: props.stream.name } })
}
</script>

<style scoped>
.stream-card {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.stream-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3) !important;
}

.thumbnail-wrapper {
  position: relative;
  overflow: hidden;
}

.stream-thumbnail {
  transition: transform 0.3s ease;
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

.live-badge {
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
