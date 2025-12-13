/**
 * Search Service
 * 
 * Provides advanced search functionality with fuzzy matching,
 * relevance ranking, and multi-entity search capabilities.
 * 
 * @module services/SearchService
 * @since 1.0.0
 */

import { supabase } from './supabase';

/**
 * Search result types
 */
export type SearchEntityType = 'all' | 'students' | 'classes' | 'tasks' | 'schedules' | 'attendance';

export interface SearchResult {
    id: string;
    type: SearchEntityType;
    title: string;
    subtitle?: string;
    description?: string;
    metadata?: Record<string, any>;
    relevance: number;
    icon?: string;
    link?: string;
}

export interface SearchOptions {
    entityType?: SearchEntityType;
    limit?: number;
    fuzzy?: boolean;
    includeMetadata?: boolean;
}

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
const levenshteinDistance = (str1: string, str2: string): number => {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
    }
    return dp[m][n];
};

/**
 * Calculate relevance score (0-100)
 */
const calculateRelevance = (query: string, text: string, fuzzy: boolean = true): number => {
    const normalizedQuery = query.toLowerCase().trim();
    const normalizedText = text.toLowerCase().trim();

    // Exact match
    if (normalizedText === normalizedQuery) return 100;

    // Starts with query
    if (normalizedText.startsWith(normalizedQuery)) return 90;

    // Contains query
    if (normalizedText.includes(normalizedQuery)) {
        const position = normalizedText.indexOf(normalizedQuery);
        return 80 - (position * 0.5); // Earlier matches score higher
    }

    // Word match
    const queryWords = normalizedQuery.split(/\s+/);
    const textWords = normalizedText.split(/\s+/);
    const matchedWords = queryWords.filter(qw =>
        textWords.some(tw => tw.includes(qw) || qw.includes(tw))
    );
    if (matchedWords.length > 0) {
        return 60 + (matchedWords.length / queryWords.length) * 20;
    }

    // Fuzzy matching
    if (fuzzy && normalizedQuery.length >= 3) {
        const distance = levenshteinDistance(normalizedQuery, normalizedText.slice(0, normalizedQuery.length + 2));
        const similarity = 1 - (distance / Math.max(normalizedQuery.length, normalizedText.length));
        if (similarity > 0.6) {
            return Math.floor(similarity * 50);
        }
    }

    return 0;
};

/**
 * Search students
 */
const searchStudents = async (
    userId: string,
    query: string,
    options: SearchOptions
): Promise<SearchResult[]> => {
    const { data: students } = await supabase
        .from('students')
        .select('id, name, gender, access_code, class_id, classes(name)')
        .eq('user_id', userId)
        .is('deleted_at', null);

    if (!students) return [];

    return students
        .map(student => {
            const searchableText = `${student.name} ${student.access_code || ''} ${(student.classes as any)?.name || ''}`;
            const relevance = calculateRelevance(query, searchableText, options.fuzzy);

            return {
                id: student.id,
                type: 'students' as SearchEntityType,
                title: student.name,
                subtitle: `${student.gender} • ${(student.classes as any)?.name || 'Tanpa Kelas'}`,
                description: student.access_code ? `Kode: ${student.access_code}` : undefined,
                metadata: { gender: student.gender, classId: student.class_id },
                relevance,
                link: `/siswa/${student.id}`,
            };
        })
        .filter(r => r.relevance > 0)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, options.limit || 10);
};

/**
 * Search classes
 */
const searchClasses = async (
    userId: string,
    query: string,
    options: SearchOptions
): Promise<SearchResult[]> => {
    const { data: classes } = await supabase
        .from('classes')
        .select('id, name')
        .eq('user_id', userId)
        .is('deleted_at', null);

    if (!classes) return [];

    // Get student counts
    const { data: students } = await supabase
        .from('students')
        .select('class_id')
        .eq('user_id', userId)
        .is('deleted_at', null);

    const studentCounts: Record<string, number> = {};
    students?.forEach(s => {
        studentCounts[s.class_id] = (studentCounts[s.class_id] || 0) + 1;
    });

    return classes
        .map(cls => {
            const relevance = calculateRelevance(query, cls.name, options.fuzzy);
            const count = studentCounts[cls.id] || 0;

            return {
                id: cls.id,
                type: 'classes' as SearchEntityType,
                title: cls.name,
                subtitle: `${count} siswa`,
                metadata: { studentCount: count },
                relevance,
                link: `/siswa?class=${cls.id}`,
            };
        })
        .filter(r => r.relevance > 0)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, options.limit || 10);
};

/**
 * Search tasks
 */
