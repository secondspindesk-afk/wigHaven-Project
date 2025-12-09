import React, { createContext, useContext } from 'react';
import { useCurrency } from '@/lib/hooks/useCurrency';

interface CurrencyContextValue {
    currency: string;
    rates: Record<string, number> | undefined;
    supportedCurrencies: string[];
    changeCurrency: (currency: string) => void;
    formatPrice: (amount: number | string) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
    const currencyValue = useCurrency();

    return (
        <CurrencyContext.Provider value={currencyValue}>
            {children}
        </CurrencyContext.Provider>
    );
}

export function useCurrencyContext() {
    const context = useContext(CurrencyContext);
    if (!context) {
        throw new Error('useCurrencyContext must be used within CurrencyProvider');
    }
    return context;
}
