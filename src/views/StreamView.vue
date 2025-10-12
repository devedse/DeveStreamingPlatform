<template>
  <v-container fluid class="pa-4">
    <!-- Back button -->
    <div class="mb-4">
      <v-btn
        variant="text"
        @click="router.push('/')"
      >
        <v-icon icon="mdi-arrow-left" start></v-icon>
        Back to Streams
      </v-btn>
    </div>

    <!-- Stream header -->
    <div class="mb-4">
      <div class="d-flex align-center mb-2">
        <v-chip color="error" size="small" class="mr-2">
          <v-icon icon="mdi-circle" size="x-small" class="mr-1"></v-icon>
          LIVE
        </v-chip>
        <h1 class="text-h4 font-weight-bold">{{ streamName }}</h1>
      </div>
      <p class="text-body-2 text-grey">
        Streaming via WebRTC with sub-second latency
      </p>
    </div>

    <!-- Player section -->
    <v-row>
      <v-col cols="12" lg="8">
        <v-card elevation="2">
          <OvenPlayerComponent
            :stream-url="playbackUrl"
            :autoplay="true"
          />
        </v-card>
      </v-col>

      <!-- Stats sidebar -->
      <v-col cols="12" lg="4">
        <StreamStats 
          :stream-name="streamName"
          :stats="stats" 
          :loading="statsLoading"
        />
      </v-col>
    </v-row>
  </v-container>
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
