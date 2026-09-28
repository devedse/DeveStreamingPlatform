import { ref, computed, onMounted, onUnmounted, watch, type Ref } from 'vue'

export interface LayoutStream {
  name: string
  width?: number
  height?: number
  aspectRatio?: number
}

const DEFAULT_ASPECT_RATIO = 16 / 9
export const LAYOUT_GAP = 2
export const LAYOUT_BORDER = 1

function positive(value: number | undefined): value is number {
  return value !== undefined && Number.isFinite(value) && value > 0
}

export function streamAspectRatio(stream: LayoutStream): number {
  if (positive(stream.aspectRatio)) return stream.aspectRatio
  const ratio = positive(stream.width) && positive(stream.height)
    ? stream.width / stream.height : DEFAULT_ASPECT_RATIO
  return positive(ratio) ? ratio : DEFAULT_ASPECT_RATIO
}

function dimension(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

export interface StreamLayout {
  streamIndex: number
  x: number
  y: number
  cellWidth: number
  cellHeight: number
  width: number
  height: number
}

function fit(aspect: number, width: number, height: number) {
  const fittedWidth = Math.min(width, height * aspect)
  return { width: fittedWidth, height: Math.min(height, fittedWidth / aspect) }
}

/** Equal priorities with diminishing returns. Zero-area videos cannot be omitted
 * to improve the score. Logs of dimensions avoid area underflow/overflow. */
export function scoreVideoAreas(videos: { width: number, height: number }[]): number {
  return videos.reduce((score, video) => score + Math.log(video.width) + Math.log(video.height), 0)
}

// All contiguous partitions for normal multiview counts. Above ten streams,
// use balanced shelves of every possible capacity to bound the search cost.
function partitions(count: number): number[][] {
  if (count <= 10) {
    const result: number[][] = []
    for (let mask = 0; mask < 2 ** (count - 1); mask++) {
      const groups = [1]
      for (let i = 1; i < count; i++) {
        if (mask & (1 << (i - 1))) groups.push(1)
        else groups[groups.length - 1]!++
      }
      result.push(groups)
    }
    return result
  }
  const result: number[][] = []
  for (let capacity = 1; capacity <= count; capacity++) {
    const groups = Array.from({ length: Math.ceil(count / capacity) }, (_, i) => Math.min(capacity, count - i * capacity))
    result.push(groups, [...groups].reverse())
  }
  return result
}

// Maximize sum(count * log(height)) with positive heights, fixed total budget
// and per-shelf caps. Capped shelves release their surplus to the others.
function shelfHeights(counts: number[], caps: number[], budget: number): number[] {
  const heights = caps.map(() => 0)
  let active = counts.map((_, i) => i)
  let remaining = budget
  while (active.length) {
    const weight = active.reduce((sum, i) => sum + counts[i]!, 0)
    const capped = active.filter(i => caps[i]! <= remaining * counts[i]! / weight)
    if (!capped.length) {
      for (const i of active) heights[i] = remaining * counts[i]! / weight
      break
    }
    for (const i of capped) {
      heights[i] = caps[i]!
      remaining = Math.max(0, remaining - heights[i]!)
    }
    const removed = new Set(capped)
    active = active.filter(i => !removed.has(i))
  }
  return heights
}

/** Search aspect-preserving shelves in both orientations. This is a bounded
 * packing heuristic, not a globally optimal arbitrary-rectangle solver. */
export function calculateOptimalLayout(streams: LayoutStream[], width: number, height: number) {
  width = dimension(width)
  height = dimension(height)
  const aspects = streams.map(streamAspectRatio)
  const count = streams.length
  // Leave content space even when the container is smaller than decoration.
  const border = Math.min(LAYOUT_BORDER, width / (4 * Math.max(1, count)), height / (4 * Math.max(1, count)))
  const gap = Math.min(LAYOUT_GAP, border * 2)
  type Candidate = { streamLayouts: StreamLayout[], score: number, totalPixels: number }
  let best: Candidate = { streamLayouts: [], score: -Infinity, totalPixels: 0 }

  function consider(streamLayouts: StreamLayout[]) {
    const score = scoreVideoAreas(streamLayouts)
    const totalPixels = streamLayouts.reduce((sum, video) => sum + video.width * video.height, 0)
    if (!best.streamLayouts.length || score > best.score + 1e-9 ||
      ((score === best.score || Math.abs(score - best.score) <= 1e-9) && totalPixels > best.totalPixels)) {
      best = { streamLayouts, score, totalPixels }
    }
  }

  // Keep equal-cell grids as a fairness baseline alongside flexible shelves.
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols)
    const cellWidth = Math.max(0, (width - (cols - 1) * gap) / cols)
    const cellHeight = Math.max(0, (height - (rows - 1) * gap) / rows)
    consider(aspects.map((aspect, streamIndex) => ({
      streamIndex, x: (streamIndex % cols) * (cellWidth + gap),
      y: Math.floor(streamIndex / cols) * (cellHeight + gap), cellWidth, cellHeight,
      ...fit(aspect, Math.max(0, cellWidth - 2 * border), Math.max(0, cellHeight - 2 * border)),
    })))
  }

  for (const transposed of [false, true]) {
    const across = transposed ? height : width
    const down = transposed ? width : height
    // Extreme metadata only affects candidate preferences here. The final fit
    // below always uses the original aspect ratio, without stretching it.
    const ratios = aspects.map(ar => Math.max(1e-12, Math.min(1e12, transposed ? 1 / ar : ar)))
    for (const groups of count ? partitions(count) : []) {
      let offset = 0
      const shelves = groups.map(size => {
        const start = offset
        offset += size
        const ratioSum = ratios.slice(start, offset).reduce((sum, ar) => sum + ar, 0)
        const budget = Math.max(0, across - size * 2 * border - (size - 1) * gap)
        return { start, size, cap: budget / ratioSum }
      })
      const contentBudget = Math.max(0, down - groups.length * 2 * border - (groups.length - 1) * gap)
      const heights = shelfHeights(groups, shelves.map(shelf => shelf.cap), contentBudget)
      const usedHeight = heights.reduce((sum, h) => sum + h + 2 * border, 0) + (groups.length - 1) * gap
      let y = Math.max(0, (down - usedHeight) / 2)
      const videos: StreamLayout[] = []
      shelves.forEach((shelf, row) => {
        const h = heights[row]!
        const widths = ratios.slice(shelf.start, shelf.start + shelf.size).map(ar => ar * h + 2 * border)
        const usedWidth = widths.reduce((sum, w) => sum + w, 0) + (shelf.size - 1) * gap
        let x = Math.max(0, (across - usedWidth) / 2)
        widths.forEach((w, col) => {
          const streamIndex = shelf.start + col
          // Clamp numerical roundoff at the container edge.
          const cw = Math.max(0, Math.min(w, across - x))
          const ch = Math.max(0, Math.min(h + 2 * border, down - y))
          const cellWidth = transposed ? ch : cw
          const cellHeight = transposed ? cw : ch
          videos.push({ streamIndex, x: transposed ? y : x, y: transposed ? x : y, cellWidth, cellHeight,
            ...fit(aspects[streamIndex]!, Math.max(0, cellWidth - 2 * border), Math.max(0, cellHeight - 2 * border)) })
          x += w + gap
        })
        y += h + 2 * border + gap
      })
      consider(videos)
    }
  }
  return { ...best, score: count ? best.score : 0, border, gap,
    screenUtilization: width > 0 && height > 0 ? best.totalPixels / width / height : 0 }
}

