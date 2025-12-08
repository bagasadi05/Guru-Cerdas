import React from 'react';

/**
 * Skip Link Component
 * Allows keyboard users to skip to main content
 */
interface SkipLinkProps {
    targetId?: string;
    children?: React.ReactNode;
}

export const SkipLink: React.FC<SkipLinkProps> = ({
    targetId = 'main-content',
    children = 'Lewati ke konten utama'
}) => {
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        const target = document.getElementById(targetId);
        if (target) {
            target.tabIndex = -1;
            target.focus();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <a
            href={`#${targetId}`}
            onClick={handleClick}
            className="
                sr-only focus:not-sr-only
                focus:fixed focus:top-4 focus:left-4 focus:z-[9999]
                focus:px-4 focus:py-2 focus:rounded-lg
                focus:bg-indigo-600 focus:text-white
                focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-400
            "
        >
            {children}
        </a>
    );
};

/**
 * Screen Reader Only Text
 * Visually hidden but accessible to screen readers
 */
interface SrOnlyProps {
    children: React.ReactNode;
    as?: keyof JSX.IntrinsicElements;
}

export const SrOnly: React.FC<SrOnlyProps> = ({ children, as: Component = 'span' }) => {
    return (
        <Component className="sr-only">
            {children}
        </Component>
    );
};

/**
 * Live Region for announcements
 */
interface LiveRegionProps {
    message: string;
    priority?: 'polite' | 'assertive';
    atomic?: boolean;
}

export const LiveRegion: React.FC<LiveRegionProps> = ({
    message,
    priority = 'polite',
    atomic = true
}) => {
    return (
        <div
            role={priority === 'assertive' ? 'alert' : 'status'}
            aria-live={priority}
            aria-atomic={atomic}
            className="sr-only"
        >
            {message}
        </div>
    );
};

/**
 * Accessible Icon Button
 */
interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: React.ReactNode;
    label: string;
    srLabel?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
    icon,
    label,
    srLabel,
    className = '',
    ...props
}) => {
    return (
        <button
            aria-label={srLabel || label}
            title={label}
            className={`
                inline-flex items-center justify-center
                p-2 rounded-lg
                hover:bg-slate-100 dark:hover:bg-slate-800
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                transition-colors
                ${className}
            `}
            {...props}
        >
            {icon}
            <SrOnly>{srLabel || label}</SrOnly>
        </button>
    );
};

/**
 * Focus Visible Wrapper
 * Adds focus-visible styles for keyboard focus only
 */
interface FocusVisibleProps {
    children: React.ReactNode;
    className?: string;
}

export const FocusVisible: React.FC<FocusVisibleProps> = ({ children, className = '' }) => {
    return (
        <div className={`focus-visible:ring-2 focus-visible:ring-indigo-500 ${className}`}>
            {children}
        </div>
    );
};

/**
 * Accessible Loading Spinner
 */
interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    label?: string;
}

export const AccessibleSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    label = 'Memuat...'
}) => {
    const sizeClasses = {
        sm: 'w-4 h-4 border-2',
        md: 'w-8 h-8 border-3',
        lg: 'w-12 h-12 border-4'
    };

    return (
        <div role="status" aria-live="polite" className="flex items-center gap-2">
            <div
                className={`
                    ${sizeClasses[size]}
                    border-indigo-500 border-t-transparent 
                    rounded-full animate-spin
                `}
                aria-hidden="true"
            />
            <SrOnly>{label}</SrOnly>
        </div>
    );
};

/**
 * Accessible Progress Bar
 */
interface ProgressBarProps {
    value: number;
    max?: number;
    label?: string;
    showValue?: boolean;
}

