import React, { useRef, useEffect, useCallback, useState, createContext, useContext } from 'react';

/**
 * Enhanced Accessibility Components
 * Features: ARIA labels, keyboard navigation, focus management, skip links, screen reader utilities
 */

// ============================================
// SKIP LINKS COMPONENT
// ============================================

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
            {links.map((link) => (
                <a
                    key={link.id}
                    href={`#${link.id}`}
                    className="
                        sr-only focus:not-sr-only 
                        focus:fixed focus:top-4 focus:left-4 focus:z-[9999]
                        focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white
                        focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white
                    "
                >
                    {link.label}
                </a>
            ))}
        </div>
    );
};

// ============================================
// FOCUS TRAP HOOK
// ============================================

export function useFocusTrap(enabled: boolean = true) {
    const containerRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!enabled || !containerRef.current) return;

        // Save previous focus
        previousFocusRef.current = document.activeElement as HTMLElement;

        // Focus first focusable element
        const focusableElements = getFocusableElements(containerRef.current);
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab' || !containerRef.current) return;

            const focusableElements = getFocusableElements(containerRef.current);
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement?.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement?.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            // Restore previous focus
            previousFocusRef.current?.focus();
        };
    }, [enabled]);

    return containerRef;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
    const focusableSelectors = [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
    ];

    return Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelectors.join(','))
    ).filter(el => el.offsetParent !== null);
}

// ============================================
// FOCUS MANAGEMENT CONTEXT
// ============================================

interface FocusContextValue {
    focusedId: string | null;
    setFocusedId: (id: string | null) => void;
    registerElement: (id: string, ref: React.RefObject<HTMLElement>) => void;
    unregisterElement: (id: string) => void;
    focusElement: (id: string) => void;
    focusNext: () => void;
    focusPrevious: () => void;
}

const FocusContext = createContext<FocusContextValue | null>(null);

export const FocusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [focusedId, setFocusedId] = useState<string | null>(null);
    const elementsRef = useRef<Map<string, React.RefObject<HTMLElement>>>(new Map());
    const orderRef = useRef<string[]>([]);

    const registerElement = useCallback((id: string, ref: React.RefObject<HTMLElement>) => {
        elementsRef.current.set(id, ref);
        if (!orderRef.current.includes(id)) {
            orderRef.current.push(id);
        }
    }, []);

    const unregisterElement = useCallback((id: string) => {
        elementsRef.current.delete(id);
        orderRef.current = orderRef.current.filter(i => i !== id);
    }, []);

    const focusElement = useCallback((id: string) => {
        const ref = elementsRef.current.get(id);
        if (ref?.current) {
            ref.current.focus();
            setFocusedId(id);
        }
    }, []);

    const focusNext = useCallback(() => {
        const currentIndex = focusedId ? orderRef.current.indexOf(focusedId) : -1;
        const nextIndex = (currentIndex + 1) % orderRef.current.length;
        focusElement(orderRef.current[nextIndex]);
    }, [focusedId, focusElement]);

    const focusPrevious = useCallback(() => {
        const currentIndex = focusedId ? orderRef.current.indexOf(focusedId) : 0;
        const prevIndex = currentIndex === 0 ? orderRef.current.length - 1 : currentIndex - 1;
        focusElement(orderRef.current[prevIndex]);
    }, [focusedId, focusElement]);

    return (
        <FocusContext.Provider value={{
            focusedId,
            setFocusedId,
            registerElement,
            unregisterElement,
            focusElement,
            focusNext,
            focusPrevious
        }}>
            {children}
        </FocusContext.Provider>
    );
};

export const useFocusManagement = () => {
    const context = useContext(FocusContext);
    if (!context) {
        throw new Error('useFocusManagement must be used within FocusProvider');
    }
    return context;
};

// ============================================
// KEYBOARD NAVIGATION HOOK
// ============================================

