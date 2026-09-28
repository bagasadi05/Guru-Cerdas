import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PromesTab } from '../../src/components/pages/perangkat-ajar/PromesTab';
import { ProtaTab } from '../../src/components/pages/perangkat-ajar/ProtaTab';
import type { ProtaItem, KaldikWeek, MatrixCell, RmeSummary, ProtaValidationResult } from '../../src/types/perangkatAjar';

describe('PromesTab Component UX Enhancements', () => {
  const mockProtaItems: ProtaItem[] = [
    {
      id: 'tp-1',
      semesterNumber: 1,
      elementOrDomain: 'Menyimak',
      learningObjectiveCode: 'TP 1.1',
      learningObjectiveText: 'Memahami teks lisan',
      coreTopic: 'Teks Informasi',
      targetJp: 8,
      orderIndex: 0,
    },
    {
      id: 'tp-2',
      semesterNumber: 1,
      elementOrDomain: 'Membaca',
      learningObjectiveCode: 'TP 1.2',
      learningObjectiveText: 'Membaca teks cerita',
      coreTopic: 'Cerita Rakyat',
      targetJp: 12,
      orderIndex: 1,
    },
  ];

  const mockSemesterWeeks: KaldikWeek[] = [];
  for (let m = 7; m <= 12; m++) {
    for (let w = 1; w <= 5; w++) {
      mockSemesterWeeks.push({
        month: m,
        weekNumber: w,
        type: 'KBM',
      });
    }
  }

  const mockCells: MatrixCell[] = [
    { rowId: 'tp-1', monthIndex: 0, weekNumber: 1, allocatedJp: 4, isLocked: false },
    { rowId: 'tp-1', monthIndex: 0, weekNumber: 2, allocatedJp: 4, isLocked: false },
  ];

  it('renders all month filter buttons and defaults to 30 weeks view', () => {
    render(
      <PromesTab
        protaItems={mockProtaItems}
        semesterWeeks={mockSemesterWeeks}
        semesterNumber={1}
        onChangeSemester={vi.fn()}
        weeklyJpLimit={4}
        onChangeWeeklyJpLimit={vi.fn()}
        cells={mockCells}
        onUpdateCell={vi.fn()}
        onAutoDistribute={vi.fn()}
        onResetMatrix={vi.fn()}
      />
    );

    expect(screen.getByText('Semua Bulan (30 Pekan)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Juli$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Agustus$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Desember$/i })).toBeInTheDocument();
  });

  it('filters table to single month view when a month button is clicked', () => {
    render(
      <PromesTab
        protaItems={mockProtaItems}
        semesterWeeks={mockSemesterWeeks}
        semesterNumber={1}
        onChangeSemester={vi.fn()}
        weeklyJpLimit={4}
        onChangeWeeklyJpLimit={vi.fn()}
        cells={mockCells}
        onUpdateCell={vi.fn()}
        onAutoDistribute={vi.fn()}
        onResetMatrix={vi.fn()}
      />
    );

    // Switch to Agustus (monthIndex 1)
    const agustusBtn = screen.getByRole('button', { name: /^Agustus$/i });
    fireEvent.click(agustusBtn);

    expect(screen.getByText('Bulan Agustus (5 Pekan)')).toBeInTheDocument();
    expect(screen.getByTitle('Bulan Sebelumnya')).toBeInTheDocument();
    expect(screen.getByTitle('Bulan Berikutnya')).toBeInTheDocument();
  });

  it('opens quick picker on cell click and updates value on chip tap', () => {
    const onUpdateCell = vi.fn();

    render(
      <PromesTab
        protaItems={mockProtaItems}
        semesterWeeks={mockSemesterWeeks}
        semesterNumber={1}
        onChangeSemester={vi.fn()}
        weeklyJpLimit={4}
        onChangeWeeklyJpLimit={vi.fn()}
        cells={mockCells}
        onUpdateCell={onUpdateCell}
        onAutoDistribute={vi.fn()}
        onResetMatrix={vi.fn()}
      />
    );

    // Click on week 1 input of tp-1
    const weekInput = screen.getByLabelText(/Pekan 1 Juli - TP 1.1/i);
    fireEvent.click(weekInput);

    // Stepper & quick chips popover should appear
    expect(screen.getByText(/Maks 4 JP/i)).toBeInTheDocument();
    const plusButton = screen.getByRole('button', { name: 'Tambah 1 JP' });
    expect(plusButton).toBeInTheDocument();

    fireEvent.click(plusButton);
    expect(onUpdateCell).toHaveBeenCalledWith('tp-1', 0, 1, 4); // existing 4 reaches max 4

    // Quick chip button
    const chip2 = screen.getByRole('button', { name: '2' });
    fireEvent.click(chip2);
    expect(onUpdateCell).toHaveBeenCalledWith('tp-1', 0, 1, 2);
  });
});

describe('ProtaTab Component UX Enhancements', () => {
  const mockProtaItems: ProtaItem[] = [
    {
      id: 'tp-1',
      semesterNumber: 1,
      elementOrDomain: 'Menyimak',
      learningObjectiveCode: 'TP 1.1',
      learningObjectiveText: 'Memahami teks lisan',
      coreTopic: 'Teks Informasi',
      targetJp: 18,
      orderIndex: 0,
    },
    {
      id: 'tp-2',
      semesterNumber: 1,
      elementOrDomain: 'Membaca',
      learningObjectiveCode: 'TP 1.2',
      learningObjectiveText: 'Membaca teks naratif',
      coreTopic: 'Cerita Rakyat',
      targetJp: 18,
      orderIndex: 1,
    },
  ];

  const mockRme: RmeSummary = {
    semesterNumber: 1,
    totalWeeks: 30,
    effectiveWeeks: 18,
    nonEffectiveWeeks: 12,
    nonEffectiveBreakdown: {
      KBM: 18,
      MPLS: 1,
      STS: 1,
      SAS: 1,
      RAPOR: 1,
      LIBUR_SEMESTER: 4,
      LIBUR_NASIONAL: 2,
      KEGIATAN_KHUSUS: 2,
      NON_ACTIVE: 0,
    },
    weeklyJpQuota: 4,
    totalAvailableJp: 72,
    reserveJp: 0,
    netTeachingJp: 72,
  };

  const mockValidation: ProtaValidationResult = {
    allocatedSemester1Jp: 36,
    allocatedSemester2Jp: 0,
    allocatedAnnualJp: 36,
    totalTargetJp: 144,
    statusSemester1: 'DEFISIT',
    statusSemester2: 'DEFISIT',
    statusAnnual: 'DEFISIT',
    diffSemester1: -36,
    diffSemester2: -72,
    diffAnnual: -108,
    deficitJpSemester1: 36,
    surplusJpSemester1: 0,
    deficitJpSemester2: 72,
    surplusJpSemester2: 0,
  };

  it('triggers onMoveItem when reorder arrows are clicked', () => {
    const onMoveItem = vi.fn();
    const onSwapSemester = vi.fn();

    render(
      <ProtaTab
        items={mockProtaItems}
        onAddItem={vi.fn()}
        onUpdateItem={vi.fn()}
        onDeleteItem={vi.fn()}
        onMoveItem={onMoveItem}
        onSwapSemester={onSwapSemester}
        onLoadSampleData={vi.fn()}
        curriculum="MERDEKA"
        onChangeCurriculum={vi.fn()}
        validation={mockValidation}
        rmeSem1={mockRme}
        rmeSem2={mockRme}
      />
    );

    // Find move down button on first item
    const moveDownButtons = screen.getAllByTitle('Pindah urutan ke bawah');
    expect(moveDownButtons.length).toBeGreaterThan(0);
    fireEvent.click(moveDownButtons[0]);

    expect(onMoveItem).toHaveBeenCalledWith('tp-1', 'down');
  });

  it('triggers onSwapSemester when quick swap button is clicked', () => {
    const onSwapSemester = vi.fn();

    render(
      <ProtaTab
        items={mockProtaItems}
        onAddItem={vi.fn()}
        onUpdateItem={vi.fn()}
        onDeleteItem={vi.fn()}
        onMoveItem={vi.fn()}
        onSwapSemester={onSwapSemester}
        onLoadSampleData={vi.fn()}
        curriculum="MERDEKA"
        onChangeCurriculum={vi.fn()}
        validation={mockValidation}
        rmeSem1={mockRme}
        rmeSem2={mockRme}
      />
    );

    // Swap semester button
    const swapButtons = screen.getAllByTitle(/Pindah ke Semester 2/i);
    expect(swapButtons.length).toBeGreaterThan(0);
    fireEvent.click(swapButtons[0]);

    expect(onSwapSemester).toHaveBeenCalledWith('tp-1');
  });
});
