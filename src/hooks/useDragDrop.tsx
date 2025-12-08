import React, { useState, useCallback, useMemo } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    TouchSensor,
    KeyboardSensor,
    closestCenter,
    useSensor,
    useSensors,
    UniqueIdentifier,
    DragOverEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
    horizontalListSortingStrategy,
    rectSortingStrategy,
    arrayMove,
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Upload, X, Check, FileIcon, ImageIcon, FileText } from 'lucide-react';

/**
 * Advanced Drag & Drop System using @dnd-kit
 * 
 * Features:
 * - Sortable lists (vertical, horizontal, grid)
 * - File drop zones
 * - Touch support
 * - Keyboard accessibility
 * - Drag overlay for better UX
 */

// ============================================
// SORTABLE ITEM COMPONENT
// ============================================

interface SortableItemProps {
    id: string;
    children: React.ReactNode;
    className?: string;
    dragHandleClassName?: string;
    showDragHandle?: boolean;
    disabled?: boolean;
}

export const SortableItem: React.FC<SortableItemProps> = ({
    id,
    children,
    className = '',
    dragHandleClassName = '',
    showDragHandle = true,
    disabled = false,
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, disabled });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: disabled ? 'default' : 'grab',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`relative group ${isDragging ? 'z-50 shadow-2xl' : ''} ${className}`}
            {...(showDragHandle ? {} : { ...attributes, ...listeners })}
        >
            {showDragHandle && (
                <div
                    className={`absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded cursor-grab active:cursor-grabbing
                        opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800
                        transition-opacity z-10 ${dragHandleClassName}`}
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="w-4 h-4 text-slate-400" />
                </div>
            )}
            {children}
        </div>
    );
};

// ============================================
// SORTABLE LIST COMPONENT
// ============================================

type SortingStrategy = 'vertical' | 'horizontal' | 'grid';

interface SortableListProps<T extends { id: string }> {
    items: T[];
    onReorder: (items: T[]) => void;
    renderItem: (item: T, index: number) => React.ReactNode;
    renderOverlay?: (item: T) => React.ReactNode;
    strategy?: SortingStrategy;
    className?: string;
    disabled?: boolean;
}

export function SortableList<T extends { id: string }>({
    items,
    onReorder,
    renderItem,
    renderOverlay,
    strategy = 'vertical',
    className = '',
    disabled = false,
}: SortableListProps<T>) {
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 200,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const strategyMap = {
        vertical: verticalListSortingStrategy,
        horizontal: horizontalListSortingStrategy,
        grid: rectSortingStrategy,
    };

    const handleDragStart = useCallback((event: DragStartEvent) => {
        setActiveId(event.active.id);
    }, []);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);

        if (over && active.id !== over.id) {
            const oldIndex = items.findIndex((item) => item.id === active.id);
            const newIndex = items.findIndex((item) => item.id === over.id);
            const newItems = arrayMove(items, oldIndex, newIndex);
            onReorder(newItems);
        }
    }, [items, onReorder]);

    const activeItem = useMemo(() =>
        items.find((item) => item.id === activeId),
        [items, activeId]
    );

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <SortableContext
                items={items.map((item) => item.id)}
                strategy={strategyMap[strategy]}
                disabled={disabled}
            >
                <div className={className}>
                    {items.map((item, index) => renderItem(item, index))}
                </div>
            </SortableContext>

            <DragOverlay>
                {activeItem && renderOverlay ? (
                    <div className="shadow-2xl rounded-xl opacity-90">
                        {renderOverlay(activeItem)}
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}

// ============================================
// useSortableList HOOK
// ============================================

export function useSortableList<T extends { id: string }>(initialItems: T[]) {
    const [items, setItems] = useState<T[]>(initialItems);

    // Sync with external changes
    React.useEffect(() => {
        setItems(initialItems);
    }, [initialItems]);

    const reorder = useCallback((newItems: T[]) => {
        setItems(newItems);
    }, []);

    const moveItem = useCallback((fromIndex: number, toIndex: number) => {
        setItems((prev) => arrayMove(prev, fromIndex, toIndex));
    }, []);

    const addItem = useCallback((item: T, index?: number) => {
        setItems((prev) => {
            if (index !== undefined) {
                const newItems = [...prev];
                newItems.splice(index, 0, item);
                return newItems;
            }
            return [...prev, item];
        });
    }, []);

    const removeItem = useCallback((id: string) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    }, []);

    const updateItem = useCallback((id: string, updates: Partial<T>) => {
        setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
        );
    }, []);

    return {
        items,
        setItems,
        reorder,
        moveItem,
        addItem,
        removeItem,
        updateItem,
    };
}

