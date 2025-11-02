# Build stage
FROM node:25-alpine AS build

# Accept build version argument
ARG BUILD_VERSION=dev

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application with version
RUN echo "Building version: ${BUILD_VERSION}" && \
    VITE_APP_VERSION=${BUILD_VERSION} pnpm build

# Production stage
FROM nginx:alpine

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Install apache2-utils for htpasswd
RUN apk add --no-cache apache2-utils

# Create entrypoint script to generate htpasswd from env vars
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
