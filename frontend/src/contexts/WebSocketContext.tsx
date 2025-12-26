import React, { createContext, useContext, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/lib/hooks/useUser';
import { useToast } from '@/contexts/ToastContext';
import { tokenManager } from '@/lib/utils/tokenManager';
import { WebSocketMessageSchema } from '@/lib/schemas/websocketSchemas';
import { wsManager } from '@/lib/utils/websocketManager';
import { NotificationsResponse, Notification } from '@/lib/api/notifications';
import debounce from 'lodash/debounce';

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
     * Optimized Query Invalidation
     * 
     * Collects all query keys received during the debounce window and invalidates
     * them all at once. This prevents missing updates when multiple messages
     * arrive in quick succession.
     */
    const pendingQueryKeysRef = useRef<Set<string>>(new Set());

    const processPendingInvalidations = useCallback(
        debounce(() => {
            const keysToInvalidate = Array.from(pendingQueryKeysRef.current);
            if (keysToInvalidate.length === 0) return;

            console.log(`🔄 [WebSocket] Processing ${keysToInvalidate.length} pending invalidations`);

            keysToInvalidate.forEach((keyStr) => {
                try {
                    const queryKey = JSON.parse(keyStr);
                    console.log('   - Invalidating:', queryKey);
                    queryClient.invalidateQueries({
                        queryKey,
                        refetchType: 'all'
                    });
                } catch (e) {
                    console.error('❌ [WebSocket] Failed to parse query key:', keyStr);
                }
            });

            pendingQueryKeysRef.current.clear();
            console.log('✅ [WebSocket] All pending queries invalidated');
        }, 500),
        [queryClient]
    );

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

            // Handle DATA_UPDATE (admin dashboard AND storefront)
            if (message.type === 'DATA_UPDATE') {
                console.log('📡 [WebSocket] Received DATA_UPDATE:', message.eventType, message.queryKeys);

                // Add all query keys to the pending set (as JSON strings for uniqueness)
                message.queryKeys.forEach(key => {
                    pendingQueryKeysRef.current.add(JSON.stringify(key));
                });

                // For stock/product events, also invalidate specific product if productId in metadata
                if (message.metadata?.productId &&
                    (message.eventType === 'stock' || message.eventType === 'products')) {
                    pendingQueryKeysRef.current.add(JSON.stringify(['product', message.metadata.productId]));
                }

                // For order events, also invalidate specific order if orderNumber in metadata
                if (message.metadata?.orderNumber && message.eventType === 'orders') {
                    pendingQueryKeysRef.current.add(JSON.stringify(['order', message.metadata.orderNumber]));
                }

                // Handle currency updates
                if (message.eventType === 'currency') {
                    pendingQueryKeysRef.current.add(JSON.stringify(['currency', 'rates']));
                }

                // Trigger debounced processing
                processPendingInvalidations();
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

            // Cache invalidation based on notification type - using debounced system
            switch (notification.type) {
                case 'payment':
                case 'order_payment_confirmed':
                case 'order_placed':
                case 'order_status':
                case 'order_cancelled':
                case 'order_refunded':
                    pendingQueryKeysRef.current.add(JSON.stringify(['orders']));
                    if (notification.data?.orderNumber) {
                        pendingQueryKeysRef.current.add(JSON.stringify(['order', notification.data.orderNumber]));
                    }
                    break;

                case 'back_in_stock':
                    if (notification.data?.productId) {
                        pendingQueryKeysRef.current.add(JSON.stringify(['product', notification.data.productId]));
                    }
                    pendingQueryKeysRef.current.add(JSON.stringify(['products']));
                    break;

                case 'review_approved':
                case 'review_rejected':
                    pendingQueryKeysRef.current.add(JSON.stringify(['reviews']));
                    if (notification.data?.productId) {
                        pendingQueryKeysRef.current.add(JSON.stringify(['product', notification.data.productId]));
                    }
                    break;

                case 'sale_alert':
                case 'promotional':
                    pendingQueryKeysRef.current.add(JSON.stringify(['products']));
                    break;

                case 'support_reply':
                case 'support_resolved':
                    pendingQueryKeysRef.current.add(JSON.stringify(['support']));
                    break;

                case 'admin_support_reply':
                    pendingQueryKeysRef.current.add(JSON.stringify(['admin', 'support']));
                    pendingQueryKeysRef.current.add(JSON.stringify(['support', 'ticket']));
                    break;

                default:
                    break;
            }

            // Trigger debounced processing
            processPendingInvalidations();

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
                queryClient.invalidateQueries({ queryKey: ['products'] });
                queryClient.invalidateQueries({ queryKey: ['categories'] });
                queryClient.invalidateQueries({ queryKey: ['public', 'banners'] });
                queryClient.invalidateQueries({ queryKey: ['reviews'] });
                queryClient.invalidateQueries({ queryKey: ['public', 'settings'] });

                if (userRoleRef.current === 'admin' || userRoleRef.current === 'super_admin') {
                    queryClient.invalidateQueries({ queryKey: ['admin'] });
                    queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
                    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'inventory-status'] });
                    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard', 'low-stock'] });
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

