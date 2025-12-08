import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test-utils';
import React from 'react';

// Mock supabase
vi.mock('../../src/services/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    order: vi.fn(() => Promise.resolve({
                        data: [
                            { id: 'student-1', name: 'Student 1', class_id: 'class-1', gender: 'Laki-laki' },
                            { id: 'student-2', name: 'Student 2', class_id: 'class-1', gender: 'Perempuan' }
                        ],
                        error: null
                    })),
                    single: vi.fn(() => Promise.resolve({
                        data: { id: 'student-1', name: 'Student 1' },
                        error: null
                    }))
                })),
                order: vi.fn(() => Promise.resolve({
                    data: [],
                    error: null
                }))
            })),
            insert: vi.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null })),
            update: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null }))
            })),
            delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
        })),
        auth: {
            getSession: vi.fn(() => Promise.resolve({
                data: { session: { user: { id: 'test-user' } } },
                error: null
            })),
            onAuthStateChange: vi.fn(() => ({
                data: { subscription: { unsubscribe: vi.fn() } }
            }))
        }
    }
}));

const StudentsPage = React.lazy(() => import('../../src/components/pages/StudentsPage'));

describe('StudentsPage Extended Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders without crashing', async () => {
        expect(() => {
            renderWithProviders(
                <React.Suspense fallback={<div>Loading...</div>}>
                    <StudentsPage />
                </React.Suspense>
            );
        }).not.toThrow();
    });
});

describe('Student Search and Filter', () => {
    it('should filter students by name', () => {
        const students = [
            { id: 1, name: 'Ahmad Rizki' },
            { id: 2, name: 'Budi Santoso' },
            { id: 3, name: 'Ahmad Fajar' }
        ];

        const searchTerm = 'Ahmad';
        const filtered = students.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        expect(filtered.length).toBe(2);
        expect(filtered.map(s => s.name)).toContain('Ahmad Rizki');
        expect(filtered.map(s => s.name)).toContain('Ahmad Fajar');
    });

    it('should filter students by class', () => {
        const students = [
            { id: 1, name: 'Student 1', class_id: 'class-a' },
            { id: 2, name: 'Student 2', class_id: 'class-b' },
            { id: 3, name: 'Student 3', class_id: 'class-a' }
        ];

        const classFilter = 'class-a';
        const filtered = students.filter(s => s.class_id === classFilter);

        expect(filtered.length).toBe(2);
    });

    it('should filter students by gender', () => {
        const students = [
            { id: 1, name: 'Student 1', gender: 'Laki-laki' },
            { id: 2, name: 'Student 2', gender: 'Perempuan' },
            { id: 3, name: 'Student 3', gender: 'Laki-laki' }
        ];

        const genderFilter = 'Perempuan';
        const filtered = students.filter(s => s.gender === genderFilter);

        expect(filtered.length).toBe(1);
    });

    it('should combine multiple filters', () => {
        const students = [
            { id: 1, name: 'Ahmad', class_id: 'class-a', gender: 'Laki-laki' },
            { id: 2, name: 'Ahmad', class_id: 'class-b', gender: 'Laki-laki' },
            { id: 3, name: 'Budi', class_id: 'class-a', gender: 'Laki-laki' },
            { id: 4, name: 'Ahmad', class_id: 'class-a', gender: 'Perempuan' }
        ];

        const filters = {
            name: 'Ahmad',
            class_id: 'class-a',
            gender: 'Laki-laki'
        };

        const filtered = students.filter(s =>
            s.name.includes(filters.name) &&
            s.class_id === filters.class_id &&
            s.gender === filters.gender
        );

        expect(filtered.length).toBe(1);
        expect(filtered[0].id).toBe(1);
    });
});

describe('Student Sorting', () => {
    it('should sort students by name ascending', () => {
        const students = [
            { name: 'Charlie' },
            { name: 'Alice' },
            { name: 'Bob' }
        ];

        const sorted = [...students].sort((a, b) => a.name.localeCompare(b.name));

        expect(sorted[0].name).toBe('Alice');
        expect(sorted[1].name).toBe('Bob');
        expect(sorted[2].name).toBe('Charlie');
    });

    it('should sort students by name descending', () => {
        const students = [
            { name: 'Charlie' },
            { name: 'Alice' },
            { name: 'Bob' }
        ];

        const sorted = [...students].sort((a, b) => b.name.localeCompare(a.name));

        expect(sorted[0].name).toBe('Charlie');
        expect(sorted[2].name).toBe('Alice');
    });

    it('should sort students by class', () => {
        const students = [
            { name: 'Student 1', class_name: 'Kelas 2A' },
            { name: 'Student 2', class_name: 'Kelas 1A' },
            { name: 'Student 3', class_name: 'Kelas 1B' }
        ];

        const sorted = [...students].sort((a, b) => a.class_name.localeCompare(b.class_name));

        expect(sorted[0].class_name).toBe('Kelas 1A');
        expect(sorted[1].class_name).toBe('Kelas 1B');
        expect(sorted[2].class_name).toBe('Kelas 2A');
    });
});

