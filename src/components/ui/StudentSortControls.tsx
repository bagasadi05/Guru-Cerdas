import React from 'react';
import { ChevronUpIcon, ChevronDownIcon, UsersIcon } from '../Icons';

export type SortField = 'name' | 'score' | 'status' | 'index';
export type SortDirection = 'asc' | 'desc';
export type GroupBy = 'none' | 'status' | 'scoreRange';

interface SortConfig {
    field: SortField;
    direction: SortDirection;
}

interface StudentSortControlsProps {
    sortConfig: SortConfig;
    onSortChange: (config: SortConfig) => void;
    groupBy: GroupBy;
    onGroupByChange: (groupBy: GroupBy) => void;
    showGrouping?: boolean;
    className?: string;
}

interface SortButtonProps {
    field: SortField;
    label: string;
    isActive: boolean;
    direction: SortDirection;
    onClick: (field: SortField) => void;
}

const SortButton: React.FC<SortButtonProps> = ({ field, label, isActive, direction, onClick }) => {
    return (
        <button
            onClick={() => onClick(field)}
            className={`
                flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                ${isActive
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }
            `}
        >
            {label}
            {isActive && (
                direction === 'asc'
                    ? <ChevronUpIcon className="w-3 h-3" />
                    : <ChevronDownIcon className="w-3 h-3" />
            )}
        </button>
    );
};

/**
 * Sorting and grouping controls for student lists
 */
