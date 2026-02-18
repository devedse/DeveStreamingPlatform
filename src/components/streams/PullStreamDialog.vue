<template>
  <v-dialog v-model="dialog" max-width="600">
    <template #activator="{ props: activatorProps }">
      <v-btn
        color="secondary"
        size="large"
        v-bind="activatorProps"
        class="mr-3"
      >
        <v-icon icon="mdi-download-network" start></v-icon>
        Pull Stream
      </v-btn>
    </template>

    <v-card>
      <v-card-title class="d-flex align-center pa-4">
        <v-icon icon="mdi-download-network" class="mr-2" color="secondary"></v-icon>
        <span class="text-h6">Pull Stream</span>
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="pa-4">
        <p class="text-body-2 mb-4">
          Pull a stream from an external source (RTSP, RTSPS, or OVT). The stream will be ingested and made available for playback.
        </p>

        <v-form ref="formRef">
          <!-- Stream name -->
          <v-text-field
            v-model="streamName"
            label="Stream Name"
            placeholder="my-pulled-stream"
            variant="outlined"
            density="comfortable"
            :rules="[rules.required]"
            class="mb-4"
          >
            <template #prepend-inner>
              <v-icon icon="mdi-tag"></v-icon>
            </template>
          </v-text-field>

          <!-- URL(s) -->
          <v-textarea
            v-model="urls"
            label="URL(s)"
            placeholder="rtsp://192.168.0.160:554/stream&#10;rtsps://10.88.10.252:7441/FgwzxkysHpV49Tz8?enableSrtp"
            hint="Enter one or more URLs (RTSP, RTSPS, or OVT). One URL per line. All URLs must use the same protocol."
            persistent-hint
            variant="outlined"
            density="comfortable"
            :rules="[rules.required, rules.validateUrls]"
            rows="3"
            class="mb-4"
          >
            <template #prepend-inner>
              <v-icon icon="mdi-link"></v-icon>
            </template>
          </v-textarea>

          <!-- Advanced options -->
          <v-expansion-panels class="mb-4">
            <v-expansion-panel>
              <v-expansion-panel-title>
                <v-icon icon="mdi-cog" start></v-icon>
                Advanced Options
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-switch
                  v-model="persistent"
                  label="Persistent"
                  hint="Keep stream online even if there are no viewers"
                  persistent-hint
                  color="secondary"
                  class="mb-2"
                ></v-switch>

                <v-text-field
                  v-model.number="noInputTimeout"
                  label="No Input Timeout (ms)"
                  hint="Delete stream if no data received for this duration (ignored if persistent)"
                  persistent-hint
                  type="number"
                  variant="outlined"
                  density="compact"
                  class="mb-2"
                ></v-text-field>

                <v-text-field
                  v-if="!persistent"
                  v-model.number="unusedTimeout"
                  label="Unused Stream Timeout (ms)"
                  hint="Will delete stream if no viewers for this duration"
                  persistent-hint
                  type="number"
                  variant="outlined"
                  density="compact"
                  class="mb-2"
                ></v-text-field>

                <v-switch
                  v-model="ignoreRtcpSR"
                  label="Ignore RTCP SR Timestamp"
                  hint="Start stream immediately without waiting for RTCP SR"
                  persistent-hint
                  color="secondary"
                ></v-switch>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>

          <!-- Error message -->
          <v-alert
            v-if="errorMessage"
            type="error"
            variant="tonal"
            density="compact"
            closable
            @click:close="errorMessage = ''"
          >
            {{ errorMessage }}
          </v-alert>

          <!-- Success message -->
          <v-alert
            v-if="successMessage"
            type="success"
            variant="tonal"
            density="compact"
            closable
            @click:close="successMessage = ''"
          >
            {{ successMessage }}
          </v-alert>
        </v-form>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn
          variant="text"
          @click="dialog = false"
          :disabled="loading"
        >
          Cancel
        </v-btn>
        <v-btn
          color="secondary"
          variant="flat"
          @click="handlePullStream"
          :loading="loading"
        >
          Pull Stream
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { omeApi } from '@/services/api/omeApi'
import { useStreamStore } from '@/stores/streams'

const dialog = ref(false)
const formRef = ref<any>(null)
const streamStore = useStreamStore()

// Form fields
const streamName = ref('')
const urls = ref('')
const persistent = ref(true)
const noInputTimeout = ref(3000)
const unusedTimeout = ref(60000)
const ignoreRtcpSR = ref(false)

// UI state
const loading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

// Validation rules
const rules = {
  required: (v: any) => !!v || 'This field is required',
  validateUrls: (value: string) => {
    if (!value) return 'At least one URL is required'
    
    const urlList = value.split('\n').map(u => u.trim()).filter(Boolean)
    if (urlList.length === 0) return 'At least one URL is required'
    
    // Check that all URLs have the same scheme
    const schemes = urlList.map(url => {
      try {
        return new URL(url).protocol.replace(':', '')
      } catch {
        return null
      }
    })
    
    if (schemes.some(s => s === null)) {
      return 'All URLs must be valid (e.g., rtsp://, rtsps://, ovt://)'
    }
    
    const uniqueSchemes = new Set(schemes)
    if (uniqueSchemes.size > 1) {
      return 'All URLs must use the same protocol (rtsp://, rtsps://, or ovt://)'
    }
    
    const scheme = schemes[0]
    if (scheme !== 'rtsp' && scheme !== 'rtsps' && scheme !== 'ovt') {
      return 'Only RTSP, RTSPS, and OVT protocols are supported'
    }
    
    return true
  }
}

async function handlePullStream() {
  // Validate form
  const { valid } = await formRef.value?.validate()
  if (!valid) return
  
  errorMessage.value = ''
  successMessage.value = ''
  loading.value = true
  
  try {
    const urlList = urls.value.split('\n').map(u => u.trim()).filter(Boolean)
    
    const success = await omeApi.createPullStream({
      name: streamName.value,
      urls: urlList,
      properties: {
        persistent: persistent.value,
        noInputFailoverTimeoutMs: noInputTimeout.value,
        unusedStreamDeletionTimeoutMs: unusedTimeout.value,
        ignoreRtcpSRTimestamp: ignoreRtcpSR.value,
      }
    })
    
    if (success) {
      successMessage.value = `Stream "${streamName.value}" created successfully!`
      
      // Reset form
      streamName.value = ''
      urls.value = ''
      persistent.value = true
      noInputTimeout.value = 3000
      unusedTimeout.value = 60000
      ignoreRtcpSR.value = false
      formRef.value?.reset()
      
      // Refresh streams to show the new stream
      await streamStore.fetchStreams()
      
      // Close dialog after a short delay
      setTimeout(() => {
        dialog.value = false
        successMessage.value = ''
      }, 2000)
    } else {
      errorMessage.value = 'Failed to create pull stream. Check server logs for details.'
    }
  } catch (error) {
    errorMessage.value = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
  } finally {
    loading.value = false
  }
}
</script>
