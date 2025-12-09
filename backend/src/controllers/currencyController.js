import currencyService from '../services/currencyService.js';
import logger from '../utils/logger.js';

/**
 * GET /api/currency/rates
 * Get current exchange rates
 */
export const getRates = async (req, res) => {
    try {
        const rates = await currencyService.getCachedRates();

        res.json({
            success: true,
            data: {
                base: 'GHS',
                rates,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('Get rates error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch currency rates'
        });
    }
};

/**
 * POST /api/currency/convert
 * Convert specific amount
 */
export const convertCurrency = async (req, res) => {
    try {
        const { amount, from, to } = req.body;

        if (!amount || !from || !to) {
            return res.status(400).json({
                success: false,
                error: 'amount, from, and to are required'
            });
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount < 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid amount'
            });
        }

        const converted = await currencyService.convertAmount(parsedAmount, from, to);

        res.json({
            success: true,
            data: {
                amount: parsedAmount,
                from,
                to,
                converted: parseFloat(converted.toFixed(2))
            }
        });
    } catch (error) {
        logger.error('Convert currency error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to convert currency'
        });
    }
};

/**
 * GET /api/currency/supported
 * List supported currencies
 */
export const getSupportedCurrencies = (req, res) => {
    res.json({
        success: true,
        data: currencyService.getSupportedCurrencies()
    });
};

export default {
    getRates,
    convertCurrency,
    getSupportedCurrencies
};
