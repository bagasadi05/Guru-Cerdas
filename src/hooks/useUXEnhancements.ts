/**
 * User Experience Enhancements
 * Features: Onboarding, tutorials, undo/redo, bulk operations
 */

import { useState, useCallback, useEffect, useRef } from 'react';

// ============================================
// UNDO/REDO SYSTEM
// ============================================

interface UndoRedoState<T> {
    past: T[];
    present: T;
    future: T[];
}

export function useUndoRedo<T>(initialState: T, maxHistory: number = 50) {
    const [state, setState] = useState<UndoRedoState<T>>({
        past: [],
        present: initialState,
        future: []
    });

    const set = useCallback((newState: T | ((prev: T) => T)) => {
        setState(current => {
            const nextState = typeof newState === 'function'
                ? (newState as (prev: T) => T)(current.present)
                : newState;

            return {
                past: [...current.past.slice(-maxHistory), current.present],
                present: nextState,
                future: []
            };
        });
    }, [maxHistory]);

    const undo = useCallback(() => {
        setState(current => {
            if (current.past.length === 0) return current;

            const previous = current.past[current.past.length - 1];
            const newPast = current.past.slice(0, -1);

            return {
                past: newPast,
                present: previous,
                future: [current.present, ...current.future]
            };
        });
    }, []);

    const redo = useCallback(() => {
        setState(current => {
            if (current.future.length === 0) return current;

            const next = current.future[0];
            const newFuture = current.future.slice(1);

            return {
                past: [...current.past, current.present],
                present: next,
                future: newFuture
            };
        });
    }, []);

    const reset = useCallback((newState: T) => {
        setState({
            past: [],
            present: newState,
            future: []
        });
    }, []);

    const canUndo = state.past.length > 0;
    const canRedo = state.future.length > 0;

    return {
        state: state.present,
        set,
        undo,
        redo,
        reset,
        canUndo,
        canRedo,
        history: {
            past: state.past.length,
            future: state.future.length
        }
    };
}

// ============================================
// BULK OPERATIONS
// ============================================

export interface BulkSelection<T> {
    selectedIds: Set<string>;
    allItems: T[];
}

export function useBulkSelection<T extends { id: string }>() {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

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

    const select = useCallback((id: string) => {
        setSelectedIds(prev => new Set([...prev, id]));
    }, []);

    const deselect = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    }, []);

    const selectAll = useCallback((items: T[]) => {
        setSelectedIds(new Set(items.map(item => item.id)));
    }, []);

    const deselectAll = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    const toggleAll = useCallback((items: T[]) => {
        setSelectedIds(prev => {
            if (prev.size === items.length) {
                return new Set();
            }
            return new Set(items.map(item => item.id));
        });
    }, []);

    // Shift+Click range selection
    const selectRange = useCallback((items: T[], currentIndex: number) => {
        if (lastSelectedIndex === null) {
            toggle(items[currentIndex].id);
            setLastSelectedIndex(currentIndex);
            return;
        }

        const start = Math.min(lastSelectedIndex, currentIndex);
        const end = Math.max(lastSelectedIndex, currentIndex);

        setSelectedIds(prev => {
            const next = new Set(prev);
            for (let i = start; i <= end; i++) {
                next.add(items[i].id);
            }
            return next;
        });
    }, [lastSelectedIndex, toggle]);

    const handleSelect = useCallback((items: T[], index: number, event: { shiftKey?: boolean; ctrlKey?: boolean }) => {
        if (event.shiftKey) {
            selectRange(items, index);
        } else if (event.ctrlKey) {
            toggle(items[index].id);
        } else {
            setSelectedIds(new Set([items[index].id]));
        }
        setLastSelectedIndex(index);
    }, [selectRange, toggle]);

    const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds]);
    const isAllSelected = useCallback((items: T[]) => items.length > 0 && selectedIds.size === items.length, [selectedIds]);
    const isSomeSelected = selectedIds.size > 0;

    return {
        selectedIds,
        selectedCount: selectedIds.size,
        toggle,
        select,
        deselect,
        selectAll,
        deselectAll,
        toggleAll,
        selectRange,
        handleSelect,
        isSelected,
        isAllSelected,
        isSomeSelected
    };
}

// Bulk operation executor
export interface BulkOperationResult {
    success: number;
    failed: number;
    errors: { id: string; message: string }[];
}

