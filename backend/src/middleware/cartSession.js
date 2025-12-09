import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

/**
 * Middleware to handle cart session
 * - If user is authenticated (req.user exists), use userId
 * - If guest, look for X-Session-ID header or create new session ID
 */
export const cartSession = (req, res, next) => {
    try {
        // 1. Check if user is authenticated (from previous auth middleware)
        if (req.user) {
            logger.info(`[CART_SESSION] User found: ${JSON.stringify(req.user)}`);
            req.cart = {
                type: 'user',
                userId: req.user.id, // Fixed: auth middleware sets 'id' not 'userId'
                sessionId: null,
            };
            return next();
        }

        // 2. Check for existing session ID in headers
        let sessionId = req.headers['x-session-id'];

        // 3. If no session ID, generate one
        if (!sessionId) {
            sessionId = uuidv4();
            // Send new session ID in response header so client can store it
            res.setHeader('X-Session-ID', sessionId);
        }

        req.cart = {
            type: 'guest',
            userId: null,
            sessionId: sessionId,
        };

        next();
    } catch (error) {
        logger.error('Error in cart session middleware:', error);
        next(error);
    }
};

export default cartSession;
