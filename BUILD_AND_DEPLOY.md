# 🚀 Build & Deployment Guide

## Local Development

### Prerequisites
- Node.js 18+ or 20+
- pnpm (recommended) or npm

### Setup Steps

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Configure environment**
   
   The `.env.development` file is already set up for local development:
   ```env
   VITE_API_BASE_URL=http://10.88.28.212:8081
   VITE_API_ACCESS_TOKEN=ome-access-token
   VITE_WEBRTC_URL=ws://10.88.28.212:3333
   VITE_RTMP_URL=rtmp://10.88.28.212:1935
   VITE_SRT_URL=srt://10.88.28.212:9999
   VITE_MPEGTS_URL=udp://10.88.28.212:4000
   ```
   
   **Note:** Make sure `VITE_API_ACCESS_TOKEN` matches the `<AccessToken>` in your OvenMediaEngine Server.xml

3. **Start development server**
   ```bash
   pnpm dev
   ```
   
   App will be available at `http://localhost:5173/`

4. **Hot reload**
   - Changes to Vue components auto-reload
   - Changes to config require restart

### Development Commands

```bash
# Type check
pnpm run type-check

# Build for production
pnpm build

# Preview production build locally
pnpm preview
```

## Production Build

### Build Process

```bash
# Clean build (if needed)
rm -rf dist node_modules
pnpm install

# Build for production
pnpm build
```

This creates an optimized build in the `dist/` folder with:
- Minified JavaScript
- Optimized CSS
- Tree-shaken dependencies
- Source maps (optional)

### Build Output

```
dist/
├── assets/
│   ├── index-[hash].js      # Main application bundle
│   ├── index-[hash].css     # Compiled styles
│   └── ...                  # Other chunks and assets
├── index.html               # Entry point
└── vite.svg                 # Favicon
```

## Docker Deployment

### Quick Start

```bash
# Build the Docker image
docker build -t devedse/devestreamingplatformweb:latest .

# Run the container
docker run -d \
  --name deveplatform_web \
  -p 8080:80 \
  -e BASIC_AUTH_USERNAME=admin \
  -e BASIC_AUTH_PASSWORD=your_secure_password \
  devedse/devestreamingplatformweb:latest

# Check if it's running
docker ps
docker logs deveplatform_web
```

Visit `http://localhost:8080` and log in with your credentials.

### Docker Compose

Create a `docker-compose.yml`:

```yaml
version: '3.8'

services:
  devestreamingplatformweb:
    build: .
    container_name: deveplatform_web
    restart: unless-stopped
    ports:
      - "8080:80"
    environment:
      - BASIC_AUTH_USERNAME=${WEB_USERNAME:-admin}
      - BASIC_AUTH_PASSWORD=${WEB_PASSWORD:-changeme}
    networks:
      - streaming_network

networks:
  streaming_network:
    driver: bridge
```

Then run:

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Environment Variables for Docker

- `BASIC_AUTH_USERNAME` - HTTP Basic Auth username (default: admin)
- `BASIC_AUTH_PASSWORD` - HTTP Basic Auth password (default: changeme)

### Multi-Stage Build Explanation

The Dockerfile uses a multi-stage build:

1. **Build Stage** (node:20-alpine)
   - Installs pnpm and dependencies
   - Builds the Vue application
   - Creates optimized production bundle

2. **Production Stage** (nginx:alpine)
   - Copies built files from build stage
   - Sets up Nginx with basic auth
   - Exposes port 80

**Benefits:**
- Smaller final image size (~50MB vs ~500MB)
- No Node.js in production image
- Secure and optimized

## Publishing to Docker Hub

### First Time Setup

```bash
# Log in to Docker Hub
docker login

# Tag your image
docker tag devedse/devestreamingplatformweb:latest devedse/devestreamingplatformweb:v1.0.0
```

### Push to Docker Hub

```bash
# Push latest tag
docker push devedse/devestreamingplatformweb:latest

# Push version tag
docker push devedse/devestreamingplatformweb:v1.0.0
```

### Pull and Run from Docker Hub

```bash
# Pull the image
docker pull devedse/devestreamingplatformweb:latest

# Run it
docker run -d \
  --name streaming_web \
  -p 8080:80 \
  -e BASIC_AUTH_USERNAME=admin \
  -e BASIC_AUTH_PASSWORD=secret \
  devedse/devestreamingplatformweb:latest
```

