# Deve Streaming Platform

A modern web interface for managing and viewing live streams with OvenMediaEngine.

## Features

- 📺 **Live Stream Management** - View all active streams in real-time
- 📊 **Stream Statistics** - Monitor bitrate, resolution, codec, and viewer count
- � **Integrated Player** - Built-in OvenPlayer for WebRTC playback
- � **Multi-Protocol Support** - Generate URLs for SRT, RTMP, WebRTC, and WHIP
- ⚡ **Low Latency** - WebRTC support for sub-second latency streaming

## Technology Stack

- **Frontend**: Vue 3 + TypeScript + Vuetify 3
- **Streaming Server**: OvenMediaEngine
- **Video Player**: OvenPlayer (WebRTC)
- **Build Tool**: Vite

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Running OvenMediaEngine instance

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Configuration

Edit `src/config/index.ts` to match your OvenMediaEngine setup:

```typescript
export const config = {
  api: {
    baseUrl: 'http://your-ome-server:8081',
    accessToken: 'your-access-token',
  },
  ome: {
    vhost: 'default',
    app: 'app',
    webrtcUrl: 'ws://your-ome-server:3333',
    rtmpUrl: 'rtmp://your-ome-server:1935',
    srtUrl: 'srt://your-ome-server:9999',
  },
}
```

## Usage

1. **Add a Stream**: Click the "+" button to generate streaming URLs
2. **Start Streaming**: Use the generated URLs in OBS or other streaming software
3. **View Stream**: Streams appear automatically on the home page
4. **Monitor Stats**: Click any stream to view detailed statistics

### Streaming URL Examples

- **RTMP**: `rtmp://server:1935/app/` + stream key
- **SRT**: `srt://server:9999?streamid=app/app/streamname`
- **WebRTC Ingest**: `ws://server:3333/app/streamname?direction=send`
- **WHIP**: `http://server:3333/app/streamname?direction=whip`

## Build for Production

```bash
# Build static files
pnpm build

# Preview production build
pnpm preview
```

## Docker Deployment

Build and run with Docker:

```bash
# Build image
docker build -t devestreaming .

# Run container
docker run -d -p 8080:80 devestreaming
```

The application will be available at `http://localhost:8080`

## License

MIT