interface KeyboardNavigationOptions {
    onEnter?: () => void;
    onEscape?: () => void;
    onArrowUp?: () => void;
    onArrowDown?: () => void;
    onArrowLeft?: () => void;
    onArrowRight?: () => void;
    onHome?: () => void;
    onEnd?: () => void;
    onTab?: (shiftKey: boolean) => void;
    preventDefault?: boolean;
}

export function useKeyboardNavigation(options: KeyboardNavigationOptions) {
    const handleKeyDown = useCallback((e: KeyboardEvent | React.KeyboardEvent) => {
        const { key, shiftKey } = e;

        switch (key) {
            case 'Enter':
                if (options.onEnter) {
                    if (options.preventDefault) e.preventDefault();
                    options.onEnter();
                }
                break;
            case 'Escape':
                if (options.onEscape) {
                    if (options.preventDefault) e.preventDefault();
                    options.onEscape();
                }
                break;
            case 'ArrowUp':
                if (options.onArrowUp) {
                    if (options.preventDefault) e.preventDefault();
                    options.onArrowUp();
                }
                break;
            case 'ArrowDown':
                if (options.onArrowDown) {
                    if (options.preventDefault) e.preventDefault();
                    options.onArrowDown();
                }
                break;
            case 'ArrowLeft':
                if (options.onArrowLeft) {
                    if (options.preventDefault) e.preventDefault();
                    options.onArrowLeft();
                }
                break;
            case 'ArrowRight':
                if (options.onArrowRight) {
                    if (options.preventDefault) e.preventDefault();
                    options.onArrowRight();
                }
                break;
            case 'Home':
                if (options.onHome) {
                    if (options.preventDefault) e.preventDefault();
                    options.onHome();
                }
                break;
            case 'End':
                if (options.onEnd) {
                    if (options.preventDefault) e.preventDefault();
                    options.onEnd();
                }
                break;
            case 'Tab':
                if (options.onTab) {
                    options.onTab(shiftKey);
                }
                break;
        }
    }, [options]);

    return { onKeyDown: handleKeyDown };
}

// ============================================
// ROVING TABINDEX HOOK
// ============================================

export function useRovingTabIndex(itemCount: number, orientation: 'horizontal' | 'vertical' = 'vertical') {
    const [activeIndex, setActiveIndex] = useState(0);

    const { onKeyDown } = useKeyboardNavigation({
        onArrowDown: orientation === 'vertical' ? () => {
            setActiveIndex(prev => (prev + 1) % itemCount);
        } : undefined,
        onArrowUp: orientation === 'vertical' ? () => {
            setActiveIndex(prev => (prev - 1 + itemCount) % itemCount);
        } : undefined,
        onArrowRight: orientation === 'horizontal' ? () => {
            setActiveIndex(prev => (prev + 1) % itemCount);
        } : undefined,
        onArrowLeft: orientation === 'horizontal' ? () => {
            setActiveIndex(prev => (prev - 1 + itemCount) % itemCount);
        } : undefined,
        onHome: () => setActiveIndex(0),
        onEnd: () => setActiveIndex(itemCount - 1),
        preventDefault: true
    });

    const getTabIndex = useCallback((index: number) => {
        return index === activeIndex ? 0 : -1;
    }, [activeIndex]);

    return { activeIndex, setActiveIndex, onKeyDown, getTabIndex };
}

// ============================================
// ACCESSIBLE BUTTON
// ============================================

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
                ) : (
                    children
                )}
            </button>
        );
    }
);

AccessibleButton.displayName = 'AccessibleButton';

// ============================================
// ACCESSIBLE MODAL
// ============================================

interface AccessibleModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: React.ReactNode;
    closeOnEscape?: boolean;
    closeOnOverlay?: boolean;
}

