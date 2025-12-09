import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notificationService, { NotificationsResponse } from '../api/notifications';
import { useUser } from './useUser';
import { useToast } from '@/contexts/ToastContext';
import { tokenManager } from '@/lib/utils/tokenManager';
import { WebSocketMessageSchema, type Notification } from '@/lib/schemas/websocketSchemas';

export function useNotifications() {
    const queryClient = useQueryClient();
    const { data: user } = useUser();
    const { showToast } = useToast();
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
    const reconnectAttemptsRef = useRef(0);
    const MAX_RECONNECT_ATTEMPTS = 3;
    const RECONNECT_DELAY = 5000;

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
                    console.log('✅ WebSocket connected with secure token transmission');
                    // Reset reconnect counter on successful connection
                    reconnectAttemptsRef.current = 0;
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

                    // Abnormal closure - attempt reconnect
                    reconnectAttemptsRef.current++;

                    reconnectTimeoutRef.current = setTimeout(() => {
                        if (user) connectWebSocket();
                    }, RECONNECT_DELAY);
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

            // Close WebSocket with normal closure code
            if (wsRef.current) {
                wsRef.current.close(1000, 'Component unmounted');
                wsRef.current = null;
            }

            // Reset reconnect counter
            reconnectAttemptsRef.current = 0;
        };
    }, [user, queryClient]);

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
