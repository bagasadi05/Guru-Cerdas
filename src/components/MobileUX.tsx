import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Users, Calendar, ClipboardList, Clock, Settings, Menu, MoreHorizontal } from 'lucide-react';

/**
 * Mobile UX Components
 * Features: Bottom navigation, swipe gestures, touch targets, pull-to-refresh
 */

// ============================================
// CONSTANTS
// ============================================

// Minimum touch target size (44x44px per Apple HIG & Google Material)
export const MIN_TOUCH_TARGET = 44;

// ============================================
// SWIPE GESTURES HOOK
// ============================================

interface SwipeHandlers {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
}

interface SwipeOptions {
    threshold?: number; // minimum distance for swipe
    allowedTime?: number; // max time for swipe gesture
    velocityThreshold?: number; // minimum velocity
}

export function useSwipeGesture(
    handlers: SwipeHandlers,
    options: SwipeOptions = {}
) {
    const { threshold = 50, allowedTime = 300, velocityThreshold = 0.3 } = options;

    const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
    const elementRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        const touch = e.touches[0];
        touchStart.current = {
            x: touch.clientX,
            y: touch.clientY,
            time: Date.now()
        };
    }, []);

    const handleTouchEnd = useCallback((e: TouchEvent) => {
        if (!touchStart.current) return;

        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStart.current.x;
        const deltaY = touch.clientY - touchStart.current.y;
        const deltaTime = Date.now() - touchStart.current.time;

        if (deltaTime > allowedTime) return;

        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        const velocity = Math.max(absX, absY) / deltaTime;

        if (velocity < velocityThreshold) return;

        // Horizontal swipe
        if (absX > absY && absX > threshold) {
            if (deltaX > 0) {
                handlers.onSwipeRight?.();
            } else {
                handlers.onSwipeLeft?.();
            }
        }
        // Vertical swipe
        else if (absY > absX && absY > threshold) {
            if (deltaY > 0) {
                handlers.onSwipeDown?.();
            } else {
                handlers.onSwipeUp?.();
            }
        }

        touchStart.current = null;
    }, [handlers, threshold, allowedTime, velocityThreshold]);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        element.addEventListener('touchstart', handleTouchStart, { passive: true });
        element.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchEnd]);

    return elementRef;
}

// ============================================
// PULL TO REFRESH
// ============================================

