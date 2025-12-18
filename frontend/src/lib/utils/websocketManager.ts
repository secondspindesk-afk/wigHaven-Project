/**
 * WebSocket Singleton Manager
 * 
 * PROBLEM SOLVED: Multiple components using useNotifications() were each creating
 * their own WebSocket connections, leading to 14+ connections for the same user.
 * 
 * SOLUTION: This singleton manager ensures only ONE WebSocket connection exists
 * per browser tab, regardless of how many components use notifications.
 * 
 * Architecture:
 * - Single WebSocket instance managed centrally
 * - Components subscribe/unsubscribe to messages
 * - Connection lifecycle managed independently of React component lifecycle
 * - Automatic reconnection with exponential backoff
 */

import { tokenManager } from './tokenManager';

type MessageHandler = (message: unknown) => void;
type ConnectionHandler = () => void;

interface WebSocketManagerState {
    ws: WebSocket | null;
    subscribers: Set<MessageHandler>;
    onConnectHandlers: Set<ConnectionHandler>;
    reconnectAttempts: number;
    reconnectTimeout: NodeJS.Timeout | null;
    heartbeatInterval: NodeJS.Timeout | null;
    disconnectTimeout: NodeJS.Timeout | null;
    connectionTimeout: NodeJS.Timeout | null;
    isIntentionalClose: boolean;
    isConnecting: boolean;
}

// Reconnection config with exponential backoff
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_DELAY = 1000;
const MAX_DELAY = 30000;
const HEARTBEAT_INTERVAL = 30000;
const DISCONNECT_DEBOUNCE = 150;

class WebSocketManager {
    private state: WebSocketManagerState = {
        ws: null,
        subscribers: new Set(),
        onConnectHandlers: new Set(),
        reconnectAttempts: 0,
        reconnectTimeout: null,
        heartbeatInterval: null,
        disconnectTimeout: null,
        connectionTimeout: null,
        isIntentionalClose: false,
        isConnecting: false,
    };

    // Track last message time for activity monitoring
    private lastMessageTimestamp: number = 0;

