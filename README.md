# DeveStreamingPlatform

A modern web-based streaming platform built with Vue 3, Vuetify, and OvenPlayer for ultra-low latency WebRTC streaming.

## 🚀 Features

- 🎥 **WebRTC Video Streaming** - Sub-second latency using OvenPlayer
- 📊 **Real-time Statistics** - Live viewer counts, bandwidth, and connection metrics
- 🎨 **Modern UI** - Material Design 3 with Vuetify components
- 🌓 **Dark/Light Theme** - Toggle between themes with persistent settings
- 🔐 **Authentication** - HTTP Basic Auth for OvenMediaEngine API
- 📱 **Responsive Design** - Full-width layout optimized for all devices
- 🔄 **Auto-refresh** - Real-time updates every 5 seconds
- 🐳 **Docker Ready** - Production-ready containerization

## 🛠️ Tech Stack

- **Vue 3.5.22** - Progressive JavaScript framework with Composition API
- **TypeScript 5.9** - Type-safe development
- **Vuetify 3.10.5** - Material Design component framework
- **Vite 7.1.14** - Next-generation frontend tooling
- **Pinia 3.0.3** - Vue store with intuitive API
- **Vue Router 4.5.1** - Official router for Vue.js
- **OvenPlayer 0.10.46** - HTML5 player for WebRTC streaming
- **Axios 1.12.2** - Promise-based HTTP client

## 📋 Prerequisites

- **Node.js** 18+ and pnpm
- **OvenMediaEngine** server running with API enabled
- Access token for OvenMediaEngine API

## 🚀 Quick Start

See [QUICKSTART.md](QUICKSTART.md) for detailed setup instructions.

### Development

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.development.example .env.development
# Edit .env.development with your settings

# Start development server
pnpm dev
```

Visit `http://localhost:5173`

### Production Build

```bash
# Build for production
pnpm build

# Preview production build
pnpm preview
```

## 🐳 Docker Deployment

See [BUILD_AND_DEPLOY.md](BUILD_AND_DEPLOY.md) for complete deployment guide.

```bash
# Build Docker image
docker build -t devestreaming-web .

# Run container
docker run -p 8080:80 \
  -e VITE_API_ACCESS_TOKEN=your-token \
  -e BASIC_AUTH_USERNAME=admin \
  -e BASIC_AUTH_PASSWORD=secure-password \
  devestreaming-web
```

## 📚 Documentation

- [**QUICKSTART.md**](QUICKSTART.md) - Quick setup guide
- [**AUTHENTICATION.md**](AUTHENTICATION.md) - Authentication configuration
- [**BUILD_AND_DEPLOY.md**](BUILD_AND_DEPLOY.md) - Deployment instructions
- [**IMPLEMENTATION_SUMMARY.md**](IMPLEMENTATION_SUMMARY.md) - Technical overview
- [**TEST_RESULTS.md**](TEST_RESULTS.md) - Test coverage and results

## 🎯 Project Structure

```
src/
├── components/
│   ├── layout/          # AppHeader, navigation
│   ├── player/          # OvenPlayerComponent
│   └── streams/         # Stream cards, grid, dialogs, stats
├── services/
│   └── api/            # OvenMediaEngine API client
├── stores/             # Pinia state management
├── views/              # HomeView, StreamView
├── router/             # Vue Router configuration
├── plugins/            # Vuetify plugin setup
└── config/             # Application configuration
```

## 🔑 Environment Variables

Create `.env.development` for development:

```env
VITE_API_BASE_URL=http://your-ome-server:8081
VITE_API_ACCESS_TOKEN=your-access-token
VITE_WEBRTC_URL=ws://your-ome-server:3333
VITE_SRT_URL=srt://your-ome-server:9999
VITE_RTMP_URL=rtmp://your-ome-server:1935
VITE_MPEGTS_URL=udp://your-ome-server:4000
```

## 🧪 Testing

All features have been tested with Playwright:
- ✅ Full-width responsive layout
- ✅ WebRTC video playback
- ✅ Real-time statistics updates
- ✅ Theme switching
- ✅ Authentication headers
- ✅ Auto-refresh polling

See [TEST_RESULTS.md](TEST_RESULTS.md) for detailed test results.

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or support, please open an issue on GitHub.
