import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import notificationService, { NotificationsResponse } from '../api/notifications';
import { useUser } from './useUser';
import { useToast } from '@/contexts/ToastContext';

/**
 * useNotifications - Data-only hook for notifications
 * 
 * ARCHITECTURE CHANGE:
 * - WebSocket subscription is now handled by WebSocketProvider at app root
 * - This hook only provides notification data and mutations
 * - Prevents duplicate handlers when multiple components use this hook
 */
export function useNotifications() {
    const queryClient = useQueryClient();
    const { data: user } = useUser();
    const { showToast } = useToast();

    // Fetch notifications (no polling - WebSocketProvider handles real-time updates)
    const { data, isLoading, error } = useQuery({
        queryKey: ['notifications'],
        queryFn: () => notificationService.getNotifications(1),
        enabled: !!user,
        refetchInterval: false,
        staleTime: 30 * 1000, // 30 seconds - prevents duplicate fetches on mount
        refetchOnMount: false, // Only fetch once on initial mount
    });

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