const searchTasks = async (
    userId: string,
    query: string,
    options: SearchOptions
): Promise<SearchResult[]> => {
    const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, description, status, due_date')
        .eq('user_id', userId);

    if (!tasks) return [];

    return tasks
        .map(task => {
            const searchableText = `${task.title} ${task.description || ''}`;
            const relevance = calculateRelevance(query, searchableText, options.fuzzy);

            const statusLabels: Record<string, string> = {
                'todo': 'Belum Dikerjakan',
                'in_progress': 'Sedang Dikerjakan',
                'done': 'Selesai'
            };

            return {
                id: task.id,
                type: 'tasks' as SearchEntityType,
                title: task.title,
                subtitle: statusLabels[task.status] || task.status,
                description: task.due_date ? `Deadline: ${new Date(task.due_date).toLocaleDateString('id-ID')}` : undefined,
                metadata: { status: task.status, dueDate: task.due_date },
                relevance,
                link: '/tugas',
            };
        })
        .filter(r => r.relevance > 0)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, options.limit || 10);
};

/**
 * Search schedules
 */
const searchSchedules = async (
    userId: string,
    query: string,
    options: SearchOptions
): Promise<SearchResult[]> => {
    const { data: schedules } = await supabase
        .from('schedules')
        .select('id, subject, day, start_time, end_time, class_id, classes(name)')
        .eq('user_id', userId);

    if (!schedules) return [];

    const dayLabels: Record<string, string> = {
        'Monday': 'Senin',
        'Tuesday': 'Selasa',
        'Wednesday': 'Rabu',
        'Thursday': 'Kamis',
        'Friday': 'Jumat',
        'Saturday': 'Sabtu',
        'Sunday': 'Minggu'
    };

    return schedules
        .map(schedule => {
            const searchableText = `${schedule.subject} ${(schedule.classes as any)?.name || ''} ${dayLabels[schedule.day] || schedule.day}`;
            const relevance = calculateRelevance(query, searchableText, options.fuzzy);

            return {
                id: schedule.id,
                type: 'schedules' as SearchEntityType,
                title: schedule.subject,
                subtitle: `${dayLabels[schedule.day] || schedule.day} • ${(schedule.classes as any)?.name || ''}`,
                description: `${schedule.start_time} - ${schedule.end_time}`,
                metadata: { day: schedule.day, classId: schedule.class_id },
                relevance,
                link: '/jadwal',
            };
        })
        .filter(r => r.relevance > 0)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, options.limit || 10);
};

/**
 * Global search across all entities
 */
export const globalSearch = async (
    userId: string,
    query: string,
    options: SearchOptions = {}
): Promise<SearchResult[]> => {
    if (!query || query.trim().length < 2) return [];

    const defaultOptions: SearchOptions = {
        entityType: 'all',
        limit: 20,
        fuzzy: true,
        includeMetadata: true,
        ...options,
    };

    const { entityType, limit } = defaultOptions;

    let results: SearchResult[] = [];

    if (entityType === 'all' || entityType === 'students') {
        const studentResults = await searchStudents(userId, query, defaultOptions);
        results = [...results, ...studentResults];
    }

    if (entityType === 'all' || entityType === 'classes') {
        const classResults = await searchClasses(userId, query, defaultOptions);
        results = [...results, ...classResults];
    }

    if (entityType === 'all' || entityType === 'tasks') {
        const taskResults = await searchTasks(userId, query, defaultOptions);
        results = [...results, ...taskResults];
    }

    if (entityType === 'all' || entityType === 'schedules') {
        const scheduleResults = await searchSchedules(userId, query, defaultOptions);
        results = [...results, ...scheduleResults];
    }

    // Sort by relevance and limit
    return results
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, limit);
};

/**
 * Get search suggestions based on history and popular searches
 */
export const getSearchSuggestions = async (
    userId: string,
    partialQuery: string
): Promise<string[]> => {
    if (!partialQuery || partialQuery.length < 1) return [];

    const suggestions: string[] = [];

    // Get matching student names
    const { data: students } = await supabase
        .from('students')
        .select('name')
        .eq('user_id', userId)
        .ilike('name', `%${partialQuery}%`)
        .limit(5);

    students?.forEach(s => suggestions.push(s.name));

    // Get matching class names
    const { data: classes } = await supabase
        .from('classes')
        .select('name')
        .eq('user_id', userId)
        .ilike('name', `%${partialQuery}%`)
        .limit(3);

    classes?.forEach(c => suggestions.push(c.name));

    // Get matching subjects
    const { data: schedules } = await supabase
        .from('schedules')
        .select('subject')
        .eq('user_id', userId)
        .ilike('subject', `%${partialQuery}%`)
        .limit(3);

    schedules?.forEach(s => suggestions.push(s.subject));

    // Remove duplicates and limit
    return [...new Set(suggestions)].slice(0, 8);
};

/**
 * Search result grouping by type
 */
export const groupResultsByType = (results: SearchResult[]): Record<SearchEntityType, SearchResult[]> => {
    const grouped: Record<SearchEntityType, SearchResult[]> = {
        all: [],
        students: [],
        classes: [],
        tasks: [],
        schedules: [],
        attendance: [],
    };

    results.forEach(result => {
        if (grouped[result.type]) {
            grouped[result.type].push(result);
        }
    });

    return grouped;
};

export default {
    globalSearch,
    getSearchSuggestions,
    groupResultsByType,
    calculateRelevance,
};