interface PullToRefreshProps {
    onRefresh: () => Promise<void>;
    children: React.ReactNode;
    threshold?: number;
    maxPull?: number;
    className?: string;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
    onRefresh,
    children,
    threshold = 80,
    maxPull = 120,
    className = ''
}) => {
    const [pulling, setPulling] = useState(false);
    const [pullDistance, setPullDistance] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [canPull, setCanPull] = useState(true);

    const containerRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const currentY = useRef(0);

    const handleTouchStart = useCallback((e: TouchEvent) => {
        // Only allow pull when at top of scroll
        const scrollTop = containerRef.current?.scrollTop || 0;
        if (scrollTop > 0) {
            setCanPull(false);
            return;
        }

        setCanPull(true);
        startY.current = e.touches[0].clientY;
    }, []);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!canPull || refreshing) return;

        currentY.current = e.touches[0].clientY;
        const distance = currentY.current - startY.current;

        if (distance > 0) {
            setPulling(true);
            // Use resistance for natural feel
            const resistance = 2.5;
            const pullDist = Math.min(distance / resistance, maxPull);
            setPullDistance(pullDist);
        }
    }, [canPull, refreshing, maxPull]);

    const handleTouchEnd = useCallback(async () => {
        if (!pulling || refreshing) return;

        if (pullDistance >= threshold) {
            setRefreshing(true);
            try {
                await onRefresh();
            } finally {
                setRefreshing(false);
            }
        }

        setPulling(false);
        setPullDistance(0);
    }, [pulling, refreshing, pullDistance, threshold, onRefresh]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        container.addEventListener('touchstart', handleTouchStart, { passive: true });
        container.addEventListener('touchmove', handleTouchMove, { passive: true });
        container.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            container.removeEventListener('touchstart', handleTouchStart);
            container.removeEventListener('touchmove', handleTouchMove);
            container.removeEventListener('touchend', handleTouchEnd);
        };
    }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

    const progress = Math.min(pullDistance / threshold, 1);
    const showIndicator = pulling || refreshing;

    return (
        <div
            ref={containerRef}
            className={`relative overflow-auto ${className}`}
            style={{ overscrollBehavior: 'contain' }}
        >
            {/* Pull indicator */}
            <div
                className="absolute left-0 right-0 flex items-center justify-center pointer-events-none z-10 transition-transform"
                style={{
                    top: -60,
                    transform: `translateY(${showIndicator ? pullDistance + 60 : 0}px)`,
                    opacity: showIndicator ? 1 : 0
                }}
            >
                <div className={`
                    w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-lg
                    flex items-center justify-center
                    ${refreshing ? '' : 'transition-transform duration-200'}
                `}>
                    {refreshing ? (
                        <svg
                            className="w-5 h-5 text-indigo-500 animate-spin"
                            viewBox="0 0 24 24"
                        >
                            <circle
                                cx="12" cy="12" r="10"
                                stroke="currentColor"
                                strokeWidth="3"
                                fill="none"
                                strokeDasharray="60"
                                strokeDashoffset="20"
                                strokeLinecap="round"
                            />
                        </svg>
                    ) : (
                        <svg
                            className="w-5 h-5 text-indigo-500 transition-transform"
                            style={{ transform: `rotate(${progress * 180}deg)` }}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                        >
                            <path d="M12 4v16m0-16l-4 4m4-4l4 4" />
                        </svg>
                    )}
                </div>
            </div>

            {/* Content with translation */}
            <div
                style={{
                    transform: `translateY(${pulling && !refreshing ? pullDistance : 0}px)`,
                    transition: pulling ? 'none' : 'transform 0.2s ease-out'
                }}
            >
                {children}
            </div>

            {/* Pull text indicator */}
            {showIndicator && (
                <div
                    className="absolute left-0 right-0 text-center text-xs text-slate-400 transition-opacity"
                    style={{
                        top: pullDistance - 20,
                        opacity: pulling ? 1 : 0
                    }}
                >
                    {refreshing
                        ? 'Memperbarui...'
                        : progress >= 1
                            ? 'Lepaskan untuk refresh'
                            : 'Tarik untuk refresh'
                    }
                </div>
            )}
        </div>
    );
};

// ============================================
// BOTTOM NAVIGATION
// ============================================

interface NavItem {
    path: string;
    icon: React.ReactNode;
    label: string;
    badge?: number;
}

interface BottomNavigationProps {
    items?: NavItem[];
    maxItems?: number;
    moreMenuItems?: NavItem[];
    className?: string;
}

