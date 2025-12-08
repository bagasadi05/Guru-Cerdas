import React, { useState, useCallback, useMemo } from 'react';
import { CheckIcon, TrashIcon, EditIcon, DownloadCloudIcon, XCircleIcon, CheckSquareIcon } from '../components/Icons';

/**
 * Enhanced Bulk Selection System
 * 
 * This file provides an enhanced bulk selection system with additional features:
 * - Selection mode (enter/exit)
 * - Long-press to enter selection mode
 * - Select all header component
 * - Selectable item wrapper with visual feedback
 * 
 * For basic bulk selection, use the one from AdvancedFeatures.tsx
 * This enhanced version is for more complex use cases.
 */

// ============================================
// Bulk Selection Hook (Enhanced)
export interface UseBulkSelectionOptions<T> {
    items: T[];
    idKey?: keyof T;
}

export interface BulkSelectionState<T> {
    selectedIds: Set<string>;
    isAllSelected: boolean;
    isPartiallySelected: boolean;
    selectedCount: number;
    selectedItems: T[];
    isSelected: (id: string) => boolean;
    toggle: (id: string) => void;
    selectAll: () => void;
    deselectAll: () => void;
    toggleAll: () => void;
    selectMultiple: (ids: string[]) => void;
    isSelectionMode: boolean;
    enterSelectionMode: () => void;
    exitSelectionMode: () => void;
}

export function useBulkSelection<T extends Record<string, any>>(
    options: UseBulkSelectionOptions<T>
): BulkSelectionState<T> {
    const { items, idKey = 'id' as keyof T } = options;
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSelectionMode, setIsSelectionMode] = useState(false);

    const allIds = useMemo(() =>
        items.map(item => String(item[idKey])),
        [items, idKey]
    );

    const isAllSelected = useMemo(() =>
        items.length > 0 && selectedIds.size === items.length,
        [items.length, selectedIds.size]
    );

    const isPartiallySelected = useMemo(() =>
        selectedIds.size > 0 && selectedIds.size < items.length,
        [selectedIds.size, items.length]
    );

    const selectedItems = useMemo(() =>
        items.filter(item => selectedIds.has(String(item[idKey]))),
        [items, selectedIds, idKey]
    );

    const isSelected = useCallback((id: string) =>
        selectedIds.has(id),
        [selectedIds]
    );

    const toggle = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const selectAll = useCallback(() => {
        setSelectedIds(new Set(allIds));
    }, [allIds]);

    const deselectAll = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    const toggleAll = useCallback(() => {
        if (isAllSelected) {
            deselectAll();
        } else {
            selectAll();
        }
    }, [isAllSelected, selectAll, deselectAll]);

    const selectMultiple = useCallback((ids: string[]) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            ids.forEach(id => next.add(id));
            return next;
        });
    }, []);

    const enterSelectionMode = useCallback(() => {
        setIsSelectionMode(true);
    }, []);

    const exitSelectionMode = useCallback(() => {
        setIsSelectionMode(false);
        setSelectedIds(new Set());
    }, []);

    return {
        selectedIds,
        isAllSelected,
        isPartiallySelected,
        selectedCount: selectedIds.size,
        selectedItems,
        isSelected,
        toggle,
        selectAll,
        deselectAll,
        toggleAll,
        selectMultiple,
        isSelectionMode,
        enterSelectionMode,
        exitSelectionMode,
    };
}

// ============================================
// Bulk Selection Checkbox Component
// ============================================
interface BulkCheckboxProps {
    checked: boolean;
    indeterminate?: boolean;
    onChange: () => void;
    disabled?: boolean;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const BulkCheckbox: React.FC<BulkCheckboxProps> = ({
    checked,
    indeterminate = false,
    onChange,
    disabled = false,
    size = 'md',
    className = '',
}) => {
    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6',
    };

