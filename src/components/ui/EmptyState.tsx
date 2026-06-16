import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  cta?: { label: string; onClick: () => void };
  variant?: 'card' | 'inline';
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  cta,
  variant = 'inline',
  className = '',
}) => {
  const iconElement = icon && React.isValidElement(icon)
    ? React.cloneElement(icon as React.ReactElement, { className: 'w-8 h-8 text-slate-500 dark:text-slate-400' })
    : icon;

  const btnLabel = cta?.label || actionLabel;
  const btnClick = cta?.onClick || onAction;

  const containerClasses = variant === 'card'
    ? 'flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm'
    : 'flex flex-col items-center justify-center py-12 px-4 text-center';

  return (
    <div className={`${containerClasses} ${className}`}>
      {iconElement && (
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
          {iconElement}
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-xs">
          {description}
        </p>
      )}
      {btnClick && btnLabel && (
        <Button variant="primary" size="default" onClick={btnClick}>
          {btnLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
