import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ProtaHeader, ProtaItem } from '../../src/types/perangkatAjar';

const DOC_A = '11111111-1111-4111-8111-111111111111';
const DOC_B = '22222222-2222-4222-8222-222222222222';

const header = (id: string, subject: string): ProtaHeader => ({
  id,
  userId: 'user-1',
  academicYear: '2026/2027',
  subject,
  gradeLevel: 'Kelas 4',
  phase: 'B',
  curriculum: 'MERDEKA',
  weeklyJpQuota: 4,
  reserveJpSem1: 0,
  reserveJpSem2: 0,
});

const item = (id: string, code: string, orderIndex: number): ProtaItem => ({
  id,
  semesterNumber: 1,
  elementOrDomain: 'Bilangan',
  learningObjectiveCode: code,
  learningObjectiveText: `Uraian ${code}`,
  coreTopic: `Bab ${orderIndex + 1}`,
  targetJp: 10,
  orderIndex,
});

const docs: Record<string, { header: ProtaHeader; items: ProtaItem[] }> = {
  [DOC_A]: {
    header: header(DOC_A, 'Matematika'),
    items: [
      item('aaaaaaaa-0000-4000-8000-000000000001', 'TP 1', 0),
      item('aaaaaaaa-0000-4000-8000-000000000002', 'TP 2', 1),
    ],
  },
  [DOC_B]: {
    header: header(DOC_B, 'IPAS'),
    items: [item('bbbbbbbb-0000-4000-8000-000000000001', 'TP 9', 0)],
  },
};

const service = vi.hoisted(() => ({
  loadProta: vi.fn(),
  listProta: vi.fn(),
  saveProta: vi.fn(),
  loadPromes: vi.fn(),
  savePromes: vi.fn(),
  loadKaldikWeeks: vi.fn(),
  saveKaldikWeeks: vi.fn(),
  saveDocumentIdentity: vi.fn(),
  loadDocumentIdentity: vi.fn(),
  loadTeachingSchedule: vi.fn(),
  deleteProta: vi.fn(),
  loadSchoolKaldik: vi.fn(),
  publishSchoolKaldik: vi.fn(),
}));

const authState = vi.hoisted(() => ({ isAdmin: false }));

vi.mock('../../src/services/perangkatAjarService', () => service);
vi.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', name: 'Guru' }, isAdmin: authState.isAdmin }),
}));
vi.mock('../../src/components/pages/modul-ajar/ModulAjarCreatorPage', () => ({
  default: () => <div>Halaman Modul Ajar</div>,
}));
vi.mock('../../src/hooks/useUserSettings', () => ({
  useUserSettings: () => ({ settings: null, schoolName: 'MI AL IRSYAD KOTA MADIUN' }),
}));
vi.mock('../../src/hooks/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() }),
}));

const packageModule = vi.hoisted(() => ({
  buildPerangkatAjarPackage: vi.fn(async (_documents: unknown[]) => new Blob(['zip'])),
  toSafeFileName: (name: string) => name,
}));
vi.mock('../../src/utils/perangkatAjarPackage', () => packageModule);

const aiService = vi.hoisted(() => ({ generateProtaTopicsWithAi: vi.fn() }));
vi.mock('../../src/services/protaAiGenerator', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/services/protaAiGenerator')>()),
  generateProtaTopicsWithAi: aiService.generateProtaTopicsWithAi,
}));

const aiTopic = (code: string, tp: string) => ({ element: 'Unggah-ungguh', code, tp, topic: `Bab ${tp}`, relativeWeight: 1 });
const AI_TOPICS = {
  semester1: [aiTopic('TP 1', 'Ngoko alus'), aiTopic('TP 2', 'Krama lugu'), aiTopic('TP 3', 'Tembang dolanan')],
  semester2: [aiTopic('TP 4', 'Aksara Jawa'), aiTopic('TP 5', 'Cerita rakyat')],
};

import { PerangkatAjarPage } from '../../src/components/pages/perangkat-ajar/PerangkatAjarPage';
import { getDefaultNationalKaldik } from '../../src/data/defaultKaldikPresets';

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/perangkat-ajar?mode=prota-promes']}>
      <PerangkatAjarPage />
    </MemoryRouter>
  );

