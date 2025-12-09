import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import notificationController from '../controllers/notificationController.js';

const router = express.Router();

// SSE Subscription (REMOVED - Replaced by WebSocket)
// router.get('/subscribe', authenticateToken, notificationController.subscribe);

// Standard Endpoints
router.get('/', authenticateToken, notificationController.getNotifications);
router.patch('/:id/read', authenticateToken, notificationController.markRead);
router.post('/read-all', authenticateToken, notificationController.markAllRead);
router.delete('/all', authenticateToken, notificationController.deleteAllNotifications);
router.delete('/:id', authenticateToken, notificationController.deleteNotification);

// Admin Routes
router.post('/bulk', authenticateToken, notificationController.sendBulkNotification);

export default router;
