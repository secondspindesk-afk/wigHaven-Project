/**
 * WigHaven Gateway Worker
 * 
 * Cloudflare Worker that proxies requests to private HuggingFace Space backend.
 * Supports both HTTP requests and WebSocket connections.
 * 
 * Environment Variables (set via wrangler secret):
 * - HF_TOKEN: HuggingFace token for private space access
 * - PRIVATE_BACKEND_URL: Backend URL (set in wrangler.toml)
 */

export interface Env {
    HF_TOKEN: string;
    PRIVATE_BACKEND_URL: string;
}

// Headers to skip when proxying (hop-by-hop headers)
const SKIP_HEADERS = new Set([
    'host', 'connection', 'keep-alive', 'proxy-authenticate',
    'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade',
    'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor',
    'x-forwarded-for', 'x-forwarded-proto', 'x-real-ip'
]);

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);

        // Health check endpoint
        if (url.pathname === '/gateway-health') {
            return new Response(JSON.stringify({
                status: 'ok',
                service: 'wighaven-gateway-cf',
                version: '1.0.0',
                websocket: true
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check for WebSocket upgrade
        const upgradeHeader = request.headers.get('Upgrade');
        if (upgradeHeader?.toLowerCase() === 'websocket') {
            return handleWebSocket(request, env, url);
        }

        // Regular HTTP proxy
        return handleHTTP(request, env, url);
    }
};

/**
 * Handle regular HTTP requests - proxy to backend
 */
async function handleHTTP(request: Request, env: Env, url: URL): Promise<Response> {
    const targetUrl = `${env.PRIVATE_BACKEND_URL}${url.pathname}${url.search}`;

    // Build headers for upstream request
    const headers = new Headers();

    // Forward original headers, skip hop-by-hop
    for (const [key, value] of request.headers.entries()) {
        const keyLower = key.toLowerCase();
        if (!SKIP_HEADERS.has(keyLower)) {
            // Move Authorization to x-forwarded-auth for JWT passthrough
            if (keyLower === 'authorization') {
                headers.set('x-forwarded-auth', value);
            } else {
                headers.set(key, value);
            }
        }
    }

    // Also check x-auth-token and forward it
    const authToken = request.headers.get('x-auth-token');
    if (authToken && !headers.has('x-forwarded-auth')) {
        headers.set('x-forwarded-auth', `Bearer ${authToken}`);
    }

    // Add HF token for private space access
    if (env.HF_TOKEN) {
        headers.set('Authorization', `Bearer ${env.HF_TOKEN}`);
    }

    try {
        const response = await fetch(targetUrl, {
            method: request.method,
            headers,
            body: request.body,
            // @ts-ignore - Cloudflare-specific option
            duplex: 'half'
        });

        // Build response headers, skip hop-by-hop
        const responseHeaders = new Headers();
        for (const [key, value] of response.headers.entries()) {
            if (!SKIP_HEADERS.has(key.toLowerCase())) {
                responseHeaders.set(key, value);
            }
        }

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders
        });
    } catch (error) {
        console.error('Proxy error:', error);
        return new Response(JSON.stringify({
            error: 'Backend connection failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * Handle WebSocket upgrade - proxy to backend WebSocket
 */
async function handleWebSocket(request: Request, env: Env, url: URL): Promise<Response> {
    // Extract token from Sec-WebSocket-Protocol header
    const protocol = request.headers.get('sec-websocket-protocol');
    let token: string | null = null;

    if (protocol) {
        const parts = protocol.split(',').map(p => p.trim());
        if (parts.length >= 2 && parts[0] === 'access_token') {
            token = parts[1];
        }
    }

    // Build upstream WebSocket URL
    const backendUrl = env.PRIVATE_BACKEND_URL
        .replace('https://', 'wss://')
        .replace('http://', 'ws://');
    const targetUrl = `${backendUrl}${url.pathname}`;

    // Build headers for upstream WebSocket
    const headers = new Headers();

    // Forward token in protocol header
    if (token) {
        headers.set('Sec-WebSocket-Protocol', `access_token, ${token}`);
    }

    // Add HF token for private space access
    if (env.HF_TOKEN) {
        headers.set('Authorization', `Bearer ${env.HF_TOKEN}`);
    }

    try {
        // Connect to upstream WebSocket
        const upstreamResponse = await fetch(targetUrl, {
            headers,
            // @ts-ignore - Cloudflare WebSocket upgrade
            upgrade: 'websocket'
        });

        if (upstreamResponse.status !== 101) {
            return new Response('Upstream WebSocket connection failed', {
                status: 502
            });
        }

        // @ts-ignore - Cloudflare WebSocket
        const upstreamSocket = upstreamResponse.webSocket;
        if (!upstreamSocket) {
            return new Response('No WebSocket from upstream', { status: 502 });
        }

        // Accept the upstream connection
        upstreamSocket.accept();

        // Create WebSocket pair for client
        const [client, server] = Object.values(new WebSocketPair());

        // Accept the server side
        server.accept();

        // Bidirectional forwarding
        server.addEventListener('message', (event) => {
            try {
                upstreamSocket.send(event.data);
            } catch (e) {
                console.error('Error forwarding to upstream:', e);
            }
        });

        server.addEventListener('close', () => {
            upstreamSocket.close();
        });

        upstreamSocket.addEventListener('message', (event: MessageEvent) => {
            try {
                server.send(event.data);
            } catch (e) {
                console.error('Error forwarding to client:', e);
            }
        });

        upstreamSocket.addEventListener('close', () => {
            server.close();
        });

        // Return the client WebSocket with protocol if token was provided
        const responseHeaders = new Headers();
        if (token) {
            responseHeaders.set('Sec-WebSocket-Protocol', 'access_token');
        }

        return new Response(null, {
            status: 101,
            // @ts-ignore - Cloudflare WebSocket
            webSocket: client,
            headers: responseHeaders
        });

    } catch (error) {
        console.error('WebSocket proxy error:', error);
        return new Response('WebSocket connection failed', { status: 502 });
    }
}
