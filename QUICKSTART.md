# DeveStreamingPlatform Web - Quick Start Guide

A modern, Vue 3-based streaming platform that integrates with OvenMediaEngine for a professional streaming experience.

## 🚀 Quick Start

### Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

The app will be available at `http://localhost:5173/`

### Production Build

```bash
# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Docker Deployment

```bash
# Build Docker image
docker build -t devedse/devestreamingplatformweb:latest .

# Run with Docker
docker run -p 8080:80 \
  -e BASIC_AUTH_USERNAME=admin \
  -e BASIC_AUTH_PASSWORD=yourpassword \
  devedse/devestreamingplatformweb:latest

# Or use docker-compose
docker-compose up -d
```

## 📋 Features

- ✅ Stream browser with live stream cards
- ✅ Add stream dialog with all OBS streaming URLs
- ✅ WebRTC-based video player (OvenPlayer)
- ✅ Real-time stream statistics
- ✅ Dark/Light theme toggle
- ✅ Responsive design
- ✅ HTTP Basic Authentication (via Docker/Nginx)

## 🔧 Configuration

### Environment Variables

Create `.env.development` or `.env.production`:

```env
VITE_API_BASE_URL=http://10.88.28.212:8081
VITE_API_ACCESS_TOKEN=ome-access-token
VITE_WEBRTC_URL=ws://10.88.28.212:3333
VITE_RTMP_URL=rtmp://10.88.28.212:1935
VITE_SRT_URL=srt://10.88.28.212:9999
VITE_MPEGTS_URL=udp://10.88.28.212:4000
VITE_DEFAULT_VHOST=default
VITE_DEFAULT_APP=app
```

**Important:** The `VITE_API_ACCESS_TOKEN` must match the `<AccessToken>` value in your OvenMediaEngine `Server.xml` configuration.

### Docker Environment Variables

- `BASIC_AUTH_USERNAME` - HTTP Basic Auth username (default: admin)
- `BASIC_AUTH_PASSWORD` - HTTP Basic Auth password (default: changeme)

## 📱 Usage

### 1. Browse Streams
- Visit the home page to see all live streams
- Click "Refresh" to update the stream list
- Each stream card shows viewer count and live status

### 2. Add a Stream
- Click the "Add Stream" button
- Enter a stream name (no spaces)
- Copy the streaming URLs for OBS:
  - **SRT** - Recommended for best quality
  - **RTMP** - Standard streaming protocol
  - **WebRTC** - For playback (lowest latency)
  - **MPEG-TS/UDP** - UDP streaming

### 3. Watch a Stream
- Click "Watch Now" on any stream card
- The player will automatically start with WebRTC
- View real-time statistics in the sidebar:
  - Current viewer count
  - Connection breakdown by protocol
  - Throughput stats
  - Stream information

### 4. Theme Toggle
- Click the sun/moon icon in the header to toggle between dark and light themes

## 🏗️ Project Structure

```
src/
├── assets/           # Static assets
├── components/       # Vue components
│   ├── layout/      # Layout components (AppHeader)
│   ├── player/      # OvenPlayer component
│   └── streams/     # Stream-related components
├── config/          # Configuration
├── plugins/         # Vuetify plugin
├── router/          # Vue Router configuration
├── services/        # API services
│   └── api/        # OvenMediaEngine API client
├── stores/          # Pinia stores
├── views/           # Page views
├── App.vue          # Root component
└── main.ts          # Application entry point
```

## 🛠️ Tech Stack

- **Vue 3** - Progressive JavaScript framework
- **TypeScript** - Type safety
- **Vite** - Fast build tool
- **Vuetify 3** - Material Design component library
- **Pinia** - State management
- **Vue Router** - Client-side routing
- **OvenPlayer** - WebRTC video player
- **Axios** - HTTP client

## 🐳 Docker Info

The Docker image:
- Uses multi-stage build for optimal size
- Serves the app with Nginx
- Includes HTTP Basic Authentication
- Optimizes static assets with gzip compression
- Sets security headers

## 📝 Notes

- Stream names cannot contain spaces
- Streams appear automatically when you start broadcasting
- Statistics update every 3-5 seconds
- WebRTC provides sub-second latency for playback

## 🔒 Security

- Basic authentication is enforced at the Nginx level
- All API calls to OvenMediaEngine are proxied through the backend
- Environment variables are used for sensitive configuration
- Security headers are set in Nginx

## 📄 License

Private project - All rights reserved
