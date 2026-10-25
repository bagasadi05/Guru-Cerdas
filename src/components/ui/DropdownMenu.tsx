/* eslint-disable react-hooks/refs */
import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface DropdownMenuProps {
    children: React.ReactNode;
}

interface DropdownTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    className?: string;
    onClick?: (e?: React.MouseEvent) => void;
}

interface DropdownContentProps {
    children: React.ReactNode;
    className?: string;
    align?: 'left' | 'right';
}

interface DropdownItemProps {
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
    icon?: React.ReactNode;
    disabled?: boolean;
}

const DropdownContext = React.createContext<{
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    triggerRef: React.RefObject<HTMLButtonElement>;
    contentRef: React.RefObject<HTMLDivElement>;
} | null>(null);

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Close on click outside (handles mouse and touch)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            const target = event.target as Element | null;
            if (
                triggerRef.current &&
                !triggerRef.current.contains(event.target as Node) &&
                !target?.closest?.('.dropdown-content')
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    // Keyboard navigation: ArrowDown, ArrowUp, Home, End, Escape
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            const content = contentRef.current;
            if (!content) return;
            const items = Array.from(content.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([disabled])'));
            if (e.key === 'Escape') {
                e.preventDefault();
                setIsOpen(false);
                triggerRef.current?.focus();
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const current = document.activeElement as HTMLElement;
                const idx = items.findIndex((el) => el === current);
                const next = items[(idx + 1) % items.length] || items[0];
                next?.focus();
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                const current = document.activeElement as HTMLElement;
                const idx = items.findIndex((el) => el === current);
                const next = items[(idx - 1 + items.length) % items.length] || items[0];
                next?.focus();
                return;
            }
            if (e.key === 'Home') {
                e.preventDefault();
                items[0]?.focus();
                return;
            }
            if (e.key === 'End') {
                e.preventDefault();
                items[items.length - 1]?.focus();
                return;
            }
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen]);

    return (
        <DropdownContext.Provider value={{ isOpen, setIsOpen, triggerRef, contentRef }}>
            <div className="relative inline-block text-left">
                {children}
            </div>
        </DropdownContext.Provider>
    );
};

export const DropdownTrigger: React.FC<DropdownTriggerProps> = ({ children, className = '', onClick, ...rest }) => {
    const context = React.useContext(DropdownContext);
    if (!context) throw new Error('DropdownTrigger must be used within DropdownMenu');

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        context.setIsOpen(!context.isOpen);
        if (onClick) onClick(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            context.setIsOpen(true);
        }
    };

    return (
        <button
            ref={context.triggerRef}
            type="button"
            className={`inline-flex items-center justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-500 dark:focus-visible:ring-offset-slate-950 ${className}`}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            aria-haspopup="true"
            aria-expanded={context.isOpen}
            {...rest}
        >
            {children}
        </button>
    );
};

export const DropdownContent: React.FC<DropdownContentProps> = ({ children, className = '', align = 'right' }) => {
    const context = React.useContext(DropdownContext);
    if (!context) throw new Error('DropdownContent must be used within DropdownMenu');
    const { isOpen, triggerRef, contentRef, setIsOpen } = context;

    useLayoutEffect(() => {
        if (!isOpen) return;

        const updatePosition = () => {
            const trigger = triggerRef.current;
            const content = contentRef.current;
            if (!trigger || !content) return;

            const rect = trigger.getBoundingClientRect();

            // Detect if running in mock/jsdom environment with zeroed rect
            const isJsdom = rect.width === 0 && rect.height === 0 && rect.top === 0 && rect.left === 0 && rect.bottom === 0;
            if (isJsdom) {
                content.style.top = '0px';
                content.style.left = '0px';
                content.style.opacity = '1';
                content.style.pointerEvents = 'auto';
                return;
            }

            const menuWidth = content.offsetWidth || 200;
            const menuHeight = content.offsetHeight || 160;

            const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 360;
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 640;

            // If trigger scrolled entirely out of view, close menu
            if (rect.bottom < 0 || rect.top > viewportHeight) {
                setIsOpen(false);
                return;
            }

            // Vertical: below trigger by default, flip above if overflowing viewport bottom
            let top = rect.bottom + 6;
            if (top + menuHeight > viewportHeight - 8 && rect.top - menuHeight - 6 > 8) {
                top = rect.top - menuHeight - 6;
            }

            // Horizontal: align right or left with safety viewport clamping
            let left: number;
            if (align === 'right') {
                left = rect.right - menuWidth;
            } else {
                left = rect.left;
            }

            // Clamping within viewport prevents truncation/clipping on narrow screens
            const maxLeft = Math.max(8, viewportWidth - menuWidth - 8);
            left = Math.min(Math.max(8, left), maxLeft);

            content.style.top = `${top}px`;
            content.style.left = `${left}px`;
            content.style.opacity = '1';
            content.style.pointerEvents = 'auto';
        };

        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen, align, triggerRef, contentRef, setIsOpen]);

    if (!isOpen) return null;

    const contentElement = (
        <div
            ref={contentRef}
            style={{
                position: 'fixed',
                top: '-9999px',
                left: '-9999px',
                opacity: 0,
                pointerEvents: 'none',
            }}
            className={`dropdown-content fixed z-[9999] w-56 rounded-md shadow-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none animate-fade-in-up ${className}`}
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="menu-button"
            tabIndex={-1}
        >
            <div className="py-1" role="none">
                {children}
            </div>
        </div>
    );

    if (typeof document !== 'undefined') {
        return createPortal(contentElement, document.body);
    }

    return contentElement;
};

export const DropdownItem: React.FC<DropdownItemProps> = ({ children, onClick, className = '', icon, disabled = false }) => {
    const context = React.useContext(DropdownContext);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (disabled) return;
        context?.triggerRef.current?.focus();
        if (onClick) onClick();
        context?.setIsOpen(false);
    };

    return (
        <button type="button"
            className={`
                group flex w-full items-center text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white
                focus:outline-none focus-visible:bg-slate-100 focus-visible:dark:bg-slate-800 focus-visible:text-slate-900 focus-visible:dark:text-white
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${className}
            `}
            role="menuitem"
            tabIndex={-1}
            onClick={handleClick}
            disabled={disabled}
        >
            {icon && (
                <span className="mr-3 h-5 w-5 text-slate-400 group-hover:text-slate-500 dark:text-slate-500 dark:group-hover:text-slate-300">
                    {icon}
                </span>
            )}
            {children}
        </button>
    );
};

export default DropdownMenu;
