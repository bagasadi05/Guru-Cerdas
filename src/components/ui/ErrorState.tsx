import React from 'react';
import { AlertCircleIcon } from '../Icons';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  fullWidth?: boolean;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Terjadi Kesalahan',
  message,
  onRetry,
  fullWidth = false,
  className = '',
}) => {
  return (
    <div
      className={`bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-xl p-4 ${fullWidth ? 'w-full' : 'max-w-md'} ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertCircleIcon className="w-5 h-5 text-rose-500 dark:text-rose-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-semibold text-rose-800 dark:text-rose-200">{title}</h4>
          <p className="text-sm text-rose-700 dark:text-rose-300 mt-1">{message}</p>
          {onRetry && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-rose-700 dark:text-rose-300 hover:text-rose-800 dark:hover:text-rose-200"
              onClick={onRetry}
            >
              Coba Lagi
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorState;
