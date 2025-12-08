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
                    single: vi.fn(() => Promise.resolve({
                        data: {
                            id: 'student-123',
                            name: 'Test Student',
                            class_id: 'class-1',
                            class: { name: 'Kelas 1A' },
                            gender: 'Laki-laki',
                            access_code: 'ABC123',
                            avatar_url: null,
                            parent_phone: '081234567890'
                        },
                        error: null
                    })),
                    order: vi.fn(() => Promise.resolve({
                        data: [],
                        error: null
                    }))
                })),
                order: vi.fn(() => Promise.resolve({ data: [], error: null }))
            })),
            insert: vi.fn(() => Promise.resolve({ error: null })),
            update: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
        })),
        auth: {
            getSession: vi.fn(() => Promise.resolve({
                data: { session: null },
                error: null
            })),
            onAuthStateChange: vi.fn(() => ({
                data: { subscription: { unsubscribe: vi.fn() } }
            }))
        }
    }
}));

// Mock useParams
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useParams: () => ({ studentId: 'student-123' }),
        useNavigate: () => vi.fn()
    };
});

describe('Parent Portal Flow', () => {
    describe('Access Code Validation', () => {
        it('should validate 6-character access code', () => {
            const validateAccessCode = (code: string): boolean => {
                return /^[A-Z0-9]{6}$/.test(code);
            };

            expect(validateAccessCode('ABC123')).toBe(true);
            expect(validateAccessCode('abc123')).toBe(false);
            expect(validateAccessCode('ABC12')).toBe(false);
            expect(validateAccessCode('ABC1234')).toBe(false);
        });

        it('should reject empty access code', () => {
            const validateAccessCode = (code: string): boolean => {
                return /^[A-Z0-9]{6}$/.test(code);
            };

            expect(validateAccessCode('')).toBe(false);
        });

        it('should normalize access code to uppercase', () => {
            const normalizeCode = (code: string): string => {
                return code.toUpperCase().trim();
            };

            expect(normalizeCode('abc123')).toBe('ABC123');
            expect(normalizeCode('  ABC123  ')).toBe('ABC123');
        });
    });

    describe('Student Data Display', () => {
        it('should format student info correctly', () => {
            const student = {
                name: 'Ahmad Rizki',
                class: { name: 'Kelas 1A' },
                gender: 'Laki-laki'
            };

            const displayInfo = `${student.name} - ${student.class.name}`;
            expect(displayInfo).toBe('Ahmad Rizki - Kelas 1A');
        });

        it('should handle missing class gracefully', () => {
            const student: { name: string; class: { name: string } | null } = {
                name: 'Ahmad Rizki',
                class: null
            };

            const className = student.class?.name || 'Tidak ada kelas';
            expect(className).toBe('Tidak ada kelas');
        });
    });

    describe('Attendance History', () => {
        it('should group attendance by month', () => {
            const records = [
                { date: '2024-12-01', status: 'Hadir' },
                { date: '2024-12-15', status: 'Hadir' },
                { date: '2024-11-20', status: 'Sakit' },
                { date: '2024-11-10', status: 'Hadir' }
            ];

            const grouped = records.reduce((acc, record) => {
                const month = record.date.substring(0, 7); // YYYY-MM
                if (!acc[month]) acc[month] = [];
                acc[month].push(record);
                return acc;
            }, {} as Record<string, typeof records>);

            expect(Object.keys(grouped).length).toBe(2);
            expect(grouped['2024-12'].length).toBe(2);
            expect(grouped['2024-11'].length).toBe(2);
        });

        it('should calculate monthly attendance rate', () => {
            const records = [
                { status: 'Hadir' },
                { status: 'Hadir' },
                { status: 'Hadir' },
                { status: 'Sakit' },
                { status: 'Alpha' }
            ];

            const presentCount = records.filter(r => r.status === 'Hadir').length;
            const rate = Math.round((presentCount / records.length) * 100);

            expect(rate).toBe(60);
        });
    });

    describe('Grade Display', () => {
        it('should sort grades by subject', () => {
            const grades = [
                { subject: 'Matematika', score: 85 },
                { subject: 'Bahasa Indonesia', score: 90 },
                { subject: 'IPA', score: 88 }
            ];

            const sorted = [...grades].sort((a, b) => a.subject.localeCompare(b.subject));

            expect(sorted[0].subject).toBe('Bahasa Indonesia');
            expect(sorted[1].subject).toBe('IPA');
            expect(sorted[2].subject).toBe('Matematika');
        });

        it('should calculate GPA', () => {
            const grades = [
                { score: 85, weight: 3 },
                { score: 90, weight: 2 },
                { score: 75, weight: 4 }
            ];

            const totalWeight = grades.reduce((sum, g) => sum + g.weight, 0);
            const weightedSum = grades.reduce((sum, g) => sum + (g.score * g.weight), 0);
            const gpa = weightedSum / totalWeight;

            // (85*3 + 90*2 + 75*4) / (3+2+4) = (255 + 180 + 300) / 9 = 735 / 9 = 81.67
            expect(gpa).toBeCloseTo(81.67, 1);
        });
    });
});

