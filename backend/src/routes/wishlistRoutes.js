import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import wishlistController from '../controllers/wishlistController.js';

const router = express.Router();

router.get('/', authenticateToken, wishlistController.getWishlist);
router.post('/', authenticateToken, wishlistController.addToWishlist);
router.delete('/:productId', authenticateToken, wishlistController.removeFromWishlist);

export default router;
