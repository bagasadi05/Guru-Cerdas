/* eslint-disable react-hooks/refs */
import React, { useState, useRef, useEffect } from 'react';

interface DropdownMenuProps {
    children: React.ReactNode;
}

interface DropdownTriggerProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
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
} | null>(null);

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                triggerRef.current &&
                !triggerRef.current.contains(event.target as Node) &&
                !(event.target as Element).closest('.dropdown-content')
            ) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    return (
        <DropdownContext.Provider value={{ isOpen, setIsOpen, triggerRef }}>
            <div className="relative inline-block text-left">
                {children}
            </div>
        </DropdownContext.Provider>
    );
};

export const DropdownTrigger: React.FC<DropdownTriggerProps> = ({ children, className = '', onClick }) => {
    const context = React.useContext(DropdownContext);
    if (!context) throw new Error('DropdownTrigger must be used within DropdownMenu');

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        context.setIsOpen(!context.isOpen);
        if (onClick) onClick();
    };

    return (
        <button
            ref={context.triggerRef}
            type="button"
            className={`inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-950 ${className}`}
            onClick={handleClick}
            aria-haspopup="true"
            aria-expanded={context.isOpen}
        >
            {children}
        </button>
    );
};

export const DropdownContent: React.FC<DropdownContentProps> = ({ children, className = '', align = 'right' }) => {
    const context = React.useContext(DropdownContext);
    if (!context) throw new Error('DropdownContent must be used within DropdownMenu');

    if (!context.isOpen) return null;

    const alignmentClasses = align === 'right' ? 'right-0 origin-top-right' : 'left-0 origin-top-left';

    return (
        <div
            className={`dropdown-content absolute z-50 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:outline-none animate-fade-in-up ${alignmentClasses} ${className}`}
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
};

export const DropdownItem: React.FC<DropdownItemProps> = ({ children, onClick, className = '', icon, disabled = false }) => {
    const context = React.useContext(DropdownContext);

    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (disabled) return;
        if (onClick) onClick();
        context?.setIsOpen(false);
    };

    return (
        <button
            className={`
                group flex w-full items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white
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
