import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MassInputHeader } from '../../src/components/pages/mass-input/components/MassInputHeader';
import { MassInputBreadcrumbBar } from '../../src/components/pages/mass-input/components/MassInputBreadcrumbBar';
import { MassInputDraftBanner } from '../../src/components/pages/mass-input/components/MassInputDraftBanner';
import { MassInputFloatingBars } from '../../src/components/pages/mass-input/components/MassInputFloatingBars';
import { actionCards } from '../../src/components/pages/mass-input/constants';

describe('MassInput Components Decomposition', () => {
    it('renders MassInputHeader with mode and class info', () => {
        const handleBack = vi.fn();
        const modeConfig = actionCards.find(c => c.mode === 'subject_grade');

        render(
            <MassInputHeader
                handleBack={handleBack}
                currentCard={{ title: 'Input Nilai Mata Pelajaran', description: 'Deskripsi penilaian' }}
                activeModeConfig={modeConfig}
                mode="subject_grade"
                selectedClass="cls-1"
                classes={[{ id: 'cls-1', name: '7A', academic_year: '2025/2026', grade_level: 7, is_archived: false, user_id: 'u-1', created_at: '', deleted_at: null, updated_at: null, wali_kelas_id: null }]}
            />
        );

        expect(screen.getByText('Input Nilai Mata Pelajaran')).toBeInTheDocument();
        expect(screen.getByText('7A')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /kembali ke langkah sebelumnya/i }));
        expect(handleBack).toHaveBeenCalledTimes(1);
    });

    it('renders MassInputBreadcrumbBar when config is closed', () => {
        const onOpenConfig = vi.fn();

        render(
            <MassInputBreadcrumbBar
                mode="subject_grade"
                isConfigOpen={false}
                onOpenConfig={onOpenConfig}
                selectedClass="cls-1"
                classes={[{ id: 'cls-1', name: '7A', academic_year: '2025/2026', grade_level: 7, is_archived: false, user_id: 'u-1', created_at: '', deleted_at: null, updated_at: null, wali_kelas_id: null }]}
                subjectGradeInfo={{ subject: 'Matematika', assessment_name: 'UH 1' }}
                quizInfo={{ name: '', subject: '' }}
                selectedViolationCode=""
            />
        );

        expect(screen.getByText(/Kelas: 7A/i)).toBeInTheDocument();
        expect(screen.getByText(/Mapel: Matematika \(UH 1\)/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /ubah konfigurasi/i }));
        expect(onOpenConfig).toHaveBeenCalledTimes(1);
    });

    it('renders MassInputDraftBanner when draft is restored', () => {
        const onDiscard = vi.fn();

        render(
            <MassInputDraftBanner
                mode="subject_grade"
                restoredDraft={{ savedAt: '2026-10-25T01:00:00Z', count: 12 }}
                isDirty={true}
                assessmentName="Ulangan Harian 1"
                onDiscardRestoredDraft={onDiscard}
            />
        );

        expect(screen.getByText(/Draf belum disimpan/i)).toBeInTheDocument();
        expect(screen.getByText(/12 nilai untuk Ulangan Harian 1/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /buang draf/i }));
        expect(onDiscard).toHaveBeenCalledTimes(1);
    });

    it('renders MassInputFloatingBars portal when gradedCount > 0 in step 2', () => {
        const onSubmit = vi.fn();
        const onUndoClear = vi.fn();

        render(
            <MassInputFloatingBars
                step={2}
                mode="subject_grade"
                gradedCount={15}
                selectedStudentCount={15}
                undoSnapshot={{ kind: 'scores', count: 5 }}
                onUndoClear={onUndoClear}
                onRequestClear={() => {}}
                isDirty={true}
                isSubmitDisabled={false}
                submitButtonTooltip=""
                onSubmit={onSubmit}
                isSubmitting={false}
                isOnline={true}
            />
        );

        expect(screen.getByText(/5 nilai dibersihkan/i)).toBeInTheDocument();
        expect(screen.getByText(/15 siswa dinilai/i)).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /simpan nilai \(15\)/i }));
        expect(onSubmit).toHaveBeenCalled();
    });
});