// ============================================
// FILE DROP ZONE COMPONENT
// ============================================

interface FileDropZoneProps {
    onFilesDropped: (files: File[]) => void;
    accept?: string[];
    maxFiles?: number;
    maxSize?: number; // in bytes
    className?: string;
    children?: React.ReactNode;
    disabled?: boolean;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
    onFilesDropped,
    accept = ['*'],
    maxFiles = 10,
    maxSize = 10 * 1024 * 1024, // 10MB default
    className = '',
    children,
    disabled = false,
}) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = React.useRef<HTMLInputElement>(null);

    const validateFiles = useCallback((files: File[]): File[] => {
        setError(null);

        if (files.length > maxFiles) {
            setError(`Maksimal ${maxFiles} file`);
            return files.slice(0, maxFiles);
        }

        const validFiles = files.filter((file) => {
            if (file.size > maxSize) {
                setError(`File "${file.name}" terlalu besar (max ${Math.round(maxSize / 1024 / 1024)}MB)`);
                return false;
            }

            if (accept[0] !== '*') {
                const fileType = file.type || '';
                const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
                const isValid = accept.some((type) => {
                    if (type.startsWith('.')) {
                        return fileExt === type.toLowerCase();
                    }
                    if (type.endsWith('/*')) {
                        return fileType.startsWith(type.replace('/*', ''));
                    }
                    return fileType === type;
                });
                if (!isValid) {
                    setError(`Format file "${file.name}" tidak didukung`);
                    return false;
                }
            }

            return true;
        });

        return validFiles;
    }, [accept, maxFiles, maxSize]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled) {
            setIsDragOver(true);
        }
    }, [disabled]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        if (disabled) return;

        const files = Array.from(e.dataTransfer.files);
        const validFiles = validateFiles(files);
        if (validFiles.length > 0) {
            onFilesDropped(validFiles);
        }
    }, [disabled, onFilesDropped, validateFiles]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const validFiles = validateFiles(files);
        if (validFiles.length > 0) {
            onFilesDropped(validFiles);
        }
        e.target.value = ''; // Reset input
    }, [onFilesDropped, validateFiles]);

    const handleClick = useCallback(() => {
        if (!disabled) {
            inputRef.current?.click();
        }
    }, [disabled]);

    return (
        <div
            className={`
                relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer
                ${isDragOver
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${className}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label="Drop files here or click to upload"
        >
            <input
                ref={inputRef}
                type="file"
                multiple={maxFiles > 1}
                accept={accept.join(',')}
                onChange={handleInputChange}
                className="hidden"
                disabled={disabled}
            />

            {children || (
                <div className="flex flex-col items-center gap-4">
                    <div className={`
                        w-16 h-16 rounded-full flex items-center justify-center transition-colors
                        ${isDragOver
                            ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                        }
                    `}>
                        <Upload className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="font-medium text-slate-700 dark:text-slate-300">
                            {isDragOver ? 'Lepaskan file di sini' : 'Seret file ke sini'}
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                            atau klik untuk memilih file
                        </p>
                    </div>
                    <p className="text-xs text-slate-400">
                        Max {maxFiles} file, masing-masing max {Math.round(maxSize / 1024 / 1024)}MB
                    </p>
                </div>
            )}

            {error && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg">
                    {error}
                </div>
            )}
        </div>
    );
};

// ============================================
// FILE PREVIEW LIST COMPONENT
// ============================================

interface FileWithPreview extends File {
    preview?: string;
}

interface FilePreviewListProps {
    files: FileWithPreview[];
    onRemove: (index: number) => void;
    onReorder?: (files: FileWithPreview[]) => void;
    className?: string;
}

export const FilePreviewList: React.FC<FilePreviewListProps> = ({
    files,
    onRemove,
    onReorder,
    className = '',
}) => {
    const getFileIcon = (file: File) => {
        if (file.type.startsWith('image/')) {
            return <ImageIcon className="w-5 h-5 text-green-500" />;
        }
        if (file.type.includes('pdf')) {
            return <FileText className="w-5 h-5 text-red-500" />;
        }
        return <FileIcon className="w-5 h-5 text-blue-500" />;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    };

    const items = files.map((file, index) => ({
        id: `file-${index}-${file.name}`,
        file,
        index,
    }));

    const renderFileItem = (item: typeof items[0]) => (
        <SortableItem
            key={item.id}
            id={item.id}
            showDragHandle={!!onReorder}
            className="mb-2"
        >
            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl pl-10">
                {/* File Preview */}
                {item.file.type.startsWith('image/') && item.file.preview ? (
                    <img
                        src={item.file.preview}
                        alt={item.file.name}
                        className="w-10 h-10 rounded-lg object-cover"
                    />
                ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        {getFileIcon(item.file)}
                    </div>
                )}

                {/* File Info */}
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-700 dark:text-slate-300 truncate">
                        {item.file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                        {formatFileSize(item.file.size)}
                    </p>
                </div>

                {/* Remove Button */}
                <button
                    onClick={() => onRemove(item.index)}
                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </SortableItem>
    );

    if (files.length === 0) return null;

    if (onReorder) {
        return (
            <SortableList
                items={items}
                onReorder={(newItems) => onReorder(newItems.map((item) => item.file))}
                renderItem={(item) => renderFileItem(item)}
                className={className}
            />
        );
    }

    return (
        <div className={className}>
            {items.map((item) => (
                <div key={item.id} className="mb-2">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        {item.file.type.startsWith('image/') && item.file.preview ? (
                            <img
                                src={item.file.preview}
                                alt={item.file.name}
                                className="w-10 h-10 rounded-lg object-cover"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                {getFileIcon(item.file)}
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-700 dark:text-slate-300 truncate">
                                {item.file.name}
                            </p>
                            <p className="text-xs text-slate-500">
                                {formatFileSize(item.file.size)}
                            </p>
                        </div>
                        <button
                            onClick={() => onRemove(item.index)}
                            className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

// ============================================
// SCHEDULE DRAG DROP COMPONENT
// ============================================

export interface ScheduleSlot {
    id: string;
    day: number; // 0-6 (Sunday-Saturday)
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    title: string;
    color?: string;
}

interface ScheduleDragDropProps {
    slots: ScheduleSlot[];
    onSlotsChange: (slots: ScheduleSlot[]) => void;
    onSlotClick?: (slot: ScheduleSlot) => void;
    days?: string[];
    startHour?: number;
    endHour?: number;
    className?: string;
}

export const ScheduleDragDrop: React.FC<ScheduleDragDropProps> = ({
    slots,
    onSlotsChange,
    onSlotClick,
    days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
    startHour = 7,
    endHour = 17,
    className = '',
}) => {
    const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

    const getSlotStyle = (slot: ScheduleSlot): React.CSSProperties => {
        const [startH, startM] = slot.startTime.split(':').map(Number);
        const [endH, endM] = slot.endTime.split(':').map(Number);

        const startMinutes = (startH - startHour) * 60 + startM;
        const endMinutes = (endH - startHour) * 60 + endM;
        const duration = endMinutes - startMinutes;

        const hourHeight = 60; // 60px per hour
        const top = (startMinutes / 60) * hourHeight;
        const height = (duration / 60) * hourHeight;

        return {
            top: `${top}px`,
            height: `${height}px`,
            backgroundColor: slot.color || '#6366f1',
        };
    };

    const slotItems = slots.map((slot) => ({
        id: slot.id,
        ...slot,
    }));

    return (
        <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden ${className}`}>
            {/* Header */}
            <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700">
                <div className="w-16 p-3 bg-slate-50 dark:bg-slate-800" />
                {days.map((day, index) => (
                    <div
                        key={day}
                        className="p-3 text-center font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="relative grid grid-cols-7">
                {/* Time column */}
                <div className="w-16">
                    {hours.map((hour) => (
                        <div
                            key={hour}
                            className="h-[60px] border-b border-slate-100 dark:border-slate-800 flex items-start justify-end pr-2 pt-1"
                        >
                            <span className="text-xs text-slate-400">
                                {String(hour).padStart(2, '0')}:00
                            </span>
                        </div>
                    ))}
                </div>

                {/* Day columns */}
                {days.map((day, dayIndex) => (
                    <div
                        key={day}
                        className="relative border-l border-slate-200 dark:border-slate-700"
                    >
                        {/* Hour lines */}
                        {hours.map((hour) => (
                            <div
                                key={hour}
                                className="h-[60px] border-b border-slate-100 dark:border-slate-800"
                            />
                        ))}

                        {/* Slots for this day */}
                        <SortableList
                            items={slotItems.filter((s) => s.day === dayIndex)}
                            onReorder={(newSlots) => {
                                const otherSlots = slots.filter((s) => s.day !== dayIndex);
                                onSlotsChange([...otherSlots, ...newSlots]);
                            }}
                            renderItem={(slot) => (
                                <SortableItem
                                    key={slot.id}
                                    id={slot.id}
                                    showDragHandle={false}
                                    className="absolute left-1 right-1"
                                >
                                    <div
                                        style={getSlotStyle(slot)}
                                        className="absolute inset-x-0 rounded-lg px-2 py-1 text-white text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"
                                        onClick={() => onSlotClick?.(slot)}
                                    >
                                        <p className="truncate">{slot.title}</p>
                                        <p className="opacity-75 text-[10px]">
                                            {slot.startTime} - {slot.endTime}
                                        </p>
                                    </div>
                                </SortableItem>
                            )}
                            className="absolute inset-0"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================
// KANBAN BOARD COMPONENT
// ============================================

export interface KanbanColumn {
    id: string;
    title: string;
    items: KanbanItem[];
}

export interface KanbanItem {
    id: string;
    title: string;
    description?: string;
    color?: string;
}

interface KanbanBoardProps {
    columns: KanbanColumn[];
    onColumnsChange: (columns: KanbanColumn[]) => void;
    renderItem?: (item: KanbanItem) => React.ReactNode;
    className?: string;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
    columns,
    onColumnsChange,
    renderItem,
    className = '',
}) => {
    const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 200, tolerance: 5 },
        })
    );

    const findItemColumn = (id: string) => {
        return columns.find((col) => col.items.some((item) => item.id === id));
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeColumn = findItemColumn(active.id as string);
        const overColumn = columns.find((col) => col.id === over.id) || findItemColumn(over.id as string);

        if (!activeColumn || !overColumn || activeColumn.id === overColumn.id) return;

        const activeItem = activeColumn.items.find((item) => item.id === active.id);
        if (!activeItem) return;

        const newColumns = columns.map((col) => {
            if (col.id === activeColumn.id) {
                return {
                    ...col,
                    items: col.items.filter((item) => item.id !== active.id),
                };
            }
            if (col.id === overColumn.id) {
                const overIndex = col.items.findIndex((item) => item.id === over.id);
                const newItems = [...col.items];
                if (overIndex >= 0) {
                    newItems.splice(overIndex, 0, activeItem);
                } else {
                    newItems.push(activeItem);
                }
                return { ...col, items: newItems };
            }
            return col;
        });

        onColumnsChange(newColumns);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null);
        const { active, over } = event;
        if (!over) return;

        const column = findItemColumn(active.id as string);
        if (!column) return;

        const oldIndex = column.items.findIndex((item) => item.id === active.id);
        const newIndex = column.items.findIndex((item) => item.id === over.id);

        if (oldIndex !== newIndex && newIndex >= 0) {
            const newColumns = columns.map((col) => {
                if (col.id === column.id) {
                    return {
                        ...col,
                        items: arrayMove(col.items, oldIndex, newIndex),
                    };
                }
                return col;
            });
            onColumnsChange(newColumns);
        }
    };

    const activeItem = useMemo(() => {
        if (!activeId) return null;
        for (const col of columns) {
            const item = col.items.find((item) => item.id === activeId);
            if (item) return item;
        }
        return null;
    }, [activeId, columns]);

    const defaultRenderItem = (item: KanbanItem) => (
        <div
            className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"
            style={{ borderLeftColor: item.color, borderLeftWidth: item.color ? '4px' : undefined }}
        >
            <p className="font-medium text-slate-800 dark:text-slate-200">{item.title}</p>
            {item.description && (
                <p className="text-sm text-slate-500 mt-1">{item.description}</p>
            )}
        </div>
    );

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className={`flex gap-4 overflow-x-auto pb-4 ${className}`}>
                {columns.map((column) => (
                    <div
                        key={column.id}
                        className="flex-shrink-0 w-72 bg-slate-50 dark:bg-slate-900 rounded-2xl p-4"
                    >
                        <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center justify-between">
                            {column.title}
                            <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-full text-xs">
                                {column.items.length}
                            </span>
                        </h3>
                        <SortableContext
                            items={column.items.map((item) => item.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-3 min-h-[100px]">
                                {column.items.map((item) => (
                                    <SortableItem
                                        key={item.id}
                                        id={item.id}
                                        showDragHandle={false}
                                    >
                                        {renderItem ? renderItem(item) : defaultRenderItem(item)}
                                    </SortableItem>
                                ))}
                            </div>
                        </SortableContext>
                    </div>
                ))}
            </div>

            <DragOverlay>
                {activeItem && (
                    <div className="shadow-2xl opacity-90">
                        {renderItem ? renderItem(activeItem) : defaultRenderItem(activeItem)}
                    </div>
                )}
            </DragOverlay>
        </DndContext>
    );
};

export default {
    SortableItem,
    SortableList,
    useSortableList,
    FileDropZone,
    FilePreviewList,
    ScheduleDragDrop,
    KanbanBoard,
};
