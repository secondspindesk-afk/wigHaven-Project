import { WebSocketServer } from 'ws';
import { verifyToken } from '../utils/tokenUtils.js';
import logger from '../utils/logger.js';


// Rate limiting: Track connection attempts per IP
const connectionAttempts = new Map(); // IP -> { count, resetTime }
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_CONNECTION_ATTEMPTS = 10; // 10 attempts per minute

// Map to store active connections: userId -> Set<WebSocket>
const clients = new Map();

// Map to store admin connections: userId -> { role, sockets: Set<WebSocket> }
// Used for real-time admin dashboard updates
const adminClients = new Map();

/**
 * Initialize WebSocket Server
 * @param {Object} server - HTTP Server instance
 */
export const initializeWebSocket = (server) => {
    const wss = new WebSocketServer({
        noServer: true,
        // Handle protocol selection during handshake
        handleProtocols: (protocols, request) => {
            // protocols is a Set of protocol strings sent by client
            // We accept 'access_token' if present
            if (protocols.has('access_token')) {
                return 'access_token';
            }
            // Reject if access_token not in protocols
            return false;
        }
    });

    // Start rate limit cleanup interval (every 5 minutes)
    // This replaces the O(N) cleanup on every request which could be a DoS vector
    const cleanupInterval = setInterval(() => {
        const now = Date.now();
        for (const [ip, data] of connectionAttempts.entries()) {
            if (now > data.resetTime) {
                connectionAttempts.delete(ip);
            }
        }
    }, 5 * 60 * 1000);

    server.on('upgrade', (request, socket, head) => {
        // RATE LIMITING: Check limits without heavy cleanup
        const clientIp = request.socket.remoteAddress || 'unknown';
        const now = Date.now();
        // ... (Cleanup is now handled by interval)

        // Check rate limit
        const attemptData = connectionAttempts.get(clientIp);
        if (attemptData) {
            // Reset count if window passed (lazy cleanup for active IPs)
            if (now > attemptData.resetTime) {
                attemptData.count = 1;
                attemptData.resetTime = now + RATE_LIMIT_WINDOW_MS;
            } else if (attemptData.count >= MAX_CONNECTION_ATTEMPTS) {
                logger.warn(`Rate limit exceeded for IP: ${clientIp}`);
                socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
                socket.destroy();
                return;
            } else {
                attemptData.count++;
            }
        } else {
            connectionAttempts.set(clientIp, {
                count: 1,
                resetTime: now + RATE_LIMIT_WINDOW_MS
            });
        }

        // SECURITY: Validate origin to prevent unauthorized WebSocket connections
        const origin = request.headers.origin;
        const allowedOrigins = [
            'http://localhost:5173',       // Development frontend
            'http://localhost:3000',       // Alternative dev port
            process.env.FRONTEND_URL       // Production frontend
        ].filter(Boolean); // Remove undefined values

        if (origin && !allowedOrigins.includes(origin)) {
            logger.warn(`WebSocket connection rejected from unauthorized origin: ${origin}`);
            socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
            socket.destroy();
            return;
        }

        const parsedUrl = new URL(request.url, `http://${request.headers.host}`);
        const { pathname } = parsedUrl;

        if (pathname === '/notifications') {
            // SECURITY: Read token from Sec-WebSocket-Protocol
            const protocols = request.headers['sec-websocket-protocol'];
            let token = null;

            if (protocols) {
                const protocolList = protocols.split(',').map(p => p.trim());
                if (protocolList[0] === 'access_token' && protocolList[1]) {
                    token = protocolList[1];
                }
            }

            if (!token) {
                logger.warn('WebSocket connection rejected: missing or invalid token in protocol header');
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
                return;
            }

            try {
                const decoded = verifyToken(token);
                const userId = decoded.sub;

                wss.handleUpgrade(request, socket, head, (ws) => {
                    wss.emit('connection', ws, request, userId);
                });
            } catch (error) {
                // Log strictly as warning for specific errors, error for unknown
                if (error.message === 'Token expired') {
                    logger.warn(`WebSocket auth failed (Expired): User may need to refresh`);
                } else {
                    logger.error(`WebSocket auth failed: ${error.message}`);
                }
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
            }
        } else {
            socket.destroy();
        }
    });

    wss.on('connection', async (ws, request, userId) => {
        logger.info(`✅ WebSocket connected for user: ${userId}`);

        // Add to clients map
        if (!clients.has(userId)) {
            clients.set(userId, new Set());
        }
        clients.get(userId).add(ws);

        // Check if user is admin/super_admin
        try {
            const { getPrisma } = await import('./database.js');
            const prisma = getPrisma();
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { role: true }
            });

            if (user && (user.role === 'admin' || user.role === 'super_admin')) {
                if (!adminClients.has(userId)) {
                    adminClients.set(userId, { role: user.role, sockets: new Set() });
                }
                adminClients.get(userId).sockets.add(ws);
                logger.info(`📊 Admin ${user.role} connected to dashboard updates: ${userId}`);
            }
        } catch (err) {
            logger.warn(`Could not check admin status for ${userId}: ${err.message}`);
        }

        // HEARBEAT: Initialize isAlive
        // We rely on Client PING -> Server PONG to keep connection alive
        ws.isAlive = true;

        // Handle client messages
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());

                // Client PING is the source of truth for connection health
                if (message.type === 'PING') {
                    ws.isAlive = true;
                    // Respond with PONG to satisfy APP-LEVEL heartbeat
                    ws.send(JSON.stringify({
                        type: 'PONG',
                        timestamp: Date.now(),
                        clientTimestamp: message.timestamp
                    }));
                }
            } catch (err) {
                // Ignore malformed messages
            }
        });

        // Send welcome message
        ws.send(JSON.stringify({
            type: 'CONNECTED',
            message: 'Real-time notifications active'
        }));

        ws.on('close', () => {
            // ... Clean up maps (existing code handles this well) ...
            if (clients.has(userId)) {
                const userClients = clients.get(userId);
                userClients.delete(ws);
                if (userClients.size === 0) clients.delete(userId);
            }
            if (adminClients.has(userId)) {
                const adminData = adminClients.get(userId);
                adminData.sockets.delete(ws);
                if (adminData.sockets.size === 0) adminClients.delete(userId);
            }
        });

        ws.on('error', (error) => {
            logger.error(`WebSocket error for user ${userId}:`, error);
        });
    });

    // HEARTBEAT CHECK INTERVAL
    // Uses APP-LEVEL heartbeats only. Simpler and Proxy-Safe.
    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if (ws.isAlive === false) {
                // No PING received from client in last interval
                return ws.terminate();
            }

            // Reset flag - expect PING before next interval
            ws.isAlive = false;
        });
    }, 45000); // 45 seconds (Grace period > Client Ping 30s)

    wss.on('close', () => {
        clearInterval(interval);
        clearInterval(cleanupInterval);
    });

    logger.info('✅ WebSocket Server initialized');
    return wss;
};

