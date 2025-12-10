import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notificationService, { NotificationsResponse } from '../api/notifications';
import { useUser } from './useUser';
import { useToast } from '@/contexts/ToastContext';
import { tokenManager } from '@/lib/utils/tokenManager';
import { WebSocketMessageSchema, type Notification } from '@/lib/schemas/websocketSchemas';

// ============ LIGHTWEIGHT ROBUSTNESS ENHANCEMENTS ============
// Based on best practices for reliable WebSocket connections:
// 1. Exponential backoff with jitter - prevents thundering herd
// 2. Heartbeat ping/pong - detects dead connections early
// 3. Sync-on-reconnect - recovers missed messages without heavy infrastructure

export function useNotifications() {
    const queryClient = useQueryClient();
    const { data: user } = useUser();
    const { showToast } = useToast();
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
    const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
    const reconnectAttemptsRef = useRef(0);
    const isReconnectRef = useRef(false);

    // Reconnection config with exponential backoff
    const MAX_RECONNECT_ATTEMPTS = 10; // More attempts with backoff
    const BASE_DELAY = 1000; // Start at 1 second
    const MAX_DELAY = 30000; // Cap at 30 seconds
    const HEARTBEAT_INTERVAL = 30000; // Send heartbeat every 30 seconds

    /**
     * Calculate reconnection delay with exponential backoff and jitter
     * Prevents "thundering herd" when many clients try to reconnect simultaneously
     */
    const getReconnectDelay = useCallback((attempt: number): number => {
        // Exponential: 1s, 2s, 4s, 8s, 16s... capped at MAX_DELAY
        const exponentialDelay = Math.min(BASE_DELAY * Math.pow(2, attempt), MAX_DELAY);
        // Add jitter: ±25% randomization to distribute reconnection attempts
        const jitter = exponentialDelay * 0.25 * (Math.random() * 2 - 1);
        return Math.floor(exponentialDelay + jitter);
    }, []);

    /**
     * Sync data after reconnection to recover any missed updates
     * Lightweight: just invalidates queries, React Query handles the rest
     */
    const syncAfterReconnect = useCallback(() => {
        console.log('🔄 Syncing data after WebSocket reconnection...');

        // Invalidate critical queries that may have changed while disconnected
        // React Query will only refetch if the data is currently being used
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['orders'] });

        // For admins, also sync dashboard data
        if (user?.role === 'admin' || user?.role === 'super_admin') {
            queryClient.invalidateQueries({ queryKey: ['admin'] });
        }
    }, [queryClient, user?.role]);

    // Fetch initial notifications
    const { data, isLoading, error } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => notificationService.getNotifications(1),
        enabled: !!user,
        refetchInterval: false, // No polling! WebSocket handles real-time
    });

    // WebSocket Connection - Event-driven, no polling!
    useEffect(() => {
        if (!user) return;

        const connectWebSocket = () => {
            try {
                const token = tokenManager.getAccessToken();
                if (!token) return;

                // SECURITY ENHANCEMENT: Send token via Sec-WebSocket-Protocol header
                // instead of URL query parameter to prevent exposure in logs/history
                const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:5000';
                const ws = new WebSocket(`${wsUrl}/notifications`, ['access_token', token]);
                wsRef.current = ws;

                ws.onopen = () => {
                    const wasReconnect = isReconnectRef.current;
                    console.log(`✅ WebSocket connected${wasReconnect ? ' (reconnected)' : ''} with secure token transmission`);

                    // Reset reconnect counter on successful connection
                    reconnectAttemptsRef.current = 0;

                    // If this was a reconnection, sync data to recover missed messages
                    if (wasReconnect) {
                        syncAfterReconnect();
                        isReconnectRef.current = false;
                    }

                    // Start heartbeat to detect dead connections early
                    if (heartbeatIntervalRef.current) {
                        clearInterval(heartbeatIntervalRef.current);
                    }
                    heartbeatIntervalRef.current = setInterval(() => {
                        if (ws.readyState === WebSocket.OPEN) {
                            // Send lightweight ping - server will respond with pong
                            // This keeps the connection alive through proxies/NAT
                            try {
                                ws.send(JSON.stringify({ type: 'PING', timestamp: Date.now() }));
                            } catch {
                                // Connection already dead, will be handled by close event
                            }
                        }
                    }, HEARTBEAT_INTERVAL);
                };

                ws.onmessage = (event) => {
                    try {
                        const rawData = JSON.parse(event.data);

                        // VALIDATION: Validate message structure with Zod schema
                        const validationResult = WebSocketMessageSchema.safeParse(rawData);

                        if (!validationResult.success) {
                            console.error('❌ Invalid WebSocket message format:', validationResult.error.errors);
                            return;
                        }

                        const message = validationResult.data;

                        // Ignore control messages
                        if (message.type === 'CONNECTED') {
                            console.log('✅ WebSocket connected successfully');
                            return;
                        }

                        // Ignore PONG heartbeat responses (no action needed, just confirms connection is alive)
                        if (message.type === 'PONG') {
                            // Heartbeat response received - connection is alive
                            return;
                        }

                        // Handle force logout message (maintenance mode)
                        if (message.type === 'FORCE_LOGOUT') {
                            console.warn('🔒 Force logout received:', message.reason);
                            tokenManager.clearTokens();
                            sessionStorage.setItem('maintenanceMode', 'true');
                            showToast(message.message, 'warning');
                            // Redirect to login with maintenance flag
                            window.location.href = '/login?maintenance=true';
                            return;
                        }

                        // Handle DATA_UPDATE message (real-time admin dashboard updates)
                        if (message.type === 'DATA_UPDATE') {
                            console.log(`📊 DATA_UPDATE received: ${message.eventType}`, message.queryKeys);

                            // Invalidate each query key sent by the backend
                            message.queryKeys.forEach((queryKey: string[]) => {
                                queryClient.invalidateQueries({ queryKey });
                            });

                            // No toast for data updates - silent refresh
                            return;
                        }

                        // Type guard: message is now a Notification
                        const notification = message as Notification;
                        console.log('📬 Received notification:', notification.type);

                        // Update cache with new notification
                        queryClient.setQueryData<NotificationsResponse>(['notifications'], (old) => {
                            if (!old) return old;
                            return {
                                ...old,
                                data: [notification, ...old.data],
                                meta: {
                                    ...old.meta,
                                    total: old.meta.total + 1,
                                    unread: old.meta.unread + 1
                                }
                            };
                        });

                        // Handle specific notification types with cache invalidation
                        switch (notification.type) {
                            case 'order_payment_confirmed':
                            case 'order_placed':
                            case 'order_status':
                            case 'order_cancelled':
                            case 'order_refunded':
                                // Invalidate orders cache for real-time updates
                                queryClient.invalidateQueries({ queryKey: ['orders'] });
                                if (notification.data?.orderNumber) {
                                    queryClient.invalidateQueries({ queryKey: ['order', notification.data.orderNumber] });
                                }
                                break;

                            case 'back_in_stock':
                                // Refresh product data when items are back in stock
                                if (notification.data?.productId) {
                                    queryClient.invalidateQueries({ queryKey: ['product', notification.data.productId] });
                                }
                                queryClient.invalidateQueries({ queryKey: ['products'] });
                                break;

                            case 'review_approved':
                            case 'review_rejected':
                                // Refresh reviews when status changes
                                queryClient.invalidateQueries({ queryKey: ['reviews'] });
                                if (notification.data?.productId) {
                                    queryClient.invalidateQueries({ queryKey: ['product', notification.data.productId] });
                                }
                                break;

                            case 'sale_alert':
                            case 'promotional':
                                // Refresh product catalog for promotions
                                queryClient.invalidateQueries({ queryKey: ['products'] });
                                break;

                            // Default: no additional cache invalidation needed
                            default:
                                break;
                        }

                        // Show toast notification
                        showToast(notification.message, 'info');
                    } catch (err) {
                        console.error('❌ Error processing WebSocket message:', err);
                    }
                };

                ws.onerror = (error) => {
                    // In development with React Strict Mode, the first connection
                    // is intentionally closed, causing an expected error.
                    // Only log if this seems like a real issue
                    const isDevelopmentCleanup = ws.readyState === WebSocket.CLOSED &&
                        import.meta.env.DEV;

                    if (!isDevelopmentCleanup) {
                        console.error('❌ WebSocket error:', error);
                    }
                };

                ws.onclose = (event) => {
                    wsRef.current = null;

                    // Stop heartbeat
                    if (heartbeatIntervalRef.current) {
                        clearInterval(heartbeatIntervalRef.current);
                        heartbeatIntervalRef.current = undefined;
                    }

                    // Don't reconnect on normal closures or max attempts reached
                    const normalClosure = event.code === 1000 || event.code === 1005;
                    if (normalClosure) {
                        reconnectAttemptsRef.current = 0;
                        return;
                    }

                    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
                        console.error(`WebSocket max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
                        return;
                    }

                    // Mark this as a reconnection attempt (for sync-on-reconnect)
                    isReconnectRef.current = true;

                    // Exponential backoff with jitter
                    const delay = getReconnectDelay(reconnectAttemptsRef.current);
                    reconnectAttemptsRef.current++;

                    console.log(`⏳ WebSocket reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        if (user) connectWebSocket();
                    }, delay);
                };
            } catch (error) {
                console.error('Error connecting WebSocket:', error);
            }
        };

        connectWebSocket();

        return () => {
            // Clear any pending reconnection attempts
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = undefined;
            }

            // Clear heartbeat interval
            if (heartbeatIntervalRef.current) {
                clearInterval(heartbeatIntervalRef.current);
                heartbeatIntervalRef.current = undefined;
            }

            // Close WebSocket with normal closure code
            if (wsRef.current) {
                wsRef.current.close(1000, 'Component unmounted');
                wsRef.current = null;
            }

            // Reset counters
            reconnectAttemptsRef.current = 0;
            isReconnectRef.current = false;
        };
    }, [user, queryClient, showToast, getReconnectDelay, syncAfterReconnect]);

    // Mutations
    const markReadMutation = useMutation({
        mutationFn: notificationService.markAsRead,
        onSuccess: (_data, variables) => {
            queryClient.setQueryData<NotificationsResponse>(['notifications'], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    data: old.data.map((n) => n.id === variables ? { ...n, isRead: true } : n),
                    meta: {
                        ...old.meta,
                        unread: Math.max(0, old.meta.unread - 1)
                    }
                };
            });
        },
        onError: () => {
            showToast('Failed to mark as read', 'error');
        }
    });

    const markAllReadMutation = useMutation({
        mutationFn: notificationService.markAllAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            showToast('All notifications marked as read', 'success');
        },
        onError: () => {
            showToast('Failed to mark all as read', 'error');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: notificationService.deleteNotification,
        onSuccess: (_data, variables) => {
            queryClient.setQueryData<NotificationsResponse>(['notifications'], (old) => {
                if (!old) return old;
                const deleted = old.data.find((n) => n.id === variables);
                const wasUnread = deleted && !deleted.isRead;

                return {
                    ...old,
                    data: old.data.filter((n) => n.id !== variables),
                    meta: {
                        ...old.meta,
                        total: Math.max(0, old.meta.total - 1),
                        unread: wasUnread ? Math.max(0, old.meta.unread - 1) : old.meta.unread
                    }
                };
            });
            showToast('Notification deleted', 'success');
        },
        onError: () => {
            showToast('Failed to delete notification', 'error');
        }
    });

    const clearAllMutation = useMutation({
        mutationFn: notificationService.deleteAllNotifications,
        onSuccess: () => {
            queryClient.setQueryData<NotificationsResponse>(['notifications'], (old) => {
                if (!old) return old;
                return {
                    ...old,
                    data: [],
                    meta: { ...old.meta, total: 0, unread: 0 }
                };
            });
            showToast('All notifications cleared', 'success');
        },
        onError: () => {
            showToast('Failed to clear notifications', 'error');
        }
    });

    return {
        notifications: data?.data || [],
        meta: data?.meta,
        isLoading,
        error,
        markAsRead: markReadMutation.mutate,
        markAllAsRead: markAllReadMutation.mutate,
        deleteNotification: deleteMutation.mutate,
        clearAll: clearAllMutation.mutate
    };
}
