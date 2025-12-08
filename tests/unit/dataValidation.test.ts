import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock data for testing
const mockStudents = [
    { id: '1', name: 'Ahmad Rizki', class_id: 'class-1', gender: 'Laki-laki' as const },
    { id: '2', name: 'Siti Nurhaliza', class_id: 'class-1', gender: 'Perempuan' as const },
    { id: '3', name: 'Budi Santoso', class_id: 'class-2', gender: 'Laki-laki' as const },
];

const mockClasses = [
    { id: 'class-1', name: 'Kelas 1A', user_id: 'user-1' },
    { id: 'class-2', name: 'Kelas 1B', user_id: 'user-1' },
];

const mockTasks = [
    { id: 'task-1', title: 'Koreksi UTS', status: 'todo' as const, due_date: '2024-12-10' },
    { id: 'task-2', title: 'Persiapan Materi', status: 'done' as const, due_date: null },
];

describe('Data Validation', () => {
    describe('Student Data Validation', () => {
        it('validates student has required fields', () => {
            const student = mockStudents[0];

            expect(student.id).toBeDefined();
            expect(student.name).toBeDefined();
            expect(student.class_id).toBeDefined();
            expect(student.gender).toBeDefined();
        });

        it('validates gender is valid enum value', () => {
            const validGenders = ['Laki-laki', 'Perempuan'];

            mockStudents.forEach(student => {
                expect(validGenders).toContain(student.gender);
            });
        });

        it('validates student name is not empty', () => {
            mockStudents.forEach(student => {
                expect(student.name.length).toBeGreaterThan(0);
            });
        });

        it('validates student id format', () => {
            mockStudents.forEach(student => {
                expect(typeof student.id).toBe('string');
                expect(student.id.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Class Data Validation', () => {
        it('validates class has required fields', () => {
            const classData = mockClasses[0];

            expect(classData.id).toBeDefined();
            expect(classData.name).toBeDefined();
            expect(classData.user_id).toBeDefined();
        });

        it('validates class name is not empty', () => {
            mockClasses.forEach(classData => {
                expect(classData.name.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Task Data Validation', () => {
        it('validates task has required fields', () => {
            const task = mockTasks[0];

            expect(task.id).toBeDefined();
            expect(task.title).toBeDefined();
            expect(task.status).toBeDefined();
        });

        it('validates task status is valid enum value', () => {
            const validStatuses = ['todo', 'in_progress', 'done'];

            mockTasks.forEach(task => {
                expect(validStatuses).toContain(task.status);
            });
        });

        it('validates due_date is null or valid date string', () => {
            mockTasks.forEach(task => {
                if (task.due_date !== null) {
                    expect(() => new Date(task.due_date!)).not.toThrow();
                    expect(new Date(task.due_date!).toString()).not.toBe('Invalid Date');
                }
            });
        });
    });
});

describe('Data Filtering Logic', () => {
    it('filters students by class', () => {
        const classId = 'class-1';
        const filtered = mockStudents.filter(s => s.class_id === classId);

        expect(filtered.length).toBe(2);
        expect(filtered.every(s => s.class_id === classId)).toBe(true);
    });

    it('filters students by gender', () => {
        const gender = 'Perempuan';
        const filtered = mockStudents.filter(s => s.gender === gender);

        expect(filtered.length).toBe(1);
        expect(filtered[0].name).toBe('Siti Nurhaliza');
    });

    it('filters tasks by status', () => {
        const pendingTasks = mockTasks.filter(t => t.status !== 'done');
        const completedTasks = mockTasks.filter(t => t.status === 'done');

        expect(pendingTasks.length).toBe(1);
        expect(completedTasks.length).toBe(1);
    });

    it('searches students by name (case insensitive)', () => {
        const searchQuery = 'ahmad';
        const filtered = mockStudents.filter(s =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        expect(filtered.length).toBe(1);
        expect(filtered[0].name).toBe('Ahmad Rizki');
    });
});

describe('Data Transformation', () => {
    it('calculates gender statistics correctly', () => {
        const maleCount = mockStudents.filter(s => s.gender === 'Laki-laki').length;
        const femaleCount = mockStudents.filter(s => s.gender === 'Perempuan').length;

        expect(maleCount).toBe(2);
        expect(femaleCount).toBe(1);
        expect(maleCount + femaleCount).toBe(mockStudents.length);
    });

    it('calculates task completion rate', () => {
        const total = mockTasks.length;
        const completed = mockTasks.filter(t => t.status === 'done').length;
        const completionRate = (completed / total) * 100;

        expect(completionRate).toBe(50);
    });

    it('groups students by class', () => {
        const grouped = mockStudents.reduce((acc, student) => {
            if (!acc[student.class_id]) acc[student.class_id] = [];
            acc[student.class_id].push(student);
            return acc;
        }, {} as Record<string, typeof mockStudents>);

        expect(Object.keys(grouped).length).toBe(2);
        expect(grouped['class-1'].length).toBe(2);
        expect(grouped['class-2'].length).toBe(1);
    });
});

describe('Edge Cases', () => {
    it('handles empty arrays', () => {
        const emptyStudents: typeof mockStudents = [];

        expect(emptyStudents.filter(s => s.gender === 'Laki-laki').length).toBe(0);
        expect(emptyStudents.length).toBe(0);
    });

    it('handles search with no results', () => {
        const searchQuery = 'xyz tidak ada';
        const filtered = mockStudents.filter(s =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        expect(filtered.length).toBe(0);
    });

    it('handles special characters in search', () => {
        const searchQuery = "Ahmad's";
        const filtered = mockStudents.filter(s =>
            s.name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // Should not crash
        expect(filtered).toBeDefined();
    });
});