/**
 * Broadcast notification to a specific user
 * @param {string} userId - User ID to send to
 * @param {Object} notification - Notification data
 */
export const broadcastNotification = (userId, notification) => {
    if (clients.has(userId)) {
        const userClients = clients.get(userId);
        const message = JSON.stringify(notification);

        let sentCount = 0;
        userClients.forEach((client) => {
            if (client.readyState === 1) { // OPEN
                try {
                    client.send(message);
                    sentCount++;
                } catch (e) {
                    logger.error(`Failed to send notification to user ${userId}:`, e);
                }
            }
        });

        if (sentCount > 0) {
            logger.info(`📡 Broadcasted notification to user ${userId} (${sentCount} active connections)`);
            return true;
        }
    }
    return false;
};

/**
 * Broadcast force logout to all connected users EXCEPT specified userIds
 * Used when maintenance mode is enabled to disconnect non-admin users
 * @param {string[]} excludeUserIds - Array of user IDs to exclude (admins/super_admins)
 * @returns {number} Number of connections that were force-disconnected
 */
export const broadcastForceLogout = (excludeUserIds = []) => {
    const excludeSet = new Set(excludeUserIds);
    let disconnectedCount = 0;

    for (const [userId, userClients] of clients.entries()) {
        // Skip admin/super_admin users
        if (excludeSet.has(userId)) continue;

        const message = JSON.stringify({
            type: 'FORCE_LOGOUT',
            message: 'System is under maintenance. You have been logged out.',
            reason: 'MAINTENANCE_MODE'
        });

        userClients.forEach((ws) => {
            if (ws.readyState === 1) { // OPEN
                try {
                    ws.send(message);
                    disconnectedCount++;
                } catch (e) {
                    logger.error('Failed to send force logout message:', e);
                }
                // Close connection gracefully after sending message
                setTimeout(() => {
                    try {
                        ws.close(1000, 'Maintenance Mode');
                    } catch (e) {
                        // Ignore close errors
                    }
                }, 100);
            }
        });
    }

    logger.info(`📡 Force logout broadcast sent to ${disconnectedCount} connections`);
    return disconnectedCount;
};

