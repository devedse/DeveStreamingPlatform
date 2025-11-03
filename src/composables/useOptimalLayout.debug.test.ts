import { describe, it, expect } from 'vitest'

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
}

const DEFAULT_ASPECT_RATIO = 16 / 9

/**
 * Core algorithm: finds the grid configuration that maximizes total video pixels
 * This is extracted from useOptimalLayout.ts for direct testing
 */
function calculateOptimalLayout(
  aspectRatios: number[],
  containerWidth: number,
  containerHeight: number
): LayoutResult {
  const streamCount = aspectRatios.length

  if (streamCount === 0) {
    return {
      gridConfig: { rows: 1, cols: 1 },
      streamLayouts: [],
      totalPixels: 0,
    }
  }

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

function generateGridConfigs(streamCount: number): GridConfig[] {
  const configs: GridConfig[] = []
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
  const totalHorizontalGaps = (cols - 1) * GAP_SIZE + cols * BORDER_SIZE
  const totalVerticalGaps = (rows - 1) * GAP_SIZE + rows * BORDER_SIZE
  
  const availableWidth = containerWidth - totalHorizontalGaps
  const availableHeight = containerHeight - totalVerticalGaps

  const streamLayouts: StreamLayout[] = []
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
  
  const rowHeights: number[] = new Array(rows).fill(0)
  const colWidths: number[] = new Array(cols).fill(0)
  
  const baseRowHeight = availableHeight / rows
  const baseColWidth = availableWidth / cols
  
  for (let i = 0; i < streamCount; i++) {
    const aspectRatio = aspectRatios[i] ?? DEFAULT_ASPECT_RATIO
    const row = Math.floor(i / cols)
    const col = i % cols
    
    let streamWidth: number
    let streamHeight: number
    
    if (baseColWidth / baseRowHeight > aspectRatio) {
      streamHeight = baseRowHeight
      streamWidth = streamHeight * aspectRatio
    } else {
      streamWidth = baseColWidth
      streamHeight = streamWidth / aspectRatio
    }
    
    rowHeights[row] = Math.max(rowHeights[row] ?? 0, streamHeight)
    colWidths[col] = Math.max(colWidths[col] ?? 0, streamWidth)
  }
  
  const totalCalculatedWidth = colWidths.reduce((sum, w) => sum + w, 0)
  const totalCalculatedHeight = rowHeights.reduce((sum, h) => sum + h, 0)
  
  const widthScale = totalCalculatedWidth > 0 ? availableWidth / totalCalculatedWidth : 1
  const heightScale = totalCalculatedHeight > 0 ? availableHeight / totalCalculatedHeight : 1
  
  const scale = Math.min(widthScale, heightScale)
  
  const scaledRowHeights = rowHeights.map(h => h * scale)
  const scaledColWidths = colWidths.map(w => w * scale)
  
  let totalPixels = 0
  
  for (let i = 0; i < streamCount; i++) {
    const aspectRatio = aspectRatios[i] ?? DEFAULT_ASPECT_RATIO
    const row = Math.floor(i / cols)
    const col = i % cols
    
    const cellWidth = scaledColWidths[col] ?? 0
    const cellHeight = scaledRowHeights[row] ?? 0
    
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
  }
}

describe('Layout Algorithm Debug', () => {
  it('should compare all grid configurations for the bug case', () => {
    const aspectRatios = [3440/1440, 2560/1600]
    const containerWidth = 3504
    const containerHeight = 1061

    const possibleConfigs = generateGridConfigs(2)
    
    console.log('\n=== Testing all grid configurations ===')
    console.log(`Container: ${containerWidth}x${containerHeight}`)
    console.log(`Streams: ${aspectRatios.map((ar, i) => `Stream ${i+1} AR=${ar.toFixed(4)}`).join(', ')}\n`)

    const results: Array<{config: GridConfig, result: LayoutResult, unusedWidth: number, unusedHeight: number}> = []

    for (const config of possibleConfigs) {
      const result = evaluateGridConfig(config, aspectRatios, containerWidth, containerHeight)
      
      const GAP_SIZE = 2
      const BORDER_SIZE = 2
      const totalHorizontalGaps = (config.cols - 1) * GAP_SIZE + config.cols * BORDER_SIZE
      const totalVerticalGaps = (config.rows - 1) * GAP_SIZE + config.rows * BORDER_SIZE
      
      // Calculate column widths and row heights from layouts
      const colWidths: number[] = []
      for (let col = 0; col < config.cols; col++) {
        const streamsInCol = result.streamLayouts.filter(s => s.gridCol === col + 1)
        const maxWidth = Math.max(...streamsInCol.map(s => s.width), 0)
        colWidths.push(maxWidth)
      }
      
      const rowHeights: number[] = []
      for (let row = 0; row < config.rows; row++) {
        const streamsInRow = result.streamLayouts.filter(s => s.gridRow === row + 1)
        const maxHeight = Math.max(...streamsInRow.map(s => s.height), 0)
        rowHeights.push(maxHeight)
      }
      
      const totalGridWidth = colWidths.reduce((sum, w) => sum + w, 0)
      const totalGridHeight = rowHeights.reduce((sum, h) => sum + h, 0)
      
      const totalUsedWidth = totalGridWidth + totalHorizontalGaps
      const totalUsedHeight = totalGridHeight + totalVerticalGaps
      
      const unusedWidth = containerWidth - totalUsedWidth
      const unusedHeight = containerHeight - totalUsedHeight
      
      results.push({ config, result, unusedWidth, unusedHeight })
      
      console.log(`Grid ${config.rows}x${config.cols}:`)
      console.log(`  Column widths: [${colWidths.map(w => w.toFixed(2)).join(', ')}]`)
      console.log(`  Row heights: [${rowHeights.map(h => h.toFixed(2)).join(', ')}]`)
      console.log(`  Total pixels: ${result.totalPixels.toFixed(2)}`)
      console.log(`  Unused width: ${unusedWidth.toFixed(2)}px`)
      console.log(`  Unused height: ${unusedHeight.toFixed(2)}px`)
      console.log(`  Utilization: ${((result.totalPixels / (containerWidth * containerHeight)) * 100).toFixed(2)}%`)
      console.log('')
    }

    // Find best by total pixels
    const bestByPixels = results.reduce((best, current) => 
      current.result.totalPixels > best.result.totalPixels ? current : best
    )
    
    console.log('=== Best by Total Pixels ===')
    console.log(`Grid: ${bestByPixels.config.rows}x${bestByPixels.config.cols}`)
    console.log(`Total pixels: ${bestByPixels.result.totalPixels.toFixed(2)}`)
    console.log(`Unused: ${bestByPixels.unusedWidth.toFixed(2)}px width, ${bestByPixels.unusedHeight.toFixed(2)}px height`)

    // Find best by space utilization (minimal unused space)
    const bestByUtilization = results.reduce((best, current) => {
      const currentUnused = Math.abs(current.unusedWidth) + Math.abs(current.unusedHeight)
      const bestUnused = Math.abs(best.unusedWidth) + Math.abs(best.unusedHeight)
      return currentUnused < bestUnused ? current : best
    })
    
    console.log('\n=== Best by Space Utilization ===')
    console.log(`Grid: ${bestByUtilization.config.rows}x${bestByUtilization.config.cols}`)
    console.log(`Total pixels: ${bestByUtilization.result.totalPixels.toFixed(2)}`)
    console.log(`Unused: ${bestByUtilization.unusedWidth.toFixed(2)}px width, ${bestByUtilization.unusedHeight.toFixed(2)}px height`)

    // Test assertion - currently fails
    expect(bestByPixels.unusedWidth).toBeLessThan(5)
  })

  it('should analyze why 2x1 configuration leaves unused space', () => {
    const aspectRatios = [3440/1440, 2560/1600]
    const containerWidth = 3504
    const containerHeight = 1061
    
    const config = { rows: 1, cols: 2 }
    const result = evaluateGridConfig(config, aspectRatios, containerWidth, containerHeight)
    
    const GAP_SIZE = 2
    const BORDER_SIZE = 2
    const totalHorizontalGaps = (config.cols - 1) * GAP_SIZE + config.cols * BORDER_SIZE
    const totalVerticalGaps = (config.rows - 1) * GAP_SIZE + config.rows * BORDER_SIZE
    
    const availableWidth = containerWidth - totalHorizontalGaps
    const availableHeight = containerHeight - totalVerticalGaps
    
    console.log('\n=== Detailed Analysis of 1x2 Grid ===')
    console.log(`Container: ${containerWidth}x${containerHeight}`)
    console.log(`Gaps/Borders: H=${totalHorizontalGaps}px, V=${totalVerticalGaps}px`)
    console.log(`Available: ${availableWidth}x${availableHeight}`)
    console.log(`Aspect ratios: [${aspectRatios.map(ar => ar.toFixed(4)).join(', ')}]`)
    
    // Simulate the algorithm step by step
    const baseRowHeight = availableHeight / config.rows
    const baseColWidth = availableWidth / config.cols
    
    console.log(`\nBase cell size: ${baseColWidth.toFixed(2)}x${baseRowHeight.toFixed(2)}`)
    console.log(`Base cell aspect ratio: ${(baseColWidth / baseRowHeight).toFixed(4)}`)
    
    const rowHeights: number[] = new Array(config.rows).fill(0)
    const colWidths: number[] = new Array(config.cols).fill(0)
    
    for (let i = 0; i < aspectRatios.length; i++) {
      const aspectRatio = aspectRatios[i]
      const row = Math.floor(i / config.cols)
      const col = i % config.cols
      
      let streamWidth: number
      let streamHeight: number
      
      if (baseColWidth / baseRowHeight > aspectRatio) {
        streamHeight = baseRowHeight
        streamWidth = streamHeight * aspectRatio
        console.log(`\nStream ${i+1} (AR=${aspectRatio.toFixed(4)}): Height-constrained`)
      } else {
        streamWidth = baseColWidth
        streamHeight = streamWidth / aspectRatio
        console.log(`\nStream ${i+1} (AR=${aspectRatio.toFixed(4)}): Width-constrained`)
      }
      
      console.log(`  Calculated size: ${streamWidth.toFixed(2)}x${streamHeight.toFixed(2)}`)
      
      rowHeights[row] = Math.max(rowHeights[row], streamHeight)
      colWidths[col] = Math.max(colWidths[col], streamWidth)
      
      console.log(`  Updated row ${row} height: ${rowHeights[row].toFixed(2)}`)
      console.log(`  Updated col ${col} width: ${colWidths[col].toFixed(2)}`)
    }
    
    const totalCalculatedWidth = colWidths.reduce((sum, w) => sum + w, 0)
    const totalCalculatedHeight = rowHeights.reduce((sum, h) => sum + h, 0)
    
    console.log(`\nTotal calculated: ${totalCalculatedWidth.toFixed(2)}x${totalCalculatedHeight.toFixed(2)}`)
    
    const widthScale = availableWidth / totalCalculatedWidth
    const heightScale = availableHeight / totalCalculatedHeight
    const scale = Math.min(widthScale, heightScale)
    
    console.log(`Width scale: ${widthScale.toFixed(4)}`)
    console.log(`Height scale: ${heightScale.toFixed(4)}`)
    console.log(`Final scale: ${scale.toFixed(4)} (${scale === widthScale ? 'width-limited' : 'height-limited'})`)
    
    const scaledColWidths = colWidths.map(w => w * scale)
    const scaledRowHeights = rowHeights.map(h => h * scale)
    
    console.log(`\nScaled columns: [${scaledColWidths.map(w => w.toFixed(2)).join(', ')}]`)
    console.log(`Scaled rows: [${scaledRowHeights.map(h => h.toFixed(2)).join(', ')}]`)
    
    const scaledTotalWidth = scaledColWidths.reduce((sum, w) => sum + w, 0)
    const scaledTotalHeight = scaledRowHeights.reduce((sum, h) => sum + h, 0)
    
    console.log(`\nScaled total: ${scaledTotalWidth.toFixed(2)}x${scaledTotalHeight.toFixed(2)}`)
    console.log(`Available: ${availableWidth}x${availableHeight}`)
    console.log(`Leftover width: ${(availableWidth - scaledTotalWidth).toFixed(2)}`)
    console.log(`Leftover height: ${(availableHeight - scaledTotalHeight).toFixed(2)}`)
    
    console.log(`\n=== Issue Identified ===`)
    console.log(`The algorithm scales by the minimum of width/height scales.`)
    console.log(`This ensures fit, but doesn't redistribute the leftover space.`)
    console.log(`In this case, we're height-limited, leaving ${(availableWidth - scaledTotalWidth).toFixed(2)}px of width unused.`)
  })
})
