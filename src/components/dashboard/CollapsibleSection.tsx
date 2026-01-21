/**
 * CollapsibleSection Component
 * 
 * A mobile-friendly collapsible section for dashboard widgets.
 * Automatically collapses on mobile and expands on desktop.
 */

import React, { useState, useEffect, memo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface CollapsibleSectionProps {
    title: string;
    children: ReactNode;
    icon?: ReactNode;
    defaultExpanded?: boolean;
    /** Auto-collapse on mobile (< 640px) */
    autoCollapseOnMobile?: boolean;
    className?: string;
    headerClassName?: string;
    contentClassName?: string;
}

const CollapsibleSectionBase: React.FC<CollapsibleSectionProps> = ({
    title,
    children,
    icon,
    defaultExpanded = true,
    autoCollapseOnMobile = true,
    className = '',
    headerClassName = '',
    contentClassName = '',
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [isMobile, setIsMobile] = useState(false);

    // Check for mobile viewport
    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 640;
            setIsMobile(mobile);
            if (autoCollapseOnMobile && mobile && defaultExpanded) {
                setIsExpanded(false);
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [autoCollapseOnMobile, defaultExpanded]);

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

    return (
        <div className={`bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden ${className}`}>
            {/* Header */}
            <button
                onClick={toggleExpanded}
                className={`w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${headerClassName}`}
                aria-expanded={isExpanded}
                aria-controls={`section-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
            >
                <div className="flex items-center gap-3">
                    {icon && (
                        <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 text-indigo-600 dark:text-indigo-400">
                            {icon}
                        </div>
                    )}
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">
                        {title}
                    </h3>
                </div>
                <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                    <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </motion.div>
            </button>

            {/* Content */}
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        id={`section-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className={`p-4 sm:p-5 pt-0 ${contentClassName}`}>
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Mobile hint when collapsed */}
            {!isExpanded && isMobile && (
                <div className="px-4 pb-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Ketuk untuk memperluas
                    </p>
                </div>
            )}
        </div>
    );
};

export const CollapsibleSection = memo(CollapsibleSectionBase);
export type { CollapsibleSectionProps };
