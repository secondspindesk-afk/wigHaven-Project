/**
 * WebSocket Singleton Manager with Leader Election
 * 
 * PROBLEM SOLVED: Multiple tabs/components were creating their own WebSocket connections.
 * 
 * SOLUTION: 
 * 1. Leader Election: Only one tab (the leader) connects to the WebSocket.
 * 2. BroadcastChannel: The leader broadcasts all messages to other tabs.
 * 3. Shared Session: Uses localStorage for session consistency.
 */

import { tokenManager } from './tokenManager';
import { v4 as uuidv4 } from 'uuid';

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

// Reconnection config
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_DELAY = 1000;
const MAX_DELAY = 30000;
const HEARTBEAT_INTERVAL = 45000;
const HEARTBEAT_TIMEOUT = 90000;
const DISCONNECT_DEBOUNCE = 150;

// Leader Election Config
const LEADER_CHECK_INTERVAL = 2000;
const LEADER_LEASE_TIME = 5000;
const CHANNEL_NAME = 'wighaven_ws_sync';

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

    private tabId: string = uuidv4();
    private isLeader: boolean = false;
    private channel: BroadcastChannel | null = null;
    private leaderCheckInterval: NodeJS.Timeout | null = null;
    private lastMessageTimestamp: number = 0;

    constructor() {
        if (typeof window !== 'undefined') {
            this.channel = new BroadcastChannel(CHANNEL_NAME);
            this.channel.onmessage = this.handleChannelMessage.bind(this);
            this.startLeaderElection();
        }
    }

    /**
     * Leader Election Logic
     */
    private startLeaderElection() {
        this.checkLeadership();
        this.leaderCheckInterval = setInterval(() => this.checkLeadership(), LEADER_CHECK_INTERVAL);

        // Cleanup on tab close
        window.addEventListener('beforeunload', () => {
            if (this.isLeader) {
                localStorage.removeItem('ws_leader_id');
                localStorage.removeItem('ws_leader_lease');
                this.channel?.postMessage({ type: 'LEADER_STEP_DOWN' });
            }
        });
    }

    private checkLeadership() {
        const now = Date.now();
        const leaderId = localStorage.getItem('ws_leader_id');
        const leaseStr = localStorage.getItem('ws_leader_lease');
        const lease = leaseStr ? parseInt(leaseStr, 10) : 0;

        // If no leader or lease expired, try to become leader
        if (!leaderId || now > lease || leaderId === this.tabId) {
            this.becomeLeader();
        } else {
            this.becomeFollower();
        }
    }

    private becomeLeader() {
        if (!this.isLeader) {
            console.log(`[WebSocketManager] Tab ${this.tabId} became LEADER`);
            this.isLeader = true;
            // If we have subscribers, connect immediately
            if (this.state.subscribers.size > 0) {
                this.connect();
            }
        }
        // Renew lease
        localStorage.setItem('ws_leader_id', this.tabId);
        localStorage.setItem('ws_leader_lease', (Date.now() + LEADER_LEASE_TIME).toString());
    }

    private becomeFollower() {
        if (this.isLeader) {
            console.log(`[WebSocketManager] Tab ${this.tabId} became FOLLOWER`);
            this.isLeader = false;
            this.disconnect();
        }
    }

    private handleChannelMessage(event: MessageEvent) {
        const { type, data } = event.data;

        switch (type) {
            case 'WS_MESSAGE':
                this.broadcastToLocalSubscribers(data);
                break;
            case 'WS_CONNECTED':
                this.notifyLocalConnectHandlers();
                break;
            case 'LEADER_STEP_DOWN':
                this.checkLeadership();
                break;
        }
    }

    private broadcastToLocalSubscribers(message: any) {
        this.state.subscribers.forEach(handler => {
            try {
                handler(message);
            } catch (e) {
                console.error('[WebSocketManager] Local handler error:', e);
            }
        });
    }

    private notifyLocalConnectHandlers() {
        this.state.onConnectHandlers.forEach(handler => {
            try {
                handler();
            } catch (e) {
                console.error('[WebSocketManager] Local connect handler error:', e);
            }
        });
    }

    /**
     * Auth Helpers
     */
    private isTokenExpired(token: string): boolean {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
            const { exp } = JSON.parse(jsonPayload);
            return Date.now() >= (exp * 1000) - 10000;
        } catch {
            return true;
        }
    }

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

    private getReconnectDelay(attempt: number): number {
        const exponentialDelay = Math.min(BASE_DELAY * Math.pow(2, attempt), MAX_DELAY);
        const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
        return Math.floor(exponentialDelay + jitter);
    }

    /**
     * Connection Logic (Only for Leader)
     */
    async connect(): Promise<void> {
        if (!this.isLeader) return;

        if (this.state.disconnectTimeout) {
            clearTimeout(this.state.disconnectTimeout);
            this.state.disconnectTimeout = null;
        }

        if (this.state.ws?.readyState === WebSocket.OPEN || this.state.isConnecting) {
            return;
        }

        let token = tokenManager.getAccessToken();
        if (!token) return;

        if (this.isTokenExpired(token)) {
            const newToken = await this.refreshAuthToken();
            if (newToken) token = newToken;
            else return;
        }

        this.state.isConnecting = true;
        this.state.isIntentionalClose = false;

        try {
            let wsUrl = import.meta.env.VITE_WS_URL;
            if (!wsUrl) {
                const apiUrl = import.meta.env.VITE_API_URL;
                if (apiUrl) {
                    wsUrl = apiUrl.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
                } else {
                    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                    wsUrl = `${protocol}//${window.location.host}`;
                }
            }

            const ws = new WebSocket(`${wsUrl}/notifications`, ['access_token', token]);

            ws.onopen = () => {
                this.state.isConnecting = false;
                console.log('[WebSocketManager] LEADER connected');
                this.lastMessageTimestamp = Date.now();

                if (this.state.connectionTimeout) clearTimeout(this.state.connectionTimeout);
                this.state.connectionTimeout = setTimeout(() => {
                    this.state.reconnectAttempts = 0;
                }, 5000);

                // Notify local and other tabs
                this.notifyLocalConnectHandlers();
                this.channel?.postMessage({ type: 'WS_CONNECTED' });

                this.startHeartbeat(ws);
            };

            ws.onmessage = (event) => {
                try {
                    this.lastMessageTimestamp = Date.now();
                    const message = JSON.parse(event.data);
                    if (message.type === 'PONG') return;

                    // Broadcast to local and other tabs
                    this.broadcastToLocalSubscribers(message);
                    this.channel?.postMessage({ type: 'WS_MESSAGE', data: message });
                } catch (e) {
                    console.error('[WebSocketManager] Failed to parse message:', e);
                }
            };

            ws.onclose = (event) => {
                console.warn(`[WebSocketManager] LEADER closed: ${event.code}`);
                this.state.ws = null;
                this.state.isConnecting = false;
                this.stopHeartbeat();

                if (this.state.isIntentionalClose || event.code === 1000 || event.code === 1005) {
                    this.state.reconnectAttempts = 0;
                    return;
                }

                if (this.state.subscribers.size === 0) return;

                if (this.state.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                    console.error(`[WebSocketManager] Max reconnect attempts reached`);
                    return;
                }

                const delay = this.getReconnectDelay(this.state.reconnectAttempts);
                this.state.reconnectAttempts++;

                this.state.reconnectTimeout = setTimeout(() => {
                    if (this.isLeader && this.state.subscribers.size > 0) {
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

    private startHeartbeat(ws: WebSocket): void {
        this.stopHeartbeat();
        this.state.heartbeatInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
                const timeSinceLastMessage = Date.now() - this.lastMessageTimestamp;
                if (timeSinceLastMessage > HEARTBEAT_TIMEOUT) {
                    ws.close(4000, 'Heartbeat timeout');
                    return;
                }
                try {
                    ws.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
                } catch { }
            }
        }, HEARTBEAT_INTERVAL);
    }

    private stopHeartbeat(): void {
        if (this.state.heartbeatInterval) {
            clearInterval(this.state.heartbeatInterval);
            this.state.heartbeatInterval = null;
        }
    }

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

    subscribe(handler: MessageHandler): () => void {
        if (this.state.disconnectTimeout) {
            clearTimeout(this.state.disconnectTimeout);
            this.state.disconnectTimeout = null;
        }

        this.state.subscribers.add(handler);

        // Leader connects if first subscriber joins
        if (this.isLeader && this.state.subscribers.size >= 1 && !this.state.ws && !this.state.isConnecting) {
            this.connect();
        }

        return () => {
            this.state.subscribers.delete(handler);
            if (this.state.subscribers.size === 0) {
                this.state.disconnectTimeout = setTimeout(() => {
                    if (this.state.subscribers.size === 0) {
                        this.disconnect();
                    }
                }, DISCONNECT_DEBOUNCE);
            }
        };
    }

    onConnect(handler: ConnectionHandler): () => void {
        this.state.onConnectHandlers.add(handler);
        return () => {
            this.state.onConnectHandlers.delete(handler);
        };
    }

    isConnected(): boolean {
        // If we are follower, we consider ourselves "connected" if we are receiving messages
        // But for simplicity, we return true if we are leader and open, or if we are follower
        return this.isLeader ? this.state.ws?.readyState === WebSocket.OPEN : true;
    }

    destroy(): void {
        if (this.leaderCheckInterval) {
            clearInterval(this.leaderCheckInterval);
            this.leaderCheckInterval = null;
        }
        this.disconnect();
        if (this.channel) {
            this.channel.close();
        }
    }
}

export const wsManager = new WebSocketManager();
