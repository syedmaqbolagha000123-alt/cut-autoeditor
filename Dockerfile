# Official Node.js Debian image with support for apt-get ffmpeg
FROM node:20-bookworm-slim

# Install system dependencies including FFmpeg and FFprobe
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set container working directory
WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Copy application source code
COPY . .

# Create required media directories
RUN mkdir -p temp exports projects cache demo-project

# Expose default HTTP port
EXPOSE 4000
ENV PORT=4000
ENV NODE_ENV=production

# Launch backend server directly
CMD ["node", "backend/server.js"]
