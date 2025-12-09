// Using native fetch (available in Node.js 18+)
import { getPrisma } from '../config/database.js';
import logger from '../utils/logger.js';

const FRANKFURTER_API = 'https://api.frankfurter.app/latest';
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP'];
const CACHE_DURATION_HOURS = 6;

/**
 * Fetch latest rates from Frankfurter API
 */
export const fetchLatestRates = async () => {
    try {
        // Note: Frankfurter doesn't support GHS directly, we'll need to use a different approach
        // Using USD as base and calculating GHS rates from there
        const response = await fetch(`${FRANKFURTER_API}?from=USD&to=${SUPPORTED_CURRENCIES.join(',')}`);

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        // Manually set GHS exchange rates (approximate, should be updated regularly)
        // These are example rates - in production, use a service that supports GHS
        const ghsToUsd = 0.082; // Approximate rate

        return {
            USD: ghsToUsd,
            EUR: ghsToUsd * (data.rates.EUR || 0.92),
            GBP: ghsToUsd * (data.rates.GBP || 0.79)
        };
    } catch (error) {
        logger.error('Failed to fetch currency rates:', error);
        // Return fallback rates
        return {
            USD: 0.082,
            EUR: 0.076,
            GBP: 0.065
        };
    }
};

/**
 * Update rates in database
 */
export const updateRatesInDb = async () => {
    const rates = await fetchLatestRates();
    const prisma = getPrisma();

    const updates = Object.entries(rates).map(([currency, rate]) =>
        prisma.currencyRate.upsert({
            where: {
                baseCurrency_currency: {
                    baseCurrency: 'GHS',
                    currency
                }
            },
            create: {
                baseCurrency: 'GHS',
                currency,
                rate,
                lastUpdated: new Date()
            },
            update: {
                rate,
                lastUpdated: new Date()
            }
        })
    );

    await Promise.all(updates);
    logger.info(`Updated ${updates.length} currency rates`);
    return rates;
};

/**
 * Get cached rates from database
 */
export const getCachedRates = async () => {
    const prisma = getPrisma();
    const rates = await prisma.currencyRate.findMany({
        where: { baseCurrency: 'GHS' }
    });

    // Check if cache is stale or empty
    if (rates.length === 0) {
        return await updateRatesInDb();
    }

    const oldestRate = rates.reduce((oldest, rate) =>
        rate.lastUpdated < oldest.lastUpdated ? rate : oldest
    );

    const hoursSinceUpdate = (Date.now() - oldestRate.lastUpdated.getTime()) / (1000 * 60 * 60);

    if (hoursSinceUpdate > CACHE_DURATION_HOURS * 2) {
        // Cache is stale, refresh
        return await updateRatesInDb();
    }

    // Return cached rates as object
    return rates.reduce((obj, rate) => {
        obj[rate.currency] = parseFloat(rate.rate);
        return obj;
    }, {});
};

/**
 * Convert amount between currencies
 */
export const convertAmount = async (amount, from, to) => {
    if (from === to) return amount;

    const rates = await getCachedRates();

    // GHS is base currency
    if (from === 'GHS') {
        if (!rates[to]) throw new Error(`Unsupported currency: ${to}`);
        return amount * rates[to];
    }

    if (to === 'GHS') {
        if (!rates[from]) throw new Error(`Unsupported currency: ${from}`);
        return amount / rates[from];
    }

    // Both are non-GHS, convert through GHS
    if (!rates[from] || !rates[to]) {
        throw new Error(`Unsupported currency conversion: ${from} to ${to}`);
    }

    const ghsAmount = amount / rates[from];
    return ghsAmount * rates[to];
};

/**
 * Get all supported currencies
 */
export const getSupportedCurrencies = () => {
    return ['GHS', ...SUPPORTED_CURRENCIES];
};

export default {
    fetchLatestRates,
    updateRatesInDb,
    getCachedRates,
    convertAmount,
    getSupportedCurrencies
};
