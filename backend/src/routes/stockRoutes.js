import express from 'express';
import { optionalAuth } from '../middleware/auth.js';
import stockController from '../controllers/stockController.js';

const router = express.Router();

// Subscribe to back-in-stock alerts (Public/Protected)
router.post('/notify', optionalAuth, stockController.subscribeToRestock);

// Unsubscribe (Public/Protected)
router.delete('/notify/:variantId', optionalAuth, stockController.unsubscribeFromRestock);

export default router;
