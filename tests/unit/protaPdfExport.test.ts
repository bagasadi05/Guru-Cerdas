import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportProtaToPdf } from '../../src/utils/protaPdfExport';
import * as dynamicImports from '../../src/utils/dynamicImports';
import * as pdfHeaderUtils from '../../src/utils/pdfHeaderUtils';
import type { DocumentIdentity, ProtaItem, ProtaValidationResult } from '../../src/types/perangkatAjar';

describe('exportProtaToPdf - Guaranteed Single Page A4 Landscape', () => {
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

  const mockProtaItems: ProtaItem[] = [
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
      semesterNumber: 2,
      orderIndex: 2,
      elementOrDomain: 'Menulis',
      learningObjectiveCode: 'TP 4.8',
      learningObjectiveText: 'Menulis surat pribadi dengan struktur yang benar',
      coreTopic: 'Bab 8: Sahabat dari Jauh',
      targetJp: 22,
    },
  ];

  const mockValidation: ProtaValidationResult = {
    totalTargetJp: 40,
    allocatedSemester1Jp: 18,
    allocatedSemester2Jp: 22,
    allocatedAnnualJp: 40,
    diffSemester1: 0,
    diffSemester2: 0,
    diffAnnual: 0,
    statusSemester1: 'PAS',
    statusSemester2: 'PAS',
    statusAnnual: 'PAS',
    deficitJpSemester1: 0,
    surplusJpSemester1: 0,
    deficitJpSemester2: 0,
    surplusJpSemester2: 0,
  };

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
      lastAutoTable: { finalY: 125 },
    };

    class MockJsPDF {
      constructor() {
        return mockJsPdfInstance;
      }
    }

    vi.spyOn(dynamicImports, 'getJsPDF').mockResolvedValue({ default: MockJsPDF as any } as any);
    vi.spyOn(dynamicImports, 'getAutoTable').mockResolvedValue({ default: mockAutoTable as any } as any);
    vi.spyOn(pdfHeaderUtils, 'ensureLogosLoaded').mockResolvedValue(true);
    vi.spyOn(pdfHeaderUtils, 'addOfficialMadrasahKop').mockReturnValue(28);
  });

  it('uses addOfficialMadrasahKop and renders table without page break', async () => {
    await exportProtaToPdf({
      identity: mockIdentity,
      protaItems: mockProtaItems,
      validation: mockValidation,
    });

    expect(pdfHeaderUtils.addOfficialMadrasahKop).toHaveBeenCalled();
    expect(mockAutoTable).toHaveBeenCalled();

    // Verify autoTable uses pageBreak: 'avoid'
    const autoTableOptions = mockAutoTable.mock.calls[0][1];
    expect(autoTableOptions.pageBreak).toBe('avoid');

    // Verify signatures are kept on page 1 (addPage should NOT be called!)
    expect(mockAddPage).not.toHaveBeenCalled();

    // Verify PDF is saved with correct filename
    expect(mockSave).toHaveBeenCalledWith('Prota_Bahasa_Indonesia_Kelas_3.pdf');
  });

  it('draws both Kepala Madrasah and Guru signatures with underline', async () => {
    await exportProtaToPdf({
      identity: mockIdentity,
      protaItems: mockProtaItems,
      validation: mockValidation,
    });

    // Check that principal name and teacher name were rendered
    expect(mockText).toHaveBeenCalledWith('Mengetahui,', expect.any(Number), expect.any(Number));
    expect(mockText).toHaveBeenCalledWith(
      'Qurotul Fitriani, S.Hum, S.Pd, M.Pd.',
      expect.any(Number),
      expect.any(Number)
    );
    expect(mockText).toHaveBeenCalledWith('Bagas Riyadi, S.Pd', expect.any(Number), expect.any(Number));
  });
});
