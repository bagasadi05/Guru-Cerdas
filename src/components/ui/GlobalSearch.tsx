import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { SearchIcon, UsersIcon, GraduationCapIcon, BookOpenIcon, ClipboardListIcon, Loader2Icon, ClockIcon, XIcon } from 'lucide-react';
import { globalSearch, getSearchSuggestions, SearchResult, SearchEntityType } from '../../services/SearchService';

// Search history management
const SEARCH_HISTORY_KEY = 'portal_guru_search_history';
const MAX_HISTORY = 8;

const getSearchHistory = (): string[] => {
    try {
        return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || '[]');
    } catch {
        return [];
    }
};

const addToSearchHistory = (query: string) => {
    if (!query.trim()) return;
    const history = getSearchHistory().filter(h => h !== query);
    history.unshift(query);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
};

const clearSearchHistory = () => {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
};

// Entity type icons
const entityIcons: Record<SearchEntityType, React.ElementType> = {
    all: SearchIcon,
    students: UsersIcon,
    classes: GraduationCapIcon,
    tasks: ClipboardListIcon,
    schedules: BookOpenIcon,
    attendance: ClockIcon,
};

const entityLabels: Record<SearchEntityType, string> = {
    all: 'Semua',
    students: 'Siswa',
    classes: 'Kelas',
    tasks: 'Tugas',
    schedules: 'Jadwal',
    attendance: 'Absensi',
};

