import { z } from 'zod';

/**
 * Notification types matching backend NotificationTypes constant
 */
export const NotificationTypeSchema = z.enum([
    // User notifications
    'welcome',
    'order_placed',
    'order_payment_confirmed', // Added: Paystack webhook confirmation
    'order_status',
    'payment',
    'security',
    'review',
    'order_cancelled',
    'back_in_stock',
    'promotional',
    'order_refunded',
    'email_verified',
    'review_approved',
    'review_rejected',
    'sale_alert',
    'support_reply',    // Support ticket reply
    'support_resolved', // Support ticket resolved
    // Admin notifications
    'admin_new_order',
    'admin_low_stock',
    'admin_out_of_stock',
    'admin_new_review',
    'admin_payment_failed',
    'admin_milestone',
    'admin_support_reply',
]);

/**
 * Zod schema for WebSocket notification messages
 * Ensures type safety and validates incoming messages
 * Matches the Notification interface from ../api/notifications.ts
 */
export const NotificationSchema = z.object({
    id: z.string(),
    userId: z.string(),
    type: NotificationTypeSchema,
    title: z.string().min(1),
    message: z.string().min(1),
    link: z.string().optional(), // Matches API: link?: string
    isRead: z.boolean(),
    createdAt: z.string(),
    // WebSocket messages may include additional fields not in API response
    updatedAt: z.string().optional(),
    data: z.record(z.any()).optional() // For additional metadata
});

/**
 * Control message schema for WebSocket system messages
 */
export const ControlMessageSchema = z.object({
    type: z.literal('CONNECTED'),
    message: z.string()
});

/**
 * Force logout message schema for maintenance mode
 */
export const ForceLogoutMessageSchema = z.object({
    type: z.literal('FORCE_LOGOUT'),
    message: z.string(),
    reason: z.enum(['MAINTENANCE_MODE', 'SESSION_EXPIRED', 'ACCOUNT_DISABLED'])
});

/**
 * Data update message schema for real-time admin dashboard updates
 * Sent by backend when data changes, triggers cache invalidation
 */
export const DataUpdateMessageSchema = z.object({
    type: z.literal('DATA_UPDATE'),
    eventType: z.string(), // e.g., 'orders', 'products', 'users'
    queryKeys: z.array(z.array(z.string())), // React Query keys to invalidate
    metadata: z.record(z.any()).optional(),
    timestamp: z.string()
});

/**
 * PONG message schema for heartbeat responses from server
 * Received in response to client PING messages
 */
export const PongMessageSchema = z.object({
    type: z.literal('PONG'),
    timestamp: z.number(),
    clientTimestamp: z.number().optional()
});

/**
 * Union type for all possible WebSocket messages
 */
export const WebSocketMessageSchema = z.union([
    NotificationSchema,
    ControlMessageSchema,
    ForceLogoutMessageSchema,
    DataUpdateMessageSchema,
    PongMessageSchema
]);

/**
 * Type exports for TypeScript
 */
export type Notification = z.infer<typeof NotificationSchema>;
export type ControlMessage = z.infer<typeof ControlMessageSchema>;
export type ForceLogoutMessage = z.infer<typeof ForceLogoutMessageSchema>;
export type DataUpdateMessage = z.infer<typeof DataUpdateMessageSchema>;
export type PongMessage = z.infer<typeof PongMessageSchema>;
export type WebSocketMessage = z.infer<typeof WebSocketMessageSchema>;
