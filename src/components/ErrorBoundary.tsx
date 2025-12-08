import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../services/logger';
import { AlertTriangleIcon, RefreshCwIcon, HomeIcon } from './Icons';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Enhanced Error Boundary Component
 * Catches JavaScript errors anywhere in child component tree and displays fallback UI
 * Now with structured logging and error tracking
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error with structured logging
    logger.error(
      `Component Error: ${error.message}`,
      error,
      {
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString()
      },
      this.props.context || 'ErrorBoundary'
    );

    this.setState({ errorInfo });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReload = () => {
    logger.info('User clicked reload after error', 'ErrorBoundary');
    window.location.reload();
  };

  handleGoHome = () => {
    logger.info('User clicked go home after error', 'ErrorBoundary');
    window.location.href = '/dashboard';
  };

  handleRetry = () => {
    logger.info('User clicked retry after error', 'ErrorBoundary');
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] bg-gray-100 dark:bg-gray-950 text-center p-8">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-orange-200 dark:from-red-900/50 dark:to-orange-900/70 rounded-full flex items-center justify-center">
                <AlertTriangleIcon className="w-10 h-10 text-red-600 dark:text-red-400" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
              Terjadi Kesalahan
            </h1>

            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Maaf, terjadi kesalahan yang tidak terduga. Tim kami telah diberitahu tentang masalah ini.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-left">
                <p className="text-sm font-mono text-red-700 dark:text-red-300 break-all">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer">
                      Stack trace
                    </summary>
                    <pre className="mt-2 text-xs text-red-600 dark:text-red-400 overflow-auto max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={this.handleRetry}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <RefreshCwIcon className="w-4 h-4 mr-2" />
                Coba Lagi
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="flex-1"
              >
                <HomeIcon className="w-4 h-4 mr-2" />
                Beranda
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

/**
 * HOC to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  context?: string
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary context={context}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}

/**
 * Async error boundary wrapper for Suspense fallbacks
 */
export const AsyncErrorBoundary: React.FC<{
  children: ReactNode;
  context?: string;
}> = ({ children, context }) => {
  return (
    <ErrorBoundary context={context}>
      <React.Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
          </div>
        }
      >
        {children}
      </React.Suspense>
    </ErrorBoundary>
  );
};