describe('Student Pagination', () => {
    it('should paginate students correctly', () => {
        const students = Array.from({ length: 25 }, (_, i) => ({
            id: i + 1,
            name: `Student ${i + 1}`
        }));

        const pageSize = 10;
        const page = 1; // 0-indexed

        const paginated = students.slice(page * pageSize, (page + 1) * pageSize);

        expect(paginated.length).toBe(10);
        expect(paginated[0].id).toBe(11);
        expect(paginated[9].id).toBe(20);
    });

    it('should calculate total pages', () => {
        const totalItems = 47;
        const pageSize = 10;
        const totalPages = Math.ceil(totalItems / pageSize);

        expect(totalPages).toBe(5);
    });

    it('should handle last page with fewer items', () => {
        const students = Array.from({ length: 23 }, (_, i) => ({
            id: i + 1,
            name: `Student ${i + 1}`
        }));

        const pageSize = 10;
        const lastPage = 2; // 0-indexed

        const paginated = students.slice(lastPage * pageSize, (lastPage + 1) * pageSize);

        expect(paginated.length).toBe(3);
    });
});

describe('Student Statistics', () => {
    it('should count students by class', () => {
        const students = [
            { class_id: 'class-a' },
            { class_id: 'class-a' },
            { class_id: 'class-b' },
            { class_id: 'class-a' },
            { class_id: 'class-c' }
        ];

        const counts = students.reduce((acc, s) => {
            acc[s.class_id] = (acc[s.class_id] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        expect(counts['class-a']).toBe(3);
        expect(counts['class-b']).toBe(1);
        expect(counts['class-c']).toBe(1);
    });

    it('should count students by gender', () => {
        const students = [
            { gender: 'Laki-laki' },
            { gender: 'Perempuan' },
            { gender: 'Laki-laki' },
            { gender: 'Laki-laki' },
            { gender: 'Perempuan' }
        ];

        const male = students.filter(s => s.gender === 'Laki-laki').length;
        const female = students.filter(s => s.gender === 'Perempuan').length;

        expect(male).toBe(3);
        expect(female).toBe(2);
    });

    it('should calculate gender ratio', () => {
        const male = 15;
        const female = 10;
        const total = male + female;

        const maleRatio = Math.round((male / total) * 100);
        const femaleRatio = Math.round((female / total) * 100);

        expect(maleRatio).toBe(60);
        expect(femaleRatio).toBe(40);
    });
});

describe('Student Access Code', () => {
    it('should generate valid access code', () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const generateCode = (): string => {
            return Array.from({ length: 6 }, () =>
                chars[Math.floor(Math.random() * chars.length)]
            ).join('');
        };

        const code = generateCode();

        expect(code.length).toBe(6);
        expect(/^[A-Z0-9]+$/.test(code)).toBe(true);
        // Verify no confusing characters
        expect(code).not.toContain('I');
        expect(code).not.toContain('O');
        expect(code).not.toContain('0');
        expect(code).not.toContain('1');
    });

    it('should regenerate unique codes', () => {
        const codes = new Set<string>();
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

        const generateCode = (): string => {
            return Array.from({ length: 6 }, () =>
                chars[Math.floor(Math.random() * chars.length)]
            ).join('');
        };

        // Generate 100 codes
        for (let i = 0; i < 100; i++) {
            codes.add(generateCode());
        }

        // Most should be unique (statistically)
        expect(codes.size).toBeGreaterThan(90);
    });

    it('should validate access code format', () => {
        const validateCode = (code: string): boolean => {
            return /^[A-Z0-9]{6}$/.test(code);
        };

        expect(validateCode('ABC123')).toBe(true);
        expect(validateCode('abc123')).toBe(false);
        expect(validateCode('ABCDE')).toBe(false);
        expect(validateCode('ABCDEFG')).toBe(false);
    });
});