interface GlobalSearchProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, setIsOpen }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const [activeTab, setActiveTab] = useState<SearchEntityType>('all');
    const [showHistory, setShowHistory] = useState(true);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsContainerRef = useRef<HTMLDivElement>(null);

    // Search results query
    const { data: searchResults = [], isLoading } = useQuery({
        queryKey: ['globalSearch', user?.id, searchTerm, activeTab],
        queryFn: () => globalSearch(user!.id, searchTerm, { entityType: activeTab, limit: 15 }),
        enabled: !!user && isOpen && searchTerm.trim().length >= 2,
        staleTime: 1000 * 30,
    });

    // Suggestions query
    const { data: suggestions = [] } = useQuery({
        queryKey: ['searchSuggestions', user?.id, searchTerm],
        queryFn: () => getSearchSuggestions(user!.id, searchTerm),
        enabled: !!user && isOpen && searchTerm.trim().length >= 1 && searchTerm.trim().length < 3,
        staleTime: 1000 * 60,
    });

    const searchHistory = useMemo(() => getSearchHistory(), [isOpen]);

    const handleNavigate = useCallback((result: SearchResult) => {
        addToSearchHistory(searchTerm);
        if (result.link) {
            navigate(result.link);
        }
        setIsOpen(false);
    }, [searchTerm, navigate, setIsOpen]);

    const handleHistoryClick = useCallback((query: string) => {
        setSearchTerm(query);
        setShowHistory(false);
    }, []);

    const handleSuggestionClick = useCallback((suggestion: string) => {
        setSearchTerm(suggestion);
    }, []);

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
            setShowHistory(true);
        } else {
            setSearchTerm('');
            setActiveIndex(0);
            setActiveTab('all');
        }
    }, [isOpen]);

    useEffect(() => {
        setActiveIndex(0);
    }, [searchTerm, activeTab]);

    useEffect(() => {
        if (resultsContainerRef.current) {
            const activeElement = resultsContainerRef.current.querySelector(`[data-index="${activeIndex}"]`);
            if (activeElement) {
                activeElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [activeIndex]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev + 1) % Math.max(searchResults.length, 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev - 1 + searchResults.length) % Math.max(searchResults.length, 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (searchResults[activeIndex]) {
                handleNavigate(searchResults[activeIndex]);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const getResultIcon = (type: SearchEntityType) => {
        const Icon = entityIcons[type] || SearchIcon;
        return Icon;
    };

    if (!isOpen) return null;

    const showingSuggestions = searchTerm.length >= 1 && searchTerm.length < 3 && suggestions.length > 0;
    const showingResults = searchTerm.length >= 2 && searchResults.length > 0;
    const showingNoResults = searchTerm.length >= 2 && !isLoading && searchResults.length === 0;
    const showingHistory = showHistory && searchTerm.length === 0 && searchHistory.length > 0;

    return (
        <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setIsOpen(false)}
        >
            <div
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-auto mt-[10vh] animate-fade-in-up flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="relative" onKeyDown={handleKeyDown}>
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        {isLoading ? (
                            <Loader2Icon className="h-5 w-5 text-indigo-500 animate-spin" />
                        ) : (
                            <SearchIcon className="h-5 w-5 text-gray-400" />
                        )}
                    </div>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Cari siswa, kelas, tugas, atau jadwal..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setShowHistory(false); }}
                        className="w-full h-14 bg-transparent pl-12 pr-12 text-base md:text-lg border-b border-gray-200 dark:border-gray-700 focus:outline-none"
                        aria-label="Kotak Pencarian Global"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
                        >
                            <XIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>

                {/* Entity Type Tabs */}
                {searchTerm.length >= 2 && (
                    <div className="flex gap-1 px-4 py-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto scrollbar-hide">
                        {(['all', 'students', 'classes', 'tasks', 'schedules'] as SearchEntityType[]).map(type => (
                            <button
                                key={type}
                                onClick={() => setActiveTab(type)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeTab === type
                                        ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                                        : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }`}
                            >
                                {entityLabels[type]}
                            </button>
                        ))}
                    </div>
                )}

                {/* Results Container */}
                <div className="p-2 md:p-4 max-h-[50vh] overflow-y-auto" ref={resultsContainerRef}>
                    {/* Search History */}
                    {showingHistory && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between px-2">
                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Pencarian Terakhir</span>
                                <button
                                    onClick={() => { clearSearchHistory(); setShowHistory(false); }}
                                    className="text-xs text-red-500 hover:text-red-600"
                                >
                                    Hapus Semua
                                </button>
                            </div>
                            <div className="space-y-1">
                                {searchHistory.map((query, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleHistoryClick(query)}
                                        className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                                    >
                                        <ClockIcon className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{query}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Suggestions */}
                    {showingSuggestions && (
                        <div className="space-y-1">
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 px-2">Saran</span>
                            {suggestions.map((suggestion, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleSuggestionClick(suggestion)}
                                    className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                                >
                                    <SearchIcon className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{suggestion}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Search Results */}
                    {showingResults && (
                        <div className="space-y-1">
                            {searchResults.map((result, index) => {
                                const isActive = index === activeIndex;
                                const Icon = getResultIcon(result.type);

                                return (
                                    <button
                                        key={`${result.type}-${result.id}`}
                                        onClick={() => handleNavigate(result)}
                                        className={`flex items-center gap-4 w-full p-3 rounded-lg cursor-pointer transition-colors text-left ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                            }`}
                                        data-index={index}
                                    >
                                        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-gray-100 dark:bg-gray-700/50'
                                            }`}>
                                            <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`} />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className={`font-semibold truncate ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                                {result.title}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{result.subtitle}</p>
                                                {result.description && (
                                                    <>
                                                        <span className="text-gray-300 dark:text-gray-600">•</span>
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{result.description}</p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0">
                                            <span className={`text-xs px-2 py-1 rounded-full ${isActive
                                                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                                                }`}>
                                                {entityLabels[result.type]}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* No Results */}
                    {showingNoResults && (
                        <div className="text-center py-12 text-gray-500">
                            <SearchIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                            <p className="font-semibold">Tidak ada hasil ditemukan</p>
                            <p className="text-sm mt-1">Coba kata kunci yang berbeda atau filter lain.</p>
                        </div>
                    )}

                    {/* Loading State */}
                    {isLoading && searchTerm.length >= 2 && (
                        <div className="flex items-center justify-center py-12">
                            <Loader2Icon className="w-8 h-8 text-indigo-500 animate-spin" />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                    <div>
                        Gunakan <kbd className="font-sans rounded bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5">↑</kbd> <kbd className="font-sans rounded bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5">↓</kbd> untuk navigasi, <kbd className="font-sans rounded bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5">Enter</kbd> untuk memilih.
                    </div>
                    <div className="text-gray-400">
                        <kbd className="font-sans rounded bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5">Esc</kbd> untuk menutup
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalSearch;