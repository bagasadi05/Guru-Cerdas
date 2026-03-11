/**
 * AppProviders
 *
 * Composes all global context providers into a single wrapper component.
 * This keeps App.tsx clean and makes the provider tree easy to manage in one place.
 *
 * Order matters: providers that depend on another must be nested inside it.
 * e.g. AuthProvider depends on QueryClientProvider and ThemeProvider.
 */

import React from 'react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { ThemeProvider } from '../hooks/useTheme';
import { AccessibilityProvider } from './ui/AccessibilityFeatures';
import { AuthProvider } from '../hooks/useAuth';
import { I18nProvider } from '../utils/i18n';
import { ToastProvider } from '../hooks/useToast';
import { SyncProvider, UploadManagerProvider } from './StatusIndicators';
import { SemesterProvider } from '../contexts/SemesterContext';
import { UploadProgressProvider } from './ui/PerformanceIndicators';
import { UndoToastProvider } from './ui/UndoToast';
import { KeyboardShortcutsProvider } from './advanced-features/KeyboardShortcutsProvider';
import ErrorBoundary from './ErrorBoundary';

interface AppProvidersProps {
  children: React.ReactNode;
  queryClient: QueryClient;
}

/**
 * Wraps the entire app with all required global providers.
 *
 * Provider hierarchy (outermost → innermost):
 * ErrorBoundary → QueryClient → Theme → Accessibility →
 * Auth → I18n → Toast → Sync → Semester → UploadManager →
 * UploadProgress → UndoToast → KeyboardShortcuts → children
 */
export function AppProviders({ children, queryClient }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AccessibilityProvider>
            <AuthProvider>
              <I18nProvider>
                <ToastProvider>
                  <SyncProvider>
                    <SemesterProvider>
                      <UploadManagerProvider>
                        <UploadProgressProvider>
                          <UndoToastProvider>
                            <KeyboardShortcutsProvider>
                              {children}
                            </KeyboardShortcutsProvider>
                          </UndoToastProvider>
                        </UploadProgressProvider>
                      </UploadManagerProvider>
                    </SemesterProvider>
                  </SyncProvider>
                </ToastProvider>
              </I18nProvider>
            </AuthProvider>
          </AccessibilityProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