export const StudentSortControls: React.FC<StudentSortControlsProps> = ({
    sortConfig,
    onSortChange,
    groupBy,
    onGroupByChange,
    showGrouping = true,
    className = '',
}) => {
    const handleSortClick = (field: SortField) => {
        if (sortConfig.field === field) {
            onSortChange({
                field,
                direction: sortConfig.direction === 'asc' ? 'desc' : 'asc',
            });
        } else {
            onSortChange({ field, direction: 'asc' });
        }
    };

    return (
        <div className={`flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 sm:gap-3 ${className}`}>
            {/* Sort Controls */}
            <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs text-gray-400 mr-1 whitespace-nowrap">Urutkan:</span>
                <div className="flex items-center gap-1">
                    <SortButton
                        field="index"
                        label="No"
                        isActive={sortConfig.field === 'index'}
                        direction={sortConfig.direction}
                        onClick={handleSortClick}
                    />
                    <SortButton
                        field="name"
                        label="Nama"
                        isActive={sortConfig.field === 'name'}
                        direction={sortConfig.direction}
                        onClick={handleSortClick}
                    />
                    <SortButton
                        field="score"
                        label="Nilai"
                        isActive={sortConfig.field === 'score'}
                        direction={sortConfig.direction}
                        onClick={handleSortClick}
                    />
                </div>
            </div>

            {/* Grouping Controls */}
            {showGrouping && (
                <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-xs text-gray-400 mr-1 whitespace-nowrap">Kelompok:</span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => onGroupByChange('none')}
                            className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${groupBy === 'none'
                                ? 'bg-indigo-500 text-white'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                }`}
                        >
                            Semua
                        </button>
                        <button
                            onClick={() => onGroupByChange('status')}
                            className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${groupBy === 'status'
                                ? 'bg-indigo-500 text-white'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                }`}
                        >
                            Status
                        </button>
                        <button
                            onClick={() => onGroupByChange('scoreRange')}
                            className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${groupBy === 'scoreRange'
                                ? 'bg-indigo-500 text-white'
                                : 'bg-white/10 text-gray-300 hover:bg-white/20'
                                }`}
                        >
                            Rentang
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * Group header component
 */
export const GroupHeader: React.FC<{
    title: string;
    count: number;
    color?: string;
    isExpanded?: boolean;
    onToggle?: () => void;
}> = ({ title, count, color = 'indigo', isExpanded = true, onToggle }) => {
    const colorClasses: Record<string, string> = {
        green: 'bg-green-500/20 text-green-300 border-green-500/30',
        red: 'bg-red-500/20 text-red-300 border-red-500/30',
        amber: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        blue: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        indigo: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        gray: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    };

    return (
        <div
            className={`
                flex items-center justify-between px-4 py-2 rounded-xl border mb-2
                ${colorClasses[color] || colorClasses.indigo}
                ${onToggle ? 'cursor-pointer hover:bg-opacity-30' : ''}
            `}
            onClick={onToggle}
        >
            <div className="flex items-center gap-2">
                <UsersIcon className="w-4 h-4" />
                <span className="font-bold text-sm">{title}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className="text-xs opacity-70">{count} siswa</span>
                {onToggle && (
                    isExpanded
                        ? <ChevronUpIcon className="w-4 h-4" />
                        : <ChevronDownIcon className="w-4 h-4" />
                )}
            </div>
        </div>
    );
};

/**
 * Helper function to sort students
 */
export function sortStudents<T extends { id: string; name: string }>(
    students: T[],
    scores: Record<string, string | number>,
    config: SortConfig,
    originalOrder?: T[]
): T[] {
    return [...students].sort((a, b) => {
        let comparison = 0;

        switch (config.field) {
            case 'name':
                comparison = a.name.localeCompare(b.name);
                break;
            case 'score': {
                const rawA = scores[a.id];
                const rawB = scores[b.id];
                const hasA = rawA !== undefined && rawA !== '';
                const hasB = rawB !== undefined && rawB !== '';
                const scoreA = hasA ? parseFloat(String(rawA)) : Number.NEGATIVE_INFINITY;
                const scoreB = hasB ? parseFloat(String(rawB)) : Number.NEGATIVE_INFINITY;
                comparison = scoreA - scoreB;
                break;
            }
            case 'status': {
                const hasScoreA = scores[a.id] !== undefined && scores[a.id] !== '';
                const hasScoreB = scores[b.id] !== undefined && scores[b.id] !== '';
                comparison = (hasScoreA ? 1 : 0) - (hasScoreB ? 1 : 0);
                break;
            }
            case 'index': {
                // Restore original order using the reference array
                const ref = originalOrder || students;
                const indexA = ref.findIndex(s => s.id === a.id);
                const indexB = ref.findIndex(s => s.id === b.id);
                comparison = indexA - indexB;
                break;
            }
            default:
                return 0;
        }

        return config.direction === 'asc' ? comparison : -comparison;
    });
}

/**
 * Helper function to group students
 */
export function groupStudents<T extends { id: string; name: string }>(
    students: T[],
    scores: Record<string, string | number>,
    groupBy: GroupBy,
    kkm: number = 75
): { title: string; students: T[]; color: string }[] {
    if (groupBy === 'none') {
        return [{ title: 'Semua Siswa', students, color: 'indigo' }];
    }

    if (groupBy === 'status') {
        const aboveKkm: T[] = [];
        const belowKkm: T[] = [];
        const noScore: T[] = [];

        students.forEach(student => {
            const rawScore = scores[student.id];
            if (rawScore === undefined || rawScore === null || rawScore === '') {
                noScore.push(student);
            } else {
                const score = parseFloat(String(rawScore));
                if (isNaN(score)) {
                    noScore.push(student);
                } else if (score >= kkm) {
                    aboveKkm.push(student);
                } else {
                    belowKkm.push(student);
                }
            }
        });

        const groups = [];
        if (aboveKkm.length > 0) {
            groups.push({ title: `Tuntas (≥${kkm})`, students: aboveKkm, color: 'green' });
        }
        if (belowKkm.length > 0) {
            groups.push({ title: `Belum Tuntas (<${kkm})`, students: belowKkm, color: 'amber' });
        }
        if (noScore.length > 0) {
            groups.push({ title: 'Belum Dinilai', students: noScore, color: 'gray' });
        }
        return groups;
    }

    if (groupBy === 'scoreRange') {
        const ranges: { min: number; max: number; title: string; color: string; students: T[] }[] = [
            { min: 90, max: 100, title: 'Sangat Baik (90-100)', color: 'green', students: [] },
            { min: 75, max: 89, title: 'Baik (75-89)', color: 'blue', students: [] },
            { min: 60, max: 74, title: 'Cukup (60-74)', color: 'amber', students: [] },
            { min: 0, max: 59, title: 'Kurang (<60)', color: 'red', students: [] },
            { min: -1, max: -1, title: 'Belum Dinilai', color: 'gray', students: [] },
        ];

        students.forEach(student => {
            const rawScore = scores[student.id];
            if (rawScore === undefined || rawScore === null || rawScore === '') {
                ranges[4].students.push(student);
            } else {
                const score = parseFloat(String(rawScore));
                if (isNaN(score)) {
                    ranges[4].students.push(student);
                } else if (score >= 90) {
                    ranges[0].students.push(student);
                } else if (score >= 75) {
                    ranges[1].students.push(student);
                } else if (score >= 60) {
                    ranges[2].students.push(student);
                } else {
                    ranges[3].students.push(student);
                }
            }
        });

        return ranges.filter(r => r.students.length > 0);
    }

    return [{ title: 'Semua Siswa', students, color: 'indigo' }];
}

export default StudentSortControls;
