import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useStreamStore } from './streams'

const omeApiMock = vi.hoisted(() => ({
  getStreams: vi.fn(),
  getPublicMultiplexChannels: vi.fn(),
  getUnlistedMultiplexChannels: vi.fn(),
  getRecordingState: vi.fn(),
  getStreamStats: vi.fn(),
  getStreamDetails: vi.fn(),
  getPublicStreams: vi.fn(),
  getPublicStreamStats: vi.fn(),
  getPublicStreamDetails: vi.fn(),
  makeStreamPublic: vi.fn(),
  makeStreamPrivate: vi.fn(),
  makeStreamUnlisted: vi.fn(),
  removeUnlistedStream: vi.fn(),
}))

vi.mock('@/services/api/omeApi', () => ({
  omeApi: omeApiMock,
}))

describe('stream endpoint management', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    omeApiMock.getStreams.mockResolvedValue([])
    omeApiMock.getPublicMultiplexChannels.mockResolvedValue([])
    omeApiMock.getUnlistedMultiplexChannels.mockResolvedValue([])
    omeApiMock.getRecordingState.mockResolvedValue([])
    omeApiMock.getStreamStats.mockResolvedValue(null)
    omeApiMock.getStreamDetails.mockResolvedValue(null)
    omeApiMock.getPublicStreams.mockResolvedValue([])
  })

  function createAuthenticatedStore() {
    const authStore = useAuthStore()
    authStore.isAuthenticated = true
    return useStreamStore()
  }

  it('keeps inactive endpoints separate from live streams', async () => {
    omeApiMock.getStreams.mockResolvedValue(['live-source'])
    omeApiMock.getPublicMultiplexChannels.mockResolvedValue(['live-source', 'stopped-source'])
    omeApiMock.getUnlistedMultiplexChannels.mockResolvedValue([
      'live-source__ul__active',
      'stopped-source__ul__first',
      'stopped-source__ul__second',
    ])

    const store = createAuthenticatedStore()
    await store.fetchStreams()

    expect(store.streams.map(stream => stream.name)).toEqual(['live-source'])
    expect(store.streams[0]).toMatchObject({
      isLive: true,
      isPublic: true,
      isUnlisted: true,
      unlistedChannelName: 'live-source__ul__active',
    })
    expect(store.inactiveEndpoints).toEqual([
      {
        type: 'public',
        sourceStreamName: 'stopped-source',
        channelName: 'stopped-source',
      },
      {
        type: 'unlisted',
        sourceStreamName: 'stopped-source',
        channelName: 'stopped-source__ul__first',
      },
      {
        type: 'unlisted',
        sourceStreamName: 'stopped-source',
        channelName: 'stopped-source__ul__second',
      },
    ])
  })

  it('preserves and deletes an exact inactive unlisted channel', async () => {
    omeApiMock.getUnlistedMultiplexChannels.mockResolvedValue([
      'stopped-source__ul__first',
      'stopped-source__ul__second',
    ])
    omeApiMock.removeUnlistedStream.mockResolvedValue(true)

    const store = createAuthenticatedStore()
    await store.fetchStreams()

    const endpoint = store.inactiveEndpoints[0]!
    await expect(store.deleteInactiveEndpoint(endpoint)).resolves.toBe(true)

    expect(omeApiMock.removeUnlistedStream).toHaveBeenCalledWith('stopped-source__ul__first')
    expect(store.inactiveEndpoints.map(item => item.channelName)).toEqual([
      'stopped-source__ul__second',
    ])
    expect(store.unlistedChannelNames.get('stopped-source')).toEqual([
      'stopped-source__ul__second',
    ])
  })

  it('deletes an inactive public endpoint from the public app', async () => {
    omeApiMock.getPublicMultiplexChannels.mockResolvedValue(['stopped-public'])
    omeApiMock.makeStreamPrivate.mockResolvedValue(true)

    const store = createAuthenticatedStore()
    await store.fetchStreams()

    await expect(store.deleteInactiveEndpoint(store.inactiveEndpoints[0]!)).resolves.toBe(true)

    expect(omeApiMock.makeStreamPrivate).toHaveBeenCalledWith('stopped-public')
    expect(store.inactiveEndpoints).toEqual([])
  })

  it('removes every unlisted link when disabling unlisted access', async () => {
    omeApiMock.getStreams.mockResolvedValue(['live-source'])
    omeApiMock.getUnlistedMultiplexChannels.mockResolvedValue([
      'live-source__ul__first',
      'live-source__ul__second',
    ])
    omeApiMock.removeUnlistedStream.mockResolvedValue(true)

    const store = createAuthenticatedStore()
    await store.fetchStreams()
    await expect(store.removeUnlistedStream('live-source')).resolves.toBe(true)

    expect(omeApiMock.removeUnlistedStream).toHaveBeenCalledTimes(2)
    expect(omeApiMock.removeUnlistedStream).toHaveBeenCalledWith('live-source__ul__first')
    expect(omeApiMock.removeUnlistedStream).toHaveBeenCalledWith('live-source__ul__second')
    expect(store.unlistedChannelNames.has('live-source')).toBe(false)
    expect(store.streams[0]?.isUnlisted).toBe(false)
  })

  it('keeps failed deletions visible so they can be retried', async () => {
    omeApiMock.getUnlistedMultiplexChannels.mockResolvedValue(['stopped-source__ul__secret'])
    omeApiMock.removeUnlistedStream.mockResolvedValue(false)

    const store = createAuthenticatedStore()
    await store.fetchStreams()

    await expect(store.deleteInactiveEndpoint(store.inactiveEndpoints[0]!)).resolves.toBe(false)

    expect(store.inactiveEndpoints).toHaveLength(1)
    expect(store.unlistedChannelNames.get('stopped-source')).toEqual([
      'stopped-source__ul__secret',
    ])
  })

  it('shows malformed unlisted channels so administrators can still delete them', async () => {
    omeApiMock.getUnlistedMultiplexChannels.mockResolvedValue(['legacy-channel-without-secret-format'])

    const store = createAuthenticatedStore()
    await store.fetchStreams()

    expect(store.inactiveEndpoints).toEqual([{
      type: 'unlisted',
      sourceStreamName: null,
      channelName: 'legacy-channel-without-secret-format',
    }])
  })
})
