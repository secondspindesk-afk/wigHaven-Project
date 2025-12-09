import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import currencyService from '../api/currency';

const CURRENCY_STORAGE_KEY = 'wighaven_currency';

export function useCurrency() {
    const [currency, setCurrency] = useState<string>(() => {
        return localStorage.getItem(CURRENCY_STORAGE_KEY) || 'GHS';
    });

    // Fetch rates
    const { data: ratesData } = useQuery({
        queryKey: ['currency_rates'],
        queryFn: currencyService.getExchangeRates,
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    // Fetch supported currencies
    const { data: supportedCurrencies } = useQuery({
        queryKey: ['supported_currencies'],
        queryFn: currencyService.getSupportedCurrencies,
        staleTime: Infinity,
    });

    const changeCurrency = (newCurrency: string) => {
        setCurrency(newCurrency);
        localStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency);
    };

    const formatPrice = (amount: number | string) => {
        // Coerce to number in case API returns string
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

        if (isNaN(numAmount)) return '₵0.00';
        if (!ratesData?.rates) return `₵${numAmount.toFixed(2)}`; // Fallback to GHS

        // GHS is base
        let convertedAmount = numAmount;

        if (currency !== 'GHS') {
            const rate = ratesData.rates[currency];
            if (rate) {
                convertedAmount = numAmount * rate;
            }
        }

        try {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: currency,
            }).format(convertedAmount);
        } catch (error) {
            // Fallback if currency code is invalid
            return `₵${convertedAmount.toFixed(2)}`;
        }
    };

    return {
        currency: currency || 'GHS',
        rates: ratesData?.rates || {},
        supportedCurrencies: supportedCurrencies || ['GHS'],
        changeCurrency,
        formatPrice
    };
}
