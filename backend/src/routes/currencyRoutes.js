import express from 'express';
import * as currencyController from '../controllers/currencyController.js';
import { currencyCache } from '../middleware/cacheControl.js';

const router = express.Router();

// PUBLIC ROUTES - NO AUTHENTICATION REQUIRED
// These endpoints provide currency exchange rates and currency conversion
// They should be accessible to all users without requiring a login
// Currency rates are refreshed every 6 hours, so cache aggressively

router.get('/currency/rates', currencyCache, currencyController.getRates);
router.get('/currency/convert', currencyCache, currencyController.convertCurrency);
router.get('/currency/supported', currencyCache, currencyController.getSupportedCurrencies);

export default router;
