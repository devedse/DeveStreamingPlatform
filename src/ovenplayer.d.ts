declare module 'ovenplayer' {
  interface OvenPlayerConfig {
    sources: Array<{
      type: string
      file: string
      label?: string
    }>
    autoStart?: boolean
    controls?: boolean
    muted?: boolean
    volume?: number
    showBigPlayButton?: boolean
    aspectRatio?: string
    waterMark?: {
      image?: string
      position?: string
      y?: string
      x?: string
      width?: string
      height?: string
    }
  }

  interface OvenPlayerInstance {
    play(): void
    pause(): void
    stop(): void
    remove(): void
    getVolume(): number
    setVolume(volume: number): void
    on(event: string, callback: (data?: any) => void): void
    off(event: string, callback?: (data?: any) => void): void
  }

  interface OvenPlayer {
    create(element: HTMLElement, config: OvenPlayerConfig): OvenPlayerInstance
  }

  const OvenPlayer: OvenPlayer
  export default OvenPlayer
}
