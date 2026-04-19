/**
 * Semester Utilities
 * Helper functions for semester-based filtering and date calculations
 */

export type SemesterType = '1' | '2' | 'all';

export interface SemesterInfo {
    semester: '1' | '2';
    year: number;
    academicYear: string; // e.g., "2024/2025"
    label: string; // e.g., "Semester 1 (Ganjil) 2024/2025"
}

/**
 * Get current semester based on current date
 * Semester 1 (Ganjil): July - December
 * Semester 2 (Genap): January - June
 */
export const getCurrentSemester = (): SemesterInfo => {
    const now = new Date();
    const month = now.getMonth(); // 0-11
    const year = now.getFullYear();

    // Semester 1: July (6) to December (11)
    // Semester 2: January (0) to June (5)
    const semester: '1' | '2' = month >= 6 ? '1' : '2';

    // Academic year calculation:
    // Semester 1 (Jul-Dec 2024) → Academic Year 2024/2025
    // Semester 2 (Jan-Jun 2025) → Academic Year 2024/2025
    const academicYearStart = semester === '1' ? year : year - 1;
    const academicYear = `${academicYearStart}/${academicYearStart + 1}`;

    const label = semester === '1'
        ? `Semester 1 (Ganjil) ${academicYear}`
        : `Semester 2 (Genap) ${academicYear}`;

    return { semester, year, academicYear, label };
};

/**
 * Get date range for a specific semester
 */
export const getSemesterDateRange = (semester: '1' | '2', academicYearStart: number): { start: Date; end: Date } => {
    if (semester === '1') {
        // July 1 to December 31
        return {
            start: new Date(academicYearStart, 6, 1), // July 1
            end: new Date(academicYearStart, 11, 31, 23, 59, 59) // December 31
        };
    } else {
        // January 1 to June 30 (next year)
        return {
            start: new Date(academicYearStart + 1, 0, 1), // January 1
            end: new Date(academicYearStart + 1, 5, 30, 23, 59, 59) // June 30
        };
    }
};

/**
 * Check if a date falls within a specific semester
 */
export const isDateInSemester = (date: Date | string, semester: SemesterType): boolean => {
    if (semester === 'all') return true;

    const d = typeof date === 'string' ? new Date(date) : date;
    const month = d.getMonth();

    if (semester === '1') {
        // July (6) to December (11)
        return month >= 6 && month <= 11;
    } else {
        // January (0) to June (5)
        return month >= 0 && month <= 5;
    }
};

/**
 * Get semester from a date
 */
export const getSemesterFromDate = (date: Date | string): '1' | '2' => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const month = d.getMonth();
    return month >= 6 ? '1' : '2';
};

/**
 * Get display label for semester selector
 */
export const getSemesterLabel = (semester: SemesterType): string => {
    switch (semester) {
        case '1':
            return 'Semester 1 (Ganjil)';
        case '2':
            return 'Semester 2 (Genap)';
        case 'all':
            return 'Semua Semester';
    }
};

type SemesterTerm = 'ganjil' | 'genap' | null;

const getSemesterTermFromName = (name?: string | null): SemesterTerm => {
    if (!name) return null;

    const normalized = name.toLowerCase();
    if (normalized.includes('ganjil')) return 'ganjil';
    if (normalized.includes('genap')) return 'genap';
    if (/semester\s*1|sem\s*1|smt\s*1/.test(normalized)) return 'ganjil';
    if (/semester\s*2|sem\s*2|smt\s*2/.test(normalized)) return 'genap';

    return null;
};

const getSemesterTermFromDate = (startDate?: string | null): SemesterTerm => {
    if (!startDate) return null;

    const parsed = new Date(startDate);
    if (Number.isNaN(parsed.getTime())) return null;

    return parsed.getMonth() >= 6 ? 'ganjil' : 'genap';
};

export const getSemesterTerm = (name?: string | null, startDate?: string | null): SemesterTerm => (
    getSemesterTermFromName(name) ?? getSemesterTermFromDate(startDate)
);

export const getSemesterDisplayName = (
    name?: string | null,
    startDate?: string | null,
    format: 'short' | 'full' = 'full'
): string => {
    const term = getSemesterTerm(name, startDate);

    if (term === 'ganjil') {
        return format === 'short' ? 'Ganjil' : 'Semester Ganjil';
    }

    if (term === 'genap') {
        return format === 'short' ? 'Genap' : 'Semester Genap';
    }

    return name || 'Semester';
};

/**
 * Filter an array of records by semester based on date field
 */
export const filterBySemester = <T extends { [key: string]: unknown }>(
    records: T[],
    semester: SemesterType,
    dateField: keyof T = 'created_at' as keyof T
): T[] => {
    if (semester === 'all') return records;

    return records.filter(record => {
        const dateValue = record[dateField];
        if (typeof dateValue === 'string' || dateValue instanceof Date) {
            return isDateInSemester(dateValue as Date | string, semester);
        }
        return true;
    });
};

/**
 * Get semester options for dropdown
 */
export const SEMESTER_OPTIONS: { value: SemesterType; label: string }[] = [
    { value: 'all', label: 'Semua Semester' },
    { value: '1', label: 'Semester 1 (Ganjil) - Jul-Des' },
    { value: '2', label: 'Semester 2 (Genap) - Jan-Jun' },
];