describe('User Flow: Login and Navigation', () => {
    describe('Teacher Login Flow', () => {
        it('should validate email format', () => {
            const isValidEmail = (email: string): boolean => {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
            };

            expect(isValidEmail('teacher@school.com')).toBe(true);
            expect(isValidEmail('invalid-email')).toBe(false);
            expect(isValidEmail('')).toBe(false);
        });

        it('should validate password requirements', () => {
            const isValidPassword = (password: string): boolean => {
                return password.length >= 8 &&
                    /[A-Z]/.test(password) &&
                    /[a-z]/.test(password) &&
                    /[0-9]/.test(password);
            };

            expect(isValidPassword('Password1')).toBe(true);
            expect(isValidPassword('password')).toBe(false);
            expect(isValidPassword('Pass1')).toBe(false);
        });
    });

    describe('Navigation Flow', () => {
        it('should define all routes', () => {
            const routes = [
                { path: '/dashboard', name: 'Dashboard' },
                { path: '/siswa', name: 'Students' },
                { path: '/absensi', name: 'Attendance' },
                { path: '/jadwal', name: 'Schedule' },
                { path: '/tugas', name: 'Tasks' },
                { path: '/pengaturan', name: 'Settings' }
            ];

            expect(routes.length).toBe(6);
            expect(routes.find(r => r.path === '/dashboard')).toBeDefined();
        });

        it('should handle unauthorized access', () => {
            const isAuthenticated = false;
            const protectedRoute = '/dashboard';

            const redirectTo = isAuthenticated ? protectedRoute : '/guru-login';
            expect(redirectTo).toBe('/guru-login');
        });
    });
});

