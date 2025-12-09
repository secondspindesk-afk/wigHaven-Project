import express from 'express';
import * as addressController from '../controllers/addressController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', addressController.getUserAddresses);
router.post('/', addressController.createAddress);
router.patch('/:id', addressController.updateAddress);
router.delete('/:id', addressController.deleteAddress);

export default router;
