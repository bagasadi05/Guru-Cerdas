import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrankasHeader } from '../../src/components/pages/brankas/components/BrankasHeader';
import { BrankasClassCard } from '../../src/components/pages/brankas/components/BrankasClassCard';
import { BrankasClassGrid } from '../../src/components/pages/brankas/components/BrankasClassGrid';
import { BrankasModals } from '../../src/components/pages/brankas/components/BrankasModals';
import { ClassItem } from '../../src/components/pages/brankas/types';

describe('Brankas Components Decomposition', () => {
  const mockClass: ClassItem = {
    id: 'cls-1',
    name: '7A',
    academic_year: '2025/2026',
    grade_level: 7,
    is_archived: false,
    user_id: 'usr-1',
    created_at: new Date().toISOString(),
  };

  it('renders BrankasHeader with correct counts', () => {
    render(
      <BrankasHeader
        activeCount={5}
        archivedCount={2}
        totalArchivedStudents={45}
      />
    );

    expect(screen.getByText('Brankas Kelas')).toBeInTheDocument();
    expect(screen.getByText(/5 kelas aktif/i)).toBeInTheDocument();
    expect(screen.getByText(/2 di brankas/i)).toBeInTheDocument();
    expect(screen.getByText(/45 siswa diarsipkan/i)).toBeInTheDocument();
  });

  it('renders BrankasClassCard in active mode with archive button', () => {
    const onArchive = vi.fn();
    render(
      <BrankasClassCard
        cls={mockClass}
        studentCount={30}
        academicYearLabel="2025/2026"
        onOpenDetail={() => {}}
        onConfirmRestore={() => {}}
        onConfirmArchive={onArchive}
      />
    );

    expect(screen.getByText('Kelas 7A')).toBeInTheDocument();
    expect(screen.getByText('Tingkat 7')).toBeInTheDocument();
    expect(screen.getByText('30 siswa')).toBeInTheDocument();
    expect(screen.getByText('Aktif')).toBeInTheDocument();

    const archiveBtn = screen.getByRole('button', { name: /simpan di brankas/i });
    fireEvent.click(archiveBtn);
    expect(onArchive).toHaveBeenCalledWith(mockClass);
  });

  it('renders BrankasClassCard in archived mode with detail and restore buttons', () => {
    const onDetail = vi.fn();
    const onRestore = vi.fn();
    const archivedClass = { ...mockClass, is_archived: true };

    render(
      <BrankasClassCard
        cls={archivedClass}
        studentCount={28}
        academicYearLabel="2024/2025"
        onOpenDetail={onDetail}
        onConfirmRestore={onRestore}
        onConfirmArchive={() => {}}
      />
    );

    expect(screen.getByText('Terarsip')).toBeInTheDocument();
    const detailBtn = screen.getByRole('button', { name: /buka arsip/i });
    fireEvent.click(detailBtn);
    expect(onDetail).toHaveBeenCalledWith(archivedClass);

    const restoreBtn = screen.getByRole('button', { name: /pulihkan kelas ke dashboard/i });
    fireEvent.click(restoreBtn);
    expect(onRestore).toHaveBeenCalledWith(archivedClass);
  });

  it('handles tab switching and search input in BrankasClassGrid', () => {
    const onTabSwitch = vi.fn();
    const onSearchChange = vi.fn();

    render(
      <BrankasClassGrid
        activeTab="active"
        onTabSwitch={onTabSwitch}
        activeCount={3}
        archivedCount={1}
        searchQuery=""
        onSearchChange={onSearchChange}
        displayedClasses={[mockClass]}
        studentCountMap={{ 'cls-1': 30 }}
        getAcademicYearLabel={() => '2025/2026'}
        onOpenDetail={() => {}}
        onConfirmRestore={() => {}}
        onConfirmArchive={() => {}}
      />
    );

    const searchInput = screen.getByLabelText(/cari kelas di brankas/i);
    fireEvent.change(searchInput, { target: { value: '7B' } });
    expect(onSearchChange).toHaveBeenCalledWith('7B');

    const archivedTabBtn = screen.getByRole('button', { name: /brankas arsip/i });
    fireEvent.click(archivedTabBtn);
    expect(onTabSwitch).toHaveBeenCalledWith('archived');
  });

  it('requires typing "ARSIP" before enabling archive action in BrankasModals', () => {
    const onArchive = vi.fn();
    const onConfirmTextChange = vi.fn();

    const { rerender } = render(
      <BrankasModals
        confirmArchiveClass={mockClass}
        onCloseArchiveModal={() => {}}
        confirmText=""
        onConfirmTextChange={onConfirmTextChange}
        onArchive={onArchive}
        isArchivePending={false}
        confirmRestoreClass={null}
        onCloseRestoreModal={() => {}}
        onRestore={() => {}}
        isRestorePending={false}
      />
    );

    expect(screen.getByText('Simpan Kelas di Brankas?')).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: /ya, masukkan brankas/i });
    expect(confirmBtn).toBeDisabled();

    // Rerender with "ARSIP" filled
    rerender(
      <BrankasModals
        confirmArchiveClass={mockClass}
        onCloseArchiveModal={() => {}}
        confirmText="ARSIP"
        onConfirmTextChange={onConfirmTextChange}
        onArchive={onArchive}
        isArchivePending={false}
        confirmRestoreClass={null}
        onCloseRestoreModal={() => {}}
        onRestore={() => {}}
        isRestorePending={false}
      />
    );

    expect(confirmBtn).not.toBeDisabled();
    fireEvent.click(confirmBtn);
    expect(onArchive).toHaveBeenCalled();
  });
});
