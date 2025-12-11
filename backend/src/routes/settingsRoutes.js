import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import settingsController from '../controllers/settingsController.js';
import { longCache } from '../middleware/cacheControl.js';

const router = express.Router();

// Get all settings (Admin only)
router.get('/', authenticateToken, requireAdmin, settingsController.getSettings);

// Update a setting (Admin only)
router.post('/', authenticateToken, requireAdmin, settingsController.updateSetting);

// Public settings (No auth, cached for 1 hour at edge)
router.get('/public', longCache, settingsController.getPublicSettings);

export default router;
