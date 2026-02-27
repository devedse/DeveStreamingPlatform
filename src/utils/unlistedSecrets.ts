/**
 * Unlisted stream secret utilities.
 *
 * Unlisted streams are relayed to the OME "unlisted" app via MultiplexChannel.
 * The channel name embeds a secret so that only people who know the full name
 * can access the stream.  Format:
 *
 *   {streamName}__ul__{secret}
 *
 * OME itself is the source of truth — no external database is needed.
 */

/** Separator between the original stream name and the secret */
export const UNLISTED_SEPARATOR = '__ul__'

/**
 * Generate a 24-character hex secret (96 bits of entropy).
 * Uses the Web Crypto API for cryptographic randomness.
 */
export function generateSecret(): string {
  const bytes = new Uint8Array(12) // 12 bytes = 96 bits = 24 hex chars
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Build the MultiplexChannel name for the unlisted app.
 *
 * @example buildUnlistedChannelName('Devedse', 'a3f8b2c1e9d04f7a6b8c2d1e')
 *          // → 'Devedse__ul__a3f8b2c1e9d04f7a6b8c2d1e'
 */
export function buildUnlistedChannelName(streamName: string, secret: string): string {
  return `${streamName}${UNLISTED_SEPARATOR}${secret}`
}

/**
 * Parse an unlisted channel name back into its stream name and secret.
 * Returns `null` if the name does not contain the separator.
 */
export function parseUnlistedChannelName(
  channelName: string,
): { streamName: string; secret: string } | null {
  const idx = channelName.indexOf(UNLISTED_SEPARATOR)
  if (idx === -1) return null
  return {
    streamName: channelName.substring(0, idx),
    secret: channelName.substring(idx + UNLISTED_SEPARATOR.length),
  }
}

/**
 * Build the shareable URL for an unlisted stream.
 *
 * @example buildShareUrl('Devedse__ul__a3f8b2...')
 *          // → 'https://domain.com/s/Devedse__ul__a3f8b2...'
 */
export function buildShareUrl(channelName: string): string {
  return `${window.location.origin}/s/${channelName}`
}
