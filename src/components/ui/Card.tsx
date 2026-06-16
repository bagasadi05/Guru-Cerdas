import React from 'react';
import { componentStyles, cx } from '../../styles/designTokens';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div
    className={cx(componentStyles.card, className)}
    {...props}
  />
);

export const CardInteractive: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div
    className={cx(componentStyles.cardInteractive, className)}
    {...props}
  />
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div
    className={cx('p-4 border-b border-slate-200/70 dark:border-slate-700/60 relative', className)}
    {...props}
  />
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => (
  <h3
    className={cx('text-base font-semibold text-slate-900 dark:text-white leading-tight', className)}
    {...props}
  />
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, ...props }) => (
  <p
    className={cx('text-sm text-slate-500 dark:text-slate-400 mt-1 leading-normal', className)}
    {...props}
  />
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div
    className={cx('p-4', className)}
    {...props}
  />
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div
    className={cx('p-4 border-t border-slate-200/70 dark:border-slate-700/60', className)}
    {...props}
  />
);
