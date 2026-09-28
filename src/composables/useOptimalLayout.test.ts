import { describe, it, expect, vi, afterEach } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { calculateOptimalLayout, scoreVideoAreas, streamAspectRatio, useOptimalLayout, type LayoutStream } from './useOptimalLayout'

const streams = (aspects: number[]): LayoutStream[] => aspects.map((aspectRatio, i) => ({ name: `stream-${i}`, aspectRatio }))
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

function checkBounds(input: LayoutStream[], width: number, height: number) {
  const result = calculateOptimalLayout(input, width, height)
  expect(result.streamLayouts).toHaveLength(input.length)
  for (const value of [result.gap, result.border, result.screenUtilization]) {
    expect(Number.isFinite(value)).toBe(true)
    expect(value).toBeGreaterThanOrEqual(0)
  }
  expect(result.screenUtilization).toBeLessThanOrEqual(1 + 1e-10)
  result.streamLayouts.forEach((video, index) => {
    expect(video.streamIndex).toBe(index)
    for (const value of [video.x, video.y, video.cellWidth, video.cellHeight, video.width, video.height]) {
      expect(Number.isFinite(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(0)
    }
    expect(video.x + video.cellWidth).toBeLessThanOrEqual(width + 1e-7)
    expect(video.y + video.cellHeight).toBeLessThanOrEqual(height + 1e-7)
    expect(video.width + 2 * result.border).toBeLessThanOrEqual(video.cellWidth + 1e-7)
    expect(video.height + 2 * result.border).toBeLessThanOrEqual(video.cellHeight + 1e-7)
    if (video.width > 0 && video.height > 0) {
      expect(video.width / video.height).toBeCloseTo(streamAspectRatio(input[index]!), 8)
    }
    for (const other of result.streamLayouts.slice(index + 1)) {
      const overlapX = Math.min(video.x + video.cellWidth, other.x + other.cellWidth) - Math.max(video.x, other.x)
      const overlapY = Math.min(video.y + video.cellHeight, other.y + other.cellHeight) - Math.max(video.y, other.y)
      expect(Math.min(overlapX, overlapY)).toBeLessThanOrEqual(1e-7)
    }
  })
  const pixels = sum(result.streamLayouts.map(video => video.width * video.height))
  expect(result.totalPixels).toBeCloseTo(pixels, 6)
  expect(result.screenUtilization).toBeCloseTo(width * height ? pixels / width / height : 0, 10)
  return result
}

const wide = 3440 / 1440
const standard = 2560 / 1440
const viewports = [[3440, 1440], [3504, 1061], [1920, 1080], [2560, 1440], [5120, 1440], [1080, 1920], [390, 844], [844, 390], [1365.5, 767.25]]
const scenarios = [
  [wide, wide, standard], [wide, standard, wide], [standard, wide, wide],
  [wide, wide, wide, standard], [wide, 2560 / 1600],
  [4, 1, 1, 4], [1, 4, 4, 1], [9 / 16, wide, 1, standard, 9 / 16],
  [wide, wide, wide], [wide, wide, wide, wide],
]

describe('bounded flexible layout search', () => {
  for (const [width, height] of viewports) {
    for (const aspects of scenarios) {
      it(`fits ${aspects.join(',')} in ${width}x${height}`, () => {
        checkBounds(streams(aspects), width!, height!)
      })
    }
  }
  it('uses a balanced 2x2 grid for four identical ultrawide streams', () => {
    const result = checkBounds(streams([wide, wide, wide, wide]), 3440, 1440)
    expect(result.streamLayouts[0]!.width).toBeCloseTo(result.streamLayouts[1]!.width, 8)
    expect(result.streamLayouts[0]!.y).toBe(result.streamLayouts[1]!.y)
    expect(result.streamLayouts[2]!.y).toBeGreaterThan(result.streamLayouts[0]!.y)
    expect(result.screenUtilization).toBeGreaterThan(0.98)
  })
  it('preserves good utilization for mixed ultrawide streams', () => {
    expect(checkBounds(streams([wide, wide, wide, standard]), 3440, 1440).screenUtilization).toBeGreaterThan(0.9)
    expect(checkBounds(streams([wide, 1.6]), 3504, 1061).screenUtilization).toBeGreaterThan(0.8)
  })
  it('fits a single video without changing its aspect ratio', () => {
    const result = checkBounds(streams([16 / 9]), 1000, 1000)
    expect(result.streamLayouts[0]!.width).toBe(998)
    expect(result.streamLayouts[0]!.height).toBeCloseTo(998 * 9 / 16)
  })
  it('handles no streams', () => {
    const result = checkBounds([], 1920, 1080)
    expect(result.streamLayouts).toEqual([])
    expect(result.totalPixels).toBe(0)
  })
  for (const [width, height] of [[0, 0], [0, 800], [800, 0], [1, 1], [2, 3], [10, 1], [0.1, 0.2]]) {
    it(`handles tiny containers ${width}x${height}`, () => {
      checkBounds(streams([wide, standard, 9 / 16, 1, 4]), width!, height!)
    })
  }
  it('sanitizes invalid container dimensions', () => {
    expect(calculateOptimalLayout(streams([1, 2]), NaN, -1).totalPixels).toBe(0)
    expect(calculateOptimalLayout(streams([1]), Infinity, Infinity).totalPixels).toBe(0)
  })
  it('supports more than 100 streams', () => {
    checkBounds(streams(Array.from({ length: 121 }, (_, i) => scenarios[i % scenarios.length]![0]!)), 3840, 2160)
  })
  it('scores at least as well as every equal-grid baseline', () => {
    for (const aspects of scenarios) {
      const width = 1920
      const height = 1080
      let best = -Infinity
      for (let cols = 1; cols <= aspects.length; cols++) {
        const rows = Math.ceil(aspects.length / cols)
        const cellWidth = (width - (cols - 1) * 2) / cols - 2
        const cellHeight = (height - (rows - 1) * 2) / rows - 2
        const score = sum(aspects.map(aspect => {
          const videoWidth = Math.min(cellWidth, cellHeight * aspect)
          return Math.log(videoWidth) + Math.log(videoWidth / aspect)
        }))
        best = Math.max(best, score)
      }
      expect(calculateOptimalLayout(streams(aspects), width, height).score).toBeGreaterThanOrEqual(best - 1e-8)
    }
  })
  it('keeps extreme finite aspect ratios bounded', () => {
    const result = calculateOptimalLayout(streams([Number.MIN_VALUE, Number.MAX_VALUE, 1]), 1920, 1080)
    for (const video of result.streamLayouts) {
      expect(Number.isFinite(video.width)).toBe(true)
      expect(Number.isFinite(video.height)).toBe(true)
    }
    expect(Math.max(...result.streamLayouts.map(v => v.x + v.cellWidth))).toBeLessThanOrEqual(1920 + 1e-7)
    expect(result.screenUtilization).toBeLessThanOrEqual(1)
  })
  it('is deterministic and does not mutate its inputs', () => {
    const input = streams([wide, standard, 1, 0.5])
    const before = structuredClone(input)
    const first = calculateOptimalLayout(input, 1920, 1080)
    expect(calculateOptimalLayout(input, 1920, 1080)).toEqual(first)
    expect(input).toEqual(before)
  })
  it('satisfies bounds across 300 reproducible randomized cases', () => {
    let seed = 92345
    const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32)
    for (let i = 0; i < 300; i++) {
      const input = streams(Array.from({ length: 1 + Math.floor(random() * 30) }, () => 0.2 + random() * 5))
      checkBounds(input, 20 + random() * 6000, 20 + random() * 3000)
    }
  })
})

describe('black-bar packing examples and soft fairness', () => {
  it('places a very wide stream in the strip below a 16:9 stream', () => {
    const result = checkBounds(streams([16 / 9, 16 / 3]), 1920, 1440)
    const [main, strip] = result.streamLayouts
    expect(strip!.y).toBeGreaterThanOrEqual(main!.y + main!.cellHeight)
    expect(result.screenUtilization).toBeGreaterThan(0.99)
    expect(strip!.width * strip!.height / (main!.width * main!.height)).toBeCloseTo(1 / 3, 2)
  })
  it('places a portrait stream in a side strip next to a 4:3 stream', () => {
    const result = checkBounds(streams([4 / 3, 4 / 9]), 1920, 1080)
    const [main, portrait] = result.streamLayouts
    expect(portrait!.x).toBeGreaterThanOrEqual(main!.x + main!.cellWidth)
    expect(result.screenUtilization).toBeGreaterThan(0.99)
    expect(portrait!.width * portrait!.height / (main!.width * main!.height)).toBeCloseTo(1 / 3, 2)
  })
  it('lets a 32:9 stream span below two 16:9 streams', () => {
    const result = checkBounds(streams([16 / 9, 16 / 9, 32 / 9]), 1920, 1080)
    const [left, right, bottom] = result.streamLayouts
    expect(left!.y).toBeCloseTo(right!.y, 6)
    expect(bottom!.y).toBeGreaterThanOrEqual(left!.y + left!.cellHeight)
    expect(result.screenUtilization).toBeGreaterThan(0.98)
    expect(bottom!.width * bottom!.height / (left!.width * left!.height)).toBeCloseTo(2, 1)
  })
  it('gives all three ordinary mixed-resolution streams substantial video area', () => {
    const result = checkBounds(streams([wide, wide, standard]), 3440, 1440)
    expect(result.screenUtilization).toBeGreaterThan(0.68)
    const areas = result.streamLayouts.map(v => v.width * v.height)
    expect(Math.min(...areas) / (3440 * 1440)).toBeGreaterThan(0.15)
  })
  it('rewards useful unequal packing over an equal-area arrangement with wasted space', () => {
    const packed = [{ width: 1920, height: 1080 }, { width: 1920, height: 360 }]
    const equalArea = [{ width: Math.sqrt(691200 * 16 / 9), height: Math.sqrt(691200 * 9 / 16) }, packed[1]!]
    expect(scoreVideoAreas(packed)).toBeGreaterThan(scoreVideoAreas(equalArea))
  })
  it('prefers two useful videos over a dominant video and a thumbnail', () => {
    expect(scoreVideoAreas([{ width: 700, height: 700 }, { width: 700, height: 700 }])).toBeGreaterThan(
      scoreVideoAreas([{ width: 1000, height: 1000 }, { width: 1, height: 1 }]))
    expect(scoreVideoAreas([{ width: 1000, height: 1000 }, { width: 0, height: 0 }])).toBe(-Infinity)
  })
  it('keeps every identical stream substantial across incomplete rows', () => {
    for (const count of [2, 3, 5, 9]) {
      const result = checkBounds(streams(Array(count).fill(16 / 9)), 1920, 1080)
      const areas = result.streamLayouts.map(v => v.width * v.height)
      expect(Math.min(...areas) / (1920 * 1080)).toBeGreaterThan(0.4 / count)
    }
  })
})

describe('aspect ratio metadata', () => {
  it('prefers explicit ratios, then dimensions, then 16:9', () => {
    expect(streamAspectRatio({ name: 'a', aspectRatio: 2, width: 1, height: 1 })).toBe(2)
    expect(streamAspectRatio({ name: 'a', width: 3440, height: 1440 })).toBe(wide)
    expect(streamAspectRatio({ name: 'a' })).toBe(16 / 9)
  })
  for (const invalid of [0, -1, NaN, Infinity, -Infinity]) {
    it(`ignores invalid metadata ${invalid}`, () => {
      expect(streamAspectRatio({ name: 'a', aspectRatio: invalid, width: 4, height: 3 })).toBe(4 / 3)
      expect(streamAspectRatio({ name: 'a', width: invalid, height: 3 })).toBe(16 / 9)
      expect(streamAspectRatio({ name: 'a', width: 4, height: invalid })).toBe(16 / 9)
    })
  }
})

describe('reactive container integration', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
  it('updates on metadata, selection and window changes and removes the listener', async () => {
    const input = ref(streams([wide, standard]))
    let layout!: ReturnType<typeof useOptimalLayout>
    const remove = vi.spyOn(window, 'removeEventListener')
    const wrapper = mount(defineComponent({ setup() { layout = useOptimalLayout(input); return () => h('div') } }))
    input.value.push({ name: 'third', aspectRatio: 1 })
    expect(layout.optimalLayout.value.streamLayouts).toHaveLength(3)
    const previous = layout.optimalLayout.value
    input.value[0]!.aspectRatio = 0.5
    expect(layout.optimalLayout.value).not.toEqual(previous)
    vi.stubGlobal('innerWidth', 900)
    vi.stubGlobal('innerHeight', 600)
    window.dispatchEvent(new Event('resize'))
    expect(layout.containerWidth.value).toBe(900)
    expect(layout.containerHeight.value).toBe(600)
    input.value = []
    expect(layout.streamStyles.value).toEqual([])
    wrapper.unmount()
    expect(remove).toHaveBeenCalledWith('resize', expect.any(Function))
  })
  it('measures, observes, replaces and disconnects the actual container', async () => {
    let callback!: () => void
    const observe = vi.fn()
    const disconnect = vi.fn()
    vi.stubGlobal('ResizeObserver', class {
      constructor(cb: () => void) { callback = cb }
      observe = observe
      disconnect = disconnect
    })
    const element = document.createElement('div')
    let width = 800
    Object.defineProperties(element, { clientWidth: { get: () => width }, clientHeight: { value: 450 } })
    const container = ref<HTMLElement | null>(null)
    let layout!: ReturnType<typeof useOptimalLayout>
    const wrapper = mount(defineComponent({ setup() { layout = useOptimalLayout(ref(streams([wide, standard])), container); return () => h('div') } }))
    container.value = element
    await nextTick()
    expect(observe).toHaveBeenCalledWith(element)
    expect(layout.containerWidth.value).toBe(800)
    width = 400
    callback()
    expect(layout.containerWidth.value).toBe(400)
    const first = layout.optimalLayout.value.streamLayouts[0]!
    expect(layout.streamStyles.value[0]).toMatchObject({ left: `${first.x}px`, top: `${first.y}px`, width: `${first.cellWidth}px`, height: `${first.cellHeight}px` })
    expect(layout.streamStyles.value[0]!.borderWidth).toBe(`${layout.optimalLayout.value.border}px`)
    container.value = null
    await nextTick()
    expect(disconnect).toHaveBeenCalled()
    wrapper.unmount()
    expect(disconnect.mock.calls.length).toBeGreaterThanOrEqual(2)
  })
})
