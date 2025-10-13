# Deve Streaming Platform

A modern web interface for managing and viewing live streams with OvenMediaEngine.

![Deve Streaming Platform](image_stream.png)

## Features

- 📺 **Live Stream Management** - View all active streams in real-time
- 📊 **Stream Statistics** - Monitor bitrate, resolution, codec, and viewer count
- 🎬 **Integrated Player** - Built-in OvenPlayer for WebRTC playback
- 🌐 **Multi-Protocol Support** - Generate URLs for SRT, RTMP, WebRTC, and WHIP
- ⚡ **Low Latency** - WebRTC support for sub-second latency streaming

## Build Status

| GitHubActions Builds |
|:--------------------:|
| [![GitHubActions Builds](https://github.com/devedse/DeveStreamingPlatform/workflows/GitHubActionsBuilds/badge.svg)](https://github.com/devedse/DeveStreamingPlatform/actions/workflows/githubactionsbuilds.yml) |

## Docker

| Docker Hub |
|:----------:|
| [![Docker](https://img.shields.io/docker/pulls/devedse/devestreamingplatform.svg)](https://hub.docker.com/r/devedse/devestreamingplatform) |

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

## Docker Deployment

Build and run with Docker Compose. The application uses nginx as a reverse proxy to communicate with OvenMediaEngine, so all API calls go through `/omeapi` internally.

Create a `docker-compose.yml`:

```yaml
services:
  devestreaming:
    image: devedse/devestreamingplatform:latest
    container_name: devestreaming
    restart: unless-stopped
    ports:
      - "8089:80"
    environment:
      # OvenMediaEngine Configuration (for nginx reverse proxy)
      - OME_API_URL=http://10.88.28.212:8081
      - OME_API_TOKEN=ome-access-token
      # Streaming URLs (displayed to users)
      - OME_WEBRTC_URL=ws://10.88.28.212:3333
      - OME_RTMP_URL=rtmp://10.88.28.212:1935
      - OME_SRT_URL=srt://10.88.28.212:9999
      # OME Server Configuration
      - OME_VHOST=default
      - OME_APP=app
      # Basic Authentication (optional)
      - BASIC_AUTH_USERNAME=admin
      - BASIC_AUTH_PASSWORD=secure-password
```

**Note:** If running on the same Docker network as OvenMediaEngine, you can use the container name:
```yaml
- OME_API_URL=http://ovenmediaengine:8081
```

Then run:

```bash
docker-compose up -d
```

The application will be available at `http://localhost:8089`

### Available Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OME_API_URL` | **Internal URL** for nginx to proxy to OvenMediaEngine API | Required |
| `OME_API_TOKEN` | OME API access token | Required |
| `OME_WEBRTC_URL` | WebRTC signaling URL (public URL for streaming) | Required |
| `OME_RTMP_URL` | RTMP server URL (public URL for streaming) | Required |
| `OME_SRT_URL` | SRT server URL (public URL for streaming) | Required |
| `OME_VHOST` | Default virtual host | `default` |
| `OME_APP` | Default application name | `app` |
| `BASIC_AUTH_USERNAME` | HTTP basic auth username (optional) | - |
| `BASIC_AUTH_PASSWORD` | HTTP basic auth password (optional) | - |

### How It Works

The application uses nginx as a reverse proxy:
- **Frontend → `/omeapi`** → nginx proxy → **OvenMediaEngine API** (`OME_API_URL`)
- This allows the frontend to make API calls without CORS issues
- The `OME_API_URL` is only used by nginx internally and never exposed to the browser
- All API requests from the browser go to `/omeapi` which nginx forwards to the actual OME server

## Local Development

### Installation

```bash
# Install dependencies
pnpm install

# Start development server  
pnpm dev
```

### Configuration

For local development, create a `.env.development` file. Vite is configured to proxy `/omeapi` requests to your OME server:

```env
# OvenMediaEngine server URL (used by Vite dev server proxy)
VITE_API_BASE_URL=http://your-ome-server:8081
VITE_API_ACCESS_TOKEN=your-access-token

# Streaming URLs
VITE_WEBRTC_URL=ws://your-ome-server:3333
VITE_RTMP_URL=rtmp://your-ome-server:1935
VITE_SRT_URL=srt://your-ome-server:9999

# OME Configuration
VITE_OME_VHOST=default
VITE_OME_APP=app
```

The dev server will proxy API calls from `/omeapi` to `VITE_API_BASE_URL`.