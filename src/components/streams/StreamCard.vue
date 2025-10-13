<template>
  <v-card
    class="stream-card"
    hover
    elevation="4"
    rounded="lg"
    @click="goToStream"
  >
    <v-img
      :src="placeholderImage"
      height="200"
      cover
    >
      <!-- Live badge overlay -->
      <div class="stream-overlay">
        <v-chip
          color="error"
          size="small"
          class="live-badge"
        >
          <v-icon icon="mdi-circle" size="x-small" class="mr-1"></v-icon>
          LIVE
        </v-chip>
        
        <!-- Viewer count badge -->
        <v-chip
          v-if="stream.viewerCount > 0"
          color="rgba(0,0,0,0.7)"
          size="small"
          class="viewer-badge"
        >
          <v-icon icon="mdi-eye" size="small" class="mr-1"></v-icon>
          {{ stream.viewerCount }}
        </v-chip>
      </div>
    </v-img>

    <v-card-title>
      <v-icon icon="mdi-video" size="small" class="mr-2" color="primary"></v-icon>
      {{ stream.name }}
    </v-card-title>

    <v-card-actions>
      <v-btn
        color="primary"
        variant="flat"
        block
        @click="goToStream"
      >
        <v-icon icon="mdi-play" start></v-icon>
        Watch Now
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { type StreamInfo } from '@/services/api/types'

interface Props {
  stream: StreamInfo
}

const props = defineProps<Props>()
const router = useRouter()

// Use a simple gradient placeholder since we don't have stream thumbnails
const placeholderImage = computed(() => {
  // Generate a gradient based on the stream name (simple hash for variety)
  const hash = props.stream.name.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
  const hue = hash % 360
  return `data:image/svg+xml,%3Csvg width='400' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:hsl(${hue},70%25,50%25);stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:hsl(${(hue + 60) % 360},70%25,30%25);stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='200' fill='url(%23grad)' /%3E%3C/svg%3E`
})

function goToStream() {
  router.push({ name: 'stream', params: { name: props.stream.name } })
}
</script>

<style scoped>
.stream-card {
  cursor: pointer;
  transition: transform 0.2s ease;
}

.stream-card:hover {
  transform: translateY(-4px);
}

.stream-overlay {
  position: absolute;
  top: 8px;
  left: 8px;
  right: 8px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.live-badge {
  font-weight: bold;
}

.viewer-badge {
  backdrop-filter: blur(8px);
}
</style>
