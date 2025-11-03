import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useOptimalLayout } from './useOptimalLayout'

interface Stream {
  name: string
  width?: number
  height?: number
  aspectRatio?: number
}

// Mock window resize
function mockWindowSize(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })
}

describe('useOptimalLayout', () => {
  beforeEach(() => {
    // Reset window size before each test
    mockWindowSize(1920, 1080)
  })

  describe('Bug Case: 50px Border Issue', () => {
    it('should fill entire width with 2 streams (3440x1440 and 2560x1600) at 3504x1061 container', () => {
      const streams = ref<Stream[]>([
        { name: 'stream1', width: 3440, height: 1440, aspectRatio: 3440/1440 },
        { name: 'stream2', width: 2560, height: 1600, aspectRatio: 2560/1600 }
      ])
      mockWindowSize(3504, 1061)
      
      const { optimalLayout, gridTemplateColumns, gridTemplateRows } = useOptimalLayout(streams)

      // Parse column widths from grid template
      const columnWidths = gridTemplateColumns.value
        .split(' ')
        .map(w => parseFloat(w.replace('px', '')))
      
      // Parse row heights from grid template
      const rowHeights = gridTemplateRows.value
        .split(' ')
        .map(h => parseFloat(h.replace('px', '')))

      // Calculate total grid width
      const GAP_SIZE = 2
      const BORDER_SIZE = 2
      const cols = optimalLayout.value.gridConfig.cols
      const rows = optimalLayout.value.gridConfig.rows
      
      const totalHorizontalGaps = (cols - 1) * GAP_SIZE + cols * BORDER_SIZE
      const totalVerticalGaps = (rows - 1) * GAP_SIZE + rows * BORDER_SIZE
      
      const totalGridWidth = columnWidths.reduce((sum, w) => sum + w, 0)
      const totalGridHeight = rowHeights.reduce((sum, h) => sum + h, 0)
      
      const totalUsedWidth = totalGridWidth + totalHorizontalGaps
      const totalUsedHeight = totalGridHeight + totalVerticalGaps

      // Log diagnostic information
      console.log('Grid Configuration:', optimalLayout.value.gridConfig)
      console.log('Column Widths:', columnWidths)
      console.log('Row Heights:', rowHeights)
      console.log('Stream 1 width:', optimalLayout.value.streamLayouts[0]?.width)
      console.log('Stream 2 width:', optimalLayout.value.streamLayouts[1]?.width)
      console.log('Total Grid Width:', totalGridWidth)
      console.log('Total Used Width (with gaps/borders):', totalUsedWidth)
      console.log('Container Width:', 3504)
      
      // Test positioning: grid should fill entire container width with redistribution
      expect(totalUsedWidth).toBeCloseTo(3504, 1)
      // Note: Height may not fill completely due to aspect ratio constraints
      expect(totalUsedHeight).toBeLessThanOrEqual(1061)
      
      // Both streams should fill their column widths completely (no left/right black bars)
      expect(optimalLayout.value.streamLayouts[0]?.width).toBeCloseTo(columnWidths[0]!, 1)
      expect(optimalLayout.value.streamLayouts[1]?.width).toBeCloseTo(columnWidths[1]!, 1)
      
      // Stream 2 fills row height (height-constrained)
      expect(optimalLayout.value.streamLayouts[1]?.height).toBeCloseTo(rowHeights[0]!, 1)
      
      // Stream 1 is width-constrained after redistribution (wider aspect ratio 2.39)
      // Its height is determined by width / aspectRatio
      const stream1Height = optimalLayout.value.streamLayouts[0]!.width / (3440 / 1440)
      expect(optimalLayout.value.streamLayouts[0]?.height).toBeCloseTo(stream1Height, 1)
    })
  })
})
