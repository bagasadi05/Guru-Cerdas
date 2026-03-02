import React from 'react';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div
    className={['bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200/60 dark:border-slate-700/60 transition-all duration-200', className].filter(Boolean).join(' ')}
    {...props}
  />
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div
    className={['p-4 border-b border-slate-200/70 dark:border-slate-700/60 relative', className].filter(Boolean).join(' ')}
    {...props}
  />
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({ className, ...props }) => (
  <h3
    className={['text-base font-semibold text-slate-900 dark:text-white leading-tight', className].filter(Boolean).join(' ')}
    {...props}
  />
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({ className, ...props }) => (
  <p
    className={['text-sm text-slate-500 dark:text-slate-400 mt-1 leading-normal', className].filter(Boolean).join(' ')}
    {...props}
  />
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div
    className={['p-4', className].filter(Boolean).join(' ')}
    {...props}
  />
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div
    className={['p-4 border-t border-slate-200/70 dark:border-slate-700/60', className].filter(Boolean).join(' ')}
    {...props}
  />
);
