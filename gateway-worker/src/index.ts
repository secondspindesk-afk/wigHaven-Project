/**
 * WigHaven Gateway Worker
 * 
 * Cloudflare Worker that proxies requests to private HuggingFace Space backend.
 * Supports both HTTP requests and WebSocket connections.
 */

export interface Env {
    HF_TOKEN: string;
    PRIVATE_BACKEND_URL: string;
}

// CORS headers for browser requests
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-auth-token, x-forwarded-auth, x-session-id, x-request-id, cache-control, pragma, accept, origin, referer, user-agent',
    'Access-Control-Max-Age': '86400',
};

// Headers to skip when proxying
const SKIP_HEADERS = new Set([
    'host', 'connection', 'keep-alive', 'proxy-authenticate',
    'proxy-authorization', 'te', 'trailer', 'transfer-encoding',
    'cf-connecting-ip', 'cf-ipcountry', 'cf-ray', 'cf-visitor',
    'x-forwarded-for', 'x-forwarded-proto', 'x-real-ip'
]);

export default {
    async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
        const url = new URL(request.url);

        // Handle CORS preflight requests
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: corsHeaders
            });
        }

        // Health check endpoint
        if (url.pathname === '/gateway-health') {
            return new Response(JSON.stringify({
                status: 'ok',
                service: 'wighaven-gateway-cf',
                version: '1.3.0',
                websocket: true
            }), {
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }

        // Check for WebSocket upgrade
        const upgradeHeader = request.headers.get('Upgrade');
        if (upgradeHeader?.toLowerCase() === 'websocket') {
            return handleWebSocket(request, env, url);
        }

        // Regular HTTP proxy
        return handleHTTP(request, env, url);
    },

    /**
     * Background Heartbeat - runs on a schedule to keep HF Space awake.
     * This runs independently of the fetch handler and doesn't affect user performance.
     */
    async scheduled(event: any, env: Env, ctx: ExecutionContext) {
        const healthUrl = `${env.PRIVATE_BACKEND_URL}/gateway-health`;
        // Background heartbeat - errors logged only on failure
        ctx.waitUntil(
            fetch(healthUrl, {
                headers: { 'Authorization': `Bearer ${env.HF_TOKEN}` }
            }).catch(() => { /* Heartbeat failed - HF may be cold */ })
        );
    }
};

/**
 * Handle regular HTTP requests - proxy to backend
 */
async function handleHTTP(request: Request, env: Env, url: URL): Promise<Response> {
    const targetUrl = `${env.PRIVATE_BACKEND_URL}${url.pathname}${url.search}`;

    const headers = new Headers();

    for (const [key, value] of request.headers.entries()) {
        const keyLower = key.toLowerCase();
        if (!SKIP_HEADERS.has(keyLower)) {
            if (keyLower === 'authorization') {
                headers.set('x-forwarded-auth', value);
            } else {
                headers.set(key, value);
            }
        }
    }

    const authToken = request.headers.get('x-auth-token');
    if (authToken && !headers.has('x-forwarded-auth')) {
        headers.set('x-forwarded-auth', `Bearer ${authToken}`);
    }

    if (env.HF_TOKEN) {
        headers.set('Authorization', `Bearer ${env.HF_TOKEN}`);
    }

    try {
        const response = await fetch(targetUrl, {
            method: request.method,
            headers,
            body: request.body,
        });

        // Build response with CORS headers
        const responseHeaders = new Headers();

        // Add CORS headers first
        for (const [key, value] of Object.entries(corsHeaders)) {
            responseHeaders.set(key, value);
        }

        // Copy response headers (skip hop-by-hop)
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
        // Log only critical proxy errors
        return new Response(JSON.stringify({
            error: 'Backend connection failed',
            message: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 502,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }
}

/**
 * Handle WebSocket upgrade - proxy to backend WebSocket
 */
async function handleWebSocket(request: Request, env: Env, url: URL): Promise<Response> {
    const protocol = request.headers.get('sec-websocket-protocol');
    let token: string | null = null;

    if (protocol) {
        const parts = protocol.split(',').map(p => p.trim());
        if (parts.length >= 2 && parts[0] === 'access_token') {
            token = parts[1];
        }
    }

    const backendUrl = env.PRIVATE_BACKEND_URL
        .replace('https://', 'wss://')
        .replace('http://', 'ws://');
    const targetUrl = `${backendUrl}${url.pathname}`;

    // WebSocket proxy - no logging in hot path

    const upstreamHeaders = new Headers();

    if (token) {
        upstreamHeaders.set('Sec-WebSocket-Protocol', `access_token, ${token}`);
    }

    if (env.HF_TOKEN) {
        upstreamHeaders.set('Authorization', `Bearer ${env.HF_TOKEN}`);
    }

    try {
        const upstreamResponse = await fetch(targetUrl, {
            headers: upstreamHeaders,
        });

        if (upstreamResponse.status !== 101) {
            return new Response(`Upstream WebSocket failed: ${upstreamResponse.status}`, {
                status: 502,
                headers: corsHeaders
            });
        }

        // @ts-ignore - Cloudflare-specific API
        const upstreamWs = upstreamResponse.webSocket;
        if (!upstreamWs) {
            return new Response('No WebSocket from upstream', {
                status: 502,
                headers: corsHeaders
            });
        }

        upstreamWs.accept();

        const pair = new WebSocketPair();
        const [clientWs, serverWs] = Object.values(pair);

        serverWs.accept();

        serverWs.addEventListener('message', (event: MessageEvent) => {
            try {
                if (upstreamWs.readyState === WebSocket.OPEN) {
                    upstreamWs.send(event.data);
                }
            } catch { /* Connection closed */ }
        });

        serverWs.addEventListener('close', (event: CloseEvent) => {
            upstreamWs.close(event.code, event.reason);
        });

        upstreamWs.addEventListener('message', (event: MessageEvent) => {
            try {
                if (serverWs.readyState === WebSocket.OPEN) {
                    serverWs.send(event.data);
                }
            } catch { /* Connection closed */ }
        });

        upstreamWs.addEventListener('close', (event: CloseEvent) => {
            serverWs.close(event.code, event.reason);
        });

        const responseHeaders = new Headers();
        if (token) {
            responseHeaders.set('Sec-WebSocket-Protocol', 'access_token');
        }

        return new Response(null, {
            status: 101,
            statusText: 'Switching Protocols',
            // @ts-ignore - Cloudflare-specific API
            webSocket: clientWs,
            headers: responseHeaders
        });

    } catch (error) {
        return new Response(`WebSocket connection failed: ${error instanceof Error ? error.message : 'Unknown'}`, {
            status: 502,
            headers: corsHeaders
        });
    }
}
