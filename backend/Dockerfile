# Use Node.js 18 as the base image
FROM node:18-bullseye-slim

# Set working directory (node user already exists with UID 1000 in this image)
WORKDIR /app

# Switch to the built-in 'node' user (UID 1000, required by Hugging Face)
# Install dependencies as root to avoid permission issues
COPY package*.json ./
RUN npm install --production --omit=dev

# Copy application code
COPY . .

# Fix permissions for the node user
RUN chown -R node:node /app

# Switch to non-root user
USER node

# Generate Prisma Client
RUN npx prisma generate

# Expose port 7860 (Required by Hugging Face Spaces)
EXPOSE 7860

# Set environment variables (can be overridden in Space settings)
ENV PORT=7860
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