export async function executeBulkOperation<T>(
    ids: string[],
    operation: (id: string) => Promise<void>,
    options: {
        onProgress?: (progress: number) => void;
        continueOnError?: boolean;
    } = {}
): Promise<BulkOperationResult> {
    const { onProgress, continueOnError = true } = options;
    const result: BulkOperationResult = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < ids.length; i++) {
        try {
            await operation(ids[i]);
            result.success++;
        } catch (e: any) {
            result.failed++;
            result.errors.push({ id: ids[i], message: e.message });
            if (!continueOnError) break;
        }
        onProgress?.((i + 1) / ids.length);
    }

    return result;
}

// ============================================
// ADVANCED FILTERING & SORTING
// ============================================

export type FilterOperator =
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'not_contains'
    | 'starts_with'
    | 'ends_with'
    | 'greater_than'
    | 'less_than'
    | 'between'
    | 'in'
    | 'is_empty'
    | 'is_not_empty';

export interface FilterCondition {
    field: string;
    operator: FilterOperator;
    value: any;
    value2?: any; // For 'between' operator
}

export interface FilterGroup {
    logic: 'and' | 'or';
    conditions: (FilterCondition | FilterGroup)[];
}

export interface SortConfig {
    field: string;
    direction: 'asc' | 'desc';
}

function evaluateCondition(item: any, condition: FilterCondition): boolean {
    const value = item[condition.field];
    const filterValue = condition.value;

    switch (condition.operator) {
        case 'equals':
            return value === filterValue;
        case 'not_equals':
            return value !== filterValue;
        case 'contains':
            return String(value).toLowerCase().includes(String(filterValue).toLowerCase());
        case 'not_contains':
            return !String(value).toLowerCase().includes(String(filterValue).toLowerCase());
        case 'starts_with':
            return String(value).toLowerCase().startsWith(String(filterValue).toLowerCase());
        case 'ends_with':
            return String(value).toLowerCase().endsWith(String(filterValue).toLowerCase());
        case 'greater_than':
            return value > filterValue;
        case 'less_than':
            return value < filterValue;
        case 'between':
            return value >= filterValue && value <= condition.value2;
        case 'in':
            return Array.isArray(filterValue) && filterValue.includes(value);
        case 'is_empty':
            return value === null || value === undefined || value === '';
        case 'is_not_empty':
            return value !== null && value !== undefined && value !== '';
        default:
            return true;
    }
}

function evaluateFilter(item: any, filter: FilterCondition | FilterGroup): boolean {
    if ('logic' in filter) {
        const results = filter.conditions.map(c => evaluateFilter(item, c));
        return filter.logic === 'and'
            ? results.every(Boolean)
            : results.some(Boolean);
    }
    return evaluateCondition(item, filter);
}

export function useAdvancedFilter<T>() {
    const [filters, setFilters] = useState<FilterGroup>({ logic: 'and', conditions: [] });
    const [sorts, setSorts] = useState<SortConfig[]>([]);

    const addFilter = useCallback((condition: FilterCondition) => {
        setFilters(prev => ({
            ...prev,
            conditions: [...prev.conditions, condition]
        }));
    }, []);

    const removeFilter = useCallback((index: number) => {
        setFilters(prev => ({
            ...prev,
            conditions: prev.conditions.filter((_, i) => i !== index)
        }));
    }, []);

    const updateFilter = useCallback((index: number, condition: FilterCondition) => {
        setFilters(prev => ({
            ...prev,
            conditions: prev.conditions.map((c, i) => i === index ? condition : c)
        }));
    }, []);

    const clearFilters = useCallback(() => {
        setFilters({ logic: 'and', conditions: [] });
    }, []);

    const setLogic = useCallback((logic: 'and' | 'or') => {
        setFilters(prev => ({ ...prev, logic }));
    }, []);

    const addSort = useCallback((sort: SortConfig) => {
        setSorts(prev => {
            const existing = prev.findIndex(s => s.field === sort.field);
            if (existing >= 0) {
                return prev.map((s, i) => i === existing ? sort : s);
            }
            return [...prev, sort];
        });
    }, []);

    const removeSort = useCallback((field: string) => {
        setSorts(prev => prev.filter(s => s.field !== field));
    }, []);

    const clearSorts = useCallback(() => {
        setSorts([]);
    }, []);

    const toggleSort = useCallback((field: string) => {
        setSorts(prev => {
            const existing = prev.find(s => s.field === field);
            if (existing) {
                if (existing.direction === 'asc') {
                    return prev.map(s => s.field === field ? { ...s, direction: 'desc' as const } : s);
                }
                return prev.filter(s => s.field !== field);
            }
            return [...prev, { field, direction: 'asc' as const }];
        });
    }, []);

    const apply = useCallback((items: T[]): T[] => {
        // Apply filters
        let result = items.filter(item => {
            if (filters.conditions.length === 0) return true;
            return evaluateFilter(item, filters);
        });

        // Apply sorts
        if (sorts.length > 0) {
            result = [...result].sort((a, b) => {
                for (const sort of sorts) {
                    const aVal = (a as any)[sort.field];
                    const bVal = (b as any)[sort.field];

                    if (aVal === bVal) continue;

                    const comparison = aVal < bVal ? -1 : 1;
                    return sort.direction === 'asc' ? comparison : -comparison;
                }
                return 0;
            });
        }

        return result;
    }, [filters, sorts]);

    return {
        filters,
        sorts,
        addFilter,
        removeFilter,
        updateFilter,
        clearFilters,
        setLogic,
        addSort,
        removeSort,
        clearSorts,
        toggleSort,
        apply,
        hasFilters: filters.conditions.length > 0,
        hasSorts: sorts.length > 0
    };
}

