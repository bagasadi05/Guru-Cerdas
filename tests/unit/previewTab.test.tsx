import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PreviewTab } from '../../src/components/pages/perangkat-ajar/PreviewTab';
import type {
  DocumentIdentity,
  ProtaItem,
  ProtaValidationResult,
  KaldikWeek,
  MatrixCell,
} from '../../src/types/perangkatAjar';

// Mock react-to-print
vi.mock('react-to-print', () => ({
  useReactToPrint: vi.fn(() => vi.fn()),
}));

// Mock useToast
vi.mock('../../src/hooks/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  }),
}));

describe('PreviewTab Component - A4 Landscape & Kemenag Kop Configuration', () => {
  const mockIdentity: DocumentIdentity = {
    ministryName: 'KEMENTERIAN AGAMA REPUBLIK INDONESIA',
    regionalOffice: 'KANTOR KEMENTERIAN AGAMA KOTA MADIUN',
    schoolName: 'MI AL IRSYAD KOTA MADIUN',
    schoolAddress: 'Jl. Diponegoro No. 112B, Madiun Lor, Kec. Manguharjo, Kota Madiun, Jawa Timur 63122',
    schoolPhone: '(0351) 463765',
    schoolEmail: 'mialirsyadkotamadiun@gmail.com',
    schoolWebsite: 'mialirsyadkotamadiun.sch.id',
    city: 'Madiun',
    signatureDate: '26 September 2026',
    principalRole: 'Kepala Madrasah',
    principalName: 'H. Masturi, S.Pd.I.',
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
      learningObjectiveCode: 'TP 3.1',
      learningObjectiveText: 'Memahami ide pokok teks lisan',
      coreTopic: 'Bab 1: Kawan Baru',
      targetJp: 18,
    },
    {
      id: 'item-2',
      semesterNumber: 2,
      orderIndex: 2,
      elementOrDomain: 'Membaca',
      learningObjectiveCode: 'TP 3.2',
      learningObjectiveText: 'Membaca kosakata baru dengan lancar',
      coreTopic: 'Bab 5: Bertukar dan Membayar',
      targetJp: 18,
    },
  ];

  const mockValidation: ProtaValidationResult = {
    totalTargetJp: 36,
    allocatedSemester1Jp: 18,
    allocatedSemester2Jp: 18,
    allocatedAnnualJp: 36,
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

  const mockKaldikWeeks: KaldikWeek[] = [
    {
      id: 'kw-1',
      academicYear: '2026/2027',
      month: 7,
      weekNumber: 1,
      type: 'KBM',
      label: 'Minggu Efektif KBM',
    },
    {
      id: 'kw-2',
      academicYear: '2026/2027',
      month: 7,
      weekNumber: 2,
      type: 'KBM',
      label: 'Minggu Efektif KBM',
    },
  ];

  const mockCells: MatrixCell[] = [
    {
      rowId: 'item-1',
      monthIndex: 0,
      weekNumber: 1,
      allocatedJp: 4,
      isLocked: false,
    },
  ];

  it('renders official Kemenag Kop Surat and Madrasah identity with logos', () => {
    render(
      <PreviewTab
        identity={mockIdentity}
        onUpdateIdentity={vi.fn()}
        protaItems={mockProtaItems}
        validation={mockValidation}
        kaldikWeeks={mockKaldikWeeks}
        promesCells={mockCells}
      />
    );

    // Kemenag Ministry and Regional Office
    expect(screen.getByText('KEMENTERIAN AGAMA REPUBLIK INDONESIA')).toBeInTheDocument();
    expect(screen.getByText('KANTOR KEMENTERIAN AGAMA KOTA MADIUN')).toBeInTheDocument();

    // Madrasah Name and Address
    expect(screen.getAllByText('MI AL IRSYAD KOTA MADIUN').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Jl\. Diponegoro No\. 112B/i)).toBeInTheDocument();

    // Logos present
    const logoMadrasah = screen.getByAltText('Logo Madrasah');
    const logoKemenag = screen.getByAltText('Logo Kemenag');
    expect(logoMadrasah).toBeInTheDocument();
    expect(logoKemenag).toBeInTheDocument();

    // Signatures block
    expect(screen.getByText('Kepala Madrasah')).toBeInTheDocument();
    expect(screen.getByText('H. Masturi, S.Pd.I.')).toBeInTheDocument();
    expect(screen.getByText(/26 September 2026/i)).toBeInTheDocument();
    expect(screen.getByText('Bagas Riyadi, S.Pd')).toBeInTheDocument();
  });

  it('renders default document in A4 Landscape mode (297mm width)', () => {
    render(
      <PreviewTab
        identity={mockIdentity}
        onUpdateIdentity={vi.fn()}
        protaItems={mockProtaItems}
        validation={mockValidation}
        kaldikWeeks={mockKaldikWeeks}
        promesCells={mockCells}
      />
    );

    const printableDoc = screen.getByText('PROGRAM TAHUNAN (PROTA)').closest('#printable-document');
    expect(printableDoc).not.toBeNull();
    // In landscape mode, width should be 297mm and minHeight 210mm
    expect(printableDoc?.getAttribute('style')).toContain('297mm');
    expect(printableDoc?.getAttribute('style')).toContain('210mm');

    // Confirm orientation indicator
    expect(screen.getByText(/Format: A4 Landscape/i)).toBeInTheDocument();
  });

  it('allows toggling between A4 Landscape and A4 Portrait', () => {
    render(
      <PreviewTab
        identity={mockIdentity}
        onUpdateIdentity={vi.fn()}
        protaItems={mockProtaItems}
        validation={mockValidation}
        kaldikWeeks={mockKaldikWeeks}
        promesCells={mockCells}
      />
    );

    const portraitBtn = screen.getByRole('button', { name: /A4 Portrait/i });
    fireEvent.click(portraitBtn);

    const printableDoc = screen.getByText('PROGRAM TAHUNAN (PROTA)').closest('#printable-document');
    expect(printableDoc?.getAttribute('style')).toContain('210mm');
    expect(printableDoc?.getAttribute('style')).toContain('297mm');
    expect(screen.getByText(/Format: A4 Portrait/i)).toBeInTheDocument();

    const landscapeBtn = screen.getByRole('button', { name: /A4 Landscape/i });
    fireEvent.click(landscapeBtn);
    expect(printableDoc?.getAttribute('style')).toContain('297mm');
  });

  it('renders complete 30-week monthly distribution grid when Promes tab is active', () => {
    render(
      <PreviewTab
        identity={mockIdentity}
        onUpdateIdentity={vi.fn()}
        protaItems={mockProtaItems}
        validation={mockValidation}
        kaldikWeeks={mockKaldikWeeks}
        promesCells={mockCells}
      />
    );

    const promes1TabBtn = screen.getByRole('button', { name: /Promes Semester 1/i });
    fireEvent.click(promes1TabBtn);

    // Verify Promes Title
    expect(screen.getByText(/PROGRAM SEMESTER \(PROMES\) — SEMESTER 1 \(GANJIL\)/i)).toBeInTheDocument();

    // Verify 6 Month Headers for Semester 1 (Juli, Agustus, September, Oktober, November, Desember)
    expect(screen.getByText('Juli')).toBeInTheDocument();
    expect(screen.getByText('Agustus')).toBeInTheDocument();
    expect(screen.getByText('September')).toBeInTheDocument();
    expect(screen.getByText('Oktober')).toBeInTheDocument();
    expect(screen.getByText('November')).toBeInTheDocument();
    expect(screen.getByText('Desember')).toBeInTheDocument();

    // Verify allocated JP in cell and week headers
    expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(2);

    // Verify summary row
    expect(screen.getByText('JUMLAH ALOKASI JP MINGGUAN')).toBeInTheDocument();
  });

  it('renders all official export action buttons (PDF, Word, Excel, Cetak)', () => {
    render(
      <PreviewTab
        identity={mockIdentity}
        onUpdateIdentity={vi.fn()}
        protaItems={mockProtaItems}
        validation={mockValidation}
        kaldikWeeks={mockKaldikWeeks}
        promesCells={mockCells}
      />
    );

    expect(screen.getByRole('button', { name: /Unduh PDF/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unduh Word/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Unduh Excel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Cetak$/i })).toBeInTheDocument();
  });
});