const defaultNavItems: NavItem[] = [
    { path: '/', icon: <Home className="w-5 h-5" />, label: 'Beranda' },
    { path: '/students', icon: <Users className="w-5 h-5" />, label: 'Siswa' },
    { path: '/attendance', icon: <Calendar className="w-5 h-5" />, label: 'Absensi' },
    { path: '/tasks', icon: <ClipboardList className="w-5 h-5" />, label: 'Tugas' },
    { path: '/schedule', icon: <Clock className="w-5 h-5" />, label: 'Jadwal' },
];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
    items = defaultNavItems,
    maxItems = 5,
    moreMenuItems = [],
    className = ''
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showMore, setShowMore] = useState(false);

    // Limit visible items
    const visibleItems = items.slice(0, maxItems - (moreMenuItems.length > 0 ? 1 : 0));
    const hasMoreMenu = moreMenuItems.length > 0;

    const isActive = (path: string) => {
        if (path === '/') return location.pathname === '/';
        return location.pathname.startsWith(path);
    };

    return (
        <>
            {/* More Menu Overlay */}
            {showMore && (
                <div
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={() => setShowMore(false)}
                />
            )}

            {/* More Menu Panel */}
            {showMore && (
                <div className="fixed bottom-20 left-4 right-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-slide-up">
                    <div className="p-2">
                        {moreMenuItems.map((item) => (
                            <button
                                key={item.path}
                                onClick={() => {
                                    navigate(item.path);
                                    setShowMore(false);
                                }}
                                className={`
                                    w-full flex items-center gap-3 px-4 py-3 rounded-xl
                                    transition-colors
                                    ${isActive(item.path)
                                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }
                                `}
                                style={{ minHeight: MIN_TOUCH_TARGET }}
                            >
                                {item.icon}
                                <span className="font-medium">{item.label}</span>
                                {item.badge !== undefined && item.badge > 0 && (
                                    <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
                                        {item.badge > 99 ? '99+' : item.badge}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Bottom Navigation Bar */}
            <nav
                className={`
                    fixed bottom-0 left-0 right-0 z-30
                    bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg
                    border-t border-slate-200 dark:border-slate-800
                    safe-area-bottom
                    ${className}
                `}
            >
                <div className="flex items-center justify-around px-2">
                    {visibleItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`
                                relative flex flex-col items-center justify-center
                                py-2 px-3 transition-colors
                                ${isActive(item.path)
                                    ? 'text-indigo-600 dark:text-indigo-400'
                                    : 'text-slate-500 dark:text-slate-400'
                                }
                            `}
                            style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET + 12 }}
                            aria-label={item.label}
                            aria-current={isActive(item.path) ? 'page' : undefined}
                        >
                            {/* Active indicator */}
                            {isActive(item.path) && (
                                <span className="absolute top-1 w-1 h-1 rounded-full bg-indigo-500" />
                            )}

                            {/* Icon with badge */}
                            <span className="relative">
                                {item.icon}
                                {item.badge !== undefined && item.badge > 0 && (
                                    <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                                        {item.badge > 9 ? '9+' : item.badge}
                                    </span>
                                )}
                            </span>

                            {/* Label */}
                            <span className={`text-[10px] mt-1 font-medium ${isActive(item.path) ? '' : 'opacity-70'}`}>
                                {item.label}
                            </span>
                        </button>
                    ))}

                    {/* More button */}
                    {hasMoreMenu && (
                        <button
                            onClick={() => setShowMore(!showMore)}
                            className={`
                                relative flex flex-col items-center justify-center
                                py-2 px-3 transition-colors
                                ${showMore
                                    ? 'text-indigo-600 dark:text-indigo-400'
                                    : 'text-slate-500 dark:text-slate-400'
                                }
                            `}
                            style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET + 12 }}
                            aria-label="Menu lainnya"
                            aria-expanded={showMore}
                        >
                            <MoreHorizontal className="w-5 h-5" />
                            <span className="text-[10px] mt-1 font-medium opacity-70">Lainnya</span>
                        </button>
                    )}
                </div>
            </nav>
        </>
    );
};

// ============================================
// SWIPEABLE PAGE CONTAINER
// ============================================

interface SwipeablePageProps {
    children: React.ReactNode;
    pages: string[]; // Array of route paths
    currentPath: string;
    onNavigate: (path: string) => void;
    className?: string;
}

export const SwipeablePage: React.FC<SwipeablePageProps> = ({
    children,
    pages,
    currentPath,
    onNavigate,
    className = ''
}) => {
    const currentIndex = pages.indexOf(currentPath);

    const swipeRef = useSwipeGesture({
        onSwipeLeft: () => {
            if (currentIndex < pages.length - 1) {
                onNavigate(pages[currentIndex + 1]);
            }
        },
        onSwipeRight: () => {
            if (currentIndex > 0) {
                onNavigate(pages[currentIndex - 1]);
            }
        }
    });

    return (
        <div ref={swipeRef} className={className}>
            {children}
        </div>
    );
};

// ============================================
// TOUCH TARGET WRAPPER
// ============================================

interface TouchTargetProps {
    children: React.ReactNode;
    size?: number;
    className?: string;
    as?: keyof JSX.IntrinsicElements;
}

export const TouchTarget: React.FC<TouchTargetProps & React.HTMLAttributes<HTMLElement>> = ({
    children,
    size = MIN_TOUCH_TARGET,
    className = '',
    as: Component = 'div',
    ...props
}) => {
    return React.createElement(
        Component,
        {
            className: `inline-flex items-center justify-center ${className}`,
            style: { minWidth: size, minHeight: size },
            ...props
        },
        children
    );
};

// ============================================
// MOBILE OPTIMIZED BUTTON
// ============================================

