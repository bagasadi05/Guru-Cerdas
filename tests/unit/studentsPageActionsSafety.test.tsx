import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStudentsPageActions } from '../../src/components/students/useStudentsPageActions';
import { ClassRow, ConfirmModalState, StudentRow } from '../../src/components/students/types';
import { exportToCSV, exportToExcel } from '../../src/utils/exportUtils';

const db = vi.hoisted(() => ({
  students: [] as Record<string, unknown>[],
  updates: [] as { table: string; data: Record<string, unknown>; filters: Record<string, unknown> }[],
  inserts: [] as Record<string, unknown>[][],
  error: null as null | { message: string },
}));

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: (table: string) => {
      const filters: Record<string, unknown> = {};
      let update: Record<string, unknown> | undefined;
      let head = false;
      const chain = {
        select: (_columns: string, options?: { head?: boolean }) => { head = !!options?.head; return chain; },
        eq: (key: string, value: unknown) => { filters[key] = value; return chain; },
        is: (key: string, value: unknown) => { filters[key] = value; return chain; },
        in: (key: string, value: unknown[]) => { filters[key] = value; return chain; },
        order: () => chain,
        range: () => chain,
        update: (data: Record<string, unknown>) => { update = data; return chain; },
        insert: async (data: Record<string, unknown>[]) => { db.inserts.push(data); return { error: db.error }; },
        then: (resolve: (value: unknown) => void) => {
          const rows = db.students.filter((row) => Object.entries(filters).every(([key, value]) =>
            Array.isArray(value) ? value.includes(row[key]) : row[key] === value,
          ));
          if (update && !db.error) db.updates.push({ table, data: update, filters: { ...filters } });
          resolve({ data: head ? null : rows, count: rows.length, error: db.error });
        },
      };
      return chain;
    },
  },
}));
vi.mock('../../src/utils/confetti', () => ({ triggerSuccessConfetti: vi.fn() }));
vi.mock('../../src/utils/exportUtils', () => ({ exportToExcel: vi.fn(), exportToCSV: vi.fn() }));
vi.mock('../../src/services/SoftDeleteService', () => ({ softDelete: vi.fn(), softDeleteBulk: vi.fn() }));

const classA: ClassRow = {
  id: 'class-a', name: 'Kelas A', user_id: 'teacher', created_at: '', deleted_at: null,
  academic_year: null, grade_level: null, is_archived: false, updated_at: null, wali_kelas_id: null,
};
const classB: ClassRow = { ...classA, id: 'class-b', name: 'Kelas B' };
const studentA: StudentRow = {
  id: 'student-a', class_id: classA.id, name: 'Siswa A', gender: 'Laki-laki', user_id: 'teacher',
  created_at: '', deleted_at: null, access_code: null, avatar_url: null, birth_date: null,
  nis: null, nisn: null, parent_name: null, parent_phone: null,
};
const studentB: StudentRow = { ...studentA, id: 'student-b', class_id: classB.id, name: 'Siswa B' };
const toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() };

function setup() {
  let confirmation: ConfirmModalState = { isOpen: false, title: '', message: '', onConfirm: vi.fn() };
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useStudentsPageActions({
    userId: 'teacher', classes: [classA, classB], studentsForActiveClass: [studentA],
    activeClassId: classA.id, selectedItems: new Set([studentA.id]), clearSelection: vi.fn(), toast,
    studentModalMode: 'add', currentStudent: null, genderSelection: 'Laki-laki',
    classModalMode: 'add', currentClass: null, classNameInput: '',
    setIsStudentModalOpen: vi.fn(), setIsClassModalOpen: vi.fn(), setIsBulkMoveModalOpen: vi.fn(),
    setIsExportModalOpen: vi.fn(),
    setConfirmModalState: (value) => { confirmation = typeof value === 'function' ? value(confirmation) : value; },
  }), { wrapper });
  return { ...hook, getConfirmation: () => confirmation };
}

