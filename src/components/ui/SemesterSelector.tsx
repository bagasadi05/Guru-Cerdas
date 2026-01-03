import React from 'react';
import { Select } from './Select';
import { CalendarIcon, LockIcon } from 'lucide-react';
import { useSemester } from '../../contexts/SemesterContext';


interface SemesterSelectorProps {
    value?: string | null;
    onChange: (semesterId: string) => void;
    showIcon?: boolean;
    className?: string;
    disabled?: boolean;
    size?: 'sm' | 'md';
    includeAllOption?: boolean;
}

export const SemesterSelector: React.FC<SemesterSelectorProps> = ({
    value,
    onChange,
    showIcon = true,
    className = '',
    disabled = false,
    size = 'md',
    includeAllOption = true
}) => {
    const { semesters, isLoading } = useSemester();

    const sizeClasses = size === 'sm'
        ? 'h-8 text-sm pl-8'
        : 'h-10 text-sm pl-10';


    const activeSemester = semesters.find(s => s.is_active);

    return (
        <div className={`relative inline-flex items-center gap-2 ${className}`}>
            {showIcon && (
                <CalendarIcon
                    className={`absolute left-2.5 z-10 text-indigo-500 ${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'}`}
                />
            )}
            <Select
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled || isLoading}
                className={`${sizeClasses} ${showIcon ? '' : 'pl-3'} pr-8 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer`}
            >
                {includeAllOption && <option value="all">Semua Semester</option>}

                {semesters.map(sem => {
                    const yearName = sem.academic_years?.name || 'Tahun Ajaran ?';
                    const semName = sem.name; // e.g., "Ganjil" or "Semester 1"
                    const label = `${yearName} - ${semName}${sem.is_active ? ' (Aktif)' : ''}`;

                    return (
                        <option key={sem.id} value={sem.id} className="text-slate-900">
                            {label}
                        </option>
                    );
                })}

                {/* Legacy Fallback if needed, but better to migrate */}
            </Select>

            {/* Current semester indicator dot if selected value is active */}
            {value && activeSemester && value === activeSemester.id && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-800" title="Semester Aktif" />
            )}
        </div>
    );
};

// Adapted components for backward compatibility / usefulness

export const SemesterBadge: React.FC<{ semesterName?: string; isActive?: boolean }> = ({ semesterName, isActive }) => {
    // If we passed a simple string like "1" or "2" (legacy), map it
    let label = semesterName || 'N/A';
    if (semesterName === '1') label = 'Sem 1';
    if (semesterName === '2') label = 'Sem 2';

    const color = isActive
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
        : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
            {label}
        </span>
    );
};

export const SemesterLockedBanner: React.FC<{ isLocked?: boolean }> = ({ isLocked }) => {
    if (!isLocked) return null;
    return (
        <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl text-amber-700 dark:text-amber-400 text-sm">
            <LockIcon className="w-4 h-4 flex-shrink-0" />
            <span>
                <strong>Semester Terkunci</strong> - Data tidak dapat diubah atau dihapus.
            </span>
        </div>
    );
};