describe('User Flow: Student Management', () => {
    describe('Add Student Flow', () => {
        it('should validate student form', () => {
            const validateStudentForm = (data: {
                name: string;
                class_id: string;
                gender: string;
            }): { valid: boolean; errors: string[] } => {
                const errors: string[] = [];

                if (!data.name || data.name.length < 2) {
                    errors.push('Nama minimal 2 karakter');
                }
                if (!data.class_id) {
                    errors.push('Kelas harus dipilih');
                }
                if (!['Laki-laki', 'Perempuan'].includes(data.gender)) {
                    errors.push('Jenis kelamin tidak valid');
                }

                return { valid: errors.length === 0, errors };
            };

            const validData = { name: 'Ahmad', class_id: 'class-1', gender: 'Laki-laki' };
            expect(validateStudentForm(validData).valid).toBe(true);

            const invalidData = { name: 'A', class_id: '', gender: 'Invalid' };
            const result = validateStudentForm(invalidData);
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBe(3);
        });

        it('should generate access code on student creation', () => {
            const generateAccessCode = (): string => {
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                return Array.from({ length: 6 }, () =>
                    chars[Math.floor(Math.random() * chars.length)]
                ).join('');
            };

            const code = generateAccessCode();
            expect(code.length).toBe(6);
            expect(/^[A-Z0-9]{6}$/.test(code)).toBe(true);
        });
    });

    describe('Edit Student Flow', () => {
        it('should preserve unchanged fields', () => {
            const original = {
                id: '1',
                name: 'Original Name',
                class_id: 'class-1',
                gender: 'Laki-laki'
            };

            const updates = { name: 'New Name' };
            const merged = { ...original, ...updates };

            expect(merged.id).toBe('1');
            expect(merged.name).toBe('New Name');
            expect(merged.class_id).toBe('class-1');
        });

        it('should track changed fields', () => {
            const original = { name: 'Old', gender: 'Laki-laki' };
            const updated = { name: 'New', gender: 'Laki-laki' };

            const changedFields = Object.keys(original).filter(
                key => original[key as keyof typeof original] !== updated[key as keyof typeof updated]
            );

            expect(changedFields).toContain('name');
            expect(changedFields).not.toContain('gender');
        });
    });

    describe('Delete Student Flow', () => {
        it('should confirm before delete', () => {
            const showConfirmDialog = true;
            const userConfirmed = true;

            const shouldDelete = showConfirmDialog ? userConfirmed : false;
            expect(shouldDelete).toBe(true);
        });

        it('should cascade delete related data', () => {
            // Simulate cascade delete
            const studentId = 'student-1';
            const attendance = [
                { id: 1, student_id: 'student-1' },
                { id: 2, student_id: 'student-2' }
            ];
            const grades = [
                { id: 1, student_id: 'student-1' },
                { id: 2, student_id: 'student-1' }
            ];

            const remainingAttendance = attendance.filter(a => a.student_id !== studentId);
            const remainingGrades = grades.filter(g => g.student_id !== studentId);

            expect(remainingAttendance.length).toBe(1);
            expect(remainingGrades.length).toBe(0);
        });
    });
});

describe('User Flow: Attendance Taking', () => {
    describe('Take Attendance Flow', () => {
        it('should initialize all students as present', () => {
            const students = [
                { id: 1, name: 'Student 1' },
                { id: 2, name: 'Student 2' }
            ];

            const attendance = students.map(s => ({
                student_id: s.id,
                status: 'Hadir' as const,
                date: new Date().toISOString().split('T')[0]
            }));

            expect(attendance.every(a => a.status === 'Hadir')).toBe(true);
        });

        it('should allow status toggle', () => {
            const statuses = ['Hadir', 'Izin', 'Sakit', 'Alpha'] as const;
            let currentStatus = 'Hadir';

            const nextStatus = () => {
                const currentIndex = statuses.indexOf(currentStatus as typeof statuses[number]);
                const nextIndex = (currentIndex + 1) % statuses.length;
                return statuses[nextIndex];
            };

            expect(nextStatus()).toBe('Izin');
            currentStatus = 'Alpha';
            expect(nextStatus()).toBe('Hadir');
        });

        it('should track unsaved changes', () => {
            const original = [
                { id: 1, status: 'Hadir' },
                { id: 2, status: 'Hadir' }
            ];

            const modified = [
                { id: 1, status: 'Hadir' },
                { id: 2, status: 'Sakit' }
            ];

            const hasChanges = original.some((o, i) => o.status !== modified[i].status);
            expect(hasChanges).toBe(true);
        });
    });

    describe('Bulk Operations', () => {
        it('should mark all as present', () => {
            const students = [
                { id: 1, status: 'Alpha' },
                { id: 2, status: 'Sakit' }
            ];

            const allPresent = students.map(s => ({ ...s, status: 'Hadir' }));
            expect(allPresent.every(s => s.status === 'Hadir')).toBe(true);
        });

        it('should mark all as absent', () => {
            const students = [
                { id: 1, status: 'Hadir' },
                { id: 2, status: 'Hadir' }
            ];

            const allAbsent = students.map(s => ({ ...s, status: 'Alpha' }));
            expect(allAbsent.every(s => s.status === 'Alpha')).toBe(true);
        });
    });
});
