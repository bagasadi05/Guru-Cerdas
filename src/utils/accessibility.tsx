/**
 * Accessibility Utilities
 * 
 * This file provides components and hooks for improving accessibility:
 * - Screen reader announcements
 * - Aria label helpers
 * - Focus management
 * - Keyboard navigation
 */

import React, { useEffect, useRef, useState, useCallback, createContext, useContext } from 'react';

// ============================================
// SCREEN READER ANNOUNCER
// ============================================

interface AnnouncerContextType {
    announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AnnouncerContext = createContext<AnnouncerContextType | null>(null);

/**
 * Provider for screen reader announcements
 */
export const AnnouncerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [politeMessage, setPoliteMessage] = useState('');
    const [assertiveMessage, setAssertiveMessage] = useState('');

    const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
        if (priority === 'assertive') {
            setAssertiveMessage('');
            setTimeout(() => setAssertiveMessage(message), 100);
        } else {
            setPoliteMessage('');
            setTimeout(() => setPoliteMessage(message), 100);
        }
    }, []);

    return (
        <AnnouncerContext.Provider value={{ announce }}>
            {children}
            {/* Screen reader only live regions */}
            <div className="a11y-announcer" aria-live="polite" aria-atomic="true">
                {politeMessage}
            </div>
            <div className="a11y-announcer" aria-live="assertive" aria-atomic="true">
                {assertiveMessage}
            </div>
        </AnnouncerContext.Provider>
    );
};

/**
 * Hook to announce messages to screen readers
 */
export function useAnnounce() {
    const context = useContext(AnnouncerContext);

    // Return a no-op function if not inside provider
    const noopAnnounce = useCallback((_message: string, _priority?: 'polite' | 'assertive') => { }, []);

    return context?.announce ?? noopAnnounce;
}

// ============================================
// VISUALLY HIDDEN COMPONENT
// ============================================

interface VisuallyHiddenProps {
    children: React.ReactNode;
    as?: 'span' | 'div' | 'label';
}

/**
 * Component that hides content visually but keeps it accessible to screen readers
 */
export const VisuallyHidden: React.FC<VisuallyHiddenProps> = ({
    children,
    as: Component = 'span'
}) => {
    return (
        <Component className="a11y-hidden">
            {children}
        </Component>
    );
};

// ============================================
// ICON BUTTON WITH REQUIRED ARIA-LABEL
// ============================================

interface IconButtonProps {
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'ghost' | 'primary' | 'danger';
}

/**
 * Icon-only button with required aria-label for accessibility
 */
export const IconButton: React.FC<IconButtonProps> = ({
    icon,
    label,
    onClick,
    disabled = false,
    className = '',
    size = 'md',
    variant = 'default'
}) => {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-12 h-12',
    }[size];

    const variantClasses = {
        default: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700',
        ghost: 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800',
        primary: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50',
        danger: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-900/50',
    }[variant];

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            title={label}
            className={`
                inline-flex items-center justify-center rounded-lg
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                touch-target
                ${sizeClasses}
                ${variantClasses}
                ${className}
            `}
        >
            {icon}
        </button>
    );
};

// ============================================
// FOCUS TRAP
// ============================================

interface FocusTrapProps {
    children: React.ReactNode;
    active?: boolean;
    className?: string;
}

/**
 * Traps focus within a container (useful for modals and dialogs)
 */
export const FocusTrap: React.FC<FocusTrapProps> = ({
    children,
    active = true,
    className = ''
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!active || !containerRef.current) return;

        const container = containerRef.current;
        const focusableElements = container.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };

        container.addEventListener('keydown', handleKeyDown);

        // Focus first element on mount
        firstElement.focus();

        return () => {
            container.removeEventListener('keydown', handleKeyDown);
        };
    }, [active]);

    return (
        <div ref={containerRef} className={className}>
            {children}
        </div>
    );
};

// ============================================
// SKIP LINK
// ============================================

interface SkipLinkProps {
    targetId: string;
    children?: React.ReactNode;
}

/**
 * Skip to main content link for keyboard navigation
 */
