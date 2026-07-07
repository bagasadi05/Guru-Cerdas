import React from 'react';
import { CustomDropdown } from './CustomDropdown';
import { CalendarIcon, LockIcon } from 'lucide-react';
import { useSemester } from '../../contexts/SemesterContext';
import { getSemesterDisplayName } from '../../utils/semesterUtils';


interface SemesterSelectorProps {
    value?: string | null;
    onChange: (semesterId: string) => void;
    showIcon?: boolean;
    className?: string;
    disabled?: boolean;
    size?: 'sm' | 'md';
    includeAllOption?: boolean;
    activeOnly?: boolean;
}

export const SemesterSelector: React.FC<SemesterSelectorProps> = ({
    value,
    onChange,
    showIcon = true,
    className = '',
    disabled = false,
    size = 'md',
    includeAllOption = true,
    activeOnly = false
}) => {
    const { semesters, isLoading } = useSemester();




    const activeSemester = semesters.find(s => s.is_active);

    const options = [];
    if (includeAllOption && !activeOnly) {
        options.push({ value: 'all', label: 'Semua Semester' });
    }

    const filteredSemesters = activeOnly ? semesters.filter(s => s.is_active) : semesters;

    filteredSemesters.forEach(sem => {
        const yearName = sem.academic_years?.name || 'Tahun Ajaran ?';
        const semName = getSemesterDisplayName(sem.name, sem.start_date, 'full');
        const label = `${yearName} - ${semName}${sem.is_active ? ' (Aktif)' : ''}`;
        options.push({ value: sem.id, label });
    });

    return (
        <div className={`relative w-full ${className}`}>
            <CustomDropdown
                value={value || ''}
                onChange={onChange}
                disabled={disabled || isLoading}
                placeholder="-- Pilih Semester --"
                icon={showIcon ? (
                    <CalendarIcon className={`text-emerald-500 ${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'}`} />
                ) : undefined}
                options={options}
                className={`${size === 'sm' ? 'h-9 text-sm' : 'h-10 text-sm'} rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus-visible:ring-emerald-500`}
            />
            {/* Current semester indicator dot if selected value is active */}
            {value && activeSemester && value === activeSemester.id && (
                <span className="absolute -top-1 -right-1 z-10 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-800" title="Semester Aktif" />
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
