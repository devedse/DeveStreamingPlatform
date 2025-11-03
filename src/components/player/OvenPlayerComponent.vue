<template>
  <div class="oven-player-wrapper">
    <div :id="playerId" class="oven-player-container"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import OvenPlayer from 'ovenplayer'

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
let player: any = null

onMounted(() => {
  initPlayer()
})

onBeforeUnmount(() => {
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

    player.on('ready', () => {
      console.log('OvenPlayer is ready')
    })

    player.on('error', (error: any) => {
      console.error('OvenPlayer error:', error)
    })

    player.on('stateChanged', (state: any) => {
      console.log('Player state changed:', state)
    })
  } catch (error) {
    console.error('Failed to initialize OvenPlayer:', error)
  }
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
}

.oven-player-container {
  width: 100%;
  height: 100%;
}
</style>
