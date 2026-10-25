import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ProtaValidationSummary,
  ProtaToolbar,
  ProtaItemFormDrawer,
  ProtaItemsView,
} from '../../src/components/pages/perangkat-ajar/components/prota';
import type {
  ProtaItem,
  ProtaValidationResult,
  RmeSummary,
} from '../../src/types/perangkatAjar';
import type { ProtaBadgeProps } from '../../src/utils/protaEngine';

describe('ProtaTab Modular Components', () => {
  const mockValidation: ProtaValidationResult = {
    allocatedSemester1Jp: 36,
    allocatedSemester2Jp: 36,
    allocatedAnnualJp: 72,
    totalTargetJp: 72,
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

  const mockRme: RmeSummary = {
    semesterNumber: 1,
    totalWeeks: 20,
    effectiveWeeks: 18,
    nonEffectiveWeeks: 2,
    nonEffectiveBreakdown: {
      KBM: 18,
      MPLS: 1,
      STS: 0,
      SAS: 0,
      RAPOR: 0,
      LIBUR_SEMESTER: 1,
      LIBUR_NASIONAL: 0,
      KEGIATAN_KHUSUS: 0,
      NON_ACTIVE: 0,
    },
    weeklyJpQuota: 2,
    totalAvailableJp: 36,
    reserveJp: 0,
    netTeachingJp: 36,
  };

  const sampleItems: ProtaItem[] = [
    {
      id: 'item-1',
      semesterNumber: 1,
      elementOrDomain: 'Bilangan',
      learningObjectiveCode: 'TP 1.1',
      learningObjectiveText: 'Memahami bilangan cacah sampai 1.000',
      coreTopic: 'Bilangan Cacah',
      targetJp: 18,
      orderIndex: 0,
    },
    {
      id: 'item-2',
      semesterNumber: 2,
      elementOrDomain: 'Geometri',
      learningObjectiveCode: 'TP 2.1',
      learningObjectiveText: 'Mengenal berbagai bangun datar',
      coreTopic: 'Bangun Datar',
      targetJp: 18,
      orderIndex: 0,
    },
  ];

  it('renders ProtaValidationSummary correctly when balanced', () => {
    const badgeProps: ProtaBadgeProps = {
      status: 'PAS',
      badgeClass: 'bg-emerald-100 text-emerald-800',
      diffText: 'Pas (0 JP)',
      label: 'Sesuai Kaldik',
      iconName: 'CheckCircle',
    };

    render(
      <ProtaValidationSummary
        validation={mockValidation}
        rmeSem1={mockRme}
        rmeSem2={mockRme}
        sem1Badge={badgeProps}
        sem2Badge={badgeProps}
        annualBadge={badgeProps}
        hasDiscrepancy={false}
        isDeficit={false}
        discrepancyTitle=""
        discrepancyDesc=""
      />
    );

    expect(screen.getByText('Semester 1 (Ganjil)')).toBeInTheDocument();
    expect(screen.getByText('Semester 2 (Genap)')).toBeInTheDocument();
    expect(screen.getByText('Total Tahunan (Prota)')).toBeInTheDocument();
  });

  it('renders ProtaToolbar and handles curriculum toggle and quick wizard', () => {
    const onChangeCurriculum = vi.fn();
    const onOpenWizard = vi.fn();
    const onToggleAdding = vi.fn();

    render(
      <ProtaToolbar
        curriculum="MERDEKA"
        onChangeCurriculum={onChangeCurriculum}
        itemsCount={2}
        hasDiscrepancy={false}
        onOpenWizard={onOpenWizard}
        onToggleAdding={onToggleAdding}
      />
    );

    // Click K13 curriculum toggle
    fireEvent.click(screen.getByText('Kurikulum 2013 (KI/KD)'));
    expect(onChangeCurriculum).toHaveBeenCalledWith('K13');

    // Click Panduan Cepat button
    fireEvent.click(screen.getByTitle('Buka panduan cepat pembuatan Prota & Promes'));
    expect(onOpenWizard).toHaveBeenCalled();

    // Click Tambah Materi button
    fireEvent.click(screen.getByText(/Tambah Materi/i));
    expect(onToggleAdding).toHaveBeenCalled();
  });

  it('renders ProtaItemFormDrawer and handles form interaction', () => {
    const onSubmit = vi.fn((e) => e.preventDefault());
    const onCancel = vi.fn();
    const setFormData = vi.fn();

    const formData = {
      semesterNumber: 1 as const,
      elementOrDomain: 'Aljabar',
      learningObjectiveCode: 'TP 3.1',
      learningObjectiveText: 'Memahami pola bilangan sederhana',
      coreTopic: 'Pola Bilangan',
      targetJp: 6,
    };

    render(
      <ProtaItemFormDrawer
        isAdding={true}
        editingId={null}
        curriculum="MERDEKA"
        formData={formData}
        setFormData={setFormData}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('Tambah Materi Pelajaran Baru')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Memahami pola bilangan sederhana')).toBeInTheDocument();

    fireEvent.click(screen.getAllByText('Batal')[0]);
    expect(onCancel).toHaveBeenCalled();
  });

  it('renders ProtaItemsView with filter tabs and item actions', () => {
    const onMoveItem = vi.fn();
    const onSwapSemester = vi.fn();
    const onStartEdit = vi.fn();
    const onDeleteItem = vi.fn();
    const setActiveSemFilter = vi.fn();

    render(
      <ProtaItemsView
        items={sampleItems}
        filteredItems={sampleItems}
        activeSemFilter="ALL"
        setActiveSemFilter={setActiveSemFilter}
        curriculum="MERDEKA"
        isFirstInSemester={() => true}
        isLastInSemester={() => true}
        onMoveItem={onMoveItem}
        onSwapSemester={onSwapSemester}
        onStartEdit={onStartEdit}
        onDeleteItem={onDeleteItem}
      />
    );

    expect(screen.getByText('Semua (2)')).toBeInTheDocument();
    expect(screen.getByText('36 JP')).toBeInTheDocument(); // total 18 + 18 = 36 JP

    // Switch tab to Sem 1
    fireEvent.click(screen.getByText(/Semester 1/i));
    expect(setActiveSemFilter).toHaveBeenCalledWith(1);
  });
});