export const AccessibleModal: React.FC<AccessibleModalProps> = ({
    isOpen,
    onClose,
    title,
    description,
    children,
    closeOnEscape = true,
    closeOnOverlay = true
}) => {
    const containerRef = useFocusTrap(isOpen);
    const uniqueId = React.useId();
    const titleId = `modal-title-${uniqueId}`;
    const descId = description ? `modal-desc-${uniqueId}` : undefined;

    const { onKeyDown } = useKeyboardNavigation({
        onEscape: closeOnEscape ? onClose : undefined
    });

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', onKeyDown as any);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', onKeyDown as any);
            document.body.style.overflow = '';
        };
    }, [isOpen, onKeyDown]);

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className="fixed inset-0 z-50 flex items-center justify-center"
        >
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={closeOnOverlay ? onClose : undefined}
                aria-hidden="true"
            />

            {/* Modal Content */}
            <div
                ref={containerRef}
                className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-auto"
            >
                <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                        <h2 id={titleId} className="text-xl font-semibold text-slate-900 dark:text-white">
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            aria-label="Tutup modal"
                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    {description && (
                        <p id={descId} className="text-slate-600 dark:text-slate-400 mb-4">
                            {description}
                        </p>
                    )}
                    {children}
                </div>
            </div>
        </div>
    );
};

// ============================================
// LIVE REGION FOR ANNOUNCEMENTS
// ============================================

interface LiveRegionContextValue {
    announce: (message: string, politeness?: 'polite' | 'assertive') => void;
}

const LiveRegionContext = createContext<LiveRegionContextValue | null>(null);

export const LiveRegionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [politeMessage, setPoliteMessage] = useState('');
    const [assertiveMessage, setAssertiveMessage] = useState('');

    const announce = useCallback((message: string, politeness: 'polite' | 'assertive' = 'polite') => {
        if (politeness === 'assertive') {
            setAssertiveMessage('');
            setTimeout(() => setAssertiveMessage(message), 50);
        } else {
            setPoliteMessage('');
            setTimeout(() => setPoliteMessage(message), 50);
        }
    }, []);

    return (
        <LiveRegionContext.Provider value={{ announce }}>
            {children}
            {/* Screen reader live regions */}
            <div
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
            >
                {politeMessage}
            </div>
            <div
                aria-live="assertive"
                aria-atomic="true"
                className="sr-only"
            >
                {assertiveMessage}
            </div>
        </LiveRegionContext.Provider>
    );
};

export const useLiveRegion = () => {
    const context = useContext(LiveRegionContext);
    if (!context) {
        throw new Error('useLiveRegion must be used within LiveRegionProvider');
    }
    return context;
};

// ============================================
// SCREEN READER ONLY TEXT
// ============================================

export const ScreenReaderOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="sr-only">{children}</span>
);

// ============================================
// ACCESSIBLE FORM FIELD
// ============================================

interface AccessibleFieldProps {
    id: string;
    label: string;
    error?: string;
    description?: string;
    required?: boolean;
    children: React.ReactElement;
}

export const AccessibleField: React.FC<AccessibleFieldProps> = ({
    id,
    label,
    error,
    description,
    required,
    children
}) => {
    const descId = description ? `${id}-desc` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [descId, errorId].filter(Boolean).join(' ') || undefined;

    return (
        <div className="space-y-1.5">
            <label
                htmlFor={id}
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
                {label}
                {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
                {required && <span className="sr-only">(wajib diisi)</span>}
            </label>

            {React.cloneElement(children, {
                id,
                'aria-describedby': describedBy,
                'aria-invalid': !!error,
                'aria-required': required
            })}

            {description && (
                <p id={descId} className="text-sm text-slate-500 dark:text-slate-400">
                    {description}
                </p>
            )}

            {error && (
                <p id={errorId} role="alert" className="text-sm text-red-500">
                    {error}
                </p>
            )}
        </div>
    );
};

// ============================================
// COLOR CONTRAST CHECKER
// ============================================

export function checkColorContrast(foreground: string, background: string): {
    ratio: number;
    aa: boolean;
    aaa: boolean;
    aaLarge: boolean;
    aaaLarge: boolean;
} {
    const getLuminance = (color: string): number => {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16) / 255;
        const g = parseInt(hex.substr(2, 2), 16) / 255;
        const b = parseInt(hex.substr(4, 2), 16) / 255;

        const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

        return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    };

    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    return {
        ratio: Math.round(ratio * 100) / 100,
        aa: ratio >= 4.5,
        aaa: ratio >= 7,
        aaLarge: ratio >= 3,
        aaaLarge: ratio >= 4.5
    };
}

