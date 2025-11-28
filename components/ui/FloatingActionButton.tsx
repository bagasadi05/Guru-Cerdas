import React from 'react';
import { PlusIcon } from '../Icons';

interface FloatingActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon?: React.ReactNode;
    label?: string;
    position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
    offset?: { bottom?: number; right?: number; left?: number };
    size?: number;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
    children,
    icon,
    label,
    position = 'bottom-right',
    offset,
    size,
    className = '',
    ...props
}) => {
    const positionClasses: Record<string, string> = {
        'bottom-right': 'bottom-20 right-4 lg:bottom-8 lg:right-8',
        'bottom-left': 'bottom-20 left-4 lg:bottom-8 lg:left-8',
        'bottom-center': 'bottom-20 left-1/2 -translate-x-1/2 lg:bottom-8',
    };

    const style: React.CSSProperties = {};
    if (offset) {
        if (offset.bottom !== undefined) style.bottom = `${offset.bottom}px`;
        if (offset.right !== undefined) style.right = `${offset.right}px`;
        if (offset.left !== undefined) style.left = `${offset.left}px`;
    }
    if (size) {
        style.width = `${size}px`;
        style.height = `${size}px`;
    }

    return (
        <button
            className={`
        fixed z-40 flex items-center justify-center
        rounded-full shadow-lg
        bg-sky-600 hover:bg-sky-700 active:bg-sky-800
        dark:bg-purple-600 dark:hover:bg-purple-700 dark:active:bg-purple-800
        text-white transition-all duration-200
        hover:scale-110 active:scale-95
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 dark:focus:ring-purple-500
        ${!offset ? positionClasses[position] : 'fixed'}
        ${!size ? 'w-14 h-14' : ''}
        ${className}
      `}
            style={style}
            {...props}
            aria-label={label || 'Floating Action Button'}
        >
            {children || icon || <PlusIcon className="w-6 h-6" />}
            {label && <span className="sr-only">{label}</span>}
        </button>
    );
};

export default FloatingActionButton;