export const SkipLink: React.FC<SkipLinkProps> = ({
    targetId,
    children = 'Langsung ke konten utama'
}) => {
    return (
        <a
            href={`#${targetId}`}
            className="skip-link"
        >
            {children}
        </a>
    );
};

// ============================================
// ARIA LABEL GENERATOR UTILITY
// ============================================

/**
 * Generate consistent aria-labels for common UI actions
 */
export const ariaLabels = {
    // Navigation
    openMenu: 'Buka menu navigasi',
    closeMenu: 'Tutup menu navigasi',
    openSidebar: 'Buka sidebar',
    closeSidebar: 'Tutup sidebar',

    // Actions
    add: (item: string) => `Tambah ${item}`,
    edit: (item: string) => `Edit ${item}`,
    delete: (item: string) => `Hapus ${item}`,
    save: (item?: string) => item ? `Simpan ${item}` : 'Simpan',
    cancel: 'Batalkan',
    close: 'Tutup',
    search: 'Cari',
    filter: 'Filter',
    sort: 'Urutkan',
    refresh: 'Muat ulang',
    export: 'Ekspor data',
    import: 'Impor data',

    // Form
    clearInput: 'Hapus input',
    showPassword: 'Tampilkan password',
    hidePassword: 'Sembunyikan password',
    selectDate: 'Pilih tanggal',
    selectTime: 'Pilih waktu',
    uploadFile: 'Unggah file',

    // Modals
    openModal: (title: string) => `Buka ${title}`,
    closeModal: 'Tutup modal',

    // Notifications
    dismiss: 'Tutup notifikasi',
    markAsRead: 'Tandai sudah dibaca',

    // Pagination
    firstPage: 'Halaman pertama',
    previousPage: 'Halaman sebelumnya',
    nextPage: 'Halaman berikutnya',
    lastPage: 'Halaman terakhir',
    goToPage: (page: number) => `Ke halaman ${page}`,

    // Status
    loading: 'Sedang memuat...',
    success: 'Berhasil',
    error: 'Terjadi kesalahan',
};

// ============================================
// KEYBOARD NAVIGATION HELPER
// ============================================

interface UseRovingFocusOptions {
    orientation?: 'horizontal' | 'vertical' | 'both';
    wrap?: boolean;
}

/**
 * Hook for roving tabindex keyboard navigation (arrow keys in groups)
 */
export function useRovingFocus(
    itemCount: number,
    options: UseRovingFocusOptions = {}
) {
    const { orientation = 'vertical', wrap = true } = options;
    const [focusedIndex, setFocusedIndex] = useState(0);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        let newIndex = focusedIndex;

        const isNext =
            (orientation !== 'vertical' && e.key === 'ArrowRight') ||
            (orientation !== 'horizontal' && e.key === 'ArrowDown');

        const isPrev =
            (orientation !== 'vertical' && e.key === 'ArrowLeft') ||
            (orientation !== 'horizontal' && e.key === 'ArrowUp');

        if (isNext) {
            e.preventDefault();
            newIndex = focusedIndex + 1;
            if (newIndex >= itemCount) {
                newIndex = wrap ? 0 : itemCount - 1;
            }
        } else if (isPrev) {
            e.preventDefault();
            newIndex = focusedIndex - 1;
            if (newIndex < 0) {
                newIndex = wrap ? itemCount - 1 : 0;
            }
        } else if (e.key === 'Home') {
            e.preventDefault();
            newIndex = 0;
        } else if (e.key === 'End') {
            e.preventDefault();
            newIndex = itemCount - 1;
        }

        if (newIndex !== focusedIndex) {
            setFocusedIndex(newIndex);
        }
    }, [focusedIndex, itemCount, orientation, wrap]);

    return {
        focusedIndex,
        setFocusedIndex,
        handleKeyDown,
        getTabIndex: (index: number) => index === focusedIndex ? 0 : -1,
    };
}

export default {
    AnnouncerProvider,
    useAnnounce,
    VisuallyHidden,
    IconButton,
    FocusTrap,
    SkipLink,
    ariaLabels,
    useRovingFocus,
};
