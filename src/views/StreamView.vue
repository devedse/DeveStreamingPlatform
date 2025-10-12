<template>
  <div class="stream-view">
    <v-container fluid class="px-6 py-6">
      <!-- Back button -->
      <div class="mb-6">
        <v-btn
          variant="text"
          size="large"
          @click="router.push('/')"
        >
          <v-icon icon="mdi-arrow-left" start></v-icon>
          Back to Streams
        </v-btn>
      </div>

      <!-- Stream header -->
      <div class="mb-6">
        <div class="d-flex align-center mb-3">
          <v-chip color="error" size="default" class="mr-3">
            <v-icon icon="mdi-circle" size="small" class="mr-1"></v-icon>
            LIVE
          </v-chip>
          <h1 class="text-h3 font-weight-bold">{{ streamName }}</h1>
        </div>
        <p class="text-h6 text-medium-emphasis">
          Streaming via WebRTC with sub-second latency
        </p>
      </div>

      <!-- Player section -->
      <v-row>
        <v-col cols="12" lg="8">
          <v-card elevation="0" border>
            <OvenPlayerComponent
              :stream-url="playbackUrl"
              :autoplay="true"
            />
          </v-card>
        </v-col>

        <!-- Stats sidebar -->
        <v-col cols="12" lg="4">
          <StreamStats :stats="stats" :loading="statsLoading" />
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStreamStore } from '@/stores/streams'
import { generatePlaybackUrl } from '@/services/api/endpoints'
import OvenPlayerComponent from '@/components/player/OvenPlayerComponent.vue'
import StreamStats from '@/components/streams/StreamStats.vue'

const route = useRoute()
const router = useRouter()
const streamStore = useStreamStore()

const streamName = computed(() => route.params.name as string)
const playbackUrl = computed(() => generatePlaybackUrl(streamName.value))
const stats = computed(() => streamStore.activeStreamStats)
const statsLoading = computed(() => streamStore.loading)

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
