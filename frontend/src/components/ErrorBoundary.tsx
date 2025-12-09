import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary component to catch React errors and prevent white screen crashes.
 * Displays a fallback UI when an error occurs in any child component.
 */
class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Log error to console in development
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // In production, you could send this to an error reporting service
        // e.g., Sentry, LogRocket, etc.
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-[#050505] flex items-center justify-center p-8">
                    <div className="max-w-md w-full text-center">
                        <div className="mb-8">
                            <div className="w-16 h-16 mx-auto bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center">
                                <svg
                                    className="w-8 h-8 text-red-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            </div>
                        </div>

                        <h1 className="text-2xl font-bold text-white mb-2">
                            Something went wrong
                        </h1>
                        <p className="text-zinc-400 text-sm mb-8">
                            We encountered an unexpected error. Please try refreshing the page.
                        </p>

                        {this.state.error && (
                            <div className="mb-8 p-4 bg-zinc-900 border border-zinc-800 rounded text-left">
                                <p className="text-[10px] text-zinc-500 uppercase font-bold mb-2">
                                    Error Details
                                </p>
                                <p className="text-xs text-red-400 font-mono break-all">
                                    {this.state.error.message}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-4 justify-center">
                            <button
                                onClick={this.handleReload}
                                className="px-6 py-3 bg-white text-black font-bold uppercase tracking-wider text-xs hover:bg-zinc-200 transition-colors"
                            >
                                Refresh Page
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="px-6 py-3 bg-zinc-900 text-white border border-zinc-800 font-bold uppercase tracking-wider text-xs hover:bg-zinc-800 transition-colors"
                            >
                                Go Home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