    const iconSizes = {
        sm: 'w-3 h-3',
        md: 'w-3.5 h-3.5',
        lg: 'w-4 h-4',
    };

    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={indeterminate ? 'mixed' : checked}
            disabled={disabled}
            onClick={(e) => {
                e.stopPropagation();
                onChange();
            }}
            className={`
                ${sizeClasses[size]}
                rounded border-2 flex items-center justify-center transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${checked || indeterminate
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'border-slate-300 dark:border-slate-600 hover:border-indigo-500 dark:hover:border-indigo-400'
                }
                ${className}
            `}
        >
            {checked && <CheckIcon className={iconSizes[size]} />}
            {indeterminate && !checked && (
                <div className={`${iconSizes[size]} flex items-center justify-center`}>
                    <div className="w-2/3 h-0.5 bg-white rounded-full" />
                </div>
            )}
        </button>
    );
};

// ============================================
// Bulk Action Bar Component
// ============================================
export interface BulkAction {
    id: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'danger' | 'success';
    disabled?: boolean;
}

interface BulkActionBarProps {
    selectedCount: number;
    totalCount: number;
    onSelectAll: () => void;
    onDeselectAll: () => void;
    onCancel: () => void;
    actions: BulkAction[];
    isAllSelected: boolean;
    className?: string;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
    selectedCount,
    totalCount,
    onSelectAll,
    onDeselectAll,
    onCancel,
    actions,
    isAllSelected,
    className = '',
}) => {
    if (selectedCount === 0) return null;

    const variantStyles = {
        default: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
        danger: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50',
        success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50',
    };

    return (
        <div className={`fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-40 animate-fade-in-up ${className}`}>
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-3 flex items-center gap-3">
                {/* Selection Info */}
                <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl">
                    <CheckSquareIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                        {selectedCount} dipilih
                    </span>
                </div>

                {/* Select All / Deselect All */}
                <button
                    onClick={isAllSelected ? onDeselectAll : onSelectAll}
                    className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                    {isAllSelected ? 'Batal Pilih Semua' : `Pilih Semua (${totalCount})`}
                </button>

                {/* Divider */}
                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {actions.map((action) => (
                        <button
                            key={action.id}
                            onClick={action.onClick}
                            disabled={action.disabled}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all
                                ${variantStyles[action.variant || 'default']}
                                ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                            title={action.label}
                        >
                            {action.icon}
                            <span className="hidden sm:inline">{action.label}</span>
                        </button>
                    ))}
                </div>

                {/* Divider */}
                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />

                {/* Cancel Button */}
                <button
                    onClick={onCancel}
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Batal"
                >
                    <XCircleIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

// ============================================
// Selectable List Item Wrapper
// ============================================
interface SelectableItemProps {
    id: string;
    isSelected: boolean;
    isSelectionMode: boolean;
    onToggle: (id: string) => void;
    onLongPress?: () => void;
    children: React.ReactNode;
    className?: string;
}

export const SelectableItem: React.FC<SelectableItemProps> = ({
    id,
    isSelected,
    isSelectionMode,
    onToggle,
    onLongPress,
    children,
    className = '',
}) => {
    const longPressTimer = React.useRef<NodeJS.Timeout | null>(null);
    const [isLongPressing, setIsLongPressing] = React.useState(false);

    const handleTouchStart = () => {
        if (!isSelectionMode && onLongPress) {
            longPressTimer.current = setTimeout(() => {
                setIsLongPressing(true);
                onLongPress();
            }, 500);
        }
    };

    const handleTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        setIsLongPressing(false);
    };

    const handleClick = () => {
        if (isSelectionMode && !isLongPressing) {
            onToggle(id);
        }
    };

    return (
        <div
            className={`
                relative transition-all duration-200
                ${isSelectionMode ? 'cursor-pointer' : ''}
                ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900' : ''}
                ${className}
            `}
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
        >
            {/* Selection Checkbox (visible in selection mode) */}
            {isSelectionMode && (
                <div className="absolute top-3 left-3 z-10">
                    <BulkCheckbox
                        checked={isSelected}
                        onChange={() => onToggle(id)}
                        size="md"
                    />
                </div>
            )}

            {/* Selection Overlay */}
            {isSelected && (
                <div className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-xl pointer-events-none" />
            )}

            {children}
        </div>
    );
};

// ============================================
// Bulk Select Header Component
// ============================================
interface BulkSelectHeaderProps {
    isSelectionMode: boolean;
    isAllSelected: boolean;
    isPartiallySelected: boolean;
    selectedCount: number;
    totalCount: number;
    onToggleAll: () => void;
    onEnterSelectionMode: () => void;
    onExitSelectionMode: () => void;
    className?: string;
}

export const BulkSelectHeader: React.FC<BulkSelectHeaderProps> = ({
    isSelectionMode,
    isAllSelected,
    isPartiallySelected,
    selectedCount,
    totalCount,
    onToggleAll,
    onEnterSelectionMode,
    onExitSelectionMode,
    className = '',
}) => {
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            {isSelectionMode ? (
                <>
                    <BulkCheckbox
                        checked={isAllSelected}
                        indeterminate={isPartiallySelected}
                        onChange={onToggleAll}
                        size="md"
                    />
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        {selectedCount > 0
                            ? `${selectedCount} dari ${totalCount} dipilih`
                            : 'Pilih item'
                        }
                    </span>
                    <button
                        onClick={onExitSelectionMode}
                        className="ml-auto text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    >
                        Batal
                    </button>
                </>
            ) : (
                <button
                    onClick={onEnterSelectionMode}
                    className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                    <CheckSquareIcon className="w-4 h-4" />
                    Pilih
                </button>
            )}
        </div>
    );
};

