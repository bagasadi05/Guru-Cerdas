import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ProtaPromesWizardModal,
  type WizardApplyData,
} from '../../src/components/pages/perangkat-ajar/ProtaPromesWizardModal';

describe('ProtaPromesWizardModal', () => {
  it('does not render when isOpen is false', () => {
    render(
      <ProtaPromesWizardModal
        isOpen={false}
        onClose={vi.fn()}
        onApply={vi.fn()}
      />
    );

    expect(screen.queryByText(/Panduan Cepat Prota & Promes/i)).not.toBeInTheDocument();
  });

  it('renders step 1 with default values and allows advancing steps', () => {
    const handleClose = vi.fn();
    const handleApply = vi.fn();

    render(
      <ProtaPromesWizardModal
        isOpen={true}
        onClose={handleClose}
        onApply={handleApply}
        initialAcademicYear="2024/2025"
        initialSubject="Bahasa Indonesia"
        initialGradeLevel="Kelas 4"
      />
    );

    // Modal title & steps
    expect(screen.getByText(/Panduan Cepat Prota & Promes/i)).toBeInTheDocument();
    expect(screen.getByText(/Identitas & Mapel/i)).toBeInTheDocument();
    expect(screen.getByText(/Jam & Kaldik/i)).toBeInTheDocument();
    expect(screen.getByText(/Materi \(TP\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Ringkasan & Terapkan/i)).toBeInTheDocument();

    // Check step 1 content
    expect(screen.getByText(/1\. Pilih Tingkat Kelas/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Pilih Mata Pelajaran/i)).toBeInTheDocument();

    // Select Matematika chip
    const mathChip = screen.getByRole('button', { name: /^Matematika$/i });
    fireEvent.click(mathChip);

    // Advance to Step 2
    const nextBtn = screen.getByRole('button', { name: /Lanjut ke Langkah 2/i });
    fireEvent.click(nextBtn);

    // Check Step 2 content
    expect(screen.getByText(/1\. Beban Mengajar/i)).toBeInTheDocument();
    expect(screen.getByText(/Preset Kalender Pendidikan Nasional/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Pekan Efektif KBM/i).length).toBe(2);

    // Advance to Step 3
    const nextBtn2 = screen.getByRole('button', { name: /Lanjut ke Langkah 3/i });
    fireEvent.click(nextBtn2);

    // Check Step 3 content
    expect(screen.getByText(/Paket Silabus Resmi \(Standar Nasional\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Bagi Rata Berdasarkan Jumlah Bab/i)).toBeInTheDocument();
    expect(screen.getByText(/Pratinjau Materi yang Akan Dibuat/i)).toBeInTheDocument();

    // Advance to Step 4
    const nextBtn3 = screen.getByRole('button', { name: /Lanjut ke Langkah 4/i });
    fireEvent.click(nextBtn3);

    // Check Step 4 content
    expect(screen.getByText(/Perangkat Ajar Siap Diterapkan!/i)).toBeInTheDocument();
    expect(screen.getByText(/SEMESTER 1 \(GANJIL\)/i)).toBeInTheDocument();
    expect(screen.getByText(/SEMESTER 2 \(GENAP\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Matriks Program Semester \(Promes\) Otomatis Terisi/i)).toBeInTheDocument();

    // Apply button
    const applyBtn = screen.getByRole('button', { name: /✨ Terapkan & Buka Dokumen/i });
    fireEvent.click(applyBtn);

    expect(handleApply).toHaveBeenCalledTimes(1);
    const appliedData: WizardApplyData = handleApply.mock.calls[0][0];
    expect(appliedData.subject).toBe('Matematika');
    expect(appliedData.gradeLevel).toBe('Kelas 4');
    expect(appliedData.phase).toBe('B');
    expect(appliedData.curriculum).toBe('MERDEKA');
    expect(appliedData.protaItems.length).toBeGreaterThan(0);
    expect(appliedData.promesCellsSem1.length).toBeGreaterThan(0);
    expect(appliedData.promesCellsSem2.length).toBeGreaterThan(0);
    expect(appliedData.weeks.length).toBe(60); // 12 months * 5 weeks

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('allows navigating backwards using the Sebelumnya button', () => {
    render(
      <ProtaPromesWizardModal
        isOpen={true}
        onClose={vi.fn()}
        onApply={vi.fn()}
      />
    );

    // Move to Step 2
    fireEvent.click(screen.getByRole('button', { name: /Lanjut ke Langkah 2/i }));
    expect(screen.getByText(/1\. Beban Mengajar/i)).toBeInTheDocument();

    // Click Sebelumnya to go back to Step 1
    const prevBtn = screen.getByRole('button', { name: /Sebelumnya/i });
    fireEvent.click(prevBtn);

    expect(screen.getByText(/1\. Pilih Tingkat Kelas/i)).toBeInTheDocument();
  });

  it('handles custom subject input and "Bagi Rata" distribution', () => {
    const handleApply = vi.fn();

    render(
      <ProtaPromesWizardModal
        isOpen={true}
        onClose={vi.fn()}
        onApply={handleApply}
      />
    );

    // Enter custom subject
    const customInput = screen.getByPlaceholderText(/Bahasa Jawa \/ Seni Musik/i);
    fireEvent.change(customInput, { target: { value: 'Bahasa Jawa' } });

    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole('button', { name: /Lanjut ke Langkah 2/i }));

    // Change weekly JP to 2
    const jp2Btn = screen.getByRole('button', { name: /^2 JP \/ Minggu$/i });
    fireEvent.click(jp2Btn);

    // Step 2 -> Step 3
    fireEvent.click(screen.getByRole('button', { name: /Lanjut ke Langkah 3/i }));

    // Choose "Bagi Rata"
    const divideMethodBtn = screen.getByRole('button', { name: /Bagi Rata Berdasarkan Jumlah Bab/i });
    fireEvent.click(divideMethodBtn);

    expect(screen.getByText(/Berapa bab \/ lingkup materi yang diajarkan\?/i)).toBeInTheDocument();

    // Step 3 -> Step 4
    fireEvent.click(screen.getByRole('button', { name: /Lanjut ke Langkah 4/i }));

    // Apply
    fireEvent.click(screen.getByRole('button', { name: /✨ Terapkan & Buka Dokumen/i }));

    expect(handleApply).toHaveBeenCalledTimes(1);
    const appliedData: WizardApplyData = handleApply.mock.calls[0][0];
    expect(appliedData.subject).toBe('Bahasa Jawa');
    expect(appliedData.weeklyJpQuota).toBe(2);
    expect(appliedData.protaItems.length).toBe(8); // 4 chapters Sem 1 + 4 chapters Sem 2
  });

  it('calls onClose when close icon (X) is clicked', () => {
    const handleClose = vi.fn();

    render(
      <ProtaPromesWizardModal
        isOpen={true}
        onClose={handleClose}
        onApply={vi.fn()}
      />
    );

    const closeBtn = screen.getByTitle(/Tutup Panduan/i);
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape key press and locks body scroll', () => {
    const handleClose = vi.fn();

    const { unmount } = render(
      <ProtaPromesWizardModal
        isOpen={true}
        onClose={handleClose}
        onApply={vi.fn()}
      />
    );

    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);

    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('calls onClose when clicking outside modal on backdrop', () => {
    const handleClose = vi.fn();

    render(
      <ProtaPromesWizardModal
        isOpen={true}
        onClose={handleClose}
        onApply={vi.fn()}
      />
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