/**
 * Get list of currently connected user IDs
 * @returns {string[]} Array of connected user IDs
 */
export const getConnectedUserIds = () => Array.from(clients.keys());

/**
 * Broadcast data update to all connected admins (admin + super_admin)
 * Used for real-time dashboard updates without polling
 * 
 * @param {string} eventType - Type of data that changed (e.g., 'orders', 'products', 'users')
 * @param {string[][]} queryKeys - React Query keys to invalidate (e.g., [['admin', 'orders']])
 * @param {Object} metadata - Optional additional data about the change
 */
export const broadcastToAdmins = (eventType, queryKeys, metadata = {}) => {
    if (adminClients.size === 0) {
        return 0;
    }

    const message = JSON.stringify({
        type: 'DATA_UPDATE',
        eventType,
        queryKeys,
        metadata,
        timestamp: new Date().toISOString()
    });

    let sentCount = 0;

    for (const [userId, adminData] of adminClients.entries()) {
        adminData.sockets.forEach((ws) => {
            if (ws.readyState === 1) { // OPEN
                try {
                    ws.send(message);
                    sentCount++;
                } catch (e) {
                    logger.error(`Failed to send admin update to ${userId}:`, e);
                }
            }
        });
    }

    if (sentCount > 0) {
        logger.debug(`📊 DATA_UPDATE [${eventType}] sent to ${sentCount} admin connections`);
    }

    return sentCount;
};

/**
 * Broadcast data update to ALL connected users (for public data like products, categories, banners)
 * Used for real-time storefront updates when admin makes changes
 * 
 * @param {string} eventType - Type of data that changed (e.g., 'products', 'categories', 'banners')
 * @param {string[][]} queryKeys - React Query keys to invalidate (e.g., [['products']])
 * @param {Object} metadata - Optional additional data about the change
 */
export const broadcastToAllUsers = (eventType, queryKeys, metadata = {}) => {
    if (clients.size === 0) {
        return 0;
    }

    const message = JSON.stringify({
        type: 'DATA_UPDATE',
        eventType,
        queryKeys,
        metadata,
        timestamp: new Date().toISOString()
    });

    let sentCount = 0;

    // Send to ALL connected clients (not just admins)
    for (const [userId, userSockets] of clients.entries()) {
        userSockets.forEach((ws) => {
            if (ws.readyState === 1) { // OPEN
                try {
                    ws.send(message);
                    sentCount++;
                } catch (e) {
                    logger.error(`Failed to send public update to ${userId}:`, e);
                }
            }
        });
    }

    if (sentCount > 0) {
        logger.info(`📡 PUBLIC DATA_UPDATE [${eventType}] sent to ${sentCount} user connections`);
    }

    return sentCount;
};

/**
 * Get count of connected admin users
 * @returns {number} Number of connected admins
 */
export const getConnectedAdminCount = () => adminClients.size;
