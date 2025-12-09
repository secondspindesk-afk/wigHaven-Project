import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import profileController from '../controllers/profileController.js';

const router = express.Router();

// Profile Info
router.get('/', authenticateToken, profileController.getProfile);
router.put('/', authenticateToken, profileController.updateProfile);
router.put('/password', authenticateToken, profileController.updatePassword);
router.delete('/', authenticateToken, profileController.deactivateAccount);

// Address Book
router.post('/address', authenticateToken, profileController.addAddress);
router.put('/address/:id', authenticateToken, profileController.updateAddress);
router.delete('/address/:id', authenticateToken, profileController.deleteAddress);

export default router;
