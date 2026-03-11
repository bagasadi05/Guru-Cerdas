import React from 'react';

export const DashboardPanel: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
    className,
    ...props
}) => (
    <div
        className={['overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-900', className].filter(Boolean).join(' ')}
        {...props}
    />
);

export const DashboardPanelHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
    className,
    ...props
}) => (
    <div
        className={['border-b border-slate-200/60 p-4 dark:border-slate-700/60', className].filter(Boolean).join(' ')}
        {...props}
    />
);

export const DashboardPanelContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
    className,
    ...props
}) => (
    <div
        className={['p-4', className].filter(Boolean).join(' ')}
        {...props}
    />
);
