import React, { useState, useEffect, useCallback, useRef, createContext, useContext, useMemo } from 'react';
import { Search, X, Clock, TrendingUp, Users, Calendar, ClipboardList, Filter, ChevronRight, ArrowRight } from 'lucide-react';

/**
 * Advanced Search & Filtering System
 * Features: Global search, filters, search history, suggestions, autocomplete
 */

// ============================================
// TYPES
// ============================================

export type SearchEntityType = 'students' | 'attendance' | 'tasks' | 'schedule' | 'classes' | 'all';

export interface SearchResult {
    id: string;
    type: SearchEntityType;
    title: string;
    subtitle?: string;
    metadata?: Record<string, any>;
    relevance?: number;
}

export interface SearchFilter {
    field: string;
    operator: 'equals' | 'contains' | 'gt' | 'lt' | 'between' | 'in';
    value: any;
    label?: string;
}

export interface RecentSearch {
    query: string;
    timestamp: number;
    type?: SearchEntityType;
    resultCount?: number;
}

// ============================================
// SEARCH HISTORY HOOK
// ============================================

const SEARCH_HISTORY_KEY = 'portal_guru_search_history';
const MAX_HISTORY = 10;

export function useSearchHistory() {
    const [history, setHistory] = useState<RecentSearch[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem(SEARCH_HISTORY_KEY);
        if (stored) {
            try {
                setHistory(JSON.parse(stored));
            } catch {
                setHistory([]);
            }
        }
    }, []);

    const addToHistory = useCallback((search: Omit<RecentSearch, 'timestamp'>) => {
        setHistory(prev => {
            // Remove duplicate
            const filtered = prev.filter(s => s.query.toLowerCase() !== search.query.toLowerCase());
            const newHistory = [
                { ...search, timestamp: Date.now() },
                ...filtered
            ].slice(0, MAX_HISTORY);

            localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
            return newHistory;
        });
    }, []);

    const removeFromHistory = useCallback((query: string) => {
        setHistory(prev => {
            const newHistory = prev.filter(s => s.query !== query);
            localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory));
            return newHistory;
        });
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
        localStorage.removeItem(SEARCH_HISTORY_KEY);
    }, []);

    return { history, addToHistory, removeFromHistory, clearHistory };
}

// ============================================
// GLOBAL SEARCH CONTEXT
// ============================================

interface GlobalSearchContextValue {
    isOpen: boolean;
    query: string;
    results: SearchResult[];
    isLoading: boolean;
    filters: SearchFilter[];
    entityType: SearchEntityType;
    open: () => void;
    close: () => void;
    setQuery: (query: string) => void;
    search: (query: string) => Promise<void>;
    setEntityType: (type: SearchEntityType) => void;
    addFilter: (filter: SearchFilter) => void;
    removeFilter: (field: string) => void;
    clearFilters: () => void;
}

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null);

export const useGlobalSearch = () => {
    const context = useContext(GlobalSearchContext);
    if (!context) {
        throw new Error('useGlobalSearch must be used within GlobalSearchProvider');
    }
    return context;
};

interface GlobalSearchProviderProps {
    children: React.ReactNode;
    onSearch: (query: string, type: SearchEntityType, filters: SearchFilter[]) => Promise<SearchResult[]>;
}

export const GlobalSearchProvider: React.FC<GlobalSearchProviderProps> = ({ children, onSearch }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filters, setFilters] = useState<SearchFilter[]>([]);
    const [entityType, setEntityType] = useState<SearchEntityType>('all');
    const { addToHistory } = useSearchHistory();
    const debounceRef = useRef<NodeJS.Timeout>();

    const search = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        try {
            const searchResults = await onSearch(searchQuery, entityType, filters);
            setResults(searchResults);
            addToHistory({ query: searchQuery, type: entityType, resultCount: searchResults.length });
        } catch (error) {
            console.error('Search error:', error);
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [onSearch, entityType, filters, addToHistory]);

    // Debounced search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (query.trim()) {
            debounceRef.current = setTimeout(() => {
                search(query);
            }, 300);
        } else {
            setResults([]);
        }

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, search]);

    // Keyboard shortcut (Ctrl/Cmd + K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const addFilter = useCallback((filter: SearchFilter) => {
        setFilters(prev => [...prev.filter(f => f.field !== filter.field), filter]);
    }, []);

    const removeFilter = useCallback((field: string) => {
        setFilters(prev => prev.filter(f => f.field !== field));
    }, []);

    const clearFilters = useCallback(() => {
        setFilters([]);
    }, []);

    return (
        <GlobalSearchContext.Provider value={{
            isOpen,
            query,
            results,
            isLoading,
            filters,
            entityType,
            open: () => setIsOpen(true),
            close: () => { setIsOpen(false); setQuery(''); },
            setQuery,
            search,
            setEntityType,
            addFilter,
            removeFilter,
            clearFilters
        }}>
            {children}
        </GlobalSearchContext.Provider>
    );
};

