<template>
  <div class="oven-player-wrapper">
    <div id="ovenplayer" class="oven-player-container"></div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch } from 'vue'
import OvenPlayer from 'ovenplayer'

interface Source {
  type: 'webrtc' | 'llhls' | 'hls' | 'lldash' | 'dash' | 'mp4'
  file: string
  label: string
}

interface Props {
  sources: Source[]
  autoplay?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoplay: true,
})

let player: any = null

onMounted(() => {
  initPlayer()
})

onBeforeUnmount(() => {
  destroyPlayer()
})

watch(() => props.sources, () => {
  if (player) {
    destroyPlayer()
    initPlayer()
  }
}, { deep: true })

function initPlayer() {
  try {
    player = OvenPlayer.create('ovenplayer', {
      sources: props.sources,
      autoStart: props.autoplay,
      controls: true,
      mute: false,
      //volume: 50,
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
  max-width: 100%;
  max-height: 100%;
  background: #000;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.oven-player-container {
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
}
</style>
