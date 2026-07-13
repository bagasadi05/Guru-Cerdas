export type SearchEntityType = 'students' | 'attendance' | 'tasks' | 'schedule' | 'classes' | 'all';

export interface SearchResult {
    id: string;
    type: SearchEntityType;
    title: string;
    subtitle?: string;
    metadata?: Record<string, unknown>;
    relevance?: number;
}

export interface SearchFilter {
    field: string;
    operator: 'equals' | 'contains' | 'gt' | 'lt' | 'between' | 'in';
    value: unknown;
    label?: string;
}

export interface RecentSearch {
    query: string;
    timestamp: number;
    type?: SearchEntityType;
    resultCount?: number;
}