// ============================================
// ONBOARDING SYSTEM
// ============================================

export interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    target?: string; // CSS selector
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
    action?: string;
    skippable?: boolean;
}

export interface OnboardingFlow {
    id: string;
    name: string;
    steps: OnboardingStep[];
}

const ONBOARDING_KEY = 'portal_guru_onboarding';

export function useOnboarding(flowId: string, steps: OnboardingStep[]) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const [completed, setCompleted] = useState<Set<string>>(new Set());

    // Load completed state
    useEffect(() => {
        const stored = localStorage.getItem(ONBOARDING_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            setCompleted(new Set(parsed.completed || []));
        }
    }, []);

    // Check if this flow is already completed
    const isFlowCompleted = completed.has(flowId);

    const start = useCallback(() => {
        if (!isFlowCompleted) {
            setCurrentStep(0);
            setIsActive(true);
        }
    }, [isFlowCompleted]);

    const next = useCallback(() => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            complete();
        }
    }, [currentStep, steps.length]);

    const previous = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    }, [currentStep]);

    const skip = useCallback(() => {
        complete();
    }, []);

    const complete = useCallback(() => {
        setIsActive(false);
        setCompleted(prev => {
            const next = new Set([...prev, flowId]);
            localStorage.setItem(ONBOARDING_KEY, JSON.stringify({
                completed: Array.from(next)
            }));
            return next;
        });
    }, [flowId]);

    const reset = useCallback(() => {
        setCompleted(prev => {
            const next = new Set(prev);
            next.delete(flowId);
            localStorage.setItem(ONBOARDING_KEY, JSON.stringify({
                completed: Array.from(next)
            }));
            return next;
        });
        setCurrentStep(0);
    }, [flowId]);

    const goToStep = useCallback((stepIndex: number) => {
        if (stepIndex >= 0 && stepIndex < steps.length) {
            setCurrentStep(stepIndex);
        }
    }, [steps.length]);

    return {
        isActive,
        currentStep,
        currentStepData: steps[currentStep],
        totalSteps: steps.length,
        isFirstStep: currentStep === 0,
        isLastStep: currentStep === steps.length - 1,
        isFlowCompleted,
        progress: ((currentStep + 1) / steps.length) * 100,
        start,
        next,
        previous,
        skip,
        complete,
        reset,
        goToStep
    };
}