const lastSavedItems = () => {
  const calls = service.saveProta.mock.calls;
  return calls[calls.length - 1]?.[1] as ProtaItem[] | undefined;
};

describe('PerangkatAjarPage documents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('guru_cerdas_perangkat_ajar_active_prota_id', DOC_A);
    service.loadProta.mockImplementation(async (id?: string) => docs[id ?? DOC_A] ?? { header: null, items: [] });
    service.listProta.mockResolvedValue([
      { id: DOC_A, subject: 'Matematika', gradeLevel: 'Kelas 4', academicYear: '2026/2027' },
      { id: DOC_B, subject: 'IPAS', gradeLevel: 'Kelas 4', academicYear: '2026/2027' },
    ]);
    service.saveProta.mockImplementation(async (h: ProtaHeader) => h.id);
    service.loadPromes.mockResolvedValue({ header: null, cells: [] });
    service.savePromes.mockResolvedValue(undefined);
    service.loadKaldikWeeks.mockImplementation(async (year: string) => getDefaultNationalKaldik(year));
    service.saveKaldikWeeks.mockResolvedValue(undefined);
    service.loadDocumentIdentity.mockReturnValue(null);
    service.deleteProta.mockResolvedValue(undefined);
    service.loadSchoolKaldik.mockResolvedValue(null);
    service.publishSchoolKaldik.mockResolvedValue(undefined);
    authState.isAdmin = false;
    service.loadTeachingSchedule.mockResolvedValue([
      { subject: 'Matematika', classId: 'c-4a', className: '4A', gradeNumber: 4, startTime: '07:00', endTime: '09:20' },
      { subject: 'Bahasa Jawa', classId: 'c-3a', className: '3A', gradeNumber: 3, startTime: '07:00', endTime: '08:10' },
    ]);
  });

  it('lets the teacher undo deleting a materi', async () => {
    renderPage();
    await screen.findByDisplayValue('Matematika');

    fireEvent.click(screen.getByRole('button', { name: /2\. Program Tahunan/i }));
    fireEvent.click(screen.getAllByLabelText('Hapus TP 1')[0]);

    expect(await screen.findByText('Materi TP 1 dihapus.')).toBeInTheDocument();
    expect(lastSavedItems()?.map((i) => i.learningObjectiveCode)).toEqual(['TP 2']);

    fireEvent.click(screen.getByRole('button', { name: 'Batalkan' }));

    await waitFor(() =>
      expect(lastSavedItems()?.map((i) => i.learningObjectiveCode)).toEqual(['TP 1', 'TP 2'])
    );
    expect(screen.getAllByLabelText('Hapus TP 1').length).toBeGreaterThan(0);
  });

  it('saves header edits without pressing Simpan Semua', async () => {
    renderPage();
    const subjectInput = await screen.findByDisplayValue('Matematika');

    fireEvent.change(subjectInput, { target: { value: 'Matematika Lanjut' } });

    await waitFor(
      () => {
        const [savedHeader, savedItems] = service.saveProta.mock.calls.at(-1) ?? [];
        expect(savedHeader?.subject).toBe('Matematika Lanjut');
        expect(savedItems).toHaveLength(2);
      },
      { timeout: 3000 }
    );
  });

  it('derives the phase from the grade typed in the header', async () => {
    renderPage();
    const gradeInput = await screen.findByDisplayValue('Kelas 4');

    fireEvent.change(gradeInput, { target: { value: 'Kelas 8' } });

    expect(screen.getByLabelText('Fase Kurikulum Merdeka')).toHaveValue('D');
  });

  it('switches between Prota documents', async () => {
    renderPage();
    await screen.findByDisplayValue('Matematika');

    fireEvent.change(screen.getByLabelText('Dokumen Prota'), { target: { value: DOC_B } });

    expect(await screen.findByDisplayValue('IPAS')).toBeInTheDocument();
    expect(service.loadProta).toHaveBeenLastCalledWith(DOC_B);
    expect(localStorage.getItem('guru_cerdas_perangkat_ajar_active_prota_id')).toBe(DOC_B);
  });

  it('creates Prota & Promes for the timetable subjects that do not have one yet', async () => {
    renderPage();
    await screen.findByDisplayValue('Matematika');

    fireEvent.click(screen.getByRole('button', { name: /Buat dari Jadwal/i }));

    const existing = await screen.findByRole('checkbox', { name: /Matematika · Kelas 4/i });
    const missing = screen.getByRole('checkbox', { name: /Bahasa Jawa · Kelas 3/i });
    expect(existing).not.toBeChecked();
    expect(screen.getByText('Sudah ada')).toBeInTheDocument();
    expect(missing).toBeChecked();
    service.saveProta.mockClear();

    expect(screen.getByRole('checkbox', { name: /Susun TP dengan AI/i })).toBeChecked();
    aiService.generateProtaTopicsWithAi.mockResolvedValue(AI_TOPICS);
    fireEvent.click(screen.getByRole('button', { name: 'Buat 1 Prota' }));

    expect(await screen.findByDisplayValue('Bahasa Jawa')).toBeInTheDocument();
    expect(service.saveProta).toHaveBeenCalledTimes(1);
    const [createdHeader, createdItems] = service.saveProta.mock.calls[0];
    expect(createdHeader).toMatchObject({ subject: 'Bahasa Jawa', gradeLevel: 'Kelas 3', weeklyJpQuota: 2, phase: 'B' });
    expect(createdItems.map((i: ProtaItem) => i.learningObjectiveText)).toContain('Aksara Jawa');
    expect(aiService.generateProtaTopicsWithAi).toHaveBeenCalledTimes(1);
    const promesIds = service.savePromes.mock.calls.map(([h]) => `${h.protaId}:${h.semesterNumber}`);
    expect(promesIds).toEqual(
      expect.arrayContaining([`${createdHeader.id}:1`, `${createdHeader.id}:2`])
    );
  });

  it('downloads every Prota of the year in one package', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:paket');
    URL.revokeObjectURL = vi.fn();
    renderPage();
    await screen.findByDisplayValue('Matematika');
    await waitFor(() => expect(service.listProta).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /Unduh Paket/i }));

    await waitFor(() => expect(packageModule.buildPerangkatAjarPackage).toHaveBeenCalledTimes(1));
    const documents = packageModule.buildPerangkatAjarPackage.mock.calls[0][0] as Array<{ identity: { subject: string }; items: unknown[] }>;
    expect(documents.map((d) => d.identity.subject)).toEqual(['Matematika', 'IPAS']);
    expect(documents[1].items).toHaveLength(1);
    expect(service.loadProta).toHaveBeenCalledWith(DOC_B);
  });

  it('falls back to the chapter outline when AI fails during the schedule batch', async () => {
    aiService.generateProtaTopicsWithAi.mockRejectedValue(new Error('offline'));
    renderPage();
    await screen.findByDisplayValue('Matematika');

    fireEvent.click(screen.getByRole('button', { name: /Buat dari Jadwal/i }));
    await screen.findByRole('checkbox', { name: /Bahasa Jawa · Kelas 3/i });
    service.saveProta.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Buat 1 Prota' }));

    expect(await screen.findByDisplayValue('Bahasa Jawa')).toBeInTheDocument();
    expect(service.saveProta.mock.calls[0][1]).toHaveLength(8);
  });

  it('replaces materi with an AI draft and can undo it', async () => {
    aiService.generateProtaTopicsWithAi.mockResolvedValue(AI_TOPICS);
    renderPage();
    await screen.findByDisplayValue('Matematika');
    fireEvent.click(screen.getByRole('button', { name: /2\. Program Tahunan/i }));

    fireEvent.click(screen.getByRole('button', { name: /Susun dengan AI/i }));

    expect(await screen.findByText('Materi diganti draf dari AI.')).toBeInTheDocument();
    expect(lastSavedItems()?.map((i) => i.learningObjectiveCode)).toEqual(['TP 1', 'TP 2', 'TP 3', 'TP 4', 'TP 5']);
    const promesSaved = service.savePromes.mock.calls.map(([, cells]) => cells.reduce((s: number, c: { allocatedJp: number }) => s + c.allocatedJp, 0));
    expect(promesSaved.every((total: number) => total > 0)).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Batalkan' }));
    await waitFor(() => expect(lastSavedItems()?.map((i) => i.learningObjectiveCode)).toEqual(['TP 1', 'TP 2']));
    expect(screen.getAllByLabelText('Hapus TP 2').length).toBeGreaterThan(0);
  });

  it('deletes a Prota, opens the next one, and can bring it back', async () => {
    renderPage();
    await screen.findByDisplayValue('Matematika');
    await waitFor(() => expect(service.listProta).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: 'Hapus dokumen Prota ini' }));

    expect(await screen.findByText(/Prota Matematika · Kelas 4 · 2026\/2027 dihapus\./)).toBeInTheDocument();
    expect(service.deleteProta).toHaveBeenCalledWith(DOC_A);
    expect(await screen.findByDisplayValue('IPAS')).toBeInTheDocument();

    service.saveProta.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Batalkan' }));

    expect(await screen.findByDisplayValue('Matematika')).toBeInTheDocument();
    const [restoredHeader, restoredItems] = service.saveProta.mock.calls[0];
    expect(restoredHeader.id).toBe(DOC_A);
    expect(restoredItems).toHaveLength(2);
  });

  it('offers the school Kaldik and lets an admin publish theirs', async () => {
    const schoolWeeks = getDefaultNationalKaldik('2026/2027').map((w) =>
      w.month === 3 ? { ...w, type: 'LIBUR_NASIONAL' as const } : w
    );
    service.loadSchoolKaldik.mockResolvedValue({ weeks: schoolWeeks, updatedAt: '2026-10-01T00:00:00.000Z' });
    authState.isAdmin = true;
    renderPage();
    await screen.findByDisplayValue('Matematika');

    expect(await screen.findByText(/Sekolah sudah menerbitkan Kaldik 2026\/2027/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pakai Kaldik sekolah' }));

    await waitFor(() => expect(service.saveKaldikWeeks).toHaveBeenCalledWith('2026/2027', schoolWeeks));
    expect(screen.getByText('Kaldik ini sama dengan Kaldik yang diterbitkan sekolah.')).toBeInTheDocument();
    expect(screen.getByText(/Kaldik diganti Kaldik sekolah/)).toBeInTheDocument();
  });

  it('lets an admin publish the Kaldik when the school has none', async () => {
    authState.isAdmin = true;
    renderPage();
    await screen.findByDisplayValue('Matematika');

    fireEvent.click(await screen.findByRole('button', { name: 'Terbitkan untuk semua guru' }));

    await waitFor(() => expect(service.publishSchoolKaldik).toHaveBeenCalledWith('2026/2027', expect.any(Array)));
  });

  it('does not show publishing to teachers', async () => {
    renderPage();
    await screen.findByDisplayValue('Matematika');
    await waitFor(() => expect(service.loadSchoolKaldik).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Terbitkan untuk semua guru' })).not.toBeInTheDocument();
  });

  it('opens Modul Ajar prefilled from a Prota row', async () => {
    renderPage();
    await screen.findByDisplayValue('Matematika');
    fireEvent.click(screen.getByRole('button', { name: /2\. Program Tahunan/i }));

    fireEvent.click(screen.getAllByRole('button', { name: 'Buat Modul Ajar untuk TP 2' })[0]);

    expect(await screen.findByText('Halaman Modul Ajar')).toBeInTheDocument();
    const prefill = JSON.parse(sessionStorage.getItem('guru_cerdas_modul_ajar_prefill_from_prota') ?? '{}');
    expect(prefill).toMatchObject({
      mataPelajaran: 'Matematika',
      kelas: '4',
      fase: 'B',
      topik: 'Uraian TP 2',
      semester: 'Ganjil',
      manualTujuanPembelajaran: 'TP 2 Uraian TP 2',
      jumlahPertemuan: 5,
    });
  });

  it('offers to build from the timetable on the very first visit', async () => {
    service.loadProta.mockResolvedValue({ header: null, items: [] });
    service.listProta.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('Buat Prota dari Jadwal Mengajar')).toBeInTheDocument();
    expect(screen.queryByText('Panduan Cepat Prota & Promes')).not.toBeInTheDocument();
  });

  it('falls back to the Quick Wizard on the first visit without a timetable', async () => {
    service.loadProta.mockResolvedValue({ header: null, items: [] });
    service.listProta.mockResolvedValue([]);
    service.loadTeachingSchedule.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('Panduan Cepat Prota & Promes')).toBeInTheDocument();
  });
});