    /**
     * Helper: Check if JWT is expired
     */
    private isTokenExpired(token: string): boolean {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const { exp } = JSON.parse(jsonPayload);
            // Expire 10 seconds early to be safe
            return Date.now() >= (exp * 1000) - 10000;
        } catch {
            return true;
        }
    }

    /**
     * Helper: Refresh Auth Token
     */
    private async refreshAuthToken(): Promise<string | null> {
        const refreshToken = tokenManager.getRefreshToken();
        if (!refreshToken) return null;

        try {
            const apiUrl = import.meta.env.VITE_API_URL || '';
            const response = await fetch(`${apiUrl}/api/auth/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });

            if (!response.ok) throw new Error('Refresh failed');

            const data = await response.json();
            const { accessToken, refreshToken: newRefreshToken } = data.data;

            if (accessToken) {
                tokenManager.setTokens(accessToken, newRefreshToken || refreshToken);
                return accessToken;
            }
            return null;
        } catch (e) {
            console.error('[WebSocketManager] Token refresh failed:', e);
            return null;
        }
    }

    /**
     * Calculate reconnection delay with exponential backoff and jitter
     */
    private getReconnectDelay(attempt: number): number {
        const exponentialDelay = Math.min(BASE_DELAY * Math.pow(2, attempt), MAX_DELAY);
        const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
        return Math.floor(exponentialDelay + jitter);
    }

    /**
     * Connect to WebSocket server (if not already connected)
     */
    async connect(): Promise<void> {
        // Cancel any pending disconnect (React Strict Mode re-mount)
        if (this.state.disconnectTimeout) {
            clearTimeout(this.state.disconnectTimeout);
            this.state.disconnectTimeout = null;
        }

        // Already connected or connecting
        if (this.state.ws?.readyState === WebSocket.OPEN || this.state.isConnecting) {
            return;
        }

        let token = tokenManager.getAccessToken();
        if (!token) return;

        // Check expiry and refresh if needed
        if (this.isTokenExpired(token)) {
            console.log('[WebSocketManager] Token expired, attempting refresh...');
            const newToken = await this.refreshAuthToken();
            if (newToken) {
                token = newToken;
            } else {
                console.warn('[WebSocketManager] Failed to refresh token. Aborting connection.');
                // Clear tokens to prevent infinite retry loops
                // tokenManager.clearTokens(); // Optional: might be too aggressive if API is down
                return;
            }
        }

        this.state.isConnecting = true;
        this.state.isIntentionalClose = false;

        try {
            // Auto-derive WebSocket URL from API URL (which points to gateway)
            // Gateway now supports WebSocket proxy, so we use the same URL
            let wsUrl = import.meta.env.VITE_WS_URL;

            if (!wsUrl) {
                const apiUrl = import.meta.env.VITE_API_URL;
                if (apiUrl) {
                    // Convert https:// to wss:// or http:// to ws://
                    wsUrl = apiUrl
                        .replace(/^https:/, 'wss:')
                        .replace(/^http:/, 'ws:');
                } else {
                    // Fallback to current origin with proper protocol
                    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                    wsUrl = `${protocol}//${window.location.host}`;
                }
            }

            const ws = new WebSocket(`${wsUrl}/notifications`, ['access_token', token]);

            ws.onopen = () => {
                // Don't log URL for security
                this.state.isConnecting = false;
                console.log('[WebSocketManager] Connection opened - Waiting for stability...');

                // Reset activity timer
                this.lastMessageTimestamp = Date.now();

                // STABILITY CHECK: Don't reset attempts immediately.
                // Only consider it a "success" if it stays connected for 5 seconds.
                // This prevents "death spirals" where it connects -> fails immediately -> retries immediately.
                if (this.state.connectionTimeout) clearTimeout(this.state.connectionTimeout);

                this.state.connectionTimeout = setTimeout(() => {
                    console.log('[WebSocketManager] Connection stabilized - Resetting attempts');
                    this.state.reconnectAttempts = 0;
                }, 5000);

                // Notify all connect handlers
                // Note: We intentionally call this immediately on open to sync state,
                // trusting the WebSocketContext to handle de-duplication/logic.
                this.state.onConnectHandlers.forEach(handler => {
                    try {
                        handler();
                    } catch (e) {
                        console.error('[WebSocketManager] Connect handler error:', e);
                    }
                });

                // Start heartbeat
                this.startHeartbeat(ws);
            };

            ws.onmessage = (event) => {
                try {
                    // Update activity timestamp on ANY message (including PONG)
                    this.lastMessageTimestamp = Date.now();

                    const message = JSON.parse(event.data);

                    // PONG is just a heartbeat response, no need to broadcast
                    if (message.type === 'PONG') {
                        return;
                    }

                    // Broadcast message to all subscribers
                    this.state.subscribers.forEach(handler => {
                        try {
                            handler(message);
                        } catch (e) {
                            console.error('[WebSocketManager] Message handler error:', e);
                        }
                    });
                } catch (e) {
                    console.error('[WebSocketManager] Failed to parse message:', e);
                }
            };

            ws.onerror = () => {
                this.state.isConnecting = false;
            };

            ws.onclose = (event) => {
                console.warn(`[WebSocketManager] Closed: Code ${event.code}, Reason: "${event.reason || 'None'}"`);

                // If we closed before stability check, cancel the success reset
                if (this.state.connectionTimeout) {
                    clearTimeout(this.state.connectionTimeout);
                    this.state.connectionTimeout = null;
                }

                this.state.ws = null;
                this.state.isConnecting = false;
                this.stopHeartbeat();

                // Don't reconnect on intentional close or normal closure
                if (this.state.isIntentionalClose || event.code === 1000 || event.code === 1005) {
                    this.state.reconnectAttempts = 0;
                    return;
                }

                // Don't reconnect if no subscribers
                if (this.state.subscribers.size === 0) {
                    return;
                }

                // Don't reconnect if max attempts reached
                if (this.state.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                    console.error(`[WebSocketManager] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
                    return;
                }

                // Schedule reconnection with exponential backoff

                const delay = this.getReconnectDelay(this.state.reconnectAttempts);
                this.state.reconnectAttempts++;

                // Reconnection logging disabled for security

                this.state.reconnectTimeout = setTimeout(() => {
                    if (this.state.subscribers.size > 0) {
                        this.connect();
                    }
                }, delay);
            };

            this.state.ws = ws;
        } catch (error) {
            console.error('[WebSocketManager] Connection error:', error);
            this.state.isConnecting = false;
        }
    }

    /**
     * Start heartbeat to keep connection alive through proxies/NAT
     */
    private startHeartbeat(ws: WebSocket): void {
        this.stopHeartbeat();

        this.state.heartbeatInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                // Check if connection is dead (no messages for > 45s)
                const timeSinceLastMessage = Date.now() - this.lastMessageTimestamp;

                if (timeSinceLastMessage > 45000) {
                    // Connection is dead (no activity for > 45s)
                    // We force close to trigger the robust reconnection logic
                    ws.close(4000, 'Heartbeat timeout');
                    return;
                }
            }

            try {
                ws.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
            } catch {
                // Ignored
            }
        }, HEARTBEAT_INTERVAL);
    }

    /**
     * Stop heartbeat interval
     */
    private stopHeartbeat(): void {
        if (this.state.heartbeatInterval) {
            clearInterval(this.state.heartbeatInterval);
            this.state.heartbeatInterval = null;
        }
    }

    /**
     * Disconnect WebSocket (intentionally)
     */
    disconnect(): void {
        this.state.isIntentionalClose = true;

        if (this.state.reconnectTimeout) {
            clearTimeout(this.state.reconnectTimeout);
            this.state.reconnectTimeout = null;
        }

        this.stopHeartbeat();

        if (this.state.ws && this.state.ws.readyState === WebSocket.OPEN) {
            this.state.ws.close(1000, 'Intentional disconnect');
        }
        this.state.ws = null;

        this.state.reconnectAttempts = 0;
        this.state.isConnecting = false;
    }

    /**
     * Subscribe to WebSocket messages
     */
    subscribe(handler: MessageHandler): () => void {
        // Cancel any pending disconnect (React Strict Mode re-mount)
        if (this.state.disconnectTimeout) {
            clearTimeout(this.state.disconnectTimeout);
            this.state.disconnectTimeout = null;
        }

        this.state.subscribers.add(handler);

        // Auto-connect when first subscriber joins
        if (this.state.subscribers.size >= 1 && !this.state.ws && !this.state.isConnecting) {
            this.connect();
        }

        // Return unsubscribe function
        return () => {
            this.state.subscribers.delete(handler);

            // Debounced disconnect - allows React Strict Mode re-mount to cancel
            if (this.state.subscribers.size === 0) {
                this.state.disconnectTimeout = setTimeout(() => {
                    if (this.state.subscribers.size === 0) {
                        this.disconnect();
                    }
                }, DISCONNECT_DEBOUNCE);
            }
        };
    }

    /**
     * Register handler to be called on each successful connection
     * NOTE: Handler is ONLY called on actual reconnection events, NOT immediately on subscription
     * This prevents infinite loops when React useEffect re-runs with new callback references
     */
    onConnect(handler: ConnectionHandler): () => void {
        this.state.onConnectHandlers.add(handler);

        // REMOVED: Immediate call when already connected
        // This was causing infinite loops because:
        // 1. useEffect subscribes with wsManager.onConnect(handler)
        // 2. If WS is open, handler was called immediately
        // 3. Handler invalidates queries → component re-renders
        // 4. useEffect re-runs with new callback reference → subscribes again → handler called again → LOOP!
        //
        // Now handlers are ONLY called when WebSocket actually reconnects,
        // which is the intended behavior for syncing data after reconnection.

        return () => {
            this.state.onConnectHandlers.delete(handler);
        };
    }

    /**
     * Check if WebSocket is connected
     */
    isConnected(): boolean {
        return this.state.ws?.readyState === WebSocket.OPEN;
    }

    /**
     * Get current subscriber count (for debugging)
     */
    getSubscriberCount(): number {
        return this.state.subscribers.size;
    }
}

// Export singleton instance
export const wsManager = new WebSocketManager();
