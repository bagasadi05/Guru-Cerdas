import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
    PhScheduleFormModal,
    parseSubjectString,
    getDayInfo,
} from '../../src/components/schedule/PhScheduleFormModal';
import type { PhScheduleRow } from '../../src/types';

describe('PhScheduleFormModal Helpers', () => {
    describe('parseSubjectString', () => {
        it('parses "Matematika (Pecahan & Desimal)" correctly', () => {
            const res = parseSubjectString('Matematika (Pecahan & Desimal)');
            expect(res.baseSubject).toBe('Matematika');
            expect(res.topic).toBe('Pecahan & Desimal');
        });

        it('parses "IPA - Ekosistem" correctly', () => {
            const res = parseSubjectString('IPA - Ekosistem');
            expect(res.baseSubject).toBe('IPA');
            expect(res.topic).toBe('Ekosistem');
        });

        it('parses plain subject "Fikih" without topic', () => {
            const res = parseSubjectString('Fikih');
            expect(res.baseSubject).toBe('Fikih');
            expect(res.topic).toBe('');
        });

        it('handles empty or whitespace strings', () => {
            const res = parseSubjectString('   ');
            expect(res.baseSubject).toBe('');
            expect(res.topic).toBe('');
        });
    });

    describe('getDayInfo', () => {
        it('correctly detects Sunday (weekend) for 2026-09-27', () => {
            const info = getDayInfo('2026-09-27');
            expect(info).not.toBeNull();
            expect(info?.dayName).toBe('Minggu');
            expect(info?.isWeekend).toBe(true);
            expect(info?.formatted).toContain('Minggu, 27 September 2026');
        });

        it('correctly detects Monday (effective school day) for 2026-09-28', () => {
            const info = getDayInfo('2026-09-28');
            expect(info).not.toBeNull();
            expect(info?.dayName).toBe('Senin');
            expect(info?.isWeekend).toBe(false);
            expect(info?.formatted).toContain('Senin, 28 September 2026');
        });

        it('returns null for invalid date string', () => {
            expect(getDayInfo('')).toBeNull();
            expect(getDayInfo('invalid')).toBeNull();
        });
    });
});

