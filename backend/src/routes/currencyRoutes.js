import express from 'express';
import * as currencyController from '../controllers/currencyController.js';

const router = express.Router();

// PUBLIC ROUTES - NO AUTHENTICATION REQUIRED
// These endpoints provide currency exchange rates and currency conversion
// They should be accessible to all users without requiring a login

router.get('/currency/rates', currencyController.getRates);
router.get('/currency/convert', currencyController.convertCurrency);
router.get('/currency/supported', currencyController.getSupportedCurrencies);

export default router;