describe('student page actions safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.students = [studentA, studentB];
    db.updates = [];
    db.inserts = [];
    db.error = null;
  });

  it('blocks deleting an occupied class that is not the active class', async () => {
    const { result, getConfirmation } = setup();
    await act(async () => { await result.current.handleDeleteClassClick(classB); });
    expect(getConfirmation().isOpen).toBe(false);
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('masih ada 1 siswa'));
    expect(db.updates).toHaveLength(0);
  });

  it('checks the database again when an empty class deletion is confirmed', async () => {
    db.students = [studentA];
    const { result, getConfirmation } = setup();
    await act(async () => { await result.current.handleDeleteClassClick(classB); });
    expect(getConfirmation().isOpen).toBe(true);
    db.students.push(studentB);
    await act(async () => { getConfirmation().onConfirm(); });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('masih ada 1 siswa')));
    expect(db.updates).toHaveLength(0);
  });

  it('keeps deletion blocked when the student count query fails', async () => {
    db.error = { message: 'offline' };
    const { result, getConfirmation } = setup();
    await act(async () => { await result.current.handleDeleteClassClick(classB); });
    expect(getConfirmation().isOpen).toBe(false);
    expect(db.updates).toHaveLength(0);
    expect(toast.error).toHaveBeenCalledWith('offline');
  });

  it('creates codes for the chosen class while another class is active', async () => {
    const { result, getConfirmation } = setup();
    act(() => result.current.handleGenerateCodesClick(classB));
    await act(async () => { getConfirmation().onConfirm(); });
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(db.updates).toEqual([expect.objectContaining({
      table: 'students', data: { access_code: expect.stringMatching(/^[A-Z0-9]{6}$/) },
      filters: expect.objectContaining({ id: studentB.id, class_id: classB.id }),
    })]);
  });

  it('creates a code only for the chosen student and preserves existing codes', async () => {
    db.students = [studentA, { ...studentB, access_code: 'OLD222' }];
    const { result, getConfirmation } = setup();
    act(() => result.current.handleGenerateStudentCode(studentA));
    await act(async () => { getConfirmation().onConfirm(); });
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(db.updates).toHaveLength(1);
    expect(db.updates[0].filters.id).toBe(studentA.id);
    act(() => result.current.handleGenerateStudentCode(studentB));
    await act(async () => { getConfirmation().onConfirm(); });
    await waitFor(() => expect(toast.info).toHaveBeenCalled());
    expect(db.updates).toHaveLength(1);
  });

  it('rejects an unknown import class before inserting any rows', async () => {
    const { result } = setup();
    await expect(result.current.handleImportStudents([{
      rowNumber: 2, isValid: true, errors: [],
      data: { name: 'Siswa Impor', gender: 'Laki-laki', class_name: 'Kelas typo' },
    }])).rejects.toThrow('Kelas typo');
    expect(db.inserts).toHaveLength(0);
  });

  it('imports identity and contact fields into the named class', async () => {
    const { result } = setup();
    await result.current.handleImportStudents([{
      rowNumber: 2, isValid: true, errors: [],
      data: { name: 'Siswa Contoh', gender: 'Perempuan', class_name: ' kelas b ',
        nis: '000123', nisn: '0081234567', birth_date: '2014-08-17', access_code: 'NEW222',
        parent_name: 'Wali Contoh', parent_phone: '081234567890' },
    }]);
    expect(db.inserts).toEqual([[expect.objectContaining({
      class_id: classB.id, nis: '000123', nisn: '0081234567', birth_date: '2014-08-17',
      access_code: 'NEW222', parent_name: 'Wali Contoh', parent_phone: '081234567890',
    })]]);
  });

  it('rejects bulk movement when the selection includes a student outside the visible class', async () => {
    const { result } = setup();
    await act(async () => result.current.bulkMoveStudents({ studentIds: [studentA.id, studentB.id], targetClassId: classB.id }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Pilihan siswa sudah berubah')));
    expect(db.updates).toHaveLength(0);
  });

  it('uses the CSV exporter when CSV is selected', async () => {
    const { result } = setup();
    await result.current.handleExportConfirm('csv', ['name', 'nisn']);
    expect(exportToCSV).toHaveBeenCalledWith(
      [{ No: 1, 'Nama Lengkap': 'Siswa A', NISN: '-' }], 'Data_Siswa_Kelas_A', 'Data Siswa - Kelas A',
    );
    expect(exportToExcel).not.toHaveBeenCalled();
  });

  it('exports class names instead of raw class identifiers', async () => {
    const { result } = setup();
    await result.current.handleExportConfirm('xlsx', ['name', 'class_id', 'access_code']);
    expect(exportToExcel).toHaveBeenCalledWith(
      [{ No: 1, 'Nama Lengkap': 'Siswa A', Kelas: 'Kelas A', 'Kode Akses': 'Belum Ada' }],
      'Data_Siswa_Kelas_A', 'Data Siswa - Kelas A',
    );
  });

  it('rejects unavailable formats without downloading a different format', async () => {
    const { result } = setup();
    await expect(result.current.handleExportConfirm('pdf', ['name'])).rejects.toThrow('Format ekspor tidak tersedia');
    expect(exportToExcel).not.toHaveBeenCalled();
    expect(exportToCSV).not.toHaveBeenCalled();
  });
});
