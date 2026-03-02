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
      className={`bg-red-500/10 border border-red-500/20 rounded-xl p-4 ${fullWidth ? 'w-full' : 'max-w-md'} ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertCircleIcon className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-semibold text-red-200">{title}</h4>
          <p className="text-sm text-red-300 mt-1">{message}</p>
          {onRetry && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-red-300 hover:text-red-200"
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
