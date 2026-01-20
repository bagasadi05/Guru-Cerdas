import React, { useState, useEffect, useCallback, useRef, createContext, useContext, useMemo } from 'react';
import { Check, Trash2, Archive, Download, MoreHorizontal, GripVertical, X, Move, Plus, Minus, Settings, Eye, EyeOff, ChevronDown, FileText, Table, Loader2 } from 'lucide-react';

/**
 * Advanced Features
 * Bulk actions, drag & drop, keyboard shortcuts, customizable dashboard, export preview
 */

// ============================================
// BULK SELECTION HOOK
// ============================================

export interface BulkSelectionState<T> {
    selectedItems: Set<string>;
    isAllSelected: boolean;
    isPartiallySelected: boolean;
    toggleItem: (id: string) => void;
    toggleAll: () => void;
    selectItems: (ids: string[]) => void;
    clearSelection: () => void;
    isSelected: (id: string) => boolean;
    selectedCount: number;
}

export function useBulkSelection<T extends { id: string }>(
    items: T[]
): BulkSelectionState<T> {
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    const allIds = useMemo(() => new Set(items.map(i => i.id)), [items]);

    const toggleItem = useCallback((id: string) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    const toggleAll = useCallback(() => {
        setSelectedItems(prev => {
            if (prev.size === allIds.size) {
                return new Set();
            }
            return new Set(allIds);
        });
    }, [allIds]);

    const selectItems = useCallback((ids: string[]) => {
        setSelectedItems(new Set(ids));
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedItems(new Set());
    }, []);

    const isSelected = useCallback((id: string) => selectedItems.has(id), [selectedItems]);

    return {
        selectedItems,
        isAllSelected: selectedItems.size === allIds.size && allIds.size > 0,
        isPartiallySelected: selectedItems.size > 0 && selectedItems.size < allIds.size,
        toggleItem,
        toggleAll,
        selectItems,
        clearSelection,
        isSelected,
        selectedCount: selectedItems.size
    };
}

// ============================================
// BULK ACTION BAR
// ============================================

export interface BulkAction {
    id: string;
    label: string;
    icon: React.ReactNode;
    variant?: 'default' | 'danger';
    onClick: (selectedIds: string[]) => void | Promise<void>;
}

interface BulkActionBarProps {
    selectedCount: number;
    actions: BulkAction[];
    onClear: () => void;
    className?: string;
}

export const BulkActionBar: React.FC<BulkActionBarProps> = ({
    selectedCount,
    actions,
    onClear,
    className = ''
}) => {
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    if (selectedCount === 0) return null;

    const handleAction = async (action: BulkAction, selectedIds: string[]) => {
        setLoadingAction(action.id);
        try {
            await action.onClick(selectedIds);
        } finally {
            setLoadingAction(null);
        }
    };

    return (
        <div
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-4 z-40 animate-slide-up ${className}`}
        >
            {/* Selection count */}
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center font-bold">
                    {selectedCount}
                </div>
                <span className="text-sm">item dipilih</span>
            </div>

            <div className="w-px h-6 bg-slate-700" />

            {/* Actions */}
            <div className="flex items-center gap-2">
                {actions.map(action => (
                    <button
                        key={action.id}
                        onClick={() => handleAction(action, [])}
                        disabled={loadingAction !== null}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${action.variant === 'danger'
                            ? 'hover:bg-red-500/20 text-red-400'
                            : 'hover:bg-white/10'
                            }`}
                    >
                        {loadingAction === action.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            action.icon
                        )}
                        <span className="hidden sm:inline">{action.label}</span>
                    </button>
                ))}
            </div>

            <div className="w-px h-6 bg-slate-700" />

            {/* Clear selection */}
            <button
                onClick={onClear}
                className="p-2 hover:bg-white/10 rounded-lg"
                aria-label="Batalkan pilihan"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

// ============================================
// DRAG AND DROP
// ============================================

interface DragItem {
    id: string;
    index: number;
}

interface DragDropContextValue {
    draggedItem: DragItem | null;
    setDraggedItem: (item: DragItem | null) => void;
    dropTargetIndex: number | null;
    setDropTargetIndex: (index: number | null) => void;
}

const DragDropContext = createContext<DragDropContextValue | null>(null);

export const DragDropProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);
    const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

    return (
        <DragDropContext.Provider value={{ draggedItem, setDraggedItem, dropTargetIndex, setDropTargetIndex }}>
            {children}
        </DragDropContext.Provider>
    );
};

