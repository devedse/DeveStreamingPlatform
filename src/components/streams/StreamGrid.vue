<template>
  <v-row>
    <v-col
      v-for="stream in streams"
      :key="stream.name"
      cols="12"
      sm="6"
      md="4"
      lg="3"
    >
      <StreamCard :stream="stream" />
    </v-col>

    <!-- Empty state -->
    <v-col v-if="streams.length === 0" cols="12">
      <v-card class="text-center pa-8" elevation="0" variant="outlined">
        <v-icon icon="mdi-video-off" size="64" color="grey"></v-icon>
        <h2 class="text-h5 mt-4 mb-2">No Live Streams</h2>
        <p class="text-body-1 text-grey">
          No streams are currently live. Start streaming to see them here!
        </p>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import StreamCard from './StreamCard.vue'
import { type StreamInfo } from '@/services/api/types'

interface Props {
  streams: StreamInfo[]
}

defineProps<Props>()
</script>
