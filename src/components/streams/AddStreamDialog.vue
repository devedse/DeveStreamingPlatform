<template>
  <v-dialog v-model="dialog" max-width="600">
    <template #activator="{ props: activatorProps }">
      <v-btn
        color="primary"
        size="large"
        v-bind="activatorProps"
      >
        <v-icon icon="mdi-plus" start></v-icon>
        Add Stream
      </v-btn>
    </template>

    <v-card>
      <v-card-title class="d-flex align-center pa-4">
        <v-icon icon="mdi-video-plus" class="mr-2" color="primary"></v-icon>
        <span class="text-h6">Add New Stream</span>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="pa-4">
        <p class="text-body-2 mb-4">
          Enter a stream name below to get your streaming URLs for OBS or other broadcasting software.
        </p>

        <v-text-field
          v-model="streamName"
          label="Stream Name"
          placeholder="e.g., my-awesome-stream"
          variant="outlined"
          density="comfortable"
          :rules="[rules.required, rules.noSpaces]"
          @keyup.enter="generateUrls"
        >
          <template #prepend-inner>
            <v-icon icon="mdi-tag"></v-icon>
          </template>
        </v-text-field>

        <!-- Show URLs after stream name is entered -->
        <div v-if="showUrls && streamName.trim()" class="mt-4">
          <v-divider class="mb-4"></v-divider>
          
          <h3 class="text-subtitle-1 mb-3 font-weight-bold">
            <v-icon icon="mdi-broadcast" class="mr-2" color="primary"></v-icon>
            Your Streaming URLs:
          </h3>

          <!-- SRT URL -->
          <div class="url-section mb-3">
            <div class="d-flex align-center mb-2">
              <v-chip size="small" color="primary" variant="flat" class="mr-2">SRT</v-chip>
              <span class="text-caption text-grey">Recommended for best quality</span>
            </div>
            <v-text-field
              :model-value="urls.srt"
              readonly
              density="compact"
              variant="outlined"
              hide-details
            >
              <template #append-inner>
                <v-btn
                  icon="mdi-content-copy"
                  size="small"
                  variant="text"
                  @click="copyToClipboard(urls.srt, 'SRT')"
                ></v-btn>
              </template>
            </v-text-field>
          </div>

          <!-- RTMP URL -->
          <div class="url-section mb-3">
            <div class="d-flex align-center mb-2">
              <v-chip size="small" color="secondary" variant="flat" class="mr-2">RTMP</v-chip>
              <span class="text-caption text-grey">Standard streaming protocol</span>
            </div>
            <v-text-field
              :model-value="urls.rtmp"
              readonly
              density="compact"
              variant="outlined"
              hide-details
            >
              <template #append-inner>
                <v-btn
                  icon="mdi-content-copy"
                  size="small"
                  variant="text"
                  @click="copyToClipboard(urls.rtmp, 'RTMP')"
                ></v-btn>
              </template>
            </v-text-field>
          </div>

          <!-- WebRTC URL -->
          <div class="url-section mb-3">
            <div class="d-flex align-center mb-2">
              <v-chip size="small" color="info" variant="flat" class="mr-2">WebRTC</v-chip>
              <span class="text-caption text-grey">For playback (lowest latency)</span>
            </div>
            <v-text-field
              :model-value="urls.webrtc"
              readonly
              density="compact"
              variant="outlined"
              hide-details
            >
              <template #append-inner>
                <v-btn
                  icon="mdi-content-copy"
                  size="small"
                  variant="text"
                  @click="copyToClipboard(urls.webrtc, 'WebRTC')"
                ></v-btn>
              </template>
            </v-text-field>
          </div>

          <!-- MPEG-TS URL -->
          <div class="url-section">
            <div class="d-flex align-center mb-2">
              <v-chip size="small" color="warning" variant="flat" class="mr-2">MPEG-TS/UDP</v-chip>
              <span class="text-caption text-grey">UDP streaming</span>
            </div>
            <v-text-field
              :model-value="urls.mpegts"
              readonly
              density="compact"
              variant="outlined"
              hide-details
            >
              <template #append-inner>
                <v-btn
                  icon="mdi-content-copy"
                  size="small"
                  variant="text"
                  @click="copyToClipboard(urls.mpegts, 'MPEG-TS')"
                ></v-btn>
              </template>
            </v-text-field>
          </div>

          <v-alert
            type="info"
            variant="tonal"
            density="compact"
            class="mt-4"
          >
            <template #prepend>
              <v-icon icon="mdi-information"></v-icon>
            </template>
            Start streaming with these URLs in OBS. Your stream will appear automatically on the home page!
          </v-alert>
        </div>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn
          v-if="!showUrls"
          color="primary"
          variant="flat"
          :disabled="!streamName.trim() || hasSpaces"
          @click="generateUrls"
        >
          Generate URLs
        </v-btn>
        <v-btn
          variant="text"
          @click="closeDialog"
        >
          Close
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Snackbar for copy feedback -->
    <v-snackbar
      v-model="snackbar"
      :timeout="2000"
      color="success"
    >
      {{ snackbarText }}
    </v-snackbar>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { generateStreamUrls } from '@/services/api/endpoints'

const dialog = ref(false)
const streamName = ref('')
const showUrls = ref(false)
const snackbar = ref(false)
const snackbarText = ref('')

const urls = computed(() => generateStreamUrls(streamName.value.trim()))

const hasSpaces = computed(() => /\s/.test(streamName.value))

const rules = {
  required: (v: string) => !!v.trim() || 'Stream name is required',
  noSpaces: (v: string) => !/\s/.test(v) || 'Stream name cannot contain spaces',
}

function generateUrls() {
  if (streamName.value.trim() && !hasSpaces.value) {
    showUrls.value = true
  }
}

function closeDialog() {
  dialog.value = false
  // Reset after dialog closes
  setTimeout(() => {
    streamName.value = ''
    showUrls.value = false
  }, 300)
}

async function copyToClipboard(text: string, protocol: string) {
  try {
    await navigator.clipboard.writeText(text)
    snackbarText.value = `${protocol} URL copied to clipboard!`
    snackbar.value = true
  } catch (err) {
    console.error('Failed to copy:', err)
    snackbarText.value = 'Failed to copy to clipboard'
    snackbar.value = true
  }
}
</script>

<style scoped>
.url-section {
  padding: 8px 0;
}
</style>
