#!/bin/sh
set -e

# Create .htpasswd from environment variables
if [ -n "$BASIC_AUTH_USERNAME" ] && [ -n "$BASIC_AUTH_PASSWORD" ]; then
    htpasswd -cb /etc/nginx/.htpasswd "$BASIC_AUTH_USERNAME" "$BASIC_AUTH_PASSWORD"
    echo "✓ Basic auth configured for user: $BASIC_AUTH_USERNAME"
else
    echo "⚠ WARNING: BASIC_AUTH_USERNAME and BASIC_AUTH_PASSWORD not set!"
    echo "⚠ Creating default credentials (admin/changeme)"
    htpasswd -cb /etc/nginx/.htpasswd "admin" "changeme"
fi

# Execute CMD
exec "$@"
