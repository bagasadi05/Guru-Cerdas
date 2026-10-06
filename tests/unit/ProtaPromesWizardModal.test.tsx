import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ProtaPromesWizardModal,
  type WizardApplyData,
} from '../../src/components/pages/perangkat-ajar/ProtaPromesWizardModal';
import { getDefaultNationalKaldik } from '../../src/data/defaultKaldikPresets';

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

const baseProps = {
  onClose: vi.fn(),
  onApply: vi.fn(),
  initialAcademicYear: '2026/2027',
  currentWeeks: getDefaultNationalKaldik('2026/2027'),
  hasExistingData: false,
};

const goToStep = (step: 2 | 3 | 4) => {
  for (let next = 2; next <= step; next++) {
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`Lanjut ke Langkah ${next}`, 'i') }));
  }
};

const goToStep4FromStep3 = () =>
  fireEvent.click(screen.getByRole('button', { name: /Lanjut ke Langkah 4/i }));

describe('ProtaPromesWizardModal', () => {
  it('does not render when isOpen is false', () => {
    render(<ProtaPromesWizardModal {...baseProps} isOpen={false} />);

    expect(screen.queryByText(/Panduan Cepat Prota & Promes/i)).not.toBeInTheDocument();
  });

  it('renders step 1 with default values and allows advancing steps', () => {
    const handleClose = vi.fn();
    const handleApply = vi.fn();

    render(
      <ProtaPromesWizardModal
        {...baseProps}
        isOpen={true}
        onClose={handleClose}
        onApply={handleApply}
        initialSubject="Bahasa Indonesia"
        initialGradeLevel="Kelas 4"
      />
    );

    expect(screen.getByText(/Panduan Cepat Prota & Promes/i)).toBeInTheDocument();
    expect(screen.getByText(/Identitas & Mapel/i)).toBeInTheDocument();
    expect(screen.getByText(/Jam & Kaldik/i)).toBeInTheDocument();
    expect(screen.getByText(/Materi \(TP\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Ringkasan & Terapkan/i)).toBeInTheDocument();

    expect(screen.getByText(/1\. Pilih Kelas/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Pilih Mata Pelajaran/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Matematika$/i }));

    goToStep(2);
    expect(screen.getByText(/1\. Beban Mengajar/i)).toBeInTheDocument();
    expect(screen.getByText(/Kalender Pendidikan Anda/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Pekan Efektif KBM/i).length).toBe(2);

    fireEvent.click(screen.getByRole('button', { name: /Lanjut ke Langkah 3/i }));
    expect(screen.getByText(/Daftar Bab Bawaan/i)).toBeInTheDocument();
    expect(screen.getByText(/Bagi Rata Berdasarkan Jumlah Bab/i)).toBeInTheDocument();
    expect(screen.getByText(/Pratinjau Materi yang Akan Dibuat/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Lanjut ke Langkah 4/i }));
    expect(screen.getByText(/Jam materi sama dengan jam efektif/i)).toBeInTheDocument();
    expect(screen.getByText(/SEMESTER 1 \(GANJIL\)/i)).toBeInTheDocument();
    expect(screen.getByText(/SEMESTER 2 \(GENAP\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Matriks Program Semester \(Promes\) Otomatis Terisi/i)).toBeInTheDocument();
    // No existing document, so there is nothing to choose between.
    expect(screen.queryByText(/Simpan hasilnya ke/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Terapkan$/i }));

    expect(handleApply).toHaveBeenCalledTimes(1);
    const appliedData: WizardApplyData = handleApply.mock.calls[0][0];
    expect(appliedData.subject).toBe('Matematika');
    expect(appliedData.gradeLevel).toBe('Kelas 4');
    expect(appliedData.phase).toBe('B');
    expect(appliedData.curriculum).toBe('MERDEKA');
    expect(appliedData.target).toBe('replace');
    expect(appliedData.protaItems.length).toBeGreaterThan(0);
    expect(appliedData.promesCellsSem1.length).toBeGreaterThan(0);
    expect(appliedData.promesCellsSem2.length).toBeGreaterThan(0);
    expect(appliedData.weeks.length).toBe(60); // 12 months * 5 weeks

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('allows navigating backwards using the Sebelumnya button', () => {
    render(<ProtaPromesWizardModal {...baseProps} isOpen={true} />);

    goToStep(2);
    expect(screen.getByText(/1\. Beban Mengajar/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Sebelumnya/i }));

    expect(screen.getByText(/1\. Pilih Kelas/i)).toBeInTheDocument();
  });

  it('handles custom subject input and "Bagi Rata" distribution', () => {
    const handleApply = vi.fn();

    render(<ProtaPromesWizardModal {...baseProps} isOpen={true} onApply={handleApply} />);

    fireEvent.change(screen.getByPlaceholderText(/Bahasa Jawa \/ Seni Musik/i), {
      target: { value: 'Bahasa Jawa' },
    });

    goToStep(2);
    fireEvent.click(screen.getByRole('button', { name: /^2 JP \/ Minggu$/i }));

    fireEvent.click(screen.getByRole('button', { name: /Lanjut ke Langkah 3/i }));
    fireEvent.click(screen.getByRole('button', { name: /Bagi Rata Berdasarkan Jumlah Bab/i }));

    expect(screen.getByText(/Berapa bab \/ lingkup materi yang diajarkan\?/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Lanjut ke Langkah 4/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Terapkan$/i }));

    expect(handleApply).toHaveBeenCalledTimes(1);
    const appliedData: WizardApplyData = handleApply.mock.calls[0][0];
    expect(appliedData.subject).toBe('Bahasa Jawa');
    expect(appliedData.weeklyJpQuota).toBe(2);
    expect(appliedData.protaItems.length).toBe(8); // 4 chapters Sem 1 + 4 chapters Sem 2
  });

  it('does not offer Kelas 4 chapters to another grade', () => {
    const handleApply = vi.fn();

    render(
      <ProtaPromesWizardModal
        {...baseProps}
        isOpen={true}
        onApply={handleApply}
        initialSubject="Matematika"
        initialGradeLevel="Kelas 1"
      />
    );

    goToStep(3);
    const presetButton = screen.getByRole('button', { name: /Daftar Bab Bawaan/i });
    expect(presetButton).toBeDisabled();
    expect(screen.getByText(/Belum tersedia untuk Matematika Kelas 1/i)).toBeInTheDocument();
    // Falls back to the per-chapter split.
    expect(screen.getByText(/Berapa bab \/ lingkup materi yang diajarkan\?/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Lanjut ke Langkah 4/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Terapkan$/i }));

    const appliedData: WizardApplyData = handleApply.mock.calls[0][0];
    expect(appliedData.phase).toBe('A');
    expect(appliedData.protaItems.every((it) => !it.learningObjectiveCode.startsWith('TP 4.'))).toBe(true);
  });

  it('distributes Promes against the teacher Kaldik, not the national preset', () => {
    const handleApply = vi.fn();
    // Make every week of January a holiday in the teacher's own calendar.
    const ownWeeks = getDefaultNationalKaldik('2026/2027').map((w) =>
      w.month === 1 ? { ...w, type: 'LIBUR_NASIONAL' as const } : w
    );

    render(
      <ProtaPromesWizardModal {...baseProps} currentWeeks={ownWeeks} isOpen={true} onApply={handleApply} />
    );

    goToStep(4);
    fireEvent.click(screen.getByRole('button', { name: /^Terapkan$/i }));

    const appliedData: WizardApplyData = handleApply.mock.calls[0][0];
    const januaryJp = appliedData.promesCellsSem2
      .filter((c) => c.monthIndex === 0)
      .reduce((sum, c) => sum + c.allocatedJp, 0);
    expect(januaryJp).toBe(0);
    expect(appliedData.weeks).toBe(ownWeeks);
  });

  it('defaults to a new document when the open one already has materi', () => {
    const handleApply = vi.fn();

    render(
      <ProtaPromesWizardModal {...baseProps} hasExistingData={true} isOpen={true} onApply={handleApply} />
    );

    goToStep(4);
    expect(screen.getByText(/Simpan hasilnya ke/i)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Dokumen baru/i })).toBeChecked();

    fireEvent.click(screen.getByRole('radio', { name: /Ganti isi dokumen ini/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Terapkan$/i }));

    expect((handleApply.mock.calls[0][0] as WizardApplyData).target).toBe('replace');
  });

  it('drafts materi with AI and keeps the hours equal to the effective weeks', async () => {
    aiService.generateProtaTopicsWithAi.mockResolvedValue(AI_TOPICS);
    const handleApply = vi.fn();

    render(
      <ProtaPromesWizardModal
        {...baseProps}
        isOpen={true}
        onApply={handleApply}
        initialSubject="Bahasa Jawa"
        initialGradeLevel="Kelas 3"
      />
    );

    goToStep(3);
    fireEvent.click(screen.getByRole('button', { name: /Susun dengan AI/i }));

    goToStep4FromStep3();
    expect(screen.getByRole('button', { name: /^Terapkan$/i })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Sebelumnya/i }));

    fireEvent.click(screen.getByRole('button', { name: /^Buat dengan AI$/i }));
    expect(await screen.findByText(/Draf dari AI/i)).toBeInTheDocument();
    expect(aiService.generateProtaTopicsWithAi).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Bahasa Jawa', gradeLevel: 'Kelas 3', phase: 'B' })
    );
    expect(screen.getByText(/Aksara Jawa/)).toBeInTheDocument();

    goToStep4FromStep3();
    fireEvent.click(screen.getByRole('button', { name: /^Terapkan$/i }));

    const appliedData: WizardApplyData = handleApply.mock.calls[0][0];
    expect(appliedData.protaItems.map((i) => i.learningObjectiveCode)).toEqual(['TP 1', 'TP 2', 'TP 3', 'TP 4', 'TP 5']);
    const sem1Jp = appliedData.protaItems.filter((i) => i.semesterNumber === 1).reduce((s, i) => s + i.targetJp, 0);
    const sem1Cells = appliedData.promesCellsSem1.reduce((s, c) => s + c.allocatedJp, 0);
    expect(sem1Cells).toBe(sem1Jp);
  });

  it('shows the AI error and lets the teacher try again', async () => {
    aiService.generateProtaTopicsWithAi.mockRejectedValueOnce(new Error('Kuota AI habis.'));

    render(<ProtaPromesWizardModal {...baseProps} isOpen={true} initialSubject="Bahasa Jawa" initialGradeLevel="Kelas 3" />);

    goToStep(3);
    fireEvent.click(screen.getByRole('button', { name: /Susun dengan AI/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Buat dengan AI$/i }));

    expect(await screen.findByText('Kuota AI habis.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Buat dengan AI$/i })).toBeEnabled();
  });

  it('calls onClose when close icon (X) is clicked', () => {
    const handleClose = vi.fn();

    render(<ProtaPromesWizardModal {...baseProps} isOpen={true} onClose={handleClose} />);

    fireEvent.click(screen.getByTitle(/Tutup Panduan/i));

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape key press and locks body scroll', () => {
    const handleClose = vi.fn();

    const { unmount } = render(
      <ProtaPromesWizardModal {...baseProps} isOpen={true} onClose={handleClose} />
    );

    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);

    unmount();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('calls onClose when clicking outside modal on backdrop', () => {
    const handleClose = vi.fn();

    render(<ProtaPromesWizardModal {...baseProps} isOpen={true} onClose={handleClose} />);

    fireEvent.click(screen.getByRole('dialog'));

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
