import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { SearchEntityType, SearchFilter, SearchResult } from './searchTypes';

const SEARCH_HISTORY_KEY = 'portal_guru_search_history';
const MAX_HISTORY = 10;

const useSearchHistory = () => {
    const [history, setHistory] = useState(() => {
        if (typeof window === 'undefined') return [];
        try {
            return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]') as Array<{ query: string }>;
        } catch {
            return [];
        }
    });

    const addToHistory = useCallback((search: { query: string }) => {
        setHistory((previous) => {
            const next = [search, ...previous.filter((item) => item.query.toLowerCase() !== search.query.toLowerCase())].slice(0, MAX_HISTORY);
            localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    return { addToHistory };
};

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
    if (!context) throw new Error('useGlobalSearch must be used within GlobalSearchProvider');
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
    const debounceRef = useRef<ReturnType<typeof setTimeout>>();

    const search = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            return;
        }

        setIsLoading(true);
        try {
            const searchResults = await onSearch(searchQuery, entityType, filters);
            setResults(searchResults);
            addToHistory({ query: searchQuery });
        } catch {
            setResults([]);
        } finally {
            setIsLoading(false);
        }
    }, [onSearch, entityType, filters, addToHistory]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (query.trim()) {
            debounceRef.current = setTimeout(() => { void search(query); }, 300);
        } else {
            setResults([]);
        }
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, search]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                setIsOpen((open) => !open);
            }
            if (event.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const value: GlobalSearchContextValue = {
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
        addFilter: (filter) => setFilters((previous) => [...previous.filter((item) => item.field !== filter.field), filter]),
        removeFilter: (field) => setFilters((previous) => previous.filter((item) => item.field !== field)),
        clearFilters: () => setFilters([]),
    };

    return <GlobalSearchContext.Provider value={value}>{children}</GlobalSearchContext.Provider>;
};