export const AccessibleProgress: React.FC<ProgressBarProps> = ({
    value,
    max = 100,
    label = 'Progres',
    showValue = true
}) => {
    const percentage = Math.round((value / max) * 100);

    return (
        <div className="w-full">
            {label && (
                <div className="flex justify-between mb-1 text-sm">
                    <span className="text-slate-700 dark:text-slate-300">{label}</span>
                    {showValue && (
                        <span className="text-slate-600 dark:text-slate-400">{percentage}%</span>
                    )}
                </div>
            )}
            <div
                role="progressbar"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={max}
                aria-label={`${label}: ${percentage}%`}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
            >
                <div
                    className="h-full bg-indigo-600 transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

/**
 * Accessible Tabs
 */
interface TabsProps {
    tabs: Array<{ id: string; label: string; content: React.ReactNode }>;
    defaultTab?: string;
    label?: string;
}

export const AccessibleTabs: React.FC<TabsProps> = ({
    tabs,
    defaultTab,
    label = 'Tabs'
}) => {
    const [activeTab, setActiveTab] = React.useState(defaultTab || tabs[0]?.id);

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        let newIndex = index;

        switch (e.key) {
            case 'ArrowLeft':
                newIndex = index > 0 ? index - 1 : tabs.length - 1;
                break;
            case 'ArrowRight':
                newIndex = index < tabs.length - 1 ? index + 1 : 0;
                break;
            case 'Home':
                newIndex = 0;
                break;
            case 'End':
                newIndex = tabs.length - 1;
                break;
            default:
                return;
        }

        e.preventDefault();
        setActiveTab(tabs[newIndex].id);
        // Focus the new tab
        const button = document.getElementById(`tab-${tabs[newIndex].id}`);
        button?.focus();
    };

    return (
        <div>
            <div
                role="tablist"
                aria-label={label}
                className="flex gap-1 border-b border-slate-200 dark:border-slate-700"
            >
                {tabs.map((tab, index) => (
                    <button
                        key={tab.id}
                        id={`tab-${tab.id}`}
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        aria-controls={`panel-${tab.id}`}
                        tabIndex={activeTab === tab.id ? 0 : -1}
                        onClick={() => setActiveTab(tab.id)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        className={`
                            px-4 py-2 text-sm font-medium rounded-t-lg
                            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-inset
                            transition-colors
                            ${activeTab === tab.id
                                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                            }
                        `}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            {tabs.map((tab) => (
                <div
                    key={tab.id}
                    id={`panel-${tab.id}`}
                    role="tabpanel"
                    aria-labelledby={`tab-${tab.id}`}
                    hidden={activeTab !== tab.id}
                    tabIndex={0}
                    className="p-4 focus:outline-none"
                >
                    {tab.content}
                </div>
            ))}
        </div>
    );
};

/**
 * Accessible Alert/Notification
 */
interface AlertProps {
    type: 'info' | 'success' | 'warning' | 'error';
    title?: string;
    children: React.ReactNode;
    dismissible?: boolean;
    onDismiss?: () => void;
}

const alertStyles = {
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
    warning: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
};

export const AccessibleAlert: React.FC<AlertProps> = ({
    type,
    title,
    children,
    dismissible = false,
    onDismiss
}) => {
    return (
        <div
            role={type === 'error' ? 'alert' : 'status'}
            aria-live={type === 'error' ? 'assertive' : 'polite'}
            className={`
                p-4 rounded-lg border
                ${alertStyles[type]}
            `}
        >
            <div className="flex items-start gap-3">
                <div className="flex-1">
                    {title && (
                        <h3 className="font-semibold mb-1">{title}</h3>
                    )}
                    <div className="text-sm">{children}</div>
                </div>
                {dismissible && onDismiss && (
                    <button
                        onClick={onDismiss}
                        aria-label="Tutup"
                        className="p-1 rounded hover:bg-black/10 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
};

export default {
    SkipLink,
    SrOnly,
    LiveRegion,
    IconButton,
    AccessibleSpinner,
    AccessibleProgress,
    AccessibleTabs,
    AccessibleAlert
};
