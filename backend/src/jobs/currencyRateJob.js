import cron from 'node-cron';
import currencyService from '../services/currencyService.js';
import { logJobStart, logJobComplete, logJobError } from '../utils/cronLogger.js';
import logger from '../utils/logger.js';

/**
 * Currency Rate Refresh Job
 * Runs every 6 hours to update exchange rates from Frankfurter API
 */
export const startCurrencyRateJob = () => {
    cron.schedule('0 */6 * * *', async () => {
        const context = logJobStart('currency_rate_refresh');

        try {
            const rates = await currencyService.updateRatesInDb();

            logJobComplete(context, {
                recordsChecked: Object.keys(rates).length,
                recordsProcessed: Object.keys(rates).length,
                recordsFailed: 0,
                details: `Updated rates: ${JSON.stringify(rates)}`
            });
        } catch (error) {
            logJobError(context, error);
        }
    });

    logger.info('✅ Currency rate refresh job started (runs every 6 hours)');
};

export default {
    startCurrencyRateJob
};
