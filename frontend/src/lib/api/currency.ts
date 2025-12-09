import axios from './axios';

/**
 * Get supported currencies
 */
export const getSupportedCurrencies = async (): Promise<string[]> => {
    const response = await axios.get<{ success: boolean; data: string[] }>('/currency/supported');
    return response.data.data;
};

/**
 * Get current exchange rates
 */
export const getExchangeRates = async (): Promise<{ rates: Record<string, number>; base: string; timestamp: string }> => {
    const response = await axios.get<{ success: boolean; data: { rates: Record<string, number>; base: string; timestamp: string } }>(
        '/currency/rates'
    );
    return response.data.data;
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