interface MobileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    icon?: React.ReactNode;
    iconPosition?: 'left' | 'right';
    fullWidth?: boolean;
}

export const MobileButton: React.FC<MobileButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    icon,
    iconPosition = 'left',
    fullWidth = false,
    className = '',
    disabled,
    ...props
}) => {
    const variantClasses = {
        primary: 'bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white shadow-sm',
        secondary: 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200',
        ghost: 'bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-600 dark:hover:bg-slate-800 dark:text-slate-400',
        danger: 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white shadow-sm'
    };

    const sizeClasses = {
        sm: 'px-3 py-2 text-sm gap-1.5',
        md: 'px-4 py-2.5 text-sm gap-2',
        lg: 'px-5 py-3 text-base gap-2'
    };

    // Ensure minimum touch target
    const minHeight = size === 'sm' ? MIN_TOUCH_TARGET : size === 'md' ? 44 : 48;

    return (
        <button
            className={`
                inline-flex items-center justify-center font-medium rounded-xl
                transition-all duration-150 active:scale-[0.98]
                disabled:opacity-50 disabled:pointer-events-none
                ${variantClasses[variant]}
                ${sizeClasses[size]}
                ${fullWidth ? 'w-full' : ''}
                ${className}
            `}
            style={{ minHeight }}
            disabled={disabled}
            {...props}
        >
            {icon && iconPosition === 'left' && icon}
            {children}
            {icon && iconPosition === 'right' && icon}
        </button>
    );
};

// ============================================
// SWIPEABLE LIST ITEM (Swipe Actions)
// ============================================

interface SwipeAction {
    label: string;
    icon?: React.ReactNode;
    color: string;
    onClick: () => void;
}

interface SwipeableListItemProps {
    children: React.ReactNode;
    leftActions?: SwipeAction[];
    rightActions?: SwipeAction[];
    threshold?: number;
    className?: string;
}