// ============================================
// GLOBAL SEARCH MODAL
// ============================================

const entityIcons: Record<SearchEntityType, React.ReactNode> = {
    all: <Search className="w-4 h-4" />,
    students: <Users className="w-4 h-4" />,
    classes: <Users className="w-4 h-4" />,
    attendance: <Calendar className="w-4 h-4" />,
    tasks: <ClipboardList className="w-4 h-4" />,
    schedule: <Clock className="w-4 h-4" />
};

const entityLabels: Record<SearchEntityType, string> = {
    all: 'Semua',
    students: 'Siswa',
    classes: 'Kelas',
    attendance: 'Absensi',
    tasks: 'Tugas',
    schedule: 'Jadwal'
};

export const GlobalSearchModal: React.FC<{
    onSelect?: (result: SearchResult) => void;
}> = ({ onSelect }) => {
    const { isOpen, close, query, setQuery, results, isLoading, entityType, setEntityType, filters, removeFilter } = useGlobalSearch();
    const { history, removeFromHistory, clearHistory } = useSearchHistory();
    const inputRef = useRef<HTMLInputElement>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            setSelectedIndex(0);
        }
    }, [isOpen]);

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && results[selectedIndex]) {
            e.preventDefault();
            handleSelect(results[selectedIndex]);
        }
    };

    const handleSelect = (result: SearchResult) => {
        onSelect?.(result);
        close();
    };

    const highlightMatch = (text: string, query: string) => {
        if (!query.trim()) return text;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">$1</mark>');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />

            {/* Modal */}
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                {/* Search Input */}
                <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-800">
                    <Search className="w-5 h-5 text-slate-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Cari siswa, absensi, tugas..."
                        className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 outline-none text-lg"
                    />
                    {query && (
                        <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-slate-600">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                    <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
                        <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">ESC</kbd>
                        <span>untuk tutup</span>
                    </div>
                </div>

                {/* Entity Type Tabs */}
                <div className="flex items-center gap-1 p-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
                    {(Object.keys(entityLabels) as SearchEntityType[]).map(type => (
                        <button
                            key={type}
                            onClick={() => setEntityType(type)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${entityType === type
                                ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            {entityIcons[type]}
                            {entityLabels[type]}
                        </button>
                    ))}
                </div>

                {/* Active Filters */}
                {filters.length > 0 && (
                    <div className="flex items-center gap-2 p-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
                        <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        {filters.map(filter => (
                            <span
                                key={filter.field}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm"
                            >
                                {filter.label || filter.field}: {String(filter.value)}
                                <button onClick={() => removeFilter(filter.field)} className="hover:text-indigo-900">
                                    <X className="w-3 h-3" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                {/* Results */}
                <div className="max-h-[50vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : query.trim() ? (
                        results.length > 0 ? (
                            <div className="py-2">
                                {results.map((result, index) => (
                                    <button
                                        key={result.id}
                                        onClick={() => handleSelect(result)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${index === selectedIndex
                                            ? 'bg-indigo-50 dark:bg-indigo-900/30'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${result.type === 'students' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600' :
                                            result.type === 'attendance' ? 'bg-green-100 dark:bg-green-900/40 text-green-600' :
                                                result.type === 'tasks' ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-600' :
                                                    'bg-amber-100 dark:bg-amber-900/40 text-amber-600'
                                            }`}>
                                            {entityIcons[result.type]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p
                                                className="font-medium text-slate-900 dark:text-white truncate"
                                                dangerouslySetInnerHTML={{ __html: highlightMatch(result.title, query) }}
                                            />
                                            {result.subtitle && (
                                                <p
                                                    className="text-sm text-slate-500 dark:text-slate-400 truncate"
                                                    dangerouslySetInnerHTML={{ __html: highlightMatch(result.subtitle, query) }}
                                                />
                                            )}
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center">
                                <p className="text-slate-500 dark:text-slate-400">
                                    Tidak ditemukan hasil untuk "{query}"
                                </p>
                            </div>
                        )
                    ) : (
                        /* Recent Searches */
                        history.length > 0 && (
                            <div className="py-2">
                                <div className="flex items-center justify-between px-4 py-2">
                                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Pencarian Terakhir
                                    </span>
                                    <button
                                        onClick={clearHistory}
                                        className="text-xs text-indigo-600 hover:text-indigo-700"
                                    >
                                        Hapus Semua
                                    </button>
                                </div>
                                {history.map((item, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setQuery(item.query)}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    >
                                        <Clock className="w-4 h-4 text-slate-400" />
                                        <span className="flex-1 text-slate-700 dark:text-slate-300">{item.query}</span>
                                        {item.resultCount !== undefined && (
                                            <span className="text-xs text-slate-400">{item.resultCount} hasil</span>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeFromHistory(item.query); }}
                                            className="p-1 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </button>
                                ))}
                            </div>
                        )
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                            <kbd className="px-1 bg-white dark:bg-slate-700 rounded border">↑↓</kbd> navigasi
                        </span>
                        <span className="flex items-center gap-1">
                            <kbd className="px-1 bg-white dark:bg-slate-700 rounded border">↵</kbd> pilih
                        </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                        <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded border">⌘</kbd>
                        <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded border">K</kbd>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ============================================
// SEARCH TRIGGER BUTTON
// ============================================

export const SearchTrigger: React.FC<{ className?: string }> = ({ className = '' }) => {
    const { open } = useGlobalSearch();

    return (
        <button
            onClick={open}
            className={`flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-500 dark:text-slate-400 transition-colors ${className}`}
        >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Cari...</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 text-xs">
                ⌘K
            </kbd>
        </button>
    );
};

// ============================================
// FILTER BUILDER
// ============================================

interface FilterField {
    key: string;
    label: string;
    type: 'text' | 'select' | 'date' | 'number' | 'boolean';
    options?: { value: string; label: string }[];
}

interface FilterBuilderProps {
    fields: FilterField[];
    filters: SearchFilter[];
    onAddFilter: (filter: SearchFilter) => void;
    onRemoveFilter: (field: string) => void;
    onClear: () => void;
}

export const FilterBuilder: React.FC<FilterBuilderProps> = ({
    fields,
    filters,
    onAddFilter,
    onRemoveFilter,
    onClear
}) => {
    const [selectedField, setSelectedField] = useState<string>('');
    const [value, setValue] = useState<string>('');
    const [operator, setOperator] = useState<SearchFilter['operator']>('contains');

    const handleAdd = () => {
        if (!selectedField || !value) return;
        const field = fields.find(f => f.key === selectedField);
        onAddFilter({
            field: selectedField,
            operator,
            value,
            label: field?.label
        });
        setValue('');
    };

    const currentField = fields.find(f => f.key === selectedField);

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
                <select
                    value={selectedField}
                    onChange={(e) => setSelectedField(e.target.value)}
                    className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                >
                    <option value="">Pilih field...</option>
                    {fields.map(field => (
                        <option key={field.key} value={field.key}>{field.label}</option>
                    ))}
                </select>

                {currentField?.type === 'select' ? (
                    <select
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                    >
                        <option value="">Pilih nilai...</option>
                        {currentField.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                ) : (
                    <input
                        type={currentField?.type === 'number' ? 'number' : currentField?.type === 'date' ? 'date' : 'text'}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder="Nilai..."
                        className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                    />
                )}

                <button
                    onClick={handleAdd}
                    disabled={!selectedField || !value}
                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition-colors"
                >
                    + Tambah Filter
                </button>
            </div>

            {/* Active Filters */}
            {filters.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    {filters.map(filter => (
                        <span
                            key={filter.field}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full text-sm"
                        >
                            <strong>{filter.label || filter.field}:</strong> {String(filter.value)}
                            <button
                                onClick={() => onRemoveFilter(filter.field)}
                                className="ml-1 hover:text-indigo-900"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </span>
                    ))}
                    <button
                        onClick={onClear}
                        className="text-sm text-slate-500 hover:text-slate-700"
                    >
                        Hapus semua
                    </button>
                </div>
            )}
        </div>
    );
};

// ============================================
// EXPORTS
// ============================================

export default {
    useSearchHistory,
    GlobalSearchProvider,
    useGlobalSearch,
    GlobalSearchModal,
    SearchTrigger,
    FilterBuilder
};
