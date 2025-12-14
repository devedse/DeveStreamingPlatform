<template>
  <div class="oven-player-wrapper">
    <div :id="playerId" class="oven-player-container"></div>
    <div v-if="streamEnded" class="stream-ended-overlay">
      <div class="ended-content">
        <v-icon icon="mdi-video-off" size="64" color="grey-lighten-1"></v-icon>
        <h3 class="text-h6 mt-4">Stream Ended</h3>
        <p class="text-body-2 text-grey-lighten-1">{{ streamName }} is no longer live</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import OvenPlayer from 'ovenplayer'
import { omeApi } from '@/services/api/omeApi'

interface Source {
  type: 'webrtc' | 'llhls' | 'hls' | 'lldash' | 'dash' | 'mp4'
  file: string
  label: string
}

interface Props {
  sources: Source[]
  streamName: string
  autoplay?: boolean
  mute?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoplay: true,
  mute: false,
})

// Generate a unique ID for this player instance using stream name
const playerId = ref(`ovenplayer-${props.streamName}`)
const streamEnded = ref(false)
let player: any = null
let restartCount = 0
let streamCheckInterval: number | null = null

onMounted(() => {
  initPlayer()
})

onBeforeUnmount(() => {
  stopStreamCheck()
  destroyPlayer()
})

// Note: We don't watch sources changes because for a given stream,
// the sources URLs don't change. The component will be recreated
// (via key change) if we switch to a different stream.

function initPlayer() {
  try {
    player = OvenPlayer.create(playerId.value, {
      sources: props.sources,
      autoStart: props.autoplay,
      controls: true,
      mute: props.mute,
      volume: 0,
      showBigPlayButton: true,
      aspectRatio: 'auto',
      autoFallback: false,
    })

    player.on('stateChanged', async (state: any) => {
      const newState = state.newstate || state
      console.log(`[${props.streamName}] State:`, newState)
      
      if (newState === 'playing') {
        // Stream is healthy, reset restart count
        restartCount = 0
      } else if (newState === 'error') {
        console.error(`[${props.streamName}] Stream error detected`, state)
        await handleStreamError()
      } else if (newState === 'stalled') {
        console.warn(`[${props.streamName}] Stream stalled`, state)
      }
    })
  } catch (error) {
    console.error('Failed to initialize OvenPlayer:', error)
  }
}

async function handleStreamError() {
  try {
    console.log(`[${props.streamName}] Checking if stream is still available...`)
    
    // Check if the stream still exists on the server
    const streams = await omeApi.getStreams()
    const streamExists = streams.includes(props.streamName)
    
    if (streamExists) {
      // Stream exists but has an error - try restarting up to 3 times
      stopStreamCheck()
      
      if (restartCount < 3) {
        console.log(`[${props.streamName}] Stream exists but has error, restarting player (attempt ${restartCount + 1}/3)...`)
        streamEnded.value = false
        restartPlayer()
      } else {
        console.error(`[${props.streamName}] Max restart attempts (3) reached, keeping player visible`)
        // Don't show stream ended - just stop trying to restart
        streamEnded.value = false
      }
    } else {
      // Stream actually went offline
      console.error(`[${props.streamName}] Stream went offline`)
      streamEnded.value = true
      restartCount = 0 // Reset for when stream comes back
      // Start checking every 5 seconds if stream comes back
      startStreamCheck()
    }
  } catch (error) {
    console.error(`[${props.streamName}] Failed to check stream status:`, error)
  }
}

function startStreamCheck() {
  stopStreamCheck()
  console.log(`[${props.streamName}] Starting stream availability checks every 5 seconds...`)
  
  streamCheckInterval = window.setInterval(async () => {
    try {
      const streams = await omeApi.getStreams()
      const streamExists = streams.includes(props.streamName)
      
      if (streamExists) {
        console.log(`[${props.streamName}] Stream is back online! Reloading...`)
        stopStreamCheck()
        streamEnded.value = false
        restartCount = 0 // Reset restart count
        restartPlayer()
      }
    } catch (error) {
      console.error(`[${props.streamName}] Error checking stream:`, error)
    }
  }, 5000)
}

function stopStreamCheck() {
  if (streamCheckInterval !== null) {
    clearInterval(streamCheckInterval)
    streamCheckInterval = null
  }
}

function restartPlayer() {
  console.log(`[${props.streamName}] Restarting player...`)
  
  // Progressive delay: 500ms, 1500ms, 5000ms
  const delays = [500, 1500, 5000]
  const delay = delays[Math.min(restartCount, delays.length - 1)]
  
  console.log(`[${props.streamName}] Waiting ${delay}ms before restart (attempt ${restartCount + 1}/3)`)
  
  setTimeout(() => {
    restartCount++
    
    // Destroy and reinitialize
    destroyPlayer()
    initPlayer()
  }, delay)
}

function destroyPlayer() {
  if (player) {
    try {
      player.remove()
      player = null
    } catch (error) {
      console.error('Error destroying player:', error)
    }
  }
}

// Expose methods for parent components if needed
defineExpose({
  play: () => player?.play(),
  pause: () => player?.pause(),
  getVolume: () => player?.getVolume(),
  setVolume: (volume: number) => player?.setVolume(volume),
})
</script>

<style scoped>
.oven-player-wrapper {
  width: 100%;
  height: 100%;
  background: #000;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.oven-player-container {
  width: 100%;
  height: 100%;
}

.stream-ended-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.ended-content {
  text-align: center;
  padding: 2rem;
}
</style>
