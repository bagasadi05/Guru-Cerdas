import React from 'react';

interface SkipLink {
    id: string;
    label: string;
}

interface SkipLinksProps {
    links?: SkipLink[];
}

export const SkipLinks: React.FC<SkipLinksProps> = ({
    links = [
        { id: 'main-content', label: 'Lewati ke konten utama' },
        { id: 'main-navigation', label: 'Lewati ke navigasi' }
    ]
}) => {
    return (
        <div className="skip-links">
            {links.map(link => (
                <a
                    key={link.id}
                    href={`#${link.id}`}
                    className="
                        sr-only focus:not-sr-only
                        focus:fixed focus:left-4 focus:top-4 focus:z-[9999]
                        focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-white
                        focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white
                    "
                >
                    {link.label}
                </a>
            ))}
        </div>
    );
};

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    loading?: boolean;
    loadingText?: string;
}

export const AccessibleButton = React.forwardRef<HTMLButtonElement, AccessibleButtonProps>(
    ({ children, loading, loadingText = 'Memuat...', disabled, ...props }, ref) => {
        return (
            <button
                ref={ref}
                disabled={disabled || loading}
                aria-disabled={disabled || loading}
                aria-busy={loading}
                {...props}
            >
                {loading ? (
                    <>
                        <span className="sr-only">{loadingText}</span>
                        <span aria-hidden="true">{loadingText}</span>
                    </>
                ) : children}
            </button>
        );
    }
);

AccessibleButton.displayName = 'AccessibleButton';

export const ScreenReaderOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="sr-only">{children}</span>
);

interface FocusRingProps {
    children: React.ReactElement;
    className?: string;
}

export const FocusRing: React.FC<FocusRingProps> = ({ children, className = '' }) => {
    return React.cloneElement(children, {
        className: `${children.props.className || ''} focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${className}`
    });
};

interface AccessibleIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: React.ReactNode;
    label: string;
}

export const AccessibleIconButton: React.FC<AccessibleIconButtonProps> = ({
    icon,
    label,
    className = '',
    ...props
}) => {
    return (
        <button
            aria-label={label}
            title={label}
            className={`rounded-lg p-2 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:hover:bg-slate-800 ${className}`}
            {...props}
        >
            {icon}
            <span className="sr-only">{label}</span>
        </button>
    );
};

interface LoadingAnnouncementProps {
    isLoading: boolean;
    loadingMessage?: string;
    loadedMessage?: string;
}

export const LoadingAnnouncement: React.FC<LoadingAnnouncementProps> = ({
    isLoading,
    loadingMessage = 'Memuat...',
    loadedMessage = 'Selesai memuat'
}) => {
    return (
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {isLoading ? loadingMessage : loadedMessage}
        </div>
    );
};
