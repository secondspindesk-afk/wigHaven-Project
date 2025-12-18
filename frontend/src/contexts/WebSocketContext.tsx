import React, { createContext, useContext, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/lib/hooks/useUser';
import { useToast } from '@/contexts/ToastContext';
import { tokenManager } from '@/lib/utils/tokenManager';
import { WebSocketMessageSchema } from '@/lib/schemas/websocketSchemas';
import { wsManager } from '@/lib/utils/websocketManager';
import { NotificationsResponse, Notification } from '@/lib/api/notifications';

/**
 * WebSocket Context
 * 
 * PROBLEM SOLVED: Before, each component calling useNotifications() registered its own
 * message handler, causing duplicate toasts and cache updates when multiple components
 * were mounted (e.g., 5 components = 5 toasts for 1 notification).
 * 
 * SOLUTION: This provider runs ONCE at app root and handles all WebSocket messages centrally.
 * Components just read notification data via useNotificationsData() hook.
 */

interface WebSocketContextType {
    isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({ isConnected: false });

export function useWebSocketStatus() {
    return useContext(WebSocketContext);
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
    const queryClient = useQueryClient();
    const { data: user } = useUser();
    const { showToast } = useToast();
    const isConnectedRef = useRef(false);
    const hasSubscribedRef = useRef(false);
    // Track if this is a RECONNECTION (not initial connection) to avoid spamming invalidations
    const hasConnectedOnceRef = useRef(false);
    // Store user role in ref to avoid callback recreation
    const userRoleRef = useRef(user?.role);
    userRoleRef.current = user?.role;

    /**
     * Handle incoming WebSocket messages - SINGLE HANDLER for entire app
     */
    const handleMessage = useCallback((rawData: unknown) => {
        try {
            const validationResult = WebSocketMessageSchema.safeParse(rawData);

            if (!validationResult.success) {
                console.error('❌ Invalid WebSocket message format:', validationResult.error.errors);
                return;
            }

            const message = validationResult.data;

            // Ignore control messages
            if (message.type === 'CONNECTED') {
                isConnectedRef.current = true;
                return;
            }

            if (message.type === 'PONG') {
                return;
            }

            // Handle force logout
            if (message.type === 'FORCE_LOGOUT') {
                // Force logout - clear tokens and redirect
                tokenManager.clearTokens();
                sessionStorage.setItem('maintenanceMode', 'true');
                showToast(message.message, 'warning');
                window.location.href = '/login?maintenance=true';
                return;
            }

            // Handle DATA_UPDATE (admin dashboard)
            if (message.type === 'DATA_UPDATE') {
                // Data update - invalidate queries
                message.queryKeys.forEach((queryKey: string[]) => {
                    queryClient.invalidateQueries({ queryKey });
                });
                return;
            }

            // Handle notification
            const notification = message as Notification;
            // Notification received

            // Update notifications cache
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

            // Cache invalidation based on notification type
            switch (notification.type) {
                case 'payment': // Backend uses NotificationTypes.PAYMENT for payment success
                case 'order_payment_confirmed':
                case 'order_placed':
                case 'order_status':
                case 'order_cancelled':
                case 'order_refunded':
                    queryClient.invalidateQueries({ queryKey: ['orders'] });
                    if (notification.data?.orderNumber) {
                        queryClient.invalidateQueries({ queryKey: ['order', notification.data.orderNumber] });
                    }
                    break;

                case 'back_in_stock':
                    if (notification.data?.productId) {
                        queryClient.invalidateQueries({ queryKey: ['product', notification.data.productId] });
                    }
                    queryClient.invalidateQueries({ queryKey: ['products'] });
                    break;

                case 'review_approved':
                case 'review_rejected':
                    queryClient.invalidateQueries({ queryKey: ['reviews'] });
                    if (notification.data?.productId) {
                        queryClient.invalidateQueries({ queryKey: ['product', notification.data.productId] });
                    }
                    break;

                case 'sale_alert':
                case 'promotional':
                    queryClient.invalidateQueries({ queryKey: ['products'] });
                    break;

                case 'support_reply':
                case 'support_resolved':
                    queryClient.invalidateQueries({ queryKey: ['support'] });
                    break;

                case 'admin_support_reply':
                    // User replied to ticket - refresh admin support list
                    queryClient.invalidateQueries({ queryKey: ['admin', 'support'] });
                    queryClient.invalidateQueries({ queryKey: ['support', 'ticket'] });
                    break;

                default:
                    break;
            }

            // Show toast - ONLY ONCE from this central handler!
            showToast(notification.message, 'info');
        } catch (err) {
            console.error('❌ Error processing WebSocket message:', err);
        }
    }, [queryClient, showToast]);

    // Store handleMessage in ref to avoid re-running useEffect when callback changes
    const handleMessageRef = useRef(handleMessage);
    handleMessageRef.current = handleMessage;

    // Subscribe to WebSocket - ONCE when user is available
    // Using refs for handlers to prevent dependency changes from triggering re-subscription
    useEffect(() => {
        if (!user) return;

        // Only subscribe once per component lifetime
        if (hasSubscribedRef.current) return;
        hasSubscribedRef.current = true;

        // Use stable wrapper that calls current ref value
        const stableMessageHandler = (data: unknown) => {
            handleMessageRef.current(data);
        };

        const unsubscribeMessages = wsManager.subscribe(stableMessageHandler);

        // STABLE onConnect handler - only sync on RECONNECTION, not initial connect
        // Uses refs to avoid dependency on user?.role which would cause infinite loops
        const unsubscribeConnect = wsManager.onConnect(() => {
            // Only sync if we've connected before (this is a RECONNECTION)
            if (hasConnectedOnceRef.current) {
                console.log('[WebSocket] Reconnected - syncing data');
                queryClient.invalidateQueries({ queryKey: ['notifications'] });
                queryClient.invalidateQueries({ queryKey: ['orders'] });

                if (userRoleRef.current === 'admin' || userRoleRef.current === 'super_admin') {
                    queryClient.invalidateQueries({ queryKey: ['admin'] });
                }
            }
            hasConnectedOnceRef.current = true;
        });

        return () => {
            // DON'T reset hasSubscribedRef - we want to stay subscribed across re-renders
            // Only cleanup subscriptions on unmount
            unsubscribeMessages();
            unsubscribeConnect();
        };
    }, [user, queryClient]); // Removed handleMessage - using ref instead

    return (
        <WebSocketContext.Provider value={{ isConnected: isConnectedRef.current }}>
            {children}
        </WebSocketContext.Provider>
    );
}

