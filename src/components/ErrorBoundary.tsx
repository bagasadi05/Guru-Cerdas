import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { logger } from '../services/logger';
import { errorReporter } from '../services/errorHandling';
import { AlertTriangleIcon, RefreshCwIcon, HomeIcon, SparklesIcon } from './Icons';
import { Button } from './ui/Button';
import { idTranslations, enTranslations, type Language } from '../utils/i18n';

interface ErrorContext {
  userId?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
  timestamp: string;
  url: string;
  userAgent: string;
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
  /**
   * When this value changes while the boundary is in an error state, the
   * boundary automatically resets and attempts to render its children again.
   * Typically wired to the current route (location.pathname) so that navigating
   * away from a crashed screen recovers the UI instead of leaving the user
   * stuck on the fallback.
   */
  resetKey?: string | number;
  onError?: (error: Error, errorInfo: ErrorInfo, context: ErrorContext) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorContext: ErrorContext | null;
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
      errorInfo: null,
      errorContext: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: Props) {
    // Auto-recover when the consumer signals a context change (e.g. route
    // navigation) while we are showing the fallback. Without this, a boundary
    // instance that is reused across navigations (such as a parametrized route)
    // would stay stuck on the error UI even after the user moves on.
    if (this.state.hasError && this.props.resetKey !== prevProps.resetKey) {
      this.resetErrorState('navigation/resetKey change');
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Create comprehensive error context
    const errorContext: ErrorContext = {
      userId: this.getUserId(),
      component: this.props.context || 'ErrorBoundary',
      action: 'component_error',
      metadata: {
        componentStack: errorInfo.componentStack,
        props: this.sanitizeProps()
      },
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Log the error with structured logging
    logger.error(
      `Component Error: ${error.message}`,
      error,
      errorContext.metadata,
      errorContext.component
    );

    // Report to error tracking service
    errorReporter.report(error, errorContext.metadata);

    this.setState({
      errorInfo,
      errorContext
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorContext);
    }

    // Check for Chunk Load Errors
    if (this.isChunkLoadError(error)) {
      const lastReload = sessionStorage.getItem('last-chunk-error-reload');
      const now = Date.now();
      
      // Throttle automatic reloads to prevent infinite reload loops (once every 30 seconds max)
      if (!lastReload || now - parseInt(lastReload, 10) > 30000) {
        sessionStorage.setItem('last-chunk-error-reload', String(now));
        logger.warn('Chunk load error detected. Initiating automatic recovery...', 'ErrorBoundary');
        void this.recoverFromChunkError();
      } else {
        logger.warn('Chunk load error detected but automatic reload was throttled to prevent loop.', 'ErrorBoundary');
      }
    }
  }

  private isChunkLoadError(error: Error | null): boolean {
    if (!error) return false;
    const message = error.message || String(error);
    const name = error.name || '';
    return (
      message.includes('Failed to fetch dynamically imported module') ||
      message.includes('error loading dynamically imported module') ||
      name === 'ChunkLoadError' ||
      message.includes('ChunkLoadError') ||
      message.includes('Loading chunk')
    );
  }

  private recoverFromChunkError = async () => {
    try {
      // Save current path to restore it after reloading
      sessionStorage.setItem(
        'post-reload-path',
        window.location.pathname + window.location.search
      );

      // Only perform SW unregistration and cache deletion if the user is online.
      // If offline, we shouldn't unregister the service worker as it's needed for offline mode.
      if (navigator.onLine !== false) {
        logger.info('User is online. Attempting Service Worker update/refresh to recover...', 'ErrorBoundary');
        
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          if (registrations.length > 0) {
            // Step 1: Request SW updates
            for (const registration of registrations) {
              await registration.update().catch(() => {});
            }

            // Attempt to skip waiting for waiting Service Workers
            let controllerChanged = false;
            const controllerHandler = () => {
              controllerChanged = true;
            };
            navigator.serviceWorker.addEventListener('controllerchange', controllerHandler);

            for (const registration of registrations) {
              if (registration.waiting) {
                logger.info('Found waiting SW, posting SKIP_WAITING to recover...', 'ErrorBoundary');
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
              }
            }

            // Wait max 2 seconds for controllerchange
            for (let i = 0; i < 20; i++) {
              if (controllerChanged) {
                logger.info('Service Worker controller changed, reloading page...', 'ErrorBoundary');
                break;
              }
              await new Promise((resolve) => setTimeout(resolve, 100));
            }

            navigator.serviceWorker.removeEventListener('controllerchange', controllerHandler);

            if (!controllerChanged) {
              // Step 2: Force unregister Service Workers
              logger.warn('Update check complete but page did not reload. Force clearing Service Workers...', 'ErrorBoundary');
              for (const registration of registrations) {
                await registration.unregister().catch(() => {});
              }
            }
          }
        }

        // Step 3: Clear caches
        if ('caches' in window) {
          const keys = await caches.keys();
          for (const key of keys) {
            await caches.delete(key).catch(() => {});
          }
        }
      } else {
        logger.info('User is offline. Skipping Service Worker unregistration to preserve offline capabilities.', 'ErrorBoundary');
      }
    } catch (err) {
      logger.error('Error during chunk error recovery', err as Error, undefined, 'ErrorBoundary');
    } finally {
      // Always reload the page in the end
      logger.info('Reloading page now...', 'ErrorBoundary');
      window.location.reload();
    }
  };

  private getUserId(): string | undefined {
    // Try to get user ID from various sources
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user.id;
    } catch {
      return undefined;
    }
  }

  private sanitizeProps(): Record<string, any> {
    // Sanitize props to avoid circular references and sensitive data
    try {
      return JSON.parse(JSON.stringify(this.props, (key, value) => {
        if (key === 'children' || typeof value === 'function') {
          return '[Filtered]';
        }
        return value;
      }));
    } catch {
      return { error: 'Failed to serialize props' };
    }
  }

  private getLanguage(): Language {
    try {
      const saved = localStorage.getItem('portal-guru-language');
      if (saved === 'en' || saved === 'id') return saved;
    } catch {
      // Ignore
    }
    return 'id';
  }

  private getTranslations() {
    return this.getLanguage() === 'en' ? enTranslations : idTranslations;
  }

  private resetErrorState = (reason: string) => {
    logger.info(
      `Error boundary auto-reset after ${reason}`,
      this.props.context || 'ErrorBoundary'
    );
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorContext: null
    });
  };

  handleReload = () => {
    logger.info('User clicked reload after error', 'ErrorBoundary');
    window.location.reload();
  };

  handleGoHome = () => {
    logger.info('User clicked go home after error', 'ErrorBoundary');
    window.location.href = '/dashboard';
  };

  handleRetry = () => {
    logger.info('User clicked retry after error', this.props.context || 'ErrorBoundary');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorContext: null
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunkError = this.isChunkLoadError(this.state.error);
      const isIndonesian = this.getLanguage() === 'id';

      // Default error UI - Modern Glassmorphism & High Aesthetic Design
      return (
        <div className="flex flex-col items-center justify-center min-h-[500px] w-full p-4 sm:p-6 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="relative max-w-md w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800/80 shadow-2xl shadow-slate-950/20 overflow-hidden">
            {/* Ambient background glow effect */}
            <div 
              className={`absolute -top-20 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full pointer-events-none opacity-40 blur-3xl transition-all duration-500 ${
                isChunkError 
                  ? 'bg-gradient-to-br from-emerald-400 to-teal-500 dark:from-emerald-600 dark:to-teal-600' 
                  : 'bg-gradient-to-br from-rose-400 to-red-600 dark:from-rose-600 dark:to-red-700'
              }`} 
            />

            {/* Status Pill Badge */}
            <div className="relative flex justify-center mb-4">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border backdrop-blur-md shadow-sm ${
                isChunkError
                  ? 'bg-emerald-500/10 dark:bg-emerald-400/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 dark:border-emerald-400/30'
                  : 'bg-rose-500/10 dark:bg-rose-400/15 text-rose-700 dark:text-rose-300 border-rose-500/20 dark:border-rose-400/30'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  isChunkError ? 'bg-emerald-500 animate-ping' : 'bg-rose-500 animate-pulse'
                }`} />
                {isChunkError 
                  ? (isIndonesian ? 'Pembaruan Siap' : 'Update Ready')
                  : (isIndonesian ? 'Perhatian Sistem' : 'System Notice')}
              </span>
            </div>

            {/* Hero Animated Icon Badge */}
            <div className="relative flex justify-center mb-6">
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-xl transition-transform duration-300 hover:scale-105 ${
                isChunkError
                  ? 'bg-gradient-to-tr from-emerald-500 via-teal-500 to-emerald-400 text-white shadow-emerald-500/30 dark:shadow-emerald-950/50'
                  : 'bg-gradient-to-tr from-rose-500 via-red-500 to-amber-500 text-white shadow-rose-500/30 dark:shadow-rose-950/50'
              }`}>
                {isChunkError ? (
                  <SparklesIcon className="w-10 h-10 animate-pulse text-white drop-shadow-md" />
                ) : (
                  <AlertTriangleIcon className="w-10 h-10 text-white drop-shadow-md" />
                )}
              </div>
            </div>

            {/* Header Title */}
            <h1 className="relative text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-2">
              {isChunkError 
                ? (isIndonesian ? 'Aplikasi Diperbarui' : 'Application Updated')
                : this.getTranslations().errors.general}
            </h1>

            {/* Subtitle Description */}
            <p className="relative text-sm leading-relaxed text-slate-600 dark:text-slate-400 mb-6 px-1">
              {isChunkError 
                ? (isIndonesian 
                    ? 'Versi baru Guru Cerdas telah tersedia. Silakan muat ulang halaman untuk menerapkan fitur & pembaruan terbaru.' 
                    : 'A new version of Guru Cerdas is available. Please reload the page to apply the latest features & updates.')
                : this.getTranslations().errors.contactSupport}
            </p>

            {/* Dev Stack Trace Details */}
            {import.meta.env.DEV && this.state.error && (
              <div className="relative mb-6 p-4 bg-slate-100 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl text-left shadow-inner">
                <p className="text-xs font-mono font-semibold text-rose-600 dark:text-rose-400 break-all mb-1">
                  {this.state.error.message}
                </p>
                {this.state.errorInfo && (
                  <details className="mt-2 group">
                    <summary className="text-[11px] font-medium text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                      Lihat Detail Stack Trace
                    </summary>
                    <pre className="mt-2 p-2 bg-slate-200/50 dark:bg-slate-900 rounded-xl text-[10px] font-mono text-slate-700 dark:text-slate-300 overflow-auto max-h-40 border border-slate-300/40 dark:border-slate-800">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="relative flex flex-col sm:flex-row gap-3">
              {isChunkError ? (
                <button
                  type="button"
                  onClick={this.recoverFromChunkError}
                  className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-lg shadow-emerald-600/25 dark:shadow-emerald-950/40 font-semibold text-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <RefreshCwIcon className="w-4 h-4 transition-transform duration-500 group-hover:rotate-180" />
                  <span className="whitespace-nowrap">
                    {isIndonesian ? 'Muat Ulang Aplikasi' : 'Reload Application'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={this.handleRetry}
                  className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-brand-600/25 dark:shadow-brand-950/40 font-semibold text-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 group cursor-pointer"
                >
                  <RefreshCwIcon className="w-4 h-4 transition-transform duration-500 group-hover:rotate-180" />
                  <span className="whitespace-nowrap">
                    {this.getTranslations().errors.tryAgain}
                  </span>
                </button>
              )}
              <button
                type="button"
                onClick={this.handleGoHome}
                className="w-full sm:flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/60 rounded-xl font-medium text-sm transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <HomeIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                <span className="whitespace-nowrap">
                  {this.getTranslations().nav.dashboard}
                </span>
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
 * Async error boundary wrapper for Suspense fallbacks.
 *
 * Binds the boundary's resetKey to the current route so that navigating away
 * from a crashed screen automatically clears the error state and renders the
 * destination, instead of leaving the user stuck on the fallback UI.
 */
export const AsyncErrorBoundary: React.FC<{
  children: ReactNode;
  context?: string;
}> = ({ children, context }) => {
  const location = useLocation();
  return (
    <ErrorBoundary context={context} resetKey={location.pathname}>
      <React.Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full"></div>
          </div>
        }
      >
        {children}
      </React.Suspense>
    </ErrorBoundary>
  );
};
