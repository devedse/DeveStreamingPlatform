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

  const GAP_SIZE = 2
  const BORDER_SIZE = 2

  const horizontalSpacing = Math.max(cols - 1, 0) * GAP_SIZE + cols * BORDER_SIZE
  const verticalSpacing = Math.max(rows - 1, 0) * GAP_SIZE + rows * BORDER_SIZE

  const availableWidth = Math.max(containerWidth - horizontalSpacing, 0)
  const availableHeight = Math.max(containerHeight - verticalSpacing, 0)

  const cellWidth = cols > 0 ? availableWidth / cols : 0
  const cellHeight = rows > 0 ? availableHeight / rows : 0

  const rowHeights = Array.from({ length: rows }, () => 0)
  const colWidths = Array.from({ length: cols }, () => 0)

  for (let i = 0; i < streamCount; i++) {
    const aspectRatio = aspectRatios[i] ?? DEFAULT_ASPECT_RATIO
    const row = Math.floor(i / cols)
    const col = i % cols

    const fitted = fitWithinBounds(aspectRatio, cellWidth, cellHeight)

    if (row < rowHeights.length) {
      const currentHeight = rowHeights[row] ?? 0
      rowHeights[row] = Math.max(currentHeight, fitted.height)
    }
    if (col < colWidths.length) {
      const currentWidth = colWidths[col] ?? 0
      colWidths[col] = Math.max(currentWidth, fitted.width)
    }
  }

  const scaled = scaleDimensions(colWidths, rowHeights, availableWidth, availableHeight)

  const redistributed = redistributeSpace({
    colWidths: scaled.colWidths,
    rowHeights: scaled.rowHeights,
    availableWidth,
    availableHeight,
    aspectRatios,
    cols,
  })

  const streamLayouts: StreamLayout[] = []
  let totalPixels = 0

  for (let i = 0; i < streamCount; i++) {
    const aspectRatio = aspectRatios[i] ?? DEFAULT_ASPECT_RATIO
    const row = Math.floor(i / cols)
    const col = i % cols

    const targetWidth = redistributed.colWidths[col] ?? 0
    const targetHeight = redistributed.rowHeights[row] ?? 0

    const { width, height } = fitWithinBounds(aspectRatio, targetWidth, targetHeight)

    streamLayouts.push({
      streamIndex: i,
      width,
      height,
      gridRow: row + 1,
      gridCol: col + 1,
    })

    totalPixels += width * height
  }

  return {
    gridConfig: config,
    streamLayouts,
    totalPixels,
    colWidths: redistributed.colWidths,
    rowHeights: redistributed.rowHeights,
  }
}

function fitWithinBounds(aspectRatio: number, maxWidth: number, maxHeight: number) {
  if (maxWidth <= 0 || maxHeight <= 0) {
    return { width: 0, height: 0 }
  }

  const widthBasedHeight = maxWidth / aspectRatio

  if (widthBasedHeight <= maxHeight) {
    return { width: maxWidth, height: widthBasedHeight }
  }

  const heightBasedWidth = maxHeight * aspectRatio
  return { width: heightBasedWidth, height: maxHeight }
}

function scaleDimensions(
  colWidths: number[],
  rowHeights: number[],
  availableWidth: number,
  availableHeight: number
) {
  const totalWidth = colWidths.reduce((sum, width) => sum + width, 0)
  const totalHeight = rowHeights.reduce((sum, height) => sum + height, 0)

  const widthScale = totalWidth > 0 ? availableWidth / totalWidth : 1
  const heightScale = totalHeight > 0 ? availableHeight / totalHeight : 1
  const scale = Math.min(widthScale, heightScale)

  return {
    colWidths: colWidths.map(width => width * scale),
    rowHeights: rowHeights.map(height => height * scale),
    widthScale,
    heightScale,
    scale,
  }
}

interface RedistributionInput {
  colWidths: number[]
  rowHeights: number[]
  availableWidth: number
  availableHeight: number
  aspectRatios: number[]
  cols: number
}