interface DraggableItemProps {
    id: string;
    index: number;
    children: React.ReactNode;
    onReorder: (fromIndex: number, toIndex: number) => void;
    className?: string;
}

export const DraggableItem: React.FC<DraggableItemProps> = ({
    id,
    index,
    children,
    onReorder,
    className = ''
}) => {
    const context = useContext(DragDropContext);
    const [isDragging, setIsDragging] = useState(false);
    const [isOver, setIsOver] = useState(false);
    const elementRef = useRef<HTMLDivElement>(null);

    if (!context) {
        throw new Error('DraggableItem must be used within DragDropProvider');
    }

    const { draggedItem, setDraggedItem, setDropTargetIndex } = context;

    const handleDragStart = (e: React.DragEvent) => {
        setIsDragging(true);
        setDraggedItem({ id, index });
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
    };

    const handleDragEnd = () => {
        setIsDragging(false);
        setDraggedItem(null);
        setDropTargetIndex(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (draggedItem && draggedItem.index !== index) {
            setIsOver(true);
            setDropTargetIndex(index);
        }
    };

    const handleDragLeave = () => {
        setIsOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsOver(false);

        if (draggedItem && draggedItem.index !== index) {
            onReorder(draggedItem.index, index);
        }
    };

    // Touch support
    const handleTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        setDraggedItem({ id, index });
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;

        const touch = e.touches[0];
        const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
        const target = elements.find(el => el.getAttribute('data-draggable') === 'true');

        if (target) {
            const targetIndex = parseInt(target.getAttribute('data-index') || '0');
            if (targetIndex !== index) {
                setDropTargetIndex(targetIndex);
            }
        }
    };

    const handleTouchEnd = () => {
        if (context.dropTargetIndex !== null && context.dropTargetIndex !== index) {
            onReorder(index, context.dropTargetIndex);
        }
        setIsDragging(false);
        setDraggedItem(null);
        setDropTargetIndex(null);
    };

    return (
        <div
            ref={elementRef}
            draggable
            data-draggable="true"
            data-index={index}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={`
                relative group cursor-move
                transition-all duration-200
                ${isDragging ? 'opacity-50 scale-95' : ''}
                ${isOver ? 'border-t-2 border-indigo-500' : ''}
                ${className}
            `}
        >
            <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-4 h-4 text-slate-400" />
            </div>
            {children}
        </div>
    );
};

// ============================================
// useDragReorder Hook
// ============================================

export function useDragReorder<T extends { id: string }>(initialItems: T[]) {
    const [items, setItems] = useState(initialItems);

    useEffect(() => {
        setItems(initialItems);
    }, [initialItems]);

    const reorder = useCallback((fromIndex: number, toIndex: number) => {
        setItems(prev => {
            const result = Array.from(prev);
            const [removed] = result.splice(fromIndex, 1);
            result.splice(toIndex, 0, removed);
            return result;
        });
    }, []);

    return { items, reorder, setItems };
}

// ============================================
// KEYBOARD SHORTCUTS (Enhanced)
// ============================================

export interface KeyboardShortcut {
    key: string;
    modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
    description: string;
    category: string;
    action: () => void;
}

interface KeyboardShortcutsContextValue {
    shortcuts: KeyboardShortcut[];
    registerShortcut: (shortcut: KeyboardShortcut) => void;
    unregisterShortcut: (key: string, modifiers?: string[]) => void;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);

export const useKeyboardShortcuts = () => {
    const context = useContext(KeyboardShortcutsContext);
    if (!context) {
        throw new Error('useKeyboardShortcuts must be used within KeyboardShortcutsProvider');
    }
    return context;
};

export const KeyboardShortcutsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);

    const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
        setShortcuts(prev => [...prev.filter(s =>
            !(s.key === shortcut.key && JSON.stringify(s.modifiers) === JSON.stringify(shortcut.modifiers))
        ), shortcut]);
    }, []);

    const unregisterShortcut = useCallback((key: string, modifiers?: string[]) => {
        setShortcuts(prev => prev.filter(s =>
            !(s.key === key && JSON.stringify(s.modifiers) === JSON.stringify(modifiers))
        ));
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger in inputs
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as Element).tagName)) {
                return;
            }

            for (const shortcut of shortcuts) {
                const modifiers = shortcut.modifiers || [];
                const ctrlMatch = modifiers.includes('ctrl') === (e.ctrlKey || e.metaKey);
                const altMatch = modifiers.includes('alt') === e.altKey;
                const shiftMatch = modifiers.includes('shift') === e.shiftKey;

                if (e.key.toLowerCase() === shortcut.key.toLowerCase() && ctrlMatch && altMatch && shiftMatch) {
                    e.preventDefault();
                    shortcut.action();
                    return;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);

    return (
        <KeyboardShortcutsContext.Provider value={{ shortcuts, registerShortcut, unregisterShortcut }}>
            {children}
        </KeyboardShortcutsContext.Provider>
    );
};

