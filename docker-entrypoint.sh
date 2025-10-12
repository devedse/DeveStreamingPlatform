#!/bin/sh
set -e

echo "=== Deve Streaming Platform - Starting ==="

# Create .htpasswd from environment variables
if [ -n "$BASIC_AUTH_USERNAME" ] && [ -n "$BASIC_AUTH_PASSWORD" ]; then
    htpasswd -cb /etc/nginx/.htpasswd "$BASIC_AUTH_USERNAME" "$BASIC_AUTH_PASSWORD"
    echo "✓ Basic auth configured for user: $BASIC_AUTH_USERNAME"
else
    echo "⚠ WARNING: BASIC_AUTH_USERNAME and BASIC_AUTH_PASSWORD not set!"
    echo "⚠ Creating default credentials (admin/changeme)"
    htpasswd -cb /etc/nginx/.htpasswd "admin" "changeme"
fi

# Inject runtime environment variables into the built JavaScript
echo "✓ Injecting runtime configuration..."

# Create env-config.js with runtime variables
cat > /usr/share/nginx/html/env-config.js << EOF
window.ENV_CONFIG = {
  OME_API_URL: "${OME_API_URL:-}",
  OME_API_TOKEN: "${OME_API_TOKEN:-}",
  OME_VHOST: "${OME_VHOST:-default}",
  OME_APP: "${OME_APP:-app}",
  OME_WEBRTC_URL: "${OME_WEBRTC_URL:-}",
  OME_RTMP_URL: "${OME_RTMP_URL:-}",
  OME_SRT_URL: "${OME_SRT_URL:-}",
};
EOF

echo "✓ Configuration injected successfully"
echo "=== Starting Nginx ==="

# Execute CMD
exec "$@"

