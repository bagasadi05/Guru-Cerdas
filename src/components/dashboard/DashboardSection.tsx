import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface DashboardSectionProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** Whether the section is collapsible */
  collapsible?: boolean;
  /** Default open state for collapsible sections */
  defaultOpen?: boolean;
  /** Additional class names for the section wrapper */
  className?: string;
  /** Additional class names for the content area */
  contentClassName?: string;
  /** Optional action button in the header */
  action?: React.ReactNode;
  /** Tutorial data attribute */
  dataTutorial?: string;
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({
  title,
  subtitle,
  icon,
  children,
  collapsible = false,
  defaultOpen = true,
  className = '',
  contentClassName = '',
  action,
  dataTutorial,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const showHeader = title || collapsible || action;

  return (
    <section className={`space-y-3 ${className}`} data-tutorial={dataTutorial}>
      {showHeader && (
        <div
          className={`flex items-center justify-between gap-3 ${collapsible ? 'cursor-pointer select-none' : ''}`}
          onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
          role={collapsible ? 'button' : undefined}
          tabIndex={collapsible ? 0 : undefined}
          onKeyDown={collapsible ? (e) => { if (e.key === 'Enter' || e.key === ' ') setIsOpen(!isOpen); } : undefined}
        >
          <div className="flex items-center gap-2 min-w-0">
            {icon}
            {title && (
              <div className="min-w-0">
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {action}
            {collapsible && (
              <button
                type="button"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label={isOpen ? 'Tutup section' : 'Buka section'}
              >
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      )}

      {(!collapsible || isOpen) && (
        <div className={`animate-fade-in ${contentClassName}`}>
          {children}
        </div>
      )}
    </section>
  );
};
