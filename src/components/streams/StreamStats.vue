<template>
  <v-card elevation="2">
    <v-card-title class="d-flex align-center justify-space-between">
      <div class="d-flex align-center">
        <v-icon icon="mdi-chart-line" class="mr-2" color="primary"></v-icon>
        Stream Statistics
      </div>
      <v-btn
        v-if="stats"
        icon="mdi-refresh"
        size="small"
        variant="text"
        :loading="loading"
        @click="handleRefresh"
      ></v-btn>
    </v-card-title>

    <v-divider></v-divider>

    <v-card-text>
      <!-- Loading state - only show when there's NO data yet -->
      <div v-if="!stats" class="text-center pa-4">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
        <p class="text-body-2 text-grey mt-2">Loading statistics...</p>
      </div>

      <!-- Stats display - show even while refreshing -->
      <div v-else class="stats-grid">
        <!-- Viewer count -->
        <v-card variant="tonal" class="stat-card">
          <v-card-text class="text-center">
            <v-icon icon="mdi-eye" size="large" color="primary" class="mb-2"></v-icon>
            <div class="text-h4 font-weight-bold">{{ totalViewers }}</div>
            <div class="text-caption text-grey">
              {{ totalViewers === 1 ? 'Viewer' : 'Viewers' }}
            </div>
          </v-card-text>
        </v-card>

        <!-- Connection breakdown -->
        <v-card variant="tonal" class="stat-card">
          <v-card-text>
            <div class="text-subtitle-2 mb-3 font-weight-bold">
              <v-icon icon="mdi-connection" size="small" class="mr-1"></v-icon>
              Connections
            </div>
            <div class="connection-list">
              <div v-for="(count, protocol) in stats.connections" :key="protocol" class="connection-item">
                <span class="text-caption text-uppercase protocol-name">{{ protocol }}</span>
                <v-chip size="x-small" :color="count > 0 ? 'primary' : 'default'">
                  {{ count }}
                </v-chip>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- Throughput stats -->
        <v-card variant="tonal" class="stat-card">
          <v-card-text>
            <div class="text-subtitle-2 mb-3 font-weight-bold">
              <v-icon icon="mdi-speedometer" size="small" class="mr-1"></v-icon>
              Throughput
            </div>
            <div class="throughput-stats">
              <div class="mb-2">
                <div class="text-caption text-grey">Average In</div>
                <div class="text-body-2 font-weight-medium">
                  {{ formatBitsPerSec(stats.avgThroughputIn) }}
                </div>
              </div>
              <div class="mb-2">
                <div class="text-caption text-grey">Average Out</div>
                <div class="text-body-2 font-weight-medium">
                  {{ formatBitsPerSec(stats.avgThroughputOut) }}
                </div>
              </div>
              <v-divider class="my-2"></v-divider>
              <div class="mb-2">
                <div class="text-caption text-grey">Total In</div>
                <div class="text-body-2 font-weight-medium">
                  {{ formatBytes(stats.totalBytesIn) }}
                </div>
              </div>
              <div>
                <div class="text-caption text-grey">Total Out</div>
                <div class="text-body-2 font-weight-medium">
                  {{ formatBytes(stats.totalBytesOut) }}
                </div>
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- Stream info -->
        <v-card variant="tonal" class="stat-card">
          <v-card-text>
            <div class="text-subtitle-2 mb-3 font-weight-bold">
              <v-icon icon="mdi-information" size="small" class="mr-1"></v-icon>
              Stream Info
            </div>
            <div class="stream-info">
              <div class="mb-2">
                <div class="text-caption text-grey">Created</div>
                <div class="text-body-2">{{ formatTime(stats.createdTime) }}</div>
              </div>
              <div class="mb-2">
                <div class="text-caption text-grey">Total Connections</div>
                <div class="text-body-2 font-weight-medium">{{ stats.totalConnections }}</div>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Error/Empty state -->
      <div v-if="!stats" class="text-center pa-4">
        <v-icon icon="mdi-alert-circle" size="large" color="grey"></v-icon>
        <p class="text-body-2 text-grey mt-2">No statistics available</p>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStreamStore } from '@/stores/streams'
import { type StreamStats } from '@/services/api/types'
import { formatBytes, formatBitsPerSec } from '@/utils/formatters'

interface Props {
  streamName: string
  stats: StreamStats | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
})

const streamStore = useStreamStore()

async function handleRefresh() {
  await streamStore.fetchStreamStats(props.streamName)
}

const totalViewers = computed(() => {
  if (!props.stats) return 0
  return Object.values(props.stats.connections).reduce((sum: number, count: unknown) => sum + (count as number), 0)
})

function formatTime(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    return date.toLocaleString()
  } catch {
    return timestamp
  }
}
</script>

<style scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.stat-card {
  height: 100%;
}

.connection-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.connection-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.protocol-name {
  font-weight: 500;
  color: rgb(var(--v-theme-on-surface));
}

.throughput-stats,
.stream-info {
  font-size: 0.875rem;
}
</style>
