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

# Configure OME API authentication
if [ -z "$OME_API_TOKEN" ]; then
    echo "❌ ERROR: OME_API_TOKEN environment variable is required!"
    exit 1
fi
# Convert token to base64 for nginx Basic Auth header
export OME_API_TOKEN_BASE64=$(echo -n "$OME_API_TOKEN" | base64)
echo "✓ OME API authentication configured"

# Substitute environment variables in nginx config
echo "✓ Configuring nginx with environment variables..."
envsubst '${OME_API_PROXY_URL} ${OME_API_TOKEN_BASE64}' < /etc/nginx/nginx.conf > /etc/nginx/nginx.conf.tmp
mv /etc/nginx/nginx.conf.tmp /etc/nginx/nginx.conf

# Inject runtime environment variables into the built JavaScript
echo "✓ Injecting runtime configuration..."

# Create env-config.js with runtime variables
cat > /usr/share/nginx/html/env-config.js << EOF
window.ENV_CONFIG = {
  OME_VHOST: "${OME_VHOST:-default}",
  OME_APP: "${OME_APP:-app}",
  OME_PROVIDER_WEBRTC_URL: "${OME_PROVIDER_WEBRTC_URL}",
  OME_PROVIDER_RTMP_URL: "${OME_PROVIDER_RTMP_URL}",
  OME_PROVIDER_SRT_URL: "${OME_PROVIDER_SRT_URL}",
  OME_PUBLISHER_WEBRTC_URL: "${OME_PUBLISHER_WEBRTC_URL}",
  OME_PUBLISHER_LLHLS_URL: "${OME_PUBLISHER_LLHLS_URL}",
};
EOF

# Validate required configuration
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