function redistributeSpace({
  colWidths,
  rowHeights,
  availableWidth,
  availableHeight,
  aspectRatios,
  cols,
}: RedistributionInput) {
  const adjustedColWidths = [...colWidths]
  const adjustedRowHeights = [...rowHeights]

  const totalWidth = adjustedColWidths.reduce((sum, width) => sum + width, 0)
  const totalHeight = adjustedRowHeights.reduce((sum, height) => sum + height, 0)

  const widthLeftover = availableWidth - totalWidth
  const heightLeftover = availableHeight - totalHeight

  if (Math.abs(heightLeftover) < 1 && widthLeftover > 1) {
    const baseRowHeight = adjustedRowHeights[0] ?? 0
    if (baseRowHeight > 0) {
      const exactStreamWidths = aspectRatios.map(aspect => baseRowHeight * (aspect ?? DEFAULT_ASPECT_RATIO))
      const totalExactWidth = exactStreamWidths.reduce((sum, width) => sum + width, 0)
      const unused = availableWidth - totalExactWidth

      if (unused >= 0) {
        if (unused > 0) {
          const widestIdx = findWidestAspectIndex(aspectRatios)
          exactStreamWidths[widestIdx] = (exactStreamWidths[widestIdx] ?? 0) + unused
        }

        const widthsByColumn = combineStreamsPerColumn(exactStreamWidths, cols)
        widthsByColumn.forEach((width, index) => {
          adjustedColWidths[index] = width
        })
      } else {
        const aspectSum = aspectRatios.reduce(
          (sum, aspect) => sum + (aspect ?? DEFAULT_ASPECT_RATIO),
          0
        )
        const neededRowHeight = aspectSum > 0 ? availableWidth / aspectSum : baseRowHeight
        adjustedRowHeights.fill(neededRowHeight)

        const recalculatedWidths = aspectRatios.map(
          aspect => neededRowHeight * (aspect ?? DEFAULT_ASPECT_RATIO)
        )
        const recalculatedTotal = recalculatedWidths.reduce((sum, width) => sum + width, 0)
        const finalUnused = availableWidth - recalculatedTotal

        if (Math.abs(finalUnused) > 0.1) {
          const widestIdx = findWidestAspectIndex(aspectRatios)
          recalculatedWidths[widestIdx] = (recalculatedWidths[widestIdx] ?? 0) + finalUnused
        }

        const widthsByColumn = combineStreamsPerColumn(recalculatedWidths, cols)
        widthsByColumn.forEach((width, index) => {
          adjustedColWidths[index] = width
        })
      }
    }
  } else if (Math.abs(widthLeftover) < 1 && heightLeftover > 1) {
    const totalRowHeight = adjustedRowHeights.reduce((sum, height) => sum + height, 0)
    const heightBoost = totalRowHeight > 0 ? availableHeight / totalRowHeight : 1
    adjustedRowHeights.forEach((height, index) => {
      adjustedRowHeights[index] = height * heightBoost
    })
  }

  return {
    colWidths: adjustedColWidths,
    rowHeights: adjustedRowHeights,
  }
}

function combineStreamsPerColumn(streamWidths: number[], cols: number) {
  const widths = Array.from({ length: cols }, () => 0)
  for (let i = 0; i < streamWidths.length; i++) {
    const col = i % cols
    const current = widths[col] ?? 0
    const next = streamWidths[i] ?? 0
    widths[col] = Math.max(current, next)
  }
  return widths
}

function findWidestAspectIndex(aspectRatios: number[]) {
  let widestIdx = 0
  let maxAspect = aspectRatios[0] ?? DEFAULT_ASPECT_RATIO

  for (let i = 1; i < aspectRatios.length; i++) {
    const aspect = aspectRatios[i] ?? DEFAULT_ASPECT_RATIO
    if (aspect > maxAspect) {
      maxAspect = aspect
      widestIdx = i
    }
  }

  return widestIdx
}
