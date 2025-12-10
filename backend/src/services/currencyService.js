/**
 * Currency Service
 * 
 * Uses ExchangeRate-API for accurate GHS exchange rates.
 * Features:
 * - In-memory cache (reduces DB calls)
 * - Database persistence (for fallback)
 * - Supports GHS, USD, EUR, GBP
 */

import { getPrisma } from '../config/database.js';
import logger from '../utils/logger.js';

// ExchangeRate-API - Free tier: 1500 requests/month
// Supports GHS directly (unlike Frankfurter)
const EXCHANGE_API_URL = 'https://open.er-api.com/v6/latest/GHS';

// Fallback: ExchangeRate.host (also free)
const FALLBACK_API_URL = 'https://api.exchangerate.host/latest?base=GHS';

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP'];
const CACHE_DURATION_MS = 6 * 60 * 60 * 1000; // 6 hours

// ============================================
// IN-MEMORY CACHE (reduces DB round-trips)
// ============================================
let ratesCache = null;
let cacheTimestamp = 0;

/**
 * Fetch latest rates from ExchangeRate-API
 * Falls back to hardcoded rates if API fails
 */
export const fetchLatestRates = async () => {
    try {
        // Primary API
        const response = await fetch(EXCHANGE_API_URL);

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();

        if (data.result === 'success' && data.rates) {
            const rates = {
                USD: data.rates.USD || 0.082,
                EUR: data.rates.EUR || 0.076,
                GBP: data.rates.GBP || 0.065
            };

            logger.info(`✓ Fetched live rates: 1 GHS = ${rates.USD.toFixed(4)} USD`);
            return rates;
        }

        throw new Error('Invalid API response');

    } catch (primaryError) {
        logger.warn(`Primary API failed: ${primaryError.message}, trying fallback...`);

        try {
            // Fallback API
            const fallbackResponse = await fetch(FALLBACK_API_URL);
            const fallbackData = await fallbackResponse.json();

            if (fallbackData.success && fallbackData.rates) {
                return {
                    USD: fallbackData.rates.USD || 0.082,
                    EUR: fallbackData.rates.EUR || 0.076,
                    GBP: fallbackData.rates.GBP || 0.065
                };
            }
        } catch (fallbackError) {
            logger.warn(`Fallback API also failed: ${fallbackError.message}`);
        }

        // Use hardcoded fallback (updated December 2024)
        // 1 GHS ≈ 0.082 USD
        logger.warn('Using fallback rates');
        return {
            USD: 0.082,
            EUR: 0.076,
            GBP: 0.065
        };
    }
};

/**
 * Update rates in database (now with retry and error handling)
 */
export const updateRatesInDb = async () => {
    const rates = await fetchLatestRates();

    // Update in-memory cache immediately
    ratesCache = rates;
    cacheTimestamp = Date.now();

    // Try to persist to database (but don't fail if DB is unavailable)
    try {
        const prisma = getPrisma();

        // Use a single transaction to minimize connection usage
        await prisma.$transaction(async (tx) => {
            for (const [currency, rate] of Object.entries(rates)) {
                await tx.currencyRate.upsert({
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
                });
            }
        });

        logger.info(`✓ Updated ${Object.keys(rates).length} currency rates in DB`);
    } catch (dbError) {
        // Database update failed - but we still have in-memory cache
        logger.warn(`DB update failed (using memory cache): ${dbError.message}`);
    }

    return rates;
};

/**
 * Get cached rates (memory-first, then DB, then fetch)
 */
export const getCachedRates = async () => {
    // 1. Check in-memory cache first (fastest)
    if (ratesCache && (Date.now() - cacheTimestamp) < CACHE_DURATION_MS) {
        return ratesCache;
    }

    // 2. Try database cache
    try {
        const prisma = getPrisma();
        const rates = await prisma.currencyRate.findMany({
            where: { baseCurrency: 'GHS' }
        });

        if (rates.length > 0) {
            const ratesObj = rates.reduce((obj, rate) => {
                obj[rate.currency] = parseFloat(rate.rate);
                return obj;
            }, {});

            // Update memory cache
            ratesCache = ratesObj;
            cacheTimestamp = Date.now();

            // Check if DB cache is stale
            const oldestRate = rates.reduce((oldest, rate) =>
                rate.lastUpdated < oldest.lastUpdated ? rate : oldest
            );
            const hoursSinceUpdate = (Date.now() - oldestRate.lastUpdated.getTime()) / (1000 * 60 * 60);

            if (hoursSinceUpdate > 12) {
                // Refresh in background (don't block)
                setImmediate(() => updateRatesInDb().catch(() => { }));
            }

            return ratesObj;
        }
    } catch (dbError) {
        logger.warn(`DB read failed: ${dbError.message}`);
    }

    // 3. Fetch fresh rates
    return await updateRatesInDb();
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

/**
 * Force refresh rates (for admin use)
 */
export const forceRefreshRates = async () => {
    ratesCache = null;
    cacheTimestamp = 0;
    return await updateRatesInDb();
};

export default {
    fetchLatestRates,
    updateRatesInDb,
    getCachedRates,
    convertAmount,
    getSupportedCurrencies,
    forceRefreshRates
};