// ============================================
// Example Usage Component (for documentation)
// ============================================
/*
Usage Example:

import { useBulkSelection, BulkActionBar, BulkSelectHeader, SelectableItem } from './hooks/useBulkSelection';

function StudentList() {
    const students = useStudents();
    const bulkSelection = useBulkSelection({ items: students, idKey: 'id' });

    const handleBulkDelete = async () => {
        if (confirm(`Hapus ${bulkSelection.selectedCount} siswa?`)) {
            await deleteStudents(bulkSelection.selectedItems.map(s => s.id));
            bulkSelection.exitSelectionMode();
        }
    };

    const handleBulkExport = () => {
        exportToCsv(bulkSelection.selectedItems);
    };

    const bulkActions: BulkAction[] = [
        {
            id: 'export',
            label: 'Export',
            icon: <DownloadCloudIcon className="w-4 h-4" />,
            onClick: handleBulkExport,
        },
        {
            id: 'delete',
            label: 'Hapus',
            icon: <TrashIcon className="w-4 h-4" />,
            onClick: handleBulkDelete,
            variant: 'danger',
        },
    ];

    return (
        <div>
            <BulkSelectHeader
                isSelectionMode={bulkSelection.isSelectionMode}
                isAllSelected={bulkSelection.isAllSelected}
                isPartiallySelected={bulkSelection.isPartiallySelected}
                selectedCount={bulkSelection.selectedCount}
                totalCount={students.length}
                onToggleAll={bulkSelection.toggleAll}
                onEnterSelectionMode={bulkSelection.enterSelectionMode}
                onExitSelectionMode={bulkSelection.exitSelectionMode}
            />

            <div className="grid gap-4">
                {students.map((student) => (
                    <SelectableItem
                        key={student.id}
                        id={student.id}
                        isSelected={bulkSelection.isSelected(student.id)}
                        isSelectionMode={bulkSelection.isSelectionMode}
                        onToggle={bulkSelection.toggle}
                        onLongPress={bulkSelection.enterSelectionMode}
                    >
                        <StudentCard student={student} />
                    </SelectableItem>
                ))}
            </div>

            <BulkActionBar
                selectedCount={bulkSelection.selectedCount}
                totalCount={students.length}
                onSelectAll={bulkSelection.selectAll}
                onDeselectAll={bulkSelection.deselectAll}
                onCancel={bulkSelection.exitSelectionMode}
                actions={bulkActions}
                isAllSelected={bulkSelection.isAllSelected}
            />
        </div>
    );
}
*/

export default {
    useBulkSelection,
    BulkCheckbox,
    BulkActionBar,
    SelectableItem,
    BulkSelectHeader,
};
