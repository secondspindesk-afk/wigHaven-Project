import axios from './axios';

/**
 * Get supported currencies
 * NEVER returns undefined - always returns at least ['GHS']
 */
export const getSupportedCurrencies = async (): Promise<string[]> => {
    try {
        const response = await axios.get<{ success: boolean; data: string[] }>('/currency/supported');
        return response.data?.data ?? ['GHS'];
    } catch (error) {
        console.error('Failed to fetch supported currencies:', error);
        return ['GHS']; // Safe fallback
    }
};

/**
 * Get current exchange rates
 * NEVER returns undefined - always returns valid structure
 */
export const getExchangeRates = async (): Promise<{ rates: Record<string, number>; base: string; timestamp: string }> => {
    try {
        const response = await axios.get<{ success: boolean; data: { rates: Record<string, number>; base: string; timestamp: string } }>(
            '/currency/rates'
        );
        return response.data?.data ?? { rates: {}, base: 'GHS', timestamp: new Date().toISOString() };
    } catch (error) {
        console.error('Failed to fetch exchange rates:', error);
        return { rates: {}, base: 'GHS', timestamp: new Date().toISOString() }; // Safe fallback
    }
};

/**
 * Convert amount between currencies
 */
export const convertCurrency = async (
    amount: number,
    from: string,
    to: string
): Promise<number> => {
    const response = await axios.get<{ success: boolean; data: { converted: number } }>(
        `/currency/convert?amount=${amount}&from=${from}&to=${to}`
    );
    return response.data.data.converted;
};

export const currencyService = {
    getSupportedCurrencies,
    getExchangeRates,
    convertCurrency,
};

export default currencyService;
