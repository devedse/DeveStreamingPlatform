/**
 * Format bytes to human-readable format (B, KB, MB, GB, TB)
 * Uses 1024 as the divisor (binary)
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

/**
 * Format bytes per second to human-readable format (B/s, KB/s, MB/s, GB/s, TB/s)
 * Uses 1024 as the divisor (binary)
 */
export function formatBytesPerSec(bytes: number): string {
  return `${formatBytes(bytes)}/s`
}

/**
 * Format bits to human-readable format (bps, Kbps, Mbps, Gbps, Tbps)
 * Uses 1000 as the divisor (decimal, standard for bits)
 */
export function formatBits(bits: number): string {
  if (bits === 0) return '0 bps'
  const k = 1000
  const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps']
  const i = Math.floor(Math.log(bits) / Math.log(k))
  return `${(bits / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

/**
 * Format bits per second to human-readable format (bps, Kbps, Mbps, Gbps, Tbps)
 * Uses 1000 as the divisor (decimal, standard for bits)
 */
export function formatBitsPerSec(bits: number): string {
  return formatBits(bits)
}