describe('PhScheduleFormModal Component', () => {
    const mockSuggestions = ['Matematika', 'IPA', 'IPS', 'Bahasa Indonesia', 'PAI', 'PJOK'];

    const mockFormData = {
        subject: 'Matematika',
        date: '2026-09-28',
        period_label: '1-2',
    };

    const mockRawSchedules: PhScheduleRow[] = [
        {
            id: 'ph-existing-1',
            class_id: 'cls-1',
            semester_id: 'sem-1',
            subject: 'IPA',
            date: '2026-09-28',
            period_label: '3-4',
            created_by: 'user-1',
            created_at: '2026-09-01T00:00:00Z',
            updated_at: '2026-09-01T00:00:00Z',
            deleted_at: null,
        },
    ];

    it('renders modal with correct title, class context, and fields', () => {
        render(
            <PhScheduleFormModal
                isOpen={true}
                onClose={vi.fn()}
                editingSchedule={null}
                formData={mockFormData}
                setFormData={vi.fn()}
                handleSubmit={vi.fn()}
                isPending={false}
                subjectSuggestions={mockSuggestions}
                rawSchedules={mockRawSchedules}
                currentClassName="Kelas 7A"
                currentSemesterName="Semester Ganjil"
            />
        );

        expect(screen.getByText('Tambah Jadwal Penilaian Harian')).toBeInTheDocument();
        expect(screen.getByText('Kelas 7A')).toBeInTheDocument();
        expect(screen.getByText('Semester Ganjil')).toBeInTheDocument();
        expect(screen.getByLabelText(/Tanggal Pelaksanaan/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Mata Pelajaran/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Materi \/ Topik PH/i)).toBeInTheDocument();
        expect(screen.getByText('Jam Pelajaran Ke-')).toBeInTheDocument();
    });

    it('renders custom dropdown list and allows selecting another subject without losing topic', () => {
        const setFormData = vi.fn();

        render(
            <PhScheduleFormModal
                isOpen={true}
                onClose={vi.fn()}
                editingSchedule={null}
                formData={{
                    subject: 'Matematika (Aljabar)',
                    date: '2026-09-28',
                    period_label: '1-2',
                }}
                setFormData={setFormData}
                handleSubmit={vi.fn()}
                isPending={false}
                subjectSuggestions={mockSuggestions}
                rawSchedules={[]}
            />
        );

        // Open dropdown trigger
        const trigger = screen.getByLabelText(/Mata Pelajaran/i);
        expect(trigger).toHaveTextContent('Matematika');
        fireEvent.click(trigger);

        // Click IPA in list
        const ipaOption = screen.getByRole('button', { name: /^IPA$/i });
        fireEvent.click(ipaOption);

        expect(setFormData).toHaveBeenCalled();
        const updater = setFormData.mock.calls[setFormData.mock.calls.length - 1][0];
        const updated = typeof updater === 'function' ? updater({ subject: '', date: '', period_label: '' }) : updater;
        expect(updated.subject).toBe('IPA (Aljabar)');
    });

    it('allows switching to custom subject input when selecting Tambah Mapel Kustom...', () => {
        const setFormData = vi.fn();

        render(
            <PhScheduleFormModal
                isOpen={true}
                onClose={vi.fn()}
                editingSchedule={null}
                formData={mockFormData}
                setFormData={setFormData}
                handleSubmit={vi.fn()}
                isPending={false}
                subjectSuggestions={mockSuggestions}
                rawSchedules={[]}
            />
        );

        // Open dropdown
        const trigger = screen.getByLabelText(/Mata Pelajaran/i);
        fireEvent.click(trigger);

        // Click Tambah Mapel Kustom
        const customOption = screen.getByRole('button', { name: /Tambah Mapel Kustom/i });
        fireEvent.click(customOption);

        expect(screen.getByPlaceholderText(/Ketik nama mata pelajaran baru/i)).toBeInTheDocument();
        expect(screen.getByText(/Kembali ke List Mapel/i)).toBeInTheDocument();
    });

    it('shows and allows typing in custom period input when + Kustom is clicked', () => {
        const setFormData = vi.fn();

        render(
            <PhScheduleFormModal
                isOpen={true}
                onClose={vi.fn()}
                editingSchedule={null}
                formData={mockFormData}
                setFormData={setFormData}
                handleSubmit={vi.fn()}
                isPending={false}
                subjectSuggestions={mockSuggestions}
                rawSchedules={[]}
            />
        );

        const kustomBtn = screen.getByRole('button', { name: /\+ Kustom/i });
        fireEvent.click(kustomBtn);

        // Custom period input appears
        const customPeriodInput = screen.getByPlaceholderText(/cth\. 1-3 atau 7-8/i);
        expect(customPeriodInput).toBeInTheDocument();

        // Type in custom period
        fireEvent.change(customPeriodInput, { target: { value: '5-7' } });
        expect(setFormData).toHaveBeenCalled();
        const updater = setFormData.mock.calls[setFormData.mock.calls.length - 1][0];
        const updated = typeof updater === 'function' ? updater({ subject: '', date: '', period_label: '' }) : updater;
        expect(updated.period_label).toBe('5-7');
    });

    it('shows inline conflict warning when date and period clash with existing schedule', () => {
        render(
            <PhScheduleFormModal
                isOpen={true}
                onClose={vi.fn()}
                editingSchedule={null}
                formData={{
                    subject: 'Matematika',
                    date: '2026-09-28',
                    period_label: '3-4', // Clash with mockRawSchedules
                }}
                setFormData={vi.fn()}
                handleSubmit={vi.fn()}
                isPending={false}
                subjectSuggestions={mockSuggestions}
                rawSchedules={mockRawSchedules}
            />
        );

        expect(screen.getByText('Jam pelajaran bertumpang tindih')).toBeInTheDocument();
        expect(screen.getByText(/Sudah ada jadwal PH/i)).toBeInTheDocument();
    });

    it('displays centered quick date buttons and weekend indicator correctly', () => {
        const setFormData = vi.fn();

        render(
            <PhScheduleFormModal
                isOpen={true}
                onClose={vi.fn()}
                editingSchedule={null}
                formData={{
                    subject: 'Matematika',
                    date: '2026-09-27', // Sunday
                    period_label: '1-2',
                }}
                setFormData={setFormData}
                handleSubmit={vi.fn()}
                isPending={false}
                subjectSuggestions={mockSuggestions}
                rawSchedules={[]}
            />
        );

        // Weekend badge
        expect(screen.getByText('Akhir pekan')).toBeInTheDocument();

        // Quick date buttons
        const hariIniBtn = screen.getByRole('button', { name: /Hari Ini/i });
        const besokBtn = screen.getByRole('button', { name: /Besok/i });
        const seninDepanBtn = screen.getByRole('button', { name: /Senin Depan/i });

        expect(hariIniBtn).toBeInTheDocument();
        expect(besokBtn).toBeInTheDocument();
        expect(seninDepanBtn).toBeInTheDocument();

        fireEvent.click(hariIniBtn);
        expect(setFormData).toHaveBeenCalled();
    });

    it('disables submit button and shows spinner when isPending is true', () => {
        render(
            <PhScheduleFormModal
                isOpen={true}
                onClose={vi.fn()}
                editingSchedule={null}
                formData={mockFormData}
                setFormData={vi.fn()}
                handleSubmit={vi.fn()}
                isPending={true}
                subjectSuggestions={mockSuggestions}
                rawSchedules={[]}
            />
        );

        expect(screen.getByText('Menyimpan...')).toBeInTheDocument();
        const submitBtn = screen.getByRole('button', { name: /Menyimpan/i });
        expect(submitBtn).toBeDisabled();
    });
});
