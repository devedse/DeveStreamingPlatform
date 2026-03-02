#!/bin/sh
set -e

echo "=== Deve Streaming Platform - Starting ==="

# ============================================
# Authentication Setup (Cookie-based)
# ============================================

if [ -z "$ADMIN_PASSWORD" ]; then
    echo "❌ ERROR: ADMIN_PASSWORD environment variable is required!"
    exit 1
fi
# Compute password hash (frontend sends SHA-256 of password, nginx compares against this)
export ADMIN_PASSWORD_HASH=$(printf '%s' "${ADMIN_PASSWORD}" | sha256sum | cut -d' ' -f1)
# Compute cookie hash (different from password hash for security)
export AUTH_COOKIE_HASH=$(printf '%s' "dsp-cookie:${ADMIN_PASSWORD}" | sha256sum | cut -d' ' -f1)
echo "✓ Cookie-based authentication configured"

# Secure flag on cookies — enabled by default (requires HTTPS / TLS-terminating proxy)
# Set DISABLE_SECURE_COOKIES=true only for plain-HTTP development/testing
if [ "$DISABLE_SECURE_COOKIES" = "true" ]; then
    export COOKIE_SECURE_FLAG=""
    echo "⚠ Cookie Secure flag DISABLED (plain HTTP mode — do NOT use in production)"
else
    export COOKIE_SECURE_FLAG="; Secure"
    echo "✓ Cookie Secure flag enabled (set DISABLE_SECURE_COOKIES=true for plain HTTP)"
fi

# ============================================
# OME API Configuration
# ============================================

# Configure OME virtual host and app names
if [ -z "$OME_VHOST" ]; then
    echo "❌ ERROR: OME_VHOST environment variable is required!"
    exit 1
fi
echo "✓ OME virtual host configured: ${OME_VHOST}"

if [ -z "$OME_APP" ]; then
    echo "❌ ERROR: OME_APP environment variable is required!"
    exit 1
fi
echo "✓ OME app configured: ${OME_APP}"

# Configure OME API proxy URL
if [ -z "$OME_API_URL" ]; then
    echo "❌ ERROR: OME_API_URL environment variable is required!"
    exit 1
fi
export OME_API_PROXY_URL="${OME_API_URL}"
echo "✓ OME API proxy configured: ${OME_API_URL}"

# Configure OME API authentication
if [ -z "$OME_API_TOKEN" ]; then
    echo "❌ ERROR: OME_API_TOKEN environment variable is required!"
    exit 1
fi
# Convert token to base64 for nginx Basic Auth header
export OME_API_TOKEN_BASE64=$(echo -n "$OME_API_TOKEN" | base64)
echo "✓ OME API authentication configured"

# Configure OME Thumbnail proxy URL
if [ -z "$OME_THUMBNAIL_URL" ]; then
    echo "❌ ERROR: OME_THUMBNAIL_URL environment variable is required!"
    exit 1
fi
export OME_THUMBNAIL_PROXY_URL="${OME_THUMBNAIL_URL}"
echo "✓ OME Thumbnail proxy configured: ${OME_THUMBNAIL_URL}"

# Configure stream auth token (required)
if [ -z "$STREAM_AUTH_TOKEN" ]; then
    echo "❌ ERROR: STREAM_AUTH_TOKEN environment variable is required!"
    exit 1
fi
echo "✓ Stream authentication token configured"

# ============================================
# Public/Private Stream Configuration
# ============================================

# Public app name (the OME application that holds public streams via OVT pull)
if [ -z "$OME_APP_PUBLIC" ]; then
    echo "❌ ERROR: OME_APP_PUBLIC environment variable is required!"
    exit 1
fi
echo "✓ Public app configured: ${OME_APP_PUBLIC}"

# Unlisted app name (the OME application that holds unlisted/secret-link streams via Multiplex)
if [ -z "$OME_APP_UNLISTED" ]; then
    echo "❌ ERROR: OME_APP_UNLISTED environment variable is required!"
    exit 1
fi
echo "✓ Unlisted app configured: ${OME_APP_UNLISTED}"


# ============================================
# Nginx Configuration
# ============================================

# Substitute environment variables in nginx config
echo "✓ Configuring nginx with environment variables..."
envsubst '${OME_API_PROXY_URL} ${OME_API_TOKEN_BASE64} ${OME_THUMBNAIL_PROXY_URL} ${STREAM_AUTH_TOKEN} ${AUTH_COOKIE_HASH} ${ADMIN_PASSWORD_HASH} ${OME_APP_PUBLIC} ${OME_APP_UNLISTED} ${OME_VHOST} ${OME_APP} ${COOKIE_SECURE_FLAG}' < /etc/nginx/nginx.conf > /etc/nginx/nginx.conf.tmp
mv /etc/nginx/nginx.conf.tmp /etc/nginx/nginx.conf

# ============================================
# Runtime Configuration Injection
# ============================================

echo "✓ Injecting runtime configuration..."

# Create env-config.js with runtime variables
# NOTE: STREAM_AUTH_TOKEN is NOT included here (it's a secret fetched via /api/stream-token after auth)
cat > /usr/share/nginx/html/env-config.js << EOF
window.ENV_CONFIG = {
  OME_VHOST: "${OME_VHOST}",
  OME_APP: "${OME_APP}",
  OME_APP_PUBLIC: "${OME_APP_PUBLIC}",
  OME_APP_UNLISTED: "${OME_APP_UNLISTED}",
  OME_PROVIDER_WEBRTC_URL: "${OME_PROVIDER_WEBRTC_URL}",
  OME_PROVIDER_RTMP_URL: "${OME_PROVIDER_RTMP_URL}",
  OME_PROVIDER_SRT_URL: "${OME_PROVIDER_SRT_URL}",
  OME_PUBLISHER_WEBRTC_URL: "${OME_PUBLISHER_WEBRTC_URL}",
  OME_PUBLISHER_LLHLS_URL: "${OME_PUBLISHER_LLHLS_URL}",
};
EOF

# ============================================
# Validation
# ============================================

if [ -z "$OME_PROVIDER_WEBRTC_URL" ] || [ -z "$OME_PROVIDER_RTMP_URL" ] || [ -z "$OME_PROVIDER_SRT_URL" ]; then
    echo "❌ ERROR: OME_PROVIDER_WEBRTC_URL, OME_PROVIDER_RTMP_URL, and OME_PROVIDER_SRT_URL are required!"
    exit 1
fi

if [ -z "$OME_PUBLISHER_WEBRTC_URL" ] || [ -z "$OME_PUBLISHER_LLHLS_URL" ]; then
    echo "❌ ERROR: OME_PUBLISHER_WEBRTC_URL and OME_PUBLISHER_LLHLS_URL are required!"
    exit 1
fi

echo "✓ Configuration injected successfully"
echo "=== Starting Nginx ==="

# Execute CMD
exec "$@"