// ============================================
// CUSTOMIZABLE DASHBOARD
// ============================================

export interface DashboardWidget {
    id: string;
    type: string;
    title: string;
    size: 'sm' | 'md' | 'lg' | 'full';
    position: number;
    visible: boolean;
    settings?: Record<string, any>;
}

interface DashboardContextValue {
    widgets: DashboardWidget[];
    addWidget: (widget: Omit<DashboardWidget, 'id' | 'position'>) => void;
    removeWidget: (id: string) => void;
    updateWidget: (id: string, updates: Partial<DashboardWidget>) => void;
    reorderWidgets: (fromIndex: number, toIndex: number) => void;
    toggleWidget: (id: string) => void;
    saveLayout: () => void;
    resetLayout: () => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export const useDashboard = () => {
    const context = useContext(DashboardContext);
    if (!context) {
        throw new Error('useDashboard must be used within DashboardProvider');
    }
    return context;
};

const loadWidgetsFromStorage = (
    storageKey: string,
    defaultWidgets: Omit<DashboardWidget, 'position'>[]
): DashboardWidget[] => {
    if (typeof localStorage === 'undefined') {
        return defaultWidgets.map((w, i) => ({ ...w, position: i }));
    }
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
        return defaultWidgets.map((w, i) => ({ ...w, position: i }));
    }
    try {
        return JSON.parse(stored) as DashboardWidget[];
    } catch {
        return defaultWidgets.map((w, i) => ({ ...w, position: i }));
    }
};

interface DashboardProviderProps {
    children: React.ReactNode;
    defaultWidgets: Omit<DashboardWidget, 'position'>[];
    storageKey?: string;
}

export const DashboardProvider: React.FC<DashboardProviderProps> = ({
    children,
    defaultWidgets,
    storageKey = 'dashboard_layout'
}) => {
    const [widgets, setWidgets] = useState<DashboardWidget[]>(() =>
        loadWidgetsFromStorage(storageKey, defaultWidgets)
    );

    const addWidget = useCallback((widget: Omit<DashboardWidget, 'id' | 'position'>) => {
        const newWidget: DashboardWidget = {
            ...widget,
            id: `widget_${Date.now()}`,
            position: widgets.length
        };
        setWidgets(prev => [...prev, newWidget]);
    }, [widgets.length]);

    const removeWidget = useCallback((id: string) => {
        setWidgets(prev => prev.filter(w => w.id !== id));
    }, []);

    const updateWidget = useCallback((id: string, updates: Partial<DashboardWidget>) => {
        setWidgets(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
    }, []);

    const reorderWidgets = useCallback((fromIndex: number, toIndex: number) => {
        setWidgets(prev => {
            const result = [...prev];
            const [removed] = result.splice(fromIndex, 1);
            result.splice(toIndex, 0, removed);
            return result.map((w, i) => ({ ...w, position: i }));
        });
    }, []);

    const toggleWidget = useCallback((id: string) => {
        setWidgets(prev => prev.map(w =>
            w.id === id ? { ...w, visible: !w.visible } : w
        ));
    }, []);

    const saveLayout = useCallback(() => {
        localStorage.setItem(storageKey, JSON.stringify(widgets));
    }, [storageKey, widgets]);

    const resetLayout = useCallback(() => {
        setWidgets(defaultWidgets.map((w, i) => ({ ...w, position: i })));
        localStorage.removeItem(storageKey);
    }, [defaultWidgets, storageKey]);

    // Auto-save on change
    useEffect(() => {
        if (widgets.length > 0) {
            saveLayout();
        }
    }, [widgets, saveLayout]);

    return (
        <DashboardContext.Provider value={{
            widgets,
            addWidget,
            removeWidget,
            updateWidget,
            reorderWidgets,
            toggleWidget,
            saveLayout,
            resetLayout
        }}>
            {children}
        </DashboardContext.Provider>
    );
};

// ============================================
// DASHBOARD WIDGET COMPONENTS
// ============================================

interface WidgetContainerProps {
    widget: DashboardWidget;
    children: React.ReactNode;
    onSettings?: () => void;
    className?: string;
}

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
    widget,
    children,
    onSettings,
    className = ''
}) => {
    const { removeWidget, toggleWidget } = useDashboard();
    const [showMenu, setShowMenu] = useState(false);

    const sizeClasses = {
        sm: 'col-span-1',
        md: 'col-span-2',
        lg: 'col-span-3',
        full: 'col-span-full'
    };

    if (!widget.visible) return null;

    return (
        <div
            className={`
                ${sizeClasses[widget.size]}
                bg-white dark:bg-slate-800 rounded-xl shadow-sm
                border border-slate-200 dark:border-slate-700
                overflow-hidden
                ${className}
            `}
        >
            {/* Widget Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-medium text-slate-900 dark:text-white">{widget.title}</h3>
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                        <MoreHorizontal className="w-4 h-4 text-slate-400" />
                    </button>

                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                            <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20">
                                {onSettings && (
                                    <button
                                        onClick={() => { onSettings(); setShowMenu(false); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                    >
                                        <Settings className="w-4 h-4" />
                                        Pengaturan
                                    </button>
                                )}
                                <button
                                    onClick={() => { toggleWidget(widget.id); setShowMenu(false); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                >
                                    <EyeOff className="w-4 h-4" />
                                    Sembunyikan
                                </button>
                                <button
                                    onClick={() => { removeWidget(widget.id); setShowMenu(false); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Hapus
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Widget Content */}
            <div className="p-4">
                {children}
            </div>
        </div>
    );
};

