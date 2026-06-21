import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportJournalsToExcel, exportJournalsToPDF } from '../../src/services/journalExport';
import { getXLSX, getJsPDF, getAutoTable } from '../../src/utils/dynamicImports';
import type { TeachingJournal, TeachingJournalRekap } from '../../src/types/teachingJournal';

const mockJournals: TeachingJournal[] = [
  {
    id: 'j-1',
    user_id: 'user-1',
    class_id: 'class-1',
    subject: 'Fisika',
    date: '2026-06-21',
    meeting_number: 2,
    topic: 'Termodinamika',
    objectives: 'Memahami hukum kekekalan energi',
    activities: 'Membaca materi dan mengerjakan soal latihan',
    notes: 'Berjalan lancar',
    attachment_url: 'https://supabase.test/student_assets/teaching_journals/doc.pdf',
    created_at: '2026-06-21T00:00:00Z',
    updated_at: '2026-06-21T00:00:00Z'
  }
];

const mockRekap: TeachingJournalRekap[] = [
  {
    classId: 'class-1',
    className: 'Kelas 4A',
    subject: 'Fisika',
    totalMeetings: 2,
    journalsFilled: 2,
    lastJournalDate: '2026-06-21'
  }
];

vi.mock('../../src/services/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [{ id: 'class-1', name: 'Kelas 4A' }], error: null })
    }))
  }
}));

vi.mock('../../src/utils/dynamicImports', () => {
  const mockXLSXObj = {
    utils: {
      book_new: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
      book_append_sheet: vi.fn(),
      aoa_to_sheet: vi.fn(() => ({})),
    },
    writeFile: vi.fn().mockResolvedValue(undefined),
  };

  const mockJsPDFInstanceObj = {
    internal: {
      pageSize: {
        getWidth: vi.fn(() => 210),
        getHeight: vi.fn(() => 297),
      },
    },
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    setLineWidth: vi.fn(),
    setTextColor: vi.fn(),
    addPage: vi.fn(),
    getNumberOfPages: vi.fn(() => 1),
    save: vi.fn(),
  };

  const mockJsPDFObj = vi.fn().mockImplementation(function (this: any) {
    return mockJsPDFInstanceObj;
  });
  const mockAutoTableObj = vi.fn();

  return {
    getXLSX: vi.fn().mockResolvedValue(mockXLSXObj),
    getJsPDF: vi.fn().mockResolvedValue({ default: mockJsPDFObj }),
    getAutoTable: vi.fn().mockResolvedValue({ default: mockAutoTableObj }),
  };
});

vi.mock('../../src/utils/pdfHeaderUtils', () => ({
  addPdfHeader: vi.fn(() => 50),
  ensureLogosLoaded: vi.fn().mockResolvedValue(true),
}));

describe('Journal Export Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exportJournalsToExcel calls XLSX utilities and writeFile', async () => {
    await exportJournalsToExcel({
      journals: mockJournals,
      rekap: mockRekap,
      schoolName: 'MI AL IRSYAD KOTA MADIUN',
      teacherName: 'Guru Budi',
      startDate: '2026-06-01',
      endDate: '2026-06-30'
    });

    const XLSX = await getXLSX();
    expect(XLSX.utils.book_new).toHaveBeenCalled();
    expect(XLSX.writeFile).toHaveBeenCalled();
  });

  it('exportJournalsToPDF calls jsPDF save and autoTable', async () => {
    await exportJournalsToPDF({
      journals: mockJournals,
      schoolName: 'MI AL IRSYAD KOTA MADIUN',
      teacherName: 'Guru Budi',
      startDate: '2026-06-01',
      endDate: '2026-06-30'
    });

    const { default: jsPDFMock } = await getJsPDF();
    const { default: autoTableMock } = await getAutoTable();
    const docInstance = (jsPDFMock as any).mock.results[0].value;

    expect(jsPDFMock).toHaveBeenCalled();
    expect(autoTableMock).toHaveBeenCalled();
    expect(docInstance.save).toHaveBeenCalled();
  });
});
