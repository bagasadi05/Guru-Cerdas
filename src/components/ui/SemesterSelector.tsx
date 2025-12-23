import React from 'react';
import { Select } from './Select';
import { CalendarIcon } from 'lucide-react';
import { SemesterType, SEMESTER_OPTIONS, getCurrentSemester } from '../../utils/semesterUtils';

interface SemesterSelectorProps {
    value: SemesterType;
    onChange: (semester: SemesterType) => void;
    showIcon?: boolean;
    className?: string;
    disabled?: boolean;
    size?: 'sm' | 'md';
}

/**
 * Reusable Semester Selector Component
 * Used across all pages for consistent semester filtering
 */
export const SemesterSelector: React.FC<SemesterSelectorProps> = ({
    value,
    onChange,
    showIcon = true,
    className = '',
    disabled = false,
    size = 'md'
}) => {
    const currentSemester = getCurrentSemester();

    const sizeClasses = size === 'sm'
        ? 'h-8 text-sm pl-8'
        : 'h-10 text-sm pl-10';

    return (
        <div className={`relative inline-flex items-center gap-2 ${className}`}>
            {showIcon && (
                <CalendarIcon
                    className={`absolute left-2.5 z-10 text-indigo-500 ${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'}`}
                />
            )}
            <Select
                value={value}
                onChange={(e) => onChange(e.target.value as SemesterType)}
                disabled={disabled}
                className={`${sizeClasses} ${showIcon ? '' : 'pl-3'} pr-8 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer`}
            >
                {SEMESTER_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value} className="text-slate-900">
                        {opt.label}
                    </option>
                ))}
            </Select>

            {/* Current semester indicator */}
            {value === currentSemester.semester && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-800" title="Semester Aktif" />
            )}
        </div>
    );
};

/**
 * Compact inline semester badge (for headers/cards)
 */
export const SemesterBadge: React.FC<{ semester: SemesterType }> = ({ semester }) => {
    const label = semester === '1' ? 'Sem 1' : semester === '2' ? 'Sem 2' : 'All';
    const color = semester === '1'
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
        : semester === '2'
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
            {label}
        </span>
    );
};

/**
 * Locked semester warning banner
 */
export const SemesterLockedBanner: React.FC<{ semester: '1' | '2' }> = ({ semester }) => {
    return (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl text-amber-700 dark:text-amber-400 text-sm">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>
                <strong>Semester {semester} Terkunci</strong> - Data tidak dapat diubah atau dihapus.
            </span>
        </div>
    );
};
