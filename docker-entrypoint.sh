#!/bin/sh
set -e

echo "=== Deve Streaming Platform - Starting ==="

# Create .htpasswd from environment variables
if [ -n "$BASIC_AUTH_USERNAME" ] && [ -n "$BASIC_AUTH_PASSWORD" ]; then
    htpasswd -cb /etc/nginx/.htpasswd "$BASIC_AUTH_USERNAME" "$BASIC_AUTH_PASSWORD"
    echo "✓ Basic auth configured for user: $BASIC_AUTH_USERNAME"
else
    echo "⚠ WARNING: BASIC_AUTH_USERNAME and/or BASIC_AUTH_PASSWORD not set!"
    echo "⚠ Basic authentication will be disabled - creating dummy file"
    touch /etc/nginx/.htpasswd
fi

# Configure OME API proxy URL
if [ -z "$OME_API_URL" ]; then
    echo "❌ ERROR: OME_API_URL environment variable is required!"
    exit 1
fi
export OME_API_PROXY_URL="${OME_API_URL}"
echo "✓ OME API proxy configured: ${OME_API_URL}"

# Substitute environment variables in nginx config
echo "✓ Configuring nginx with environment variables..."
envsubst '${OME_API_PROXY_URL}' < /etc/nginx/nginx.conf > /etc/nginx/nginx.conf.tmp
mv /etc/nginx/nginx.conf.tmp /etc/nginx/nginx.conf

# Inject runtime environment variables into the built JavaScript
echo "✓ Injecting runtime configuration..."

# Create env-config.js with runtime variables
cat > /usr/share/nginx/html/env-config.js << EOF
window.ENV_CONFIG = {
  OME_API_TOKEN: "${OME_API_TOKEN}",
  OME_VHOST: "${OME_VHOST:-default}",
  OME_APP: "${OME_APP:-app}",
  OME_WEBRTC_URL: "${OME_WEBRTC_URL}",
  OME_RTMP_URL: "${OME_RTMP_URL}",
  OME_SRT_URL: "${OME_SRT_URL}",
};
EOF

# Validate required configuration
if [ -z "$OME_API_TOKEN" ]; then
    echo "❌ ERROR: OME_API_TOKEN environment variable is required!"
    exit 1
fi

if [ -z "$OME_WEBRTC_URL" ] || [ -z "$OME_RTMP_URL" ] || [ -z "$OME_SRT_URL" ]; then
    echo "❌ ERROR: OME_WEBRTC_URL, OME_RTMP_URL, and OME_SRT_URL are required!"
    exit 1
fi

echo "✓ Configuration injected successfully"
echo "=== Starting Nginx ==="

# Execute CMD
exec "$@"

