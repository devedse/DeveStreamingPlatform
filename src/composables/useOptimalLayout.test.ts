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

  describe('Optimal Layout for Multiple 3440x1440 Streams', () => {
    it('should create optimal 2-row layout for 3x 3440x1440 streams on 3440x1440 screen', () => {
      const streams = ref<Stream[]>([
        { name: 'stream1', width: 3440, height: 1440, aspectRatio: 3440/1440 },
        { name: 'stream2', width: 3440, height: 1440, aspectRatio: 3440/1440 },
        { name: 'stream3', width: 3440, height: 1440, aspectRatio: 3440/1440 }
      ])
      mockWindowSize(3440, 1440)
      
      const { optimalLayout, gridTemplateColumns, gridTemplateRows } = useOptimalLayout(streams)

      console.log('3x streams - Grid Configuration:', optimalLayout.value.gridConfig)
      console.log('3x streams - Grid Template Columns:', gridTemplateColumns.value)
      console.log('3x streams - Grid Template Rows:', gridTemplateRows.value)
      
      // Optimal layout should be 2 rows
      // Could be 2 columns with bottom stream spanning, or arranged to fill space efficiently
      expect(optimalLayout.value.gridConfig.rows).toBe(2)
      
      // Each stream should be approximately 50% of the screen dimensions
      // With 3440x1440 screen and 2.39:1 aspect ratio streams
      // Streams should be sized to fill space efficiently
      optimalLayout.value.streamLayouts.forEach((layout, index) => {
        console.log(`Stream ${index + 1} dimensions:`, layout?.width, 'x', layout?.height)
        
        // Each stream should maintain its aspect ratio
        if (layout) {
          const expectedHeight = layout.width / (3440 / 1440)
          expect(layout.height).toBeCloseTo(expectedHeight, 1)
        }
      })
      
      // Verify all streams fit within the viewport
      optimalLayout.value.streamLayouts.forEach((layout) => {
        if (layout) {
          expect(layout.width).toBeLessThanOrEqual(3440)
          expect(layout.height).toBeLessThanOrEqual(1440)
        }
      })
    })

    it('should create optimal 2x2 grid for 4x 3440x1440 streams on 3440x1440 screen', () => {
      const streams = ref<Stream[]>([
        { name: 'stream1', width: 3440, height: 1440, aspectRatio: 3440/1440 },
        { name: 'stream2', width: 3440, height: 1440, aspectRatio: 3440/1440 },
        { name: 'stream3', width: 3440, height: 1440, aspectRatio: 3440/1440 },
        { name: 'stream4', width: 3440, height: 1440, aspectRatio: 3440/1440 }
      ])
      mockWindowSize(3440, 1440)
      
      const { optimalLayout, gridTemplateColumns, gridTemplateRows } = useOptimalLayout(streams)

      console.log('4x streams - Grid Configuration:', optimalLayout.value.gridConfig)
      console.log('4x streams - Grid Template Columns:', gridTemplateColumns.value)
      console.log('4x streams - Grid Template Rows:', gridTemplateRows.value)
      
      // Optimal layout should be 2x2 grid
      expect(optimalLayout.value.gridConfig.cols).toBe(2)
      expect(optimalLayout.value.gridConfig.rows).toBe(2)
      
      // Parse column widths and row heights
      const columnWidths = gridTemplateColumns.value
        .split(' ')
        .map(w => parseFloat(w.replace('px', '')))
      
      const rowHeights = gridTemplateRows.value
        .split(' ')
        .map(h => parseFloat(h.replace('px', '')))
      
      console.log('Column Widths:', columnWidths)
      console.log('Row Heights:', rowHeights)
      
      // Each stream should be approximately 50% of screen dimensions
      // Account for gaps and borders
      const GAP_SIZE = 2
      const BORDER_SIZE = 2
      const totalHorizontalSpacing = (2 - 1) * GAP_SIZE + 2 * BORDER_SIZE // 1 gap + 2 columns * border
      const totalVerticalSpacing = (2 - 1) * GAP_SIZE + 2 * BORDER_SIZE // 1 gap + 2 rows * border
      
      const expectedColumnWidth = (3440 - totalHorizontalSpacing) / 2
      const expectedRowHeight = (1440 - totalVerticalSpacing) / 2
      
      console.log('Expected column width:', expectedColumnWidth)
      console.log('Expected row height:', expectedRowHeight)
      
      // Columns should be roughly equal and fill the width
      columnWidths.forEach((width) => {
        expect(width).toBeCloseTo(expectedColumnWidth, 1)
      })
      
      // Rows should be roughly equal and fill the height
      rowHeights.forEach((height) => {
        expect(height).toBeCloseTo(expectedRowHeight, 1)
      })
      
      // Each stream should maintain its aspect ratio and fit in its cell
      optimalLayout.value.streamLayouts.forEach((layout, index) => {
        console.log(`Stream ${index + 1} dimensions:`, layout?.width, 'x', layout?.height)
        
        if (layout) {
          const expectedHeight = layout.width / (3440 / 1440)
          expect(layout.height).toBeCloseTo(expectedHeight, 1)
          
          // Each stream should fit within its grid cell
          expect(layout.width).toBeLessThanOrEqual(expectedColumnWidth)
          expect(layout.height).toBeLessThanOrEqual(expectedRowHeight)
        }
      })
    })
  })
})