// ============================================
// DASHBOARD CONFIGURATOR
// ============================================

export const DashboardConfigurator: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    availableWidgets: { type: string; title: string; description: string }[];
}> = ({ isOpen, onClose, availableWidgets }) => {
    const { widgets, addWidget, toggleWidget, resetLayout } = useDashboard();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Kustomisasi Dashboard
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="max-h-96 overflow-y-auto p-4">
                    <div className="space-y-3">
                        {availableWidgets.map(available => {
                            const existing = widgets.find(w => w.type === available.type);

                            return (
                                <div
                                    key={available.type}
                                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl"
                                >
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white">
                                            {available.title}
                                        </p>
                                        <p className="text-sm text-slate-500">{available.description}</p>
                                    </div>
                                    {existing ? (
                                        <button
                                            onClick={() => toggleWidget(existing.id)}
                                            className={`p-2 rounded-lg ${existing.visible
                                                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600'
                                                : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                                                }`}
                                        >
                                            {existing.visible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => addWidget({
                                                type: available.type,
                                                title: available.title,
                                                size: 'md',
                                                visible: true
                                            })}
                                            className="p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
                                        >
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-between p-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                        onClick={resetLayout}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                    >
                        Reset ke Default
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
                    >
                        Selesai
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================
// EXPORT PREVIEW MODAL
// ============================================

export type ExportFormat = 'csv' | 'xlsx' | 'pdf' | 'json';

interface ExportPreviewProps<T> {
    isOpen: boolean;
    onClose: () => void;
    data: T[];
    columns: { key: keyof T; label: string }[];
    onExport: (format: ExportFormat, selectedColumns: (keyof T)[]) => void;
    title?: string;
}

export function ExportPreviewModal<T>({
    isOpen,
    onClose,
    data,
    columns,
    onExport,
    title = 'Ekspor Data'
}: ExportPreviewProps<T>) {
    const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('xlsx');
    const [selectedColumns, setSelectedColumns] = useState<Set<keyof T>>(
        new Set(columns.map(c => c.key))
    );
    const [isExporting, setIsExporting] = useState(false);

    const toggleColumn = (key: keyof T) => {
        setSelectedColumns(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            await onExport(selectedFormat, Array.from(selectedColumns));
            onClose();
        } finally {
            setIsExporting(false);
        }
    };

    const formats: { value: ExportFormat; label: string; icon: React.ReactNode }[] = [
        { value: 'xlsx', label: 'Excel (.xlsx)', icon: <Table className="w-4 h-4" /> },
        { value: 'csv', label: 'CSV (.csv)', icon: <FileText className="w-4 h-4" /> },
        { value: 'pdf', label: 'PDF (.pdf)', icon: <FileText className="w-4 h-4" /> },
        { value: 'json', label: 'JSON (.json)', icon: <FileText className="w-4 h-4" /> }
    ];

    if (!isOpen) return null;

    // Preview data
    const previewData = data.slice(0, 5);
    const previewColumns = columns.filter(c => selectedColumns.has(c.key));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
                        <p className="text-sm text-slate-500">{data.length} data akan diekspor</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Format Selection */}
                    <div>
                        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Format File
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {formats.map(format => (
                                <button
                                    key={format.value}
                                    onClick={() => setSelectedFormat(format.value)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${selectedFormat === format.value
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600'
                                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    {format.icon}
                                    <span className="text-sm">{format.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Column Selection */}
                    <div>
                        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Kolom yang Diekspor
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {columns.map(col => (
                                <button
                                    key={String(col.key)}
                                    onClick={() => toggleColumn(col.key)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${selectedColumns.has(col.key)
                                        ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                        }`}
                                >
                                    {selectedColumns.has(col.key) && <Check className="w-3 h-3" />}
                                    {col.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div>
                        <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Pratinjau Data
                        </h3>
                        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-800">
                                        <tr>
                                            {previewColumns.map(col => (
                                                <th
                                                    key={String(col.key)}
                                                    className="px-3 py-2 text-left font-medium text-slate-600 dark:text-slate-400"
                                                >
                                                    {col.label}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.map((row, i) => (
                                            <tr key={i} className="border-t border-slate-100 dark:border-slate-700">
                                                {previewColumns.map(col => (
                                                    <td
                                                        key={String(col.key)}
                                                        className="px-3 py-2 text-slate-700 dark:text-slate-300"
                                                    >
                                                        {String(row[col.key] ?? '-')}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {data.length > 5 && (
                                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800 text-center text-sm text-slate-500">
                                    ... dan {data.length - 5} baris lainnya
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-sm text-slate-500">
                        {selectedColumns.size} dari {columns.length} kolom dipilih
                    </span>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={isExporting || selectedColumns.size === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50"
                        >
                            {isExporting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Download className="w-4 h-4" />
                            )}
                            Ekspor
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================
// KEYBOARD SHORTCUTS PANEL
// ============================================

export const KeyboardShortcutsPanel: React.FC<{
    isOpen: boolean;
    onClose: () => void;
}> = ({ isOpen, onClose }) => {
    const { shortcuts } = useKeyboardShortcuts();

    if (!isOpen) return null;

    // Group by category
    const grouped = shortcuts.reduce((acc, s) => {
        const cat = s.category || 'Utama';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(s);
        return acc;
    }, {} as Record<string, KeyboardShortcut[]>);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col animate-scale-in">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-sm font-mono">⌘</kbd>
                        Pintasan Keyboard
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        {Object.entries(grouped).map(([category, items]) => (
                            <div key={category}>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">{category}</h3>
                                <div className="space-y-3">
                                    {items.map((shortcut, i) => (
                                        <div key={i} className="flex items-center justify-between">
                                            <span className="text-sm text-slate-700 dark:text-slate-300">{shortcut.description}</span>
                                            <div className="flex items-center gap-1">
                                                {shortcut.modifiers?.map(m => (
                                                    <kbd key={m} className="px-2 py-1 min-w-[24px] text-center bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-500 uppercase">
                                                        {m === 'meta' ? '⌘' : m}
                                                    </kbd>
                                                ))}
                                                <kbd className="px-2 py-1 min-w-[24px] text-center bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-500 uppercase">
                                                    {shortcut.key}
                                                </kbd>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
                    Tekan <kbd className="font-mono bg-white dark:bg-slate-700 px-1 rounded border">?</kbd> atau <kbd className="font-mono bg-white dark:bg-slate-700 px-1 rounded border">Shift + /</kbd> untuk membuka panel ini kapan saja
                </div>
            </div>
        </div>
    );
};

// ============================================
// EXPORTS
// ============================================

export default {
    useBulkSelection,
    BulkActionBar,
    DragDropProvider,
    DraggableItem,
    useDragReorder,
    KeyboardShortcutsProvider,
    useKeyboardShortcuts,
    KeyboardShortcutsPanel,
    DashboardProvider,
    useDashboard,
    WidgetContainer,
    DashboardConfigurator,
    ExportPreviewModal
};
