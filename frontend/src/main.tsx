import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';
import { ToastProvider } from './contexts/ToastContext';
import { CurrencyProvider } from './lib/context/CurrencyContext';
import { WebSocketProvider } from './contexts/WebSocketContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        <ToastProvider>
          <WebSocketProvider>
            <App />
          </WebSocketProvider>
        </ToastProvider>
      </CurrencyProvider>
      {/* DevTools - only shows in development */}
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
    </QueryClientProvider>
  </StrictMode>
);
