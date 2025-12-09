import { WebSocketServer } from 'ws';
import { verifyToken } from '../utils/tokenUtils.js';
import logger from '../utils/logger.js';


// Rate limiting: Track connection attempts per IP
const connectionAttempts = new Map(); // IP -> { count, resetTime }
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_CONNECTION_ATTEMPTS = 10; // 10 attempts per minute

// Map to store active connections: userId -> Set<WebSocket>
const clients = new Map();

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

    server.on('upgrade', (request, socket, head) => {
        // RATE LIMITING: Prevent connection flooding attacks
        const clientIp = request.socket.remoteAddress || 'unknown';
        const now = Date.now();

        // Clean up old entries
        for (const [ip, data] of connectionAttempts.entries()) {
            if (now > data.resetTime) {
                connectionAttempts.delete(ip);
            }
        }

        // Check rate limit
        const attemptData = connectionAttempts.get(clientIp);
        if (attemptData) {
            if (attemptData.count >= MAX_CONNECTION_ATTEMPTS) {
                logger.warn(`Rate limit exceeded for IP: ${clientIp}`);
                socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
                socket.destroy();
                return;
            }
            attemptData.count++;
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
            // SECURITY ENHANCEMENT: Read token from Sec-WebSocket-Protocol header instead of URL
            // This prevents token from appearing in browser history and server logs
            const protocols = request.headers['sec-websocket-protocol'];
            let token = null;

            if (protocols) {
                // Protocol format: "access_token, <JWT_TOKEN>"
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

                // CRITICAL: Accept the protocol in the upgrade response headers
                // We need to tell the client which protocol we're accepting
                wss.handleUpgrade(request, socket, head, (ws) => {
                    wss.emit('connection', ws, request, userId);
                });
            } catch (error) {
                logger.warn(`WebSocket auth failed: ${error.message}`);
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
            }
        } else {
            socket.destroy();
        }
    });

    wss.on('connection', (ws, request, userId) => {
        logger.info(`✅ WebSocket connected for user: ${userId}`);

        // Add to clients map
        if (!clients.has(userId)) {
            clients.set(userId, new Set());
        }
        clients.get(userId).add(ws);

        ws.isAlive = true;
        ws.on('pong', () => {
            ws.isAlive = true;
        });

        // Send welcome message
        ws.send(JSON.stringify({
            type: 'CONNECTED',
            message: 'Real-time notifications active'
        }));

        ws.on('close', () => {
            logger.info(`WebSocket disconnected for user: ${userId}`);
            if (clients.has(userId)) {
                const userClients = clients.get(userId);
                userClients.delete(ws);
                if (userClients.size === 0) {
                    clients.delete(userId);
                }
            }
        });

        ws.on('error', (error) => {
            logger.error(`WebSocket error for user ${userId}:`, error);
        });
    });

    // Heartbeat to keep connections alive
    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            // Initialize isAlive if undefined (new connections)
            if (ws.isAlive === undefined) {
                ws.isAlive = true;
            }

            if (ws.isAlive === false) {
                return ws.terminate();
            }

            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    wss.on('close', () => {
        clearInterval(interval);
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
                client.send(message);
                sentCount++;
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
                ws.send(message);
                disconnectedCount++;
                // Close connection gracefully after sending message
                setTimeout(() => ws.close(1000, 'Maintenance Mode'), 100);
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
