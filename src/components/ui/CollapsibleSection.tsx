import React, { useState } from 'react';
import { ChevronDownIcon } from 'lucide-react';

interface CollapsibleSectionProps {
    title: string;
    icon?: React.ReactNode;
    defaultOpen?: boolean;
    children: React.ReactNode;
    className?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    icon,
    defaultOpen = false,
    children,
    className = '',
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={className}>
            <button type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</span>
                </div>
                <ChevronDownIcon
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-[2000px] opacity-100 mt-3' : 'max-h-0 opacity-0'
                }`}
            >
                {children}
            </div>
        </div>
    );
};
