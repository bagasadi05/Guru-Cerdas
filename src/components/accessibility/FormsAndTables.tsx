import React, { useState } from 'react';
import { useKeyboardNavigation } from './shared';

interface AccessibleFieldProps {
    id: string;
    label: string;
    error?: string;
    description?: string;
    required?: boolean;
    children: React.ReactElement;
}

export const AccessibleField: React.FC<AccessibleFieldProps> = ({
    id,
    label,
    error,
    description,
    required,
    children
}) => {
    const descriptionId = description ? `${id}-desc` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {label}
                {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
                {required && <span className="sr-only">(wajib diisi)</span>}
            </label>

            {React.cloneElement(children, {
                id,
                'aria-describedby': describedBy,
                'aria-invalid': !!error,
                'aria-required': required
            })}

            {description && (
                <p id={descriptionId} className="text-sm text-slate-500 dark:text-slate-400">
                    {description}
                </p>
            )}

            {error && (
                <p id={errorId} role="alert" className="text-sm text-red-500">
                    {error}
                </p>
            )}
        </div>
    );
};

interface Column<T> {
    key: keyof T;
    header: string;
    sortable?: boolean;
}

interface AccessibleTableProps<T> {
    data: T[];
    columns: Column<T>[];
    caption?: string;
    sortColumn?: keyof T;
    sortDirection?: 'asc' | 'desc';
    onSort?: (column: keyof T) => void;
    emptyMessage?: string;
}

export function AccessibleTable<T extends { id: string | number }>({
    data,
    columns,
    caption,
    sortColumn,
    sortDirection,
    onSort,
    emptyMessage = 'Tidak ada data'
}: AccessibleTableProps<T>) {
    return (
        <div className="overflow-x-auto" role="region" aria-label={caption || 'Tabel data'}>
            <table className="w-full">
                {caption && <caption className="sr-only">{caption}</caption>}
                <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                        {columns.map(column => (
                            <th
                                key={String(column.key)}
                                scope="col"
                                className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-white"
                                aria-sort={
                                    sortColumn === column.key
                                        ? sortDirection === 'asc' ? 'ascending' : 'descending'
                                        : undefined
                                }
                            >
                                {column.sortable && onSort ? (
                                    <button
                                        onClick={() => onSort(column.key)}
                                        className="flex items-center gap-1 transition-colors hover:text-indigo-600"
                                    >
                                        {column.header}
                                        <span aria-hidden="true">
                                            {sortColumn === column.key ? (
                                                sortDirection === 'asc' ? '↑' : '↓'
                                            ) : '↕'}
                                        </span>
                                    </button>
                                ) : column.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : data.map(row => (
                        <tr
                            key={row.id}
                            className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                        >
                            {columns.map(column => (
                                <td key={String(column.key)} className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                                    {String(row[column.key])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

interface Tab {
    id: string;
    label: string;
    content: React.ReactNode;
}

interface AccessibleTabsProps {
    tabs: Tab[];
    defaultTab?: string;
    onChange?: (tabId: string) => void;
    className?: string;
}

export const AccessibleTabs: React.FC<AccessibleTabsProps> = ({
    tabs,
    defaultTab,
    onChange,
    className = ''
}) => {
    const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);
    const tabsRef = React.useRef<(HTMLButtonElement | null)[]>([]);

    const { onKeyDown } = useKeyboardNavigation({
        onArrowRight: () => {
            const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
            const nextIndex = (currentIndex + 1) % tabs.length;
            setActiveTab(tabs[nextIndex].id);
            tabsRef.current[nextIndex]?.focus();
        },
        onArrowLeft: () => {
            const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
            const previousIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
            setActiveTab(tabs[previousIndex].id);
            tabsRef.current[previousIndex]?.focus();
        },
        onHome: () => {
            setActiveTab(tabs[0].id);
            tabsRef.current[0]?.focus();
        },
        onEnd: () => {
            setActiveTab(tabs[tabs.length - 1].id);
            tabsRef.current[tabs.length - 1]?.focus();
        },
        preventDefault: true
    });

    React.useEffect(() => {
        onChange?.(activeTab);
    }, [activeTab, onChange]);

    return (
        <div className={className}>
            <div
                role="tablist"
                aria-label="Tab"
                className="flex border-b border-slate-200 dark:border-slate-700"
                onKeyDown={onKeyDown as React.KeyboardEventHandler<HTMLDivElement>}
            >
                {tabs.map((tab, index) => (
                    <button
                        key={tab.id}
                        ref={element => {
                            tabsRef.current[index] = element;
                        }}
                        role="tab"
                        id={`tab-${tab.id}`}
                        aria-selected={activeTab === tab.id}
                        aria-controls={`tabpanel-${tab.id}`}
                        tabIndex={activeTab === tab.id ? 0 : -1}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 ${
                            activeTab === tab.id
                                ? 'border-b-2 border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {tabs.map(tab => (
                <div
                    key={tab.id}
                    role="tabpanel"
                    id={`tabpanel-${tab.id}`}
                    aria-labelledby={`tab-${tab.id}`}
                    hidden={activeTab !== tab.id}
                    tabIndex={0}
                    className="py-4 focus:outline-none"
                >
                    {tab.content}
                </div>
            ))}
        </div>
    );
};