// Predefined onboarding flows
export const ONBOARDING_FLOWS: Record<string, OnboardingStep[]> = {
    newUser: [
        {
            id: 'welcome',
            title: 'Selamat Datang di Portal Guru! 👋',
            description: 'Aplikasi ini akan membantu Anda mengelola siswa, absensi, dan tugas dengan mudah.',
            position: 'center'
        },
        {
            id: 'dashboard',
            title: 'Dashboard',
            description: 'Di sini Anda dapat melihat ringkasan aktivitas kelas, statistik kehadiran, dan tugas terbaru.',
            target: '[data-tour="dashboard"]',
            position: 'bottom'
        },
        {
            id: 'students',
            title: 'Kelola Siswa',
            description: 'Tambah, edit, dan kelola data siswa Anda. Anda juga bisa mengimpor data dari Excel.',
            target: '[data-tour="students"]',
            position: 'right'
        },
        {
            id: 'attendance',
            title: 'Absensi',
            description: 'Catat kehadiran siswa dengan mudah. Pilih tanggal dan klik status untuk setiap siswa.',
            target: '[data-tour="attendance"]',
            position: 'right'
        },
        {
            id: 'offline',
            title: 'Mode Offline',
            description: 'Aplikasi ini bekerja offline! Data akan disimpan dan disinkronkan saat koneksi tersedia.',
            target: '[data-tour="offline"]',
            position: 'bottom'
        },
        {
            id: 'complete',
            title: 'Siap Mulai! 🎉',
            description: 'Anda sudah siap menggunakan Portal Guru. Jika butuh bantuan, klik tombol ? di sudut kanan bawah.',
            position: 'center'
        }
    ],
    firstStudent: [
        {
            id: 'add-student',
            title: 'Tambah Siswa Pertama',
            description: 'Klik tombol "Tambah Siswa" untuk menambahkan siswa ke daftar.',
            target: '[data-tour="add-student-btn"]',
            position: 'bottom'
        },
        {
            id: 'fill-form',
            title: 'Isi Data Siswa',
            description: 'Masukkan nama, kelas, dan informasi lainnya. Semua field dengan tanda * wajib diisi.',
            target: '[data-tour="student-form"]',
            position: 'left'
        }
    ],
    attendance: [
        {
            id: 'select-date',
            title: 'Pilih Tanggal',
            description: 'Pilih tanggal absensi yang ingin dicatat.',
            target: '[data-tour="date-picker"]',
            position: 'bottom'
        },
        {
            id: 'mark-status',
            title: 'Tandai Status',
            description: 'Klik tombol status (H/I/S/A) untuk setiap siswa. H=Hadir, I=Izin, S=Sakit, A=Alpha.',
            target: '[data-tour="status-buttons"]',
            position: 'bottom'
        },
        {
            id: 'save',
            title: 'Simpan',
            description: 'Klik "Simpan Perubahan" untuk menyimpan data absensi.',
            target: '[data-tour="save-btn"]',
            position: 'top'
        }
    ]
};

// ============================================
// NOTIFICATION PREFERENCES
// ============================================

export interface NotificationPreferences {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
    email: boolean;
    categories: {
        attendance: boolean;
        tasks: boolean;
        reminders: boolean;
        system: boolean;
    };
    quietHours: {
        enabled: boolean;
        start: string; // "22:00"
        end: string;   // "07:00"
    };
}

const NOTIFICATION_PREFS_KEY = 'portal_guru_notification_prefs';

const DEFAULT_PREFS: NotificationPreferences = {
    enabled: true,
    sound: true,
    desktop: true,
    email: false,
    categories: {
        attendance: true,
        tasks: true,
        reminders: true,
        system: true
    },
    quietHours: {
        enabled: false,
        start: '22:00',
        end: '07:00'
    }
};