export const SwipeableListItem: React.FC<SwipeableListItemProps> = ({
    children,
    leftActions = [],
    rightActions = [],
    threshold = 80,
    className = ''
}) => {
    const [offset, setOffset] = useState(0);
    const [swiping, setSwiping] = useState(false);
    const startX = useRef(0);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        setSwiping(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!swiping) return;
        const diff = e.touches[0].clientX - startX.current;

        // Limit swipe distance
        const maxLeft = rightActions.length * 80;
        const maxRight = leftActions.length * 80;
        const boundedOffset = Math.max(-maxLeft, Math.min(maxRight, diff));

        setOffset(boundedOffset);
    };

    const handleTouchEnd = () => {
        setSwiping(false);

        // Snap to action or back to center
        if (Math.abs(offset) > threshold) {
            // Snap to show actions
            if (offset > 0 && leftActions.length > 0) {
                setOffset(leftActions.length * 80);
            } else if (offset < 0 && rightActions.length > 0) {
                setOffset(-rightActions.length * 80);
            }
        } else {
            setOffset(0);
        }
    };

    const executeAction = (action: SwipeAction) => {
        action.onClick();
        setOffset(0);
    };

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden ${className}`}
        >
            {/* Left actions */}
            <div
                className="absolute left-0 top-0 bottom-0 flex items-stretch"
                style={{ transform: `translateX(${Math.min(0, -leftActions.length * 80 + offset)}px)` }}
            >
                {leftActions.map((action, i) => (
                    <button
                        key={i}
                        onClick={() => executeAction(action)}
                        className={`flex flex-col items-center justify-center w-20 ${action.color}`}
                        style={{ minHeight: MIN_TOUCH_TARGET }}
                    >
                        {action.icon}
                        <span className="text-xs mt-1">{action.label}</span>
                    </button>
                ))}
            </div>

            {/* Right actions */}
            <div
                className="absolute right-0 top-0 bottom-0 flex items-stretch"
                style={{ transform: `translateX(${Math.max(0, rightActions.length * 80 + offset)}px)` }}
            >
                {rightActions.map((action, i) => (
                    <button
                        key={i}
                        onClick={() => executeAction(action)}
                        className={`flex flex-col items-center justify-center w-20 ${action.color}`}
                        style={{ minHeight: MIN_TOUCH_TARGET }}
                    >
                        {action.icon}
                        <span className="text-xs mt-1">{action.label}</span>
                    </button>
                ))}
            </div>

            {/* Main content */}
            <div
                className="relative bg-white dark:bg-slate-800 transition-transform"
                style={{
                    transform: `translateX(${offset}px)`,
                    transition: swiping ? 'none' : 'transform 0.2s ease-out'
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {children}
            </div>
        </div>
    );
};

// ============================================
// FLOATING ACTION BUTTON
// ============================================

interface FABProps {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
    extended?: boolean;
    className?: string;
}

export const FloatingActionButton: React.FC<FABProps> = ({
    icon,
    label,
    onClick,
    position = 'bottom-right',
    extended = false,
    className = ''
}) => {
    const positionClasses = {
        'bottom-right': 'right-4 bottom-20',
        'bottom-left': 'left-4 bottom-20',
        'bottom-center': 'left-1/2 -translate-x-1/2 bottom-20'
    };

    return (
        <button
            onClick={onClick}
            aria-label={label}
            className={`
                fixed z-20 
                ${positionClasses[position]}
                ${extended ? 'px-5 pr-6' : 'w-14'}
                h-14 rounded-full
                bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700
                text-white shadow-lg hover:shadow-xl
                flex items-center justify-center gap-2
                transition-all duration-200 active:scale-95
                ${className}
            `}
            style={{ minWidth: MIN_TOUCH_TARGET, minHeight: MIN_TOUCH_TARGET }}
        >
            {icon}
            {extended && <span className="font-medium">{label}</span>}
        </button>
    );
};

// ============================================
// MOBILE CONTEXT
// ============================================

interface MobileContextValue {
    isMobile: boolean;
    isTouch: boolean;
    safeAreaInsets: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    };
}

const MobileContext = createContext<MobileContextValue>({
    isMobile: false,
    isTouch: false,
    safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 }
});

export const useMobile = () => useContext(MobileContext);

export const MobileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isMobile, setIsMobile] = useState(false);
    const [isTouch, setIsTouch] = useState(false);
    const [safeAreaInsets, setSafeAreaInsets] = useState({ top: 0, bottom: 0, left: 0, right: 0 });

    useEffect(() => {
        // Check if mobile
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };

        // Check if touch device
        setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);

        // Get safe area insets from CSS env()
        const computeSafeArea = () => {
            const style = getComputedStyle(document.documentElement);
            setSafeAreaInsets({
                top: parseInt(style.getPropertyValue('--sat') || '0'),
                bottom: parseInt(style.getPropertyValue('--sab') || '0'),
                left: parseInt(style.getPropertyValue('--sal') || '0'),
                right: parseInt(style.getPropertyValue('--sar') || '0')
            });
        };

        checkMobile();
        computeSafeArea();

        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <MobileContext.Provider value={{ isMobile, isTouch, safeAreaInsets }}>
            {children}
        </MobileContext.Provider>
    );
};

// ============================================
// MOBILE PAGE LAYOUT
// ============================================

interface MobilePageLayoutProps {
    children: React.ReactNode;
    header?: React.ReactNode;
    footer?: React.ReactNode;
    showBottomNav?: boolean;
    onRefresh?: () => Promise<void>;
    className?: string;
}

export const MobilePageLayout: React.FC<MobilePageLayoutProps> = ({
    children,
    header,
    footer,
    showBottomNav = true,
    onRefresh,
    className = ''
}) => {
    const content = (
        <main className={`flex-1 ${showBottomNav ? 'pb-20' : ''} ${className}`}>
            {children}
        </main>
    );

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900">
            {header}

            {onRefresh ? (
                <PullToRefresh onRefresh={onRefresh} className="flex-1 overflow-auto">
                    {content}
                </PullToRefresh>
            ) : (
                content
            )}

            {footer}
            {showBottomNav && <BottomNavigation />}
        </div>
    );
};

// ============================================
// EXPORTS
// ============================================

export default {
    MIN_TOUCH_TARGET,
    useSwipeGesture,
    PullToRefresh,
    BottomNavigation,
    SwipeablePage,
    TouchTarget,
    MobileButton,
    SwipeableListItem,
    FloatingActionButton,
    MobileProvider,
    useMobile,
    MobilePageLayout
};
