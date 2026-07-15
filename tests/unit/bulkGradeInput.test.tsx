import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../test-utils';
import BulkGradeInputPage from '../../src/components/pages/BulkGradeInputPage';
import { supabase } from '../../src/services/supabase';

// Mock toast hook
const mockToast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
};

vi.mock('../../src/hooks/useToast', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../src/hooks/useToast')>();
    return {
        ...actual,
        useToast: () => mockToast,
    };
});

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<typeof import('react-router-dom')>();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock export utilities
vi.mock('../../src/utils/gradeExporter', () => ({
    exportGradesToExcel: vi.fn(),
}));

// Mock CustomDropdown to render a native select for easy testing
vi.mock('../../src/components/ui/CustomDropdown', () => {
    return {
        CustomDropdown: ({ value, onChange, options, placeholder }: any) => (
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-label={placeholder}
            >
                <option value="">{placeholder}</option>
                {options.map((opt: any) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        ),
    };
});

// Setup query mock variables
let mockStudentsData: any[] = [];
let mockExistingGradesData: any[] = [];
let mockClassesData: any[] = [];
let mockTeacherAssignmentsData: any[] = [];
let mockSemestersData: any[] = [];
let mockAcademicYearsData: any[] = [];
let selectError: any = null;
let upsertError: any = null;
let upsertSelectData: any[] = [];
let verificationSelectData: any[] = [];
let verificationSelectError: any = null;

const makeFilterChain = (data: any = [], error: any = null) => {
    const chain: any = {
        eq: vi.fn(() => chain),
        is: vi.fn(() => chain),
        in: vi.fn(() => chain),
        order: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        select: vi.fn(() => chain),
        single: vi.fn(() => Promise.resolve({ data: Array.isArray(data) ? data[0] : (data || null), error })),
        maybeSingle: vi.fn(() => Promise.resolve({ data: Array.isArray(data) ? data[0] : (data || null), error })),
        then: (resolve: any) => {
            resolve({ data, error });
        }
    };
    return chain;
};

// Mock Supabase calls globally
vi.mock('../../src/services/supabase', () => {
    return {
        supabase: {
            from: vi.fn((table: string) => {
                if (table === 'students') {
                    return makeFilterChain(mockStudentsData, null);
                }
                if (table === 'classes') {
                    return makeFilterChain(mockClassesData, null);
                }
                if (table === 'teacher_class_assignments') {
                    return makeFilterChain(mockTeacherAssignmentsData, null);
                }
                if (table === 'semesters') {
                    return makeFilterChain(mockSemestersData, null);
                }
                if (table === 'academic_years') {
                    return makeFilterChain(mockAcademicYearsData, null);
                }
                if (table === 'academic_records') {
                    const data = verificationSelectData.length > 0 ? verificationSelectData : mockExistingGradesData;
                    return makeFilterChain(data, verificationSelectError || selectError);
                }
                return makeFilterChain([], null);
            }),
        },
    };
});

// Spy on supabase upsert
let upsertedPayload: any[] = [];
beforeEach(() => {
    upsertedPayload = [];
    vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
        if (table === 'students') {
            return makeFilterChain(mockStudentsData, null);
        }
        if (table === 'classes') {
            return makeFilterChain(mockClassesData, null);
        }
        if (table === 'teacher_class_assignments') {
            return makeFilterChain(mockTeacherAssignmentsData, null);
        }
        if (table === 'semesters') {
            return makeFilterChain(mockSemestersData, null);
        }
        if (table === 'academic_years') {
            return makeFilterChain(mockAcademicYearsData, null);
        }
        if (table === 'academic_records') {
            const data = verificationSelectData.length > 0 ? verificationSelectData : mockExistingGradesData;
            const chain = makeFilterChain(data, verificationSelectError || selectError);
            chain.upsert = vi.fn((records: any[]) => {
                upsertedPayload = records;
                return {
                    select: vi.fn(() => makeFilterChain(upsertSelectData, upsertError)),
                };
            });
            return chain;
        }
        return makeFilterChain([], null);
    });
});

