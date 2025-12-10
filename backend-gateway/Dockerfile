FROM node:18-bullseye-slim

WORKDIR /app

# Install dependencies as root to avoid permission issues
COPY package*.json ./
RUN npm install --production

# Copy application code
COPY . .

# Fix permissions for the node user
RUN chown -R node:node /app

# Switch to non-root user
USER node

EXPOSE 7860

ENV PORT=7860
ENV NODE_ENV=production

CMD ["node", "server.js"]
