<template>
  <v-card class="inactive-endpoint-card" elevation="3" rounded="lg">
    <v-card-title class="d-flex align-center ga-2">
      <v-icon icon="mdi-access-point-off" color="warning" />
      <span class="text-truncate">{{ displayName }}</span>
      <v-chip
        :color="endpoint.type === 'public' ? 'success' : 'orange'"
        size="x-small"
        variant="flat"
      >
        <v-icon :icon="endpoint.type === 'public' ? 'mdi-earth' : 'mdi-link-lock'" size="x-small" start />
        {{ endpoint.type.toUpperCase() }}
      </v-chip>
    </v-card-title>

    <v-card-text>
      <p class="text-body-2 text-grey mb-2">The source stream is no longer live.</p>
      <p class="text-caption text-grey-darken-1 text-truncate" :title="endpoint.channelName">
        Channel: {{ endpoint.channelName }}
      </p>
      <v-alert v-if="deleteError" type="error" variant="tonal" density="compact" class="mt-3">
        Could not delete this endpoint. Please try again.
      </v-alert>
    </v-card-text>

    <v-card-actions>
      <v-btn
        color="warning"
        variant="flat"
        block
        :loading="deleting"
        @click="deleteEndpoint"
      >
        <v-icon icon="mdi-delete" start />
        Delete Endpoint
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { type InactiveStreamEndpoint } from '@/services/api/types'
import { useStreamStore } from '@/stores/streams'

const props = defineProps<{
  endpoint: InactiveStreamEndpoint
}>()

const streamStore = useStreamStore()
const deleting = ref(false)
const deleteError = ref(false)
const displayName = computed(() => props.endpoint.sourceStreamName ?? 'Unknown source')

async function deleteEndpoint() {
  deleting.value = true
  deleteError.value = false
  try {
    const success = await streamStore.deleteInactiveEndpoint(props.endpoint)
    deleteError.value = !success
  } catch {
    deleteError.value = true
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.inactive-endpoint-card {
  border: 2px solid rgb(var(--v-theme-warning));
  opacity: 0.9;
}
</style>