describe('BulkGradeInputPage Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockToast.success.mockReset();
        mockToast.error.mockReset();
        mockToast.info.mockReset();

        // Standard mock data with 1 student to prevent partial empty confirmation prompts
        mockStudentsData = [
            { id: 'student-1', name: 'Budi Handoko' },
        ];
        mockExistingGradesData = [];
        mockClassesData = [
            { id: 'class-1', name: 'Kelas 4A', user_id: 'teacher-1' },
        ];
        mockSemestersData = [
            {
                id: 'test-semester-id',
                name: 'Ganjil',
                is_active: true,
                academic_year_id: 'test-year-id',
                deleted_at: null,
                academic_years: {
                    id: 'test-year-id',
                    year_name: '2025/2026',
                    is_active: true,
                    deleted_at: null,
                }
            }
        ];
        mockAcademicYearsData = [
            {
                id: 'test-year-id',
                year_name: '2025/2026',
                is_active: true,
                deleted_at: null,
            }
        ];
        mockTeacherAssignmentsData = [
            {
                id: 'assign-1',
                teacher_user_id: 'teacher-1',
                class_id: 'class-1',
                semester_id: 'test-semester-id',
                assignment_role: 'subject_teacher',
                subject_name: 'TQA',
                deleted_at: null,
            },
            {
                id: 'assign-2',
                teacher_user_id: 'collaborative-teacher-id',
                class_id: 'class-1',
                semester_id: 'test-semester-id',
                assignment_role: 'subject_teacher',
                subject_name: 'TQA',
                deleted_at: null,
            },
        ];
        selectError = null;
        upsertError = null;
        verificationSelectError = null;
        upsertSelectData = [];
        verificationSelectData = [];
    });

    it('should display the "Belum disimpan ke database" banner and warn on change when form is dirty', async () => {
        renderWithProviders(<BulkGradeInputPage />, {
            user: { id: 'teacher-1', email: 'teacher@example.com' },
        });

        // Select Class
        await waitFor(() => expect(screen.getByLabelText(/-- pilih kelas --/i)).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/-- pilih kelas --/i), { target: { value: 'class-1' } });

        // Initially clean form (no dirty warning banner)
        expect(screen.queryByText(/belum disimpan ke database/i)).not.toBeInTheDocument();

        // Change score manually -> form becomes dirty
        await waitFor(() => expect(screen.getByLabelText(/nilai untuk Budi Handoko/i)).toBeInTheDocument());
        const input = screen.getByLabelText(/nilai untuk Budi Handoko/i);
        fireEvent.change(input, { target: { value: '85' } });

        // Verify dirty warning banner appears
        expect(screen.getByText(/belum disimpan ke database/i)).toBeInTheDocument();
    });

    it('should verify upserted values using read-after-write verification query and notify success only on match', async () => {
        // Mock verification rows to match expected upsert
        upsertSelectData = [
            { id: 'record-1', student_id: 'student-1', score: 85, subject: 'TQA', assessment_name: 'Ulangan Harian', semester_id: 'test-semester-id', user_id: 'teacher-1', created_at: '2026-07-14T22:00:00Z' },
        ];
        verificationSelectData = [
            { id: 'record-1', student_id: 'student-1', score: 85, subject: 'TQA', assessment_name: 'Ulangan Harian', semester_id: 'test-semester-id', user_id: 'teacher-1', created_at: '2026-07-14T22:00:00Z' },
        ];

        renderWithProviders(<BulkGradeInputPage />, {
            user: { id: 'teacher-1', email: 'teacher@example.com' },
        });

        await waitFor(() => expect(screen.getByLabelText(/-- pilih kelas --/i)).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/-- pilih kelas --/i), { target: { value: 'class-1' } });

        await waitFor(() => expect(screen.getByLabelText(/nilai untuk Budi Handoko/i)).toBeInTheDocument());
        const input = screen.getByLabelText(/nilai untuk Budi Handoko/i);
        fireEvent.change(input, { target: { value: '85' } });

        const saveButton = screen.getByRole('button', { name: /simpan semua nilai/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining('nilai tersimpan dan terverifikasi di database'));
        });
        
        // Dirty banner should disappear on success
        expect(screen.queryByText(/belum disimpan ke database/i)).not.toBeInTheDocument();
    });

    it('should throw an error and preserve the form states if read-after-write verification finds mismatching values', async () => {
        upsertSelectData = [
            { id: 'record-1', student_id: 'student-1', score: 85, subject: 'TQA', assessment_name: 'Ulangan Harian', semester_id: 'test-semester-id', user_id: 'teacher-1', created_at: '2026-07-14T22:00:00Z' },
        ];
        // Verification query returns different score (e.g. 70 instead of 85)
        verificationSelectData = [
            { id: 'record-1', student_id: 'student-1', score: 70, subject: 'TQA', assessment_name: 'Ulangan Harian', semester_id: 'test-semester-id', user_id: 'teacher-1', created_at: '2026-07-14T22:00:00Z' },
        ];

        renderWithProviders(<BulkGradeInputPage />, {
            user: { id: 'teacher-1', email: 'teacher@example.com' },
        });

        await waitFor(() => expect(screen.getByLabelText(/-- pilih kelas --/i)).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/-- pilih kelas --/i), { target: { value: 'class-1' } });

        await waitFor(() => expect(screen.getByLabelText(/nilai untuk Budi Handoko/i)).toBeInTheDocument());
        const input = screen.getByLabelText(/nilai untuk Budi Handoko/i);
        fireEvent.change(input, { target: { value: '85' } });

        const saveButton = screen.getByRole('button', { name: /simpan semua nilai/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('Penyimpanan belum terverifikasi'));
        });

        // The dirty state banner must stay and form value should remain 85
        expect(screen.getByText(/belum disimpan ke database/i)).toBeInTheDocument();
        expect(input).toHaveValue('85');
    });

    it('should handle existingGrades SELECT query error gracefully, displaying Retry UI and preventing overwrites', async () => {
        selectError = { message: 'Database RLS error on select' };

        renderWithProviders(<BulkGradeInputPage />, {
            user: { id: 'teacher-1', email: 'teacher@example.com' },
        });

        await waitFor(() => expect(screen.getByLabelText(/-- pilih kelas --/i)).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/-- pilih kelas --/i), { target: { value: 'class-1' } });

        // Retry banner must appear
        await waitFor(() => {
            expect(screen.getByText(/gagal memuat nilai yang tersimpan/i)).toBeInTheDocument();
        });

        const retryButton = screen.getByRole('button', { name: /coba lagi/i });
        expect(retryButton).toBeInTheDocument();

        // Save button must not be rendered when existingGrades has error
        const saveButton = screen.queryByRole('button', { name: /simpan semua nilai/i });
        expect(saveButton).not.toBeInTheDocument();
    });

    it('should show user-friendly error dialog on RLS error during upsert', async () => {
        // Mock error on upsert
        upsertError = { code: '42501', message: 'new row violates row-level security policy' };

        renderWithProviders(<BulkGradeInputPage />, {
            user: { id: 'teacher-1', email: 'teacher@example.com' },
        });

        await waitFor(() => expect(screen.getByLabelText(/-- pilih kelas --/i)).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/-- pilih kelas --/i), { target: { value: 'class-1' } });

        await waitFor(() => expect(screen.getByLabelText(/nilai untuk Budi Handoko/i)).toBeInTheDocument());
        const input = screen.getByLabelText(/nilai untuk Budi Handoko/i);
        fireEvent.change(input, { target: { value: '85' } });

        const saveButton = screen.getByRole('button', { name: /simpan semua nilai/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('Nilai tidak dapat disimpan karena akun ini belum memiliki akses'));
        });
    });

    it('should retain original record user_id (original creator) when updating existing scores', async () => {
        // Let's mock that the existing grade has user_id of "original-teacher" (collaborative grading scenario)
        const originalCreatorId = 'original-teacher-id';
        mockExistingGradesData = [
            { id: 'rec-1', student_id: 'student-1', user_id: originalCreatorId, score: 75, subject: 'TQA', assessment_name: 'Ulangan Harian', semester_id: 'test-semester-id', version: 1, created_at: '2026-07-14T22:00:00Z' }
        ];

        upsertSelectData = [
            { id: 'rec-1', student_id: 'student-1', score: 85, subject: 'TQA', assessment_name: 'Ulangan Harian', semester_id: 'test-semester-id', user_id: originalCreatorId, version: 2, created_at: '2026-07-14T22:00:00Z' }
        ];
        verificationSelectData = [
            { id: 'rec-1', student_id: 'student-1', score: 85, subject: 'TQA', assessment_name: 'Ulangan Harian', semester_id: 'test-semester-id', user_id: originalCreatorId, version: 2, created_at: '2026-07-14T22:00:00Z' }
        ];

        renderWithProviders(<BulkGradeInputPage />, {
            user: { id: 'collaborative-teacher-id', email: 'collaborative@example.com' },
        });

        await waitFor(() => expect(screen.getByLabelText(/-- pilih kelas --/i)).toBeInTheDocument());
        fireEvent.change(screen.getByLabelText(/-- pilih kelas --/i), { target: { value: 'class-1' } });

        await waitFor(() => expect(screen.getByLabelText(/nilai untuk Budi Handoko/i)).toBeInTheDocument());
        const input = screen.getByLabelText(/nilai untuk Budi Handoko/i);
        fireEvent.change(input, { target: { value: '85' } });

        const saveButton = screen.getByRole('button', { name: /simpan semua nilai/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockToast.success).toHaveBeenCalled();
        });

        // Verify that the payload sent to upsert retained the originalCreatorId
        expect(upsertedPayload[0].user_id).toBe(originalCreatorId);
    });

    it('should reset dirty state and form inputs when context changes', async () => {
        // Mount page
        renderWithProviders(<BulkGradeInputPage />, {
            user: { id: 'teacher-1', email: 'teacher@example.com' },
        });

        // Context clean by default
        expect(screen.queryByText(/belum disimpan ke database/i)).not.toBeInTheDocument();
    });
});
