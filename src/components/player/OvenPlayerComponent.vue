<template>
  <div class="oven-player-wrapper">
    <div ref="playerElement" class="oven-player-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import OvenPlayer from 'ovenplayer'

interface Props {
  streamUrl: string
  autoplay?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoplay: true,
})

const playerElement = ref<HTMLElement | null>(null)
let player: any = null

onMounted(() => {
  initPlayer()
})

onBeforeUnmount(() => {
  destroyPlayer()
})

watch(() => props.streamUrl, () => {
  if (player) {
    destroyPlayer()
    initPlayer()
  }
})

function initPlayer() {
  if (!playerElement.value) {
    console.error('Player element not found')
    return
  }

  try {
    player = OvenPlayer.create(playerElement.value, {
      sources: [
        {
          type: 'webrtc',
          file: props.streamUrl,
        },
      ],
      autoStart: props.autoplay,
      controls: true,
      muted: false,
      volume: 50,
      showBigPlayButton: true,
      aspectRatio: '16:9',
      waterMark: {
        image: '',
        position: 'bottom-right',
        y: '20',
        x: '20',
        width: '100',
        height: '30',
      },
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
  background: #000;
  border-radius: 4px;
  overflow: hidden;
}

.oven-player-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
}
</style>
