import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import settingsController from '../controllers/settingsController.js';
import { noCache } from '../middleware/cacheControl.js';

const router = express.Router();

// Get all settings (Admin only)
router.get('/', authenticateToken, requireAdmin, settingsController.getSettings);

// Update a setting (Admin only)
router.post('/', authenticateToken, requireAdmin, settingsController.updateSetting);

// Public settings - noCache for real-time WebSocket updates
router.get('/public', noCache, settingsController.getPublicSettings);

export default router;
