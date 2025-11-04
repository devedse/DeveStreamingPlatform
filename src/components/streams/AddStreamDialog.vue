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
        >
          <template #prepend-inner>
            <v-icon icon="mdi-tag"></v-icon>
          </template>
        </v-text-field>

        <div class="mt-6">
          <div class="d-flex align-center gap-2 mb-2">
            <v-icon icon="mdi-monitor-share" color="primary"></v-icon>
            <span class="text-subtitle-1 font-weight-medium">Configuring OBS</span>
          </div>
          <div class="text-body-2 text-grey mb-3">
            Choose the encoder you use below to view the recommended OBS configuration screenshot.
          </div>
          <div class="d-flex flex-wrap gap-2">
            <v-btn
              variant="tonal"
              color="primary"
              size="small"
              @click="openPreview('nvenc')"
            >
              NVENC (NVIDIA)
            </v-btn>
            <v-btn
              variant="tonal"
              color="secondary"
              size="small"
              @click="openPreview('h264')"
            >
              x264 (CPU)
            </v-btn>
          </div>
        </div>

        <!-- Show URLs after stream name is entered -->
        <v-expand-transition>
          <div v-if="shouldShowUrls" class="mt-4">
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
                label="Server URL"
                readonly
                density="compact"
                variant="outlined"
                hide-details
                class="mb-2"
              >
                <template #append-inner>
                  <v-btn
                    icon="mdi-content-copy"
                    size="small"
                    variant="text"
                    @click="copyToClipboard(urls.rtmp, 'RTMP Server URL')"
                  ></v-btn>
                </template>
              </v-text-field>
              <v-text-field
                :model-value="urls.rtmpStreamKey"
                label="Stream Key"
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
                    @click="copyToClipboard(urls.rtmpStreamKey, 'Stream Key')"
                  ></v-btn>
                </template>
              </v-text-field>
            </div>

            <!-- WebRTC URL (Ingest) -->
            <div class="url-section mb-3">
              <div class="d-flex align-center mb-2">
                <v-chip size="small" color="info" variant="flat" class="mr-2">WebRTC Ingest</v-chip>
                <span class="text-caption text-grey">Self-defined signaling protocol</span>
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
                    @click="copyToClipboard(urls.webrtc, 'WebRTC Ingest')"
                  ></v-btn>
                </template>
              </v-text-field>
            </div>

            <!-- WHIP URL -->
            <div class="url-section mb-3">
              <div class="d-flex align-center mb-2">
                <v-chip size="small" color="success" variant="flat" class="mr-2">WHIP</v-chip>
                <span class="text-caption text-grey">WebRTC HTTP Ingest Protocol</span>
              </div>
              <v-text-field
                :model-value="urls.whip"
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
                    @click="copyToClipboard(urls.whip, 'WHIP')"
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
        </v-expand-transition>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
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

    <v-dialog v-model="previewDialog" max-width="960">
      <v-card>
        <v-card-title class="d-flex align-center justify-space-between">
          <div>
            <div class="text-subtitle-1 font-weight-bold">{{ previewGuide?.label }}</div>
            <div class="text-caption text-grey">{{ previewGuide?.description }}</div>
          </div>
          <v-btn icon="mdi-close" variant="text" @click="closePreview"></v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-0">
          <v-img
            v-if="previewGuide"
            :src="previewGuide.image"
            :alt="previewGuide.imageAlt"
            max-height="80vh"
            contain
            class="preview-image"
            @click="closePreview"
          ></v-img>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn
            v-if="previewGuide"
            variant="text"
            :href="previewGuide.image"
            download
          >
            <v-icon icon="mdi-download" start></v-icon>
            Download PNG
          </v-btn>
          <v-btn variant="flat" color="primary" @click="closePreview">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { generateStreamUrls } from '@/services/api/endpoints'
import nvencImage from '@/assets/images/nvenc_settings.png'
import h264Image from '@/assets/images/x264_settings.png'

const dialog = ref(false)
const streamName = ref('')
const snackbar = ref(false)
const snackbarText = ref('')
const previewDialog = ref(false)

type EncoderId = 'nvenc' | 'h264'

interface EncoderGuide {
  id: EncoderId
  label: string
  description: string
  image: string
  imageAlt: string
}

const encoderGuides: Record<EncoderId, EncoderGuide> = {
  nvenc: {
    id: 'nvenc',
    label: 'NVENC (NVIDIA)',
    description: 'Use this if your GPU supports NVIDIA NVENC.',
    image: nvencImage,
    imageAlt: 'OBS configuration window showing NVENC encoder settings',
  },
  h264: {
    id: 'h264',
    label: 'x264 (CPU)',
    description: 'Use this when encoding on the CPU (software).',
    image: h264Image,
    imageAlt: 'OBS configuration window showing x264 encoder settings',
  },
}

const previewGuide = ref<EncoderGuide | null>(null)

const urls = computed(() => generateStreamUrls(streamName.value.trim()))

const hasSpaces = computed(() => /\s/.test(streamName.value))

const shouldShowUrls = computed(() => {
  const name = streamName.value.trim()
  return name.length > 0 && !hasSpaces.value
})

const rules = {
  required: (v: string) => !!v.trim() || 'Stream name is required',
  noSpaces: (v: string) => !/\s/.test(v) || 'Stream name cannot contain spaces',
}

function closeDialog() {
  dialog.value = false
  // Reset after dialog closes
  setTimeout(() => {
    streamName.value = ''
    previewGuide.value = null
    previewDialog.value = false
  }, 300)
}

function closePreview() {
  previewDialog.value = false
  previewGuide.value = null
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

function openPreview(encoder: EncoderId) {
  previewGuide.value = encoderGuides[encoder]
  previewDialog.value = true
}
</script>

<style scoped>
.url-section {
  padding: 8px 0;
}

.preview-image {
  cursor: pointer;
}
</style>
