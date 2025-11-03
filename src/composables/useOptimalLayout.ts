import { ref, computed, onMounted, onUnmounted, type Ref } from 'vue'

interface Stream {
  name: string
  width?: number
  height?: number
  aspectRatio?: number
}

interface GridConfig {
  rows: number
  cols: number
}

interface StreamLayout {
  streamIndex: number
  width: number
  height: number
  gridRow: number
  gridCol: number
}

interface LayoutResult {
  gridConfig: GridConfig
  streamLayouts: StreamLayout[]
  totalPixels: number
  colWidths: number[]
  rowHeights: number[]
}

const DEFAULT_ASPECT_RATIO = 16 / 9

/**
 * Calculates the optimal grid layout to maximize total video pixels displayed
 * while maintaining each stream's individual aspect ratio
 */
export function useOptimalLayout(streams: Ref<Stream[]>) {
  const containerWidth = ref(window.innerWidth)
  const containerHeight = ref(window.innerHeight)

  // Calculate optimal layout based on current streams and container size
  const optimalLayout = computed(() => {
    return calculateOptimalLayout(
      streams.value,
      containerWidth.value,
      containerHeight.value
    )
  })

  // Get individual stream styles
  const streamStyles = computed(() => {
    return optimalLayout.value.streamLayouts.map(layout => ({
      width: `${layout.width}px`,
      height: `${layout.height}px`,
      gridRow: layout.gridRow,
      gridColumn: layout.gridCol,
      justifySelf: 'center',
      alignSelf: 'center',
    }))
  })

  // Grid template for the container - uses redistributed cell dimensions
  const gridTemplateColumns = computed(() => {
    const { colWidths } = optimalLayout.value
    if (colWidths.length === 0) return '1fr'
    return colWidths.map(w => `${w}px`).join(' ')
  })

  const gridTemplateRows = computed(() => {
    const { rowHeights } = optimalLayout.value
    if (rowHeights.length === 0) return '1fr'
    return rowHeights.map(h => `${h}px`).join(' ')
  })

  // Handle window resize
  function updateContainerSize() {
    containerWidth.value = window.innerWidth
    containerHeight.value = window.innerHeight
  }

  onMounted(() => {
    window.addEventListener('resize', updateContainerSize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateContainerSize)
  })

  return {
    optimalLayout,
    streamStyles,
    gridTemplateColumns,
    gridTemplateRows,
    containerWidth,
    containerHeight,
  }
}

/**
 * Core algorithm: finds the grid configuration that maximizes total video pixels
 */
function calculateOptimalLayout(
  streams: Stream[],
  containerWidth: number,
  containerHeight: number
): LayoutResult {
  const streamCount = streams.length

  if (streamCount === 0) {
    return {
      gridConfig: { rows: 1, cols: 1 },
      streamLayouts: [],
      totalPixels: 0,
      colWidths: [],
      rowHeights: [],
    }
  }

  // Get aspect ratios for all streams
  const aspectRatios = streams.map(stream => 
    stream.aspectRatio ?? 
    (stream.width && stream.height ? stream.width / stream.height : DEFAULT_ASPECT_RATIO)
  )

  let bestLayout: LayoutResult | null = null

  // Try all reasonable grid configurations
  const possibleConfigs = generateGridConfigs(streamCount)

  for (const config of possibleConfigs) {
    const layout = evaluateGridConfig(
      config,
      aspectRatios,
      containerWidth,
      containerHeight
    )

    if (!bestLayout || layout.totalPixels > bestLayout.totalPixels) {
      bestLayout = layout
    }
  }

  return bestLayout!
}

/**
 * Generates all reasonable grid configurations for a given number of streams
 */
function generateGridConfigs(streamCount: number): GridConfig[] {
  const configs: GridConfig[] = []

  // Try all combinations where rows * cols >= streamCount
  // Limit to reasonable sizes (e.g., max 10 rows/cols)
  const maxDimension = Math.min(10, streamCount)

  for (let rows = 1; rows <= maxDimension; rows++) {
    for (let cols = 1; cols <= maxDimension; cols++) {
      if (rows * cols >= streamCount) {
        configs.push({ rows, cols })
      }
    }
  }

  return configs
}

/**
 * Evaluates a specific grid configuration and calculates total pixels
 * Uses smart scaling to maximize space utilization
 */