export function useOptimalLayout(streams: Ref<LayoutStream[]>, container?: Ref<HTMLElement | null>) {
  const containerWidth = ref(typeof window === 'undefined' ? 0 : window.innerWidth)
  const containerHeight = ref(typeof window === 'undefined' ? 0 : window.innerHeight)
  function measure() {
    const element = container?.value
    containerWidth.value = element ? element.clientWidth : window.innerWidth
    containerHeight.value = element ? element.clientHeight : window.innerHeight
  }
  let observer: ResizeObserver | undefined
  let stopWatching: (() => void) | undefined
  onMounted(() => {
    window.addEventListener('resize', measure)
    if (container) {
      stopWatching = watch(container, element => {
        observer?.disconnect()
        measure()
        if (element && typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(measure)
          observer.observe(element)
        }
      }, { immediate: true, flush: 'post' })
    } else measure()
  })
  onUnmounted(() => {
    window.removeEventListener('resize', measure)
    stopWatching?.()
    observer?.disconnect()
  })
  const optimalLayout = computed(() => calculateOptimalLayout(streams.value, containerWidth.value, containerHeight.value))
  const streamStyles = computed(() => optimalLayout.value.streamLayouts.map(layout => ({
    left: `${layout.x}px`, top: `${layout.y}px`,
    width: `${layout.cellWidth}px`, height: `${layout.cellHeight}px`,
    borderWidth: `${optimalLayout.value.border}px`,
  })))
  return { optimalLayout, streamStyles, containerWidth, containerHeight }
}