export function useNotificationPreferences() {
    const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFS);

    useEffect(() => {
        const stored = localStorage.getItem(NOTIFICATION_PREFS_KEY);
        if (stored) {
            setPreferences({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
        }
    }, []);

    const updatePreferences = useCallback((updates: Partial<NotificationPreferences>) => {
        setPreferences(prev => {
            const next = { ...prev, ...updates };
            localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    const updateCategory = useCallback((category: keyof NotificationPreferences['categories'], value: boolean) => {
        setPreferences(prev => {
            const next = {
                ...prev,
                categories: { ...prev.categories, [category]: value }
            };
            localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    const updateQuietHours = useCallback((updates: Partial<NotificationPreferences['quietHours']>) => {
        setPreferences(prev => {
            const next = {
                ...prev,
                quietHours: { ...prev.quietHours, ...updates }
            };
            localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(next));
            return next;
        });
    }, []);

    const isQuietTime = useCallback(() => {
        if (!preferences.quietHours.enabled) return false;

        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const currentTime = hours * 60 + minutes;

        const [startH, startM] = preferences.quietHours.start.split(':').map(Number);
        const [endH, endM] = preferences.quietHours.end.split(':').map(Number);
        const startTime = startH * 60 + startM;
        const endTime = endH * 60 + endM;

        if (startTime > endTime) {
            // Quiet hours span midnight
            return currentTime >= startTime || currentTime < endTime;
        }
        return currentTime >= startTime && currentTime < endTime;
    }, [preferences.quietHours]);

    const shouldNotify = useCallback((category: keyof NotificationPreferences['categories']) => {
        if (!preferences.enabled) return false;
        if (!preferences.categories[category]) return false;
        if (isQuietTime()) return false;
        return true;
    }, [preferences, isQuietTime]);

    const resetToDefaults = useCallback(() => {
        setPreferences(DEFAULT_PREFS);
        localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(DEFAULT_PREFS));
    }, []);

    return {
        preferences,
        updatePreferences,
        updateCategory,
        updateQuietHours,
        isQuietTime,
        shouldNotify,
        resetToDefaults
    };
}

// ============================================
// HELP SYSTEM
// ============================================

export interface HelpTopic {
    id: string;
    title: string;
    content: string;
    keywords: string[];
    category: string;
}

export const HELP_TOPICS: HelpTopic[] = [
    {
        id: 'add-student',
        title: 'Cara Menambah Siswa',
        content: `1. Klik menu "Siswa" di sidebar
2. Klik tombol "Tambah Siswa"
3. Isi form dengan data siswa
4. Klik "Simpan"

Tips: Anda juga bisa mengimpor data siswa dari file Excel.`,
        keywords: ['tambah', 'siswa', 'baru', 'add', 'student'],
        category: 'Siswa'
    },
    {
        id: 'attendance',
        title: 'Cara Mengisi Absensi',
        content: `1. Klik menu "Absensi" di sidebar
2. Pilih tanggal di bagian atas
3. Klik tombol status untuk setiap siswa:
   - H = Hadir
   - I = Izin  
   - S = Sakit
   - A = Alpha
4. Klik "Simpan Perubahan"`,
        keywords: ['absensi', 'kehadiran', 'attendance', 'hadir'],
        category: 'Absensi'
    },
    {
        id: 'export-data',
        title: 'Cara Mengekspor Data',
        content: `1. Buka halaman yang ingin diekspor
2. Klik tombol "Export" atau ikon download
3. Pilih format (Excel/PDF/CSV)
4. File akan terdownload otomatis`,
        keywords: ['export', 'download', 'unduh', 'excel', 'pdf'],
        category: 'Data'
    },
    {
        id: 'offline-mode',
        title: 'Menggunakan Mode Offline',
        content: `Aplikasi ini mendukung mode offline:
- Data otomatis tersimpan di perangkat
- Perubahan akan disinkronkan saat online
- Lihat status sinkronisasi di navbar

Catatan: Beberapa fitur memerlukan koneksi internet.`,
        keywords: ['offline', 'tanpa internet', 'sync', 'sinkronisasi'],
        category: 'Umum'
    },
    {
        id: 'parent-portal',
        title: 'Akses Portal Orang Tua',
        content: `Orang tua dapat melihat data anak mereka:
1. Buka halaman siswa
2. Klik tombol "Kode Akses"
3. Bagikan kode 6 digit ke orang tua
4. Orang tua masuk ke /orang-tua

Kode akses bisa di-generate ulang jika diperlukan.`,
        keywords: ['orang tua', 'parent', 'akses', 'kode'],
        category: 'Portal'
    }
];

export function useHelpSystem() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    const searchResults = searchQuery.trim() === '' ? [] : HELP_TOPICS.filter(topic => {
        const query = searchQuery.toLowerCase();
        return (
            topic.title.toLowerCase().includes(query) ||
            topic.content.toLowerCase().includes(query) ||
            topic.keywords.some(k => k.toLowerCase().includes(query))
        );
    });

    const topicsByCategory = HELP_TOPICS.reduce((acc, topic) => {
        if (!acc[topic.category]) acc[topic.category] = [];
        acc[topic.category].push(topic);
        return acc;
    }, {} as Record<string, HelpTopic[]>);

    const open = useCallback((topicId?: string) => {
        if (topicId) {
            const topic = HELP_TOPICS.find(t => t.id === topicId);
            if (topic) setSelectedTopic(topic);
        }
        setIsOpen(true);
    }, []);

    const close = useCallback(() => {
        setIsOpen(false);
        setSelectedTopic(null);
        setSearchQuery('');
    }, []);

    return {
        isOpen,
        searchQuery,
        setSearchQuery,
        searchResults,
        selectedTopic,
        setSelectedTopic,
        topicsByCategory,
        open,
        close
    };
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

export interface KeyboardShortcut {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    description: string;
    action: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled: boolean = true) {
    const shortcutsRef = useRef(shortcuts);
    shortcutsRef.current = shortcuts;

    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            for (const shortcut of shortcutsRef.current) {
                const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey;
                const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
                const altMatch = shortcut.alt ? e.altKey : !e.altKey;

                if (
                    e.key.toLowerCase() === shortcut.key.toLowerCase() &&
                    ctrlMatch &&
                    shiftMatch &&
                    altMatch
                ) {
                    e.preventDefault();
                    shortcut.action();
                    break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enabled]);
}

// ============================================
// EXPORTS
// ============================================

export default {
    useUndoRedo,
    useBulkSelection,
    executeBulkOperation,
    useAdvancedFilter,
    useOnboarding,
    useNotificationPreferences,
    useHelpSystem,
    useKeyboardShortcuts,
    ONBOARDING_FLOWS,
    HELP_TOPICS
};
