# WigHaven Gateway (Cloudflare Worker)

High-performance API gateway that proxies requests to the private HuggingFace Space backend.

## Features

- ✅ HTTP proxy with streaming
- ✅ WebSocket proxy for real-time notifications
- ✅ JWT passthrough via `x-forwarded-auth` header
- ✅ HF_TOKEN authentication for private space

## Setup

### 1. Install Dependencies
```bash
cd gateway-worker
npm install
```

### 2. Set HF_TOKEN Secret
```bash
wrangler secret put HF_TOKEN
# Paste your HuggingFace token when prompted
```

### 3. Deploy
```bash
npm run deploy
```

Your gateway will be available at:
`https://wighaven-gateway.<your-subdomain>.workers.dev`

## Development

```bash
npm run dev  # Run locally with wrangler
```

## Environment Variables

| Variable | Source | Description |
|----------|--------|-------------|
| `PRIVATE_BACKEND_URL` | wrangler.toml | HF backend URL |
| `HF_TOKEN` | wrangler secret | HF auth token (private) |