// ============================================
// ACCESSIBLE DATA TABLE
// ============================================

interface Column<T> {
    key: keyof T;
    header: string;
    sortable?: boolean;
}

interface AccessibleTableProps<T> {
    data: T[];
    columns: Column<T>[];
    caption?: string;
    sortColumn?: keyof T;
    sortDirection?: 'asc' | 'desc';
    onSort?: (column: keyof T) => void;
    emptyMessage?: string;
}

export function AccessibleTable<T extends { id: string | number }>({
    data,
    columns,
    caption,
    sortColumn,
    sortDirection,
    onSort,
    emptyMessage = 'Tidak ada data'
}: AccessibleTableProps<T>) {
    return (
        <div className="overflow-x-auto" role="region" aria-label={caption || 'Tabel data'}>
            <table className="w-full">
                {caption && <caption className="sr-only">{caption}</caption>}
                <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                        {columns.map((column) => (
                            <th
                                key={String(column.key)}
                                scope="col"
                                className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white"
                                aria-sort={
                                    sortColumn === column.key
                                        ? sortDirection === 'asc' ? 'ascending' : 'descending'
                                        : undefined
                                }
                            >
                                {column.sortable && onSort ? (
                                    <button
                                        onClick={() => onSort(column.key)}
                                        className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
                                    >
                                        {column.header}
                                        <span aria-hidden="true">
                                            {sortColumn === column.key ? (
                                                sortDirection === 'asc' ? '↑' : '↓'
                                            ) : '↕'}
                                        </span>
                                    </button>
                                ) : (
                                    column.header
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td
                                colSpan={columns.length}
                                className="px-4 py-8 text-center text-slate-500 dark:text-slate-400"
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((row) => (
                            <tr
                                key={row.id}
                                className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                            >
                                {columns.map((column) => (
                                    <td
                                        key={String(column.key)}
                                        className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300"
                                    >
                                        {String(row[column.key])}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}

// ============================================
// HIGH CONTRAST MODE
// ============================================

const HIGH_CONTRAST_KEY = 'portal_guru_high_contrast';

export function useHighContrast() {
    const [isHighContrast, setIsHighContrast] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem(HIGH_CONTRAST_KEY) === 'true';
    });

    useEffect(() => {
        if (isHighContrast) {
            document.documentElement.classList.add('high-contrast');
        } else {
            document.documentElement.classList.remove('high-contrast');
        }
        localStorage.setItem(HIGH_CONTRAST_KEY, String(isHighContrast));
    }, [isHighContrast]);

    const toggle = useCallback(() => {
        setIsHighContrast(prev => !prev);
    }, []);

    return { isHighContrast, setHighContrast: setIsHighContrast, toggle };
}

// High contrast CSS classes (add to your CSS)
// .high-contrast { filter: contrast(1.4) saturate(0); }
// .high-contrast * { border-color: currentColor !important; }
// .high-contrast button, .high-contrast a { text-decoration: underline; }

interface HighContrastToggleProps {
    className?: string;
}

export const HighContrastToggle: React.FC<HighContrastToggleProps> = ({ className = '' }) => {
    const { isHighContrast, toggle } = useHighContrast();

    return (
        <button
            onClick={toggle}
            aria-pressed={isHighContrast}
            className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${className}`}
            title={isHighContrast ? 'Matikan kontras tinggi' : 'Aktifkan kontras tinggi'}
        >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="2"
                    fill={isHighContrast ? 'currentColor' : 'none'}
                />
                <path
                    d="M12 2a10 10 0 0 1 0 20"
                    fill={isHighContrast ? 'white' : 'currentColor'}
                    strokeWidth="0"
                />
            </svg>
            <span className="sr-only">
                {isHighContrast ? 'Kontras tinggi aktif' : 'Kontras tinggi nonaktif'}
            </span>
        </button>
    );
};

// ============================================
// REDUCE MOTION
// ============================================

export function useReducedMotion() {
    const [reducedMotion, setReducedMotion] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });

    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

        const handleChange = (e: MediaQueryListEvent) => {
            setReducedMotion(e.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    useEffect(() => {
        if (reducedMotion) {
            document.documentElement.classList.add('reduce-motion');
        } else {
            document.documentElement.classList.remove('reduce-motion');
        }
    }, [reducedMotion]);

    return reducedMotion;
}

// CSS: .reduce-motion * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }

// ============================================
// KEYBOARD SHORTCUTS PANEL
// ============================================

export interface KeyboardShortcut {
    keys: string[];
    description: string;
    category?: string;
}

export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
    // Navigasi
    { keys: ['Alt', '1'], description: 'Pergi ke Dashboard', category: 'Navigasi' },
    { keys: ['Alt', '2'], description: 'Pergi ke Siswa', category: 'Navigasi' },
    { keys: ['Alt', '3'], description: 'Pergi ke Absensi', category: 'Navigasi' },
    { keys: ['Alt', '4'], description: 'Pergi ke Tugas', category: 'Navigasi' },
    { keys: ['Alt', '5'], description: 'Pergi ke Jadwal', category: 'Navigasi' },

    // Aksi
    { keys: ['Ctrl', 'S'], description: 'Simpan perubahan', category: 'Aksi' },
    { keys: ['Ctrl', 'Z'], description: 'Undo', category: 'Aksi' },
    { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo', category: 'Aksi' },
    { keys: ['Ctrl', 'F'], description: 'Cari', category: 'Aksi' },
    { keys: ['Escape'], description: 'Tutup modal/cancel', category: 'Aksi' },

    // Aksesibilitas
    { keys: ['Tab'], description: 'Pindah ke elemen berikutnya', category: 'Aksesibilitas' },
    { keys: ['Shift', 'Tab'], description: 'Pindah ke elemen sebelumnya', category: 'Aksesibilitas' },
    { keys: ['Enter'], description: 'Aktifkan elemen terfokus', category: 'Aksesibilitas' },
    { keys: ['Space'], description: 'Toggle checkbox/toggle', category: 'Aksesibilitas' },
    { keys: ['Arrow Keys'], description: 'Navigasi dalam daftar/menu', category: 'Aksesibilitas' },

    // Bantuan
    { keys: ['?'], description: 'Tampilkan pintasan keyboard', category: 'Bantuan' },
    { keys: ['Ctrl', '/'], description: 'Tampilkan bantuan', category: 'Bantuan' },
];

interface KeyboardShortcutsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    shortcuts?: KeyboardShortcut[];
}

export const KeyboardShortcutsPanel: React.FC<KeyboardShortcutsPanelProps> = ({
    isOpen,
    onClose,
    shortcuts = DEFAULT_SHORTCUTS
}) => {
    const containerRef = useFocusTrap(isOpen);

    const { onKeyDown } = useKeyboardNavigation({
        onEscape: onClose
    });

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', onKeyDown as any);
        }
        return () => document.removeEventListener('keydown', onKeyDown as any);
    }, [isOpen, onKeyDown]);

    if (!isOpen) return null;

    // Group by category
    const grouped = shortcuts.reduce((acc, shortcut) => {
        const cat = shortcut.category || 'Lainnya';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(shortcut);
        return acc;
    }, {} as Record<string, KeyboardShortcut[]>);

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Panel */}
            <div
                ref={containerRef}
                className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
                            </svg>
                        </div>
                        <div>
                            <h2 id="shortcuts-title" className="text-lg font-semibold text-slate-900 dark:text-white">
                                Pintasan Keyboard
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Gunakan pintasan untuk navigasi cepat
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Tutup"
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    <div className="space-y-6">
                        {Object.entries(grouped).map(([category, items]) => (
                            <div key={category}>
                                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                    {category}
                                </h3>
                                <div className="space-y-2">
                                    {items.map((shortcut, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        >
                                            <span className="text-sm text-slate-700 dark:text-slate-300">
                                                {shortcut.description}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                {shortcut.keys.map((key, j) => (
                                                    <React.Fragment key={j}>
                                                        <kbd className="px-2 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-slate-700 dark:text-slate-300">
                                                            {key}
                                                        </kbd>
                                                        {j < shortcut.keys.length - 1 && (
                                                            <span className="text-slate-400">+</span>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                        Tekan <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-300 dark:border-slate-600 text-xs">?</kbd> kapan saja untuk menampilkan panel ini
                    </p>
                </div>
            </div>
        </div>
    );
};

// Hook to open shortcuts panel with ? key
export function useKeyboardShortcutsPanel() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger if typing in input
            if (
                document.activeElement?.tagName === 'INPUT' ||
                document.activeElement?.tagName === 'TEXTAREA'
            ) {
                return;
            }

            if (e.key === '?') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

    return {
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen(prev => !prev)
    };
}

// ============================================
// FOCUS VISIBLE INDICATOR
// ============================================

interface FocusRingProps {
    children: React.ReactElement;
    className?: string;
}

export const FocusRing: React.FC<FocusRingProps> = ({ children, className = '' }) => {
    return React.cloneElement(children, {
        className: `${children.props.className || ''} focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${className}`
    });
};

// ============================================
// ACCESSIBLE ICON BUTTON
// ============================================

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
            className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${className}`}
            {...props}
        >
            {icon}
            <span className="sr-only">{label}</span>
        </button>
    );
};

// ============================================
// LOADING ANNOUNCEMENT
// ============================================

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
    // Simple implementation - just announce current loading state
    // The aria-live region will automatically announce changes

    return (
        <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
        >
            {isLoading ? loadingMessage : loadedMessage}
        </div>
    );
};

// ============================================
// ACCESSIBLE TABS
// ============================================

interface Tab {
    id: string;
    label: string;
    content: React.ReactNode;
}

interface AccessibleTabsProps {
    tabs: Tab[];
    defaultTab?: string;
    onChange?: (tabId: string) => void;
    className?: string;
}

export const AccessibleTabs: React.FC<AccessibleTabsProps> = ({
    tabs,
    defaultTab,
    onChange,
    className = ''
}) => {
    const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
    const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

    const { onKeyDown } = useKeyboardNavigation({
        onArrowRight: () => {
            const currentIndex = tabs.findIndex(t => t.id === activeTab);
            const nextIndex = (currentIndex + 1) % tabs.length;
            setActiveTab(tabs[nextIndex].id);
            tabsRef.current[nextIndex]?.focus();
        },
        onArrowLeft: () => {
            const currentIndex = tabs.findIndex(t => t.id === activeTab);
            const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
            setActiveTab(tabs[prevIndex].id);
            tabsRef.current[prevIndex]?.focus();
        },
        onHome: () => {
            setActiveTab(tabs[0].id);
            tabsRef.current[0]?.focus();
        },
        onEnd: () => {
            setActiveTab(tabs[tabs.length - 1].id);
            tabsRef.current[tabs.length - 1]?.focus();
        },
        preventDefault: true
    });

    useEffect(() => {
        onChange?.(activeTab);
    }, [activeTab, onChange]);

    return (
        <div className={className}>
            {/* Tab list */}
            <div
                role="tablist"
                aria-label="Tab"
                className="flex border-b border-slate-200 dark:border-slate-700"
                onKeyDown={onKeyDown as any}
            >
                {tabs.map((tab, index) => (
                    <button
                        key={tab.id}
                        ref={el => tabsRef.current[index] = el}
                        role="tab"
                        id={`tab-${tab.id}`}
                        aria-selected={activeTab === tab.id}
                        aria-controls={`tabpanel-${tab.id}`}
                        tabIndex={activeTab === tab.id ? 0 : -1}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 ${activeTab === tab.id
                            ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab panels */}
            {tabs.map(tab => (
                <div
                    key={tab.id}
                    role="tabpanel"
                    id={`tabpanel-${tab.id}`}
                    aria-labelledby={`tab-${tab.id}`}
                    hidden={activeTab !== tab.id}
                    tabIndex={0}
                    className="py-4 focus:outline-none"
                >
                    {tab.content}
                </div>
            ))}
        </div>
    );
};

// ============================================
// ACCESSIBILITY SETTINGS PANEL
// ============================================

export const AccessibilitySettingsPanel: React.FC<{
    isOpen: boolean;
    onClose: () => void;
}> = ({ isOpen, onClose }) => {
    const { isHighContrast, toggle: toggleContrast } = useHighContrast();
    const reducedMotion = useReducedMotion();
    const containerRef = useFocusTrap(isOpen);

    if (!isOpen) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="a11y-settings-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
            <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

            <div
                ref={containerRef}
                className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full"
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 id="a11y-settings-title" className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Pengaturan Aksesibilitas
                        </h2>
                        <button
                            onClick={onClose}
                            aria-label="Tutup"
                            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="space-y-4">
                        {/* High Contrast */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white">Kontras Tinggi</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Meningkatkan kontras warna untuk visibilitas lebih baik
                                </p>
                            </div>
                            <button
                                role="switch"
                                aria-checked={isHighContrast}
                                onClick={toggleContrast}
                                className={`relative w-11 h-6 rounded-full transition-colors ${isHighContrast ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'
                                    }`}
                            >
                                <span
                                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isHighContrast ? 'translate-x-5' : ''
                                        }`}
                                />
                            </button>
                        </div>

                        {/* Reduced Motion */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white">Kurangi Animasi</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {reducedMotion
                                        ? 'Diaktifkan oleh pengaturan sistem'
                                        : 'Mengikuti pengaturan sistem Anda'
                                    }
                                </p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-medium ${reducedMotion
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400'
                                : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                }`}>
                                {reducedMotion ? 'Aktif' : 'Nonaktif'}
                            </div>
                        </div>

                        {/* Keyboard Shortcuts Info */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                            <h3 className="font-medium text-slate-900 dark:text-white mb-2">Pintasan Keyboard</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                                Tekan <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded border text-xs">?</kbd> untuk melihat semua pintasan keyboard yang tersedia.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================
// EXPORTS
// ============================================

export default {
    SkipLinks,
    useFocusTrap,
    FocusProvider,
    useFocusManagement,
    useKeyboardNavigation,
    useRovingTabIndex,
    AccessibleButton,
    AccessibleModal,
    LiveRegionProvider,
    useLiveRegion,
    ScreenReaderOnly,
    AccessibleField,
    checkColorContrast,
    AccessibleTable,
    // New exports
    useHighContrast,
    HighContrastToggle,
    useReducedMotion,
    KeyboardShortcutsPanel,
    useKeyboardShortcutsPanel,
    DEFAULT_SHORTCUTS,
    FocusRing,
    AccessibleIconButton,
    LoadingAnnouncement,
    AccessibleTabs,
    AccessibilitySettingsPanel
};
