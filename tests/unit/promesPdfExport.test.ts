import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportPromesToPdf } from '../../src/utils/promesPdfExport';
import * as dynamicImports from '../../src/utils/dynamicImports';
import * as pdfHeaderUtils from '../../src/utils/pdfHeaderUtils';
import type { DocumentIdentity, ProtaItem, KaldikWeek, MatrixCell } from '../../src/types/perangkatAjar';

describe('exportPromesToPdf - Guaranteed Single Page A4 Landscape with 30-Week Matrix', () => {
  let mockSave: ReturnType<typeof vi.fn>;
  let mockAddPage: ReturnType<typeof vi.fn>;
  let mockText: ReturnType<typeof vi.fn>;
  let mockLine: ReturnType<typeof vi.fn>;
  let mockAutoTable: ReturnType<typeof vi.fn>;

  const mockIdentity: DocumentIdentity = {
    ministryName: 'KEMENTERIAN AGAMA REPUBLIK INDONESIA',
    regionalOffice: 'KANTOR KEMENTERIAN AGAMA KOTA MADIUN',
    schoolName: 'MI AL IRSYAD KOTA MADIUN',
    schoolAddress: 'Jl. Diponegoro No. 112B, Madiun Lor, Kec. Manguharjo, Kota Madiun, Jawa Timur 63122',
    schoolPhone: '(0351) 463765',
    schoolEmail: 'mialirsyadkotamadiun@gmail.com',
    schoolWebsite: 'mialirsyadkotamadiun.sch.id',
    city: 'Madiun',
    signatureDate: '29 September 2026',
    principalRole: 'Kepala Madrasah',
    principalName: 'Qurotul Fitriani, S.Hum, S.Pd, M.Pd.',
    principalNip: '-',
    teacherRole: 'Guru Mata Pelajaran',
    teacherName: 'Bagas Riyadi, S.Pd',
    teacherNip: '-',
    subject: 'Bahasa Indonesia',
    gradeLevel: 'Kelas 3',
    phase: 'Fase B',
    curriculum: 'MERDEKA',
    academicYear: '2026/2027',
    semesterNumber: 1,
    showLogos: true,
  };

  const mockItems: ProtaItem[] = [
    {
      id: 'item-1',
      semesterNumber: 1,
      orderIndex: 1,
      elementOrDomain: 'Menyimak',
      learningObjectiveCode: 'TP 4.1',
      learningObjectiveText: 'Memahami ide pokok dan ide pendukung pada teks informatif lisan',
      coreTopic: 'Bab 1: Ayo, Bermain',
      targetJp: 18,
    },
    {
      id: 'item-2',
      semesterNumber: 1,
      orderIndex: 2,
      elementOrDomain: 'Membaca dan Memirsa',
      learningObjectiveCode: 'TP 4.2',
      learningObjectiveText: 'Membaca nyaring teks narasi dengan intonasi yang tepat',
      coreTopic: 'Bab 2: Teman Terbaik',
      targetJp: 18,
    },
  ];

  const mockKaldikWeeks: KaldikWeek[] = [
    { id: 'kw-1', academicYear: '2026/2027', month: 7, weekNumber: 1, type: 'KBM', label: 'Minggu Efektif' },
    { id: 'kw-2', academicYear: '2026/2027', month: 7, weekNumber: 2, type: 'KBM', label: 'Minggu Efektif' },
  ];

  const mockCells: MatrixCell[] = [
    { rowId: 'item-1', monthIndex: 0, weekNumber: 1, allocatedJp: 4, isLocked: false },
    { rowId: 'item-1', monthIndex: 0, weekNumber: 2, allocatedJp: 4, isLocked: false },
  ];

  beforeEach(() => {
    mockSave = vi.fn();
    mockAddPage = vi.fn();
    mockText = vi.fn();
    mockLine = vi.fn();
    mockAutoTable = vi.fn();

    const mockJsPdfInstance = {
      internal: {
        pageSize: {
          getWidth: () => 297,
          getHeight: () => 210,
        },
      },
      setFontSize: vi.fn(),
      setFont: vi.fn(),
      setTextColor: vi.fn(),
      setDrawColor: vi.fn(),
      setLineWidth: vi.fn(),
      getTextWidth: vi.fn(() => 25),
      text: mockText,
      line: mockLine,
      addPage: mockAddPage,
      save: mockSave,
      lastAutoTable: { finalY: 130 },
    };

    class MockJsPDF {
      constructor() {
        return mockJsPdfInstance;
      }
    }

    vi.spyOn(dynamicImports, 'getJsPDF').mockResolvedValue({ default: MockJsPDF as any } as any);
    vi.spyOn(dynamicImports, 'getAutoTable').mockResolvedValue({ default: mockAutoTable as any } as any);
    vi.spyOn(pdfHeaderUtils, 'ensureLogosLoaded').mockResolvedValue(true);
    vi.spyOn(pdfHeaderUtils, 'addOfficialMadrasahKop').mockReturnValue(27);
  });

  it('renders official Kop, 30-week table without pageBreak, and saves file', async () => {
    await exportPromesToPdf({
      identity: mockIdentity,
      semesterNumber: 1,
      items: mockItems,
      kaldikWeeks: mockKaldikWeeks,
      cells: mockCells,
    });

    expect(pdfHeaderUtils.addOfficialMadrasahKop).toHaveBeenCalled();
    expect(mockAutoTable).toHaveBeenCalled();

    const autoTableOptions = mockAutoTable.mock.calls[0][1];
    expect(autoTableOptions.pageBreak).toBe('avoid');

    // Verify 1-page guarantee (no addPage call)
    expect(mockAddPage).not.toHaveBeenCalled();

    // Verify filename
    expect(mockSave).toHaveBeenCalledWith('Promes_Sem1_Bahasa_Indonesia_Kelas_3.pdf');
  });

  it('draws both Kepala Madrasah and Guru signatures', async () => {
    await exportPromesToPdf({
      identity: mockIdentity,
      semesterNumber: 1,
      items: mockItems,
      kaldikWeeks: mockKaldikWeeks,
      cells: mockCells,
    });

    expect(mockText).toHaveBeenCalledWith('Mengetahui,', expect.any(Number), expect.any(Number));
    expect(mockText).toHaveBeenCalledWith('Qurotul Fitriani, S.Hum, S.Pd, M.Pd.', expect.any(Number), expect.any(Number));
    expect(mockText).toHaveBeenCalledWith('Bagas Riyadi, S.Pd', expect.any(Number), expect.any(Number));
  });
});
