<template>
  <v-container fluid class="pa-6 fill-height">
    <!-- Page header -->
    <v-row>
      <v-col cols="12">
        <div class="d-flex justify-space-between align-center flex-wrap mb-6">
          <div>
            <h1 class="text-h3 font-weight-bold mb-2">
              <v-icon icon="mdi-television-play" color="primary" size="40" class="mr-3"></v-icon>
              Live Streams
            </h1>
            <p class="text-h6 text-medium-emphasis">
              Browse and watch live streams
            </p>
          </div>
          
          <div class="d-flex ga-3">
            <v-btn
              :loading="loading"
              color="primary"
              variant="tonal"
              size="large"
              @click="refreshStreams"
            >
              <v-icon icon="mdi-refresh" start></v-icon>
              Refresh
            </v-btn>
            
            <AddStreamDialog />
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Stream grid -->
    <StreamGrid :streams="streams" />

    <!-- Error message -->
    <v-row v-if="error">
      <v-col cols="12">
        <v-alert
          type="error"
          variant="tonal"
          closable
          @click:close="error = null"
        >
          {{ error }}
        </v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed } from 'vue'
import { useStreamStore } from '@/stores/streams'
import StreamGrid from '@/components/streams/StreamGrid.vue'
import AddStreamDialog from '@/components/streams/AddStreamDialog.vue'

const streamStore = useStreamStore()

const streams = computed(() => streamStore.liveStreams)
const loading = computed(() => streamStore.loading)
const error = computed({
  get: () => streamStore.error,
  set: (value) => { streamStore.error = value }
})

onMounted(async () => {
  await refreshStreams()
  // Start polling for updates every 5 seconds
  streamStore.startPolling(5000)
})

onBeforeUnmount(() => {
  // Stop polling when leaving the page
  streamStore.stopPolling()
})

async function refreshStreams() {
  await streamStore.fetchStreams()
}
</script>
