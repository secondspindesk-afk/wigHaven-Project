// Format currency amounts
export const formatCurrency = (amount: number | string, currency: string = 'GHS'): string => {
    const symbols: Record<string, string> = {
        GHS: 'GH₵',
        USD: '$',
        EUR: '€',
        GBP: '£',
    };

    const symbol = symbols[currency] || currency;

    // Ensure amount is a number
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    // Handle invalid numbers
    if (isNaN(numAmount) || numAmount === null || numAmount === undefined) {
        return `${symbol}0.00`;
    }

    const formatted = numAmount.toFixed(2);

    return `${symbol}${formatted}`;
};

// Format price range
export const formatPriceRange = (minPrice: number, maxPrice: number, currency: string = 'GHS'): string => {
    if (minPrice === maxPrice) {
        return formatCurrency(minPrice, currency);
    }
    return `From ${formatCurrency(minPrice, currency)}`;
};

// Get currency symbol
export const getCurrencySymbol = (currency: string = 'GHS'): string => {
    const symbols: Record<string, string> = {
        GHS: 'GH₵',
        USD: '$',
        EUR: '€',
        GBP: '£',
    };
    return symbols[currency] || currency;
};
