import { Database } from '../../services/database.types';

export type StudentRow = Database['public']['Tables']['students']['Row'];
export type ClassRow = Database['public']['Tables']['classes']['Row'];

export interface StudentViewProps {
    students: StudentRow[];
    isSelected: (id: string) => boolean;
    toggleItem: (id: string) => void;
    onAction: (student: StudentRow, action: 'view' | 'edit' | 'delete' | 'menu') => void;
}

export interface SortConfig {
    key: string;
    direction: 'asc' | 'desc';
}

export interface StudentTableProps extends StudentViewProps {
    isAllSelected: boolean;
    toggleAll: () => void;
    sortConfig: SortConfig;
    onSort: (key: string) => void;
}