function evaluateGridConfig(
  config: GridConfig,
  aspectRatios: number[],
  containerWidth: number,
  containerHeight: number
): LayoutResult {
  const { rows, cols } = config
  const streamCount = aspectRatios.length

  // Account for gaps and borders
  const GAP_SIZE = 2
  const BORDER_SIZE = 2
  const totalHorizontalGaps = (cols - 1) * GAP_SIZE + cols * BORDER_SIZE
  const totalVerticalGaps = (rows - 1) * GAP_SIZE + rows * BORDER_SIZE
  
  // Available space after accounting for gaps and borders
  const availableWidth = containerWidth - totalHorizontalGaps
  const availableHeight = containerHeight - totalVerticalGaps

  // Group streams by their grid position to understand row/col requirements
  const streamsByRow: number[][] = []
  const streamsByCol: number[][] = []
  
  for (let i = 0; i < streamCount; i++) {
    const row = Math.floor(i / cols)
    const col = i % cols
    
    if (!streamsByRow[row]) streamsByRow[row] = []
    if (!streamsByCol[col]) streamsByCol[col] = []
    
    streamsByRow[row].push(i)
    streamsByCol[col].push(i)
  }
  
  // Calculate optimal row heights and column widths
  // We want to maximize total pixels while respecting aspect ratios
  const rowHeights: number[] = new Array(rows).fill(0)
  const colWidths: number[] = new Array(cols).fill(0)
  
  // Strategy: iteratively adjust row heights and column widths to maximize usage
  // Start with equal distribution
  const baseRowHeight = availableHeight / rows
  const baseColWidth = availableWidth / cols
  
  for (let i = 0; i < streamCount; i++) {
    const aspectRatio = aspectRatios[i] ?? DEFAULT_ASPECT_RATIO
    const row = Math.floor(i / cols)
    const col = i % cols
    
    // Calculate what size this stream would be in a cell of baseRowHeight x baseColWidth
    let streamWidth: number
    let streamHeight: number
    
    if (baseColWidth / baseRowHeight > aspectRatio) {
      // Cell is wider than stream - height-constrained
      streamHeight = baseRowHeight
      streamWidth = streamHeight * aspectRatio
    } else {
      // Cell is taller than stream - width-constrained
      streamWidth = baseColWidth
      streamHeight = streamWidth / aspectRatio
    }
    
    // Update the row height and column width requirements
    rowHeights[row] = Math.max(rowHeights[row] ?? 0, streamHeight)
    colWidths[col] = Math.max(colWidths[col] ?? 0, streamWidth)
  }
  
  // Now scale everything up to fill the available space
  const totalCalculatedWidth = colWidths.reduce((sum, w) => sum + w, 0)
  const totalCalculatedHeight = rowHeights.reduce((sum, h) => sum + h, 0)
  
  const widthScale = totalCalculatedWidth > 0 ? availableWidth / totalCalculatedWidth : 1
  const heightScale = totalCalculatedHeight > 0 ? availableHeight / totalCalculatedHeight : 1
  
  // Use the minimum scale to ensure we fit in both dimensions
  const scale = Math.min(widthScale, heightScale)
  
  // Apply the scale
  let scaledRowHeights = rowHeights.map(h => h * scale)
  let scaledColWidths = colWidths.map(w => w * scale)
  
  // Redistribution phase: determine which dimension is constrained and boost the other
  const scaledTotalWidth = scaledColWidths.reduce((sum, w) => sum + w, 0)
  const scaledTotalHeight = scaledRowHeights.reduce((sum, h) => sum + h, 0)
  
  const widthLeftover = availableWidth - scaledTotalWidth
  const heightLeftover = availableHeight - scaledTotalHeight
  
  // Debug logging
  console.log('Scaled row heights BEFORE redistribution:', scaledRowHeights)
  console.log('Width leftover:', widthLeftover, 'Height leftover:', heightLeftover)
  
  // Simpler redistribution: if height-constrained, calculate exact widths and redistribute
  if (Math.abs(heightLeftover) < 1 && widthLeftover > 1) {
    // Height is already at maximum, so row heights don't change
    // Calculate what each stream's width SHOULD be at current row height
    const rowHeight = scaledRowHeights[0] ?? 0
    console.log('Using row height:', rowHeight)
    const exactStreamWidths: number[] = []
    let totalExactWidth = 0
    
    for (let i = 0; i < streamCount; i++) {
      const aspectRatio = aspectRatios[i] ?? DEFAULT_ASPECT_RATIO
      const exactWidth = rowHeight * aspectRatio
      console.log(`Stream ${i}: AR=${aspectRatio}, exactWidth=${exactWidth}`)
      exactStreamWidths.push(exactWidth)
      totalExactWidth += exactWidth
    }
    
    console.log('Total exact width:', totalExactWidth, 'Available width:', availableWidth)
    // Remaining width = available - what streams need
    const unused = availableWidth - totalExactWidth
    console.log('Unused width:', unused)
    
    // Redistribute intelligently
    if (unused >= 0) {
      // Unused space: give it to widest stream
      if (unused > 0) {
        let widestIdx = 0
        let maxAR = aspectRatios[0] ?? DEFAULT_ASPECT_RATIO
        for (let i = 1; i < streamCount; i++) {
          const ar = aspectRatios[i] ?? DEFAULT_ASPECT_RATIO
          if (ar > maxAR) {
            maxAR = ar
            widestIdx = i
          }
        }
        console.log('Giving unused to stream', widestIdx, 'with AR', maxAR)
        exactStreamWidths[widestIdx] = exactStreamWidths[widestIdx]! + unused
      }
      
      console.log('Final exact stream widths:', exactStreamWidths)
      // Set column widths
      for (let col = 0; col < cols; col++) {
        scaledColWidths[col] = exactStreamWidths[col] ?? 0
      }
    } else {
      // Streams are too big: need to shrink row height
      console.log('Streams too big, shrinking row height')
      const neededRowHeight = availableWidth / exactStreamWidths.reduce((sum, _w, i) => {
        const ar = aspectRatios[i] ?? DEFAULT_ASPECT_RATIO
        return sum + ar
      }, 0)
      console.log('New row height:', neededRowHeight)
      scaledRowHeights = scaledRowHeights.map(() => neededRowHeight)
      
      // Recalculate stream widths at new row height
      let totalWidth = 0
      for (let i = 0; i < streamCount; i++) {
        const aspectRatio = aspectRatios[i] ?? DEFAULT_ASPECT_RATIO
        const streamWidth = neededRowHeight * aspectRatio
        exactStreamWidths[i] = streamWidth
        totalWidth += streamWidth
      }
      
      // Give any remaining pixels to widest stream
      const finalUnused = availableWidth - totalWidth
      if (Math.abs(finalUnused) > 0.1) {
        let widestIdx = 0
        let maxAR = aspectRatios[0] ?? DEFAULT_ASPECT_RATIO
        for (let i = 1; i < streamCount; i++) {
          const ar = aspectRatios[i] ?? DEFAULT_ASPECT_RATIO
          if (ar > maxAR) {
            maxAR = ar
            widestIdx = i
          }
        }
        exactStreamWidths[widestIdx] = exactStreamWidths[widestIdx]! + finalUnused
      }
      
      console.log('Final stream widths after shrink:', exactStreamWidths)
      for (let col = 0; col < cols; col++) {
        scaledColWidths[col] = exactStreamWidths[col] ?? 0
      }
    }
  } else if (Math.abs(widthLeftover) < 1 && heightLeftover > 1) {
    // Width-constrained: boost row heights
    const heightBoost = availableHeight / scaledTotalHeight
    scaledRowHeights = scaledRowHeights.map(h => h * heightBoost)
  }
  
  // Create final layouts
  const streamLayouts: StreamLayout[] = []
  let totalPixels = 0
  
  for (let i = 0; i < streamCount; i++) {
    const aspectRatio = aspectRatios[i] ?? DEFAULT_ASPECT_RATIO
    const row = Math.floor(i / cols)
    const col = i % cols
    
    const cellWidth = scaledColWidths[col] ?? 0
    const cellHeight = scaledRowHeights[row] ?? 0
    
    // Fit stream in cell maintaining aspect ratio
    let streamWidth: number
    let streamHeight: number
    
    if (cellWidth / cellHeight > aspectRatio) {
      streamHeight = cellHeight
      streamWidth = streamHeight * aspectRatio
    } else {
      streamWidth = cellWidth
      streamHeight = streamWidth / aspectRatio
    }
    
    streamLayouts.push({
      streamIndex: i,
      width: streamWidth,
      height: streamHeight,
      gridRow: row + 1,
      gridCol: col + 1,
    })
    
    totalPixels += streamWidth * streamHeight
  }

  return {
    gridConfig: config,
    streamLayouts,
    totalPixels,
    colWidths: scaledColWidths,
    rowHeights: scaledRowHeights,
  }
}