## Nginx Configuration

### Basic Auth

The `docker-entrypoint.sh` script automatically creates `.htpasswd` from environment variables.

Manual creation:
```bash
htpasswd -c .htpasswd admin
# Enter password when prompted
```

### Custom Nginx Config

To modify Nginx configuration:

1. Edit `nginx.conf`
2. Rebuild Docker image
3. Redeploy

Key sections:
- **Authentication**: `auth_basic` directives
- **SPA Routing**: `try_files $uri $uri/ /index.html`
- **Caching**: Static asset cache headers
- **Compression**: Gzip settings

## Production Environment Variables

For production deployment, create `.env.production`:

```env
VITE_API_BASE_URL=https://devedse.duckdns.org:8082
VITE_API_ACCESS_TOKEN=ome-access-token
VITE_WEBRTC_URL=wss://devedse.duckdns.org:3334
VITE_RTMP_URL=rtmps://devedse.duckdns.org:1935
VITE_SRT_URL=srt://devedse.duckdns.org:9999
VITE_MPEGTS_URL=udp://devedse.duckdns.org:4000
```

**Note:** These are baked into the build, so rebuild after changes.

## Continuous Deployment

### GitHub Actions Example

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [main]
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Log in to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: |
            devedse/devestreamingplatformweb:latest
            devedse/devestreamingplatformweb:${{ github.ref_name }}
```

## Troubleshooting

### Build Issues

**Problem:** `pnpm install` fails
- **Solution:** Clear cache with `pnpm store prune` and retry

**Problem:** TypeScript errors
- **Solution:** These are mostly IDE warnings, the app should still build

### Runtime Issues

**Problem:** White screen after deployment
- **Solution:** Check browser console, ensure API URLs are correct

**Problem:** Can't connect to OvenMediaEngine
- **Solution:** Verify CORS settings in OvenMediaEngine, check network access

**Problem:** Basic auth not working
- **Solution:** Check environment variables are set correctly

### Docker Issues

**Problem:** Port already in use
- **Solution:** Change port mapping: `-p 8081:80` instead of `8080:80`

**Problem:** Container exits immediately
- **Solution:** Check logs with `docker logs deveplatform_web`

## Performance Optimization

### Build Optimization

```bash
# Analyze bundle size
pnpm add -D rollup-plugin-visualizer
```

Add to `vite.config.ts`:
```typescript
import { visualizer } from 'rollup-plugin-visualizer'

plugins: [
  vue(),
  vuetify({ autoImport: true }),
  visualizer({ open: true })
]
```

### Nginx Caching

Already configured in `nginx.conf`:
- Static assets: 1 year cache
- index.html: no cache
- Gzip compression enabled

### CDN Deployment

For even better performance:
1. Upload `dist/` to CDN
2. Update environment variables to point to CDN
3. Serve index.html from origin, assets from CDN

## Monitoring

### Docker Health Checks

Add to Dockerfile:
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1
```

### Logging

View logs:
```bash
# Docker logs
docker logs -f deveplatform_web

# Nginx access logs
docker exec deveplatform_web tail -f /var/log/nginx/access.log

# Nginx error logs
docker exec deveplatform_web tail -f /var/log/nginx/error.log
```

## Security Checklist

- ✅ HTTP Basic Authentication enabled
- ✅ Security headers configured
- ✅ No sensitive data in client-side code
- ✅ Environment variables for configuration
- ✅ HTTPS in production (via reverse proxy)
- ✅ Regular dependency updates

## Backup & Restore

### Backup

```bash
# Export configuration
docker run --rm devedse/devestreamingplatformweb:latest \
  cat /etc/nginx/.htpasswd > htpasswd.backup
```

### Restore

```bash
# Mount custom htpasswd
docker run -d \
  -v $(pwd)/htpasswd.backup:/etc/nginx/.htpasswd:ro \
  -p 8080:80 \
  devedse/devestreamingplatformweb:latest
```

## Support

For issues or questions:
1. Check browser console for errors
2. Review Docker logs
3. Verify OvenMediaEngine is accessible
4. Check network/firewall settings

---

**Ready to deploy! 🎉**
