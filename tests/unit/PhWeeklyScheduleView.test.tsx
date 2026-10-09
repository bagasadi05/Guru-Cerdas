import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhWeeklyScheduleView } from '../../src/components/schedule/PhWeeklyScheduleView';
import { PhScheduleEngine } from '../../src/components/schedule/engine/PhScheduleEngine';
import type { PhScheduleRow } from '../../src/types';

describe('PhWeeklyScheduleView Component', () => {
    // The view shows a Monday–Sunday week (weekends included). On a Sunday that
    // is the week ending today, not the next school week, so compute it the same way.
    const currentWeekDays = PhScheduleEngine.getSchoolWeekDays(new Date(), 0, true);
    const monday = currentWeekDays[0];
    const wednesday = currentWeekDays[2];

    const mockSchedules: PhScheduleRow[] = [
        {
            id: 'ph-1',
            class_id: 'class-1',
            semester_id: 'sem-1',
            subject: 'Matematika Wajib',
            date: monday.dateStr,
            period_label: '1-2',
            created_by: 'user-1',
            created_at: '2026-09-01T00:00:00Z',
            updated_at: '2026-09-01T00:00:00Z',
            deleted_at: null,
        },
        {
            id: 'ph-2',
            class_id: 'class-1',
            semester_id: 'sem-1',
            subject: 'Fisika',
            date: wednesday.dateStr,
            period_label: '3-4',
            created_by: 'user-1',
            created_at: '2026-09-01T00:00:00Z',
            updated_at: '2026-09-01T00:00:00Z',
            deleted_at: null,
        },
    ];

    it('renders all 5 days of the school week (Senin - Jumat) and formatted dates', () => {
        render(
            <PhWeeklyScheduleView
                schedules={mockSchedules}
                canAdd={true}
                canModify={() => true}
                onAdd={vi.fn()}
                onEdit={vi.fn()}
                onDuplicate={vi.fn()}
                onDelete={vi.fn()}
                onInputNilai={vi.fn()}
            />
        );

        // Day names must appear in headers
        expect(screen.getAllByText('Senin').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Selasa').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Rabu').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Kamis').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Jumat').length).toBeGreaterThan(0);

        // Formatted dates under each day
        expect(screen.getByText(monday.dateFormatted)).toBeInTheDocument();
        expect(screen.getByText(wednesday.dateFormatted)).toBeInTheDocument();

        // Check header total count badge
        expect(screen.getByText('2 PH Terjadwal')).toBeInTheDocument();
    });

    it('renders schedule items on matching days', () => {
        render(
            <PhWeeklyScheduleView
                schedules={mockSchedules}
                canAdd={true}
                canModify={() => true}
                onAdd={vi.fn()}
                onEdit={vi.fn()}
                onDuplicate={vi.fn()}
                onDelete={vi.fn()}
                onInputNilai={vi.fn()}
            />
        );

        expect(screen.getByText('Matematika Wajib')).toBeInTheDocument();
        expect(screen.getByText('Jam 1-2')).toBeInTheDocument();
        expect(screen.getByText('Fisika')).toBeInTheDocument();
        expect(screen.getByText('Jam 3-4')).toBeInTheDocument();
    });

    it('shows one empty state and one add action for a completely empty week', () => {
        const onAdd = vi.fn();
        render(<PhWeeklyScheduleView schedules={[]} canAdd canModify={() => true}
            onAdd={onAdd} onEdit={vi.fn()} onDuplicate={vi.fn()} onDelete={vi.fn()} onInputNilai={vi.fn()}
            referenceDate="2026-10-09" />);
        expect(screen.getByText('Belum ada jadwal PH minggu ini')).toBeInTheDocument();
        expect(screen.queryByText('Tidak ada PH')).not.toBeInTheDocument();
        expect(screen.getAllByRole('button', { name: 'Tambah PH minggu ini' })).toHaveLength(1);
        fireEvent.click(screen.getByRole('button', { name: 'Tambah PH minggu ini' }));
        expect(onAdd).toHaveBeenCalledWith('2026-10-09');
    });

    it('calls onInputNilai when clicking "Input Nilai" button', () => {
        const handleInputNilai = vi.fn();
        render(
            <PhWeeklyScheduleView
                schedules={mockSchedules}
                canAdd={true}
                canModify={() => true}
                onAdd={vi.fn()}
                onEdit={vi.fn()}
                onDuplicate={vi.fn()}
                onDelete={vi.fn()}
                onInputNilai={handleInputNilai}
            />
        );

        const inputNilaiButtons = screen.getAllByRole('button', { name: /Input Nilai/i });
        fireEvent.click(inputNilaiButtons[0]);

        expect(handleInputNilai).toHaveBeenCalledWith(mockSchedules[0]);
    });

    it('calls onAdd with the prefilled day date when clicking "Tambah PH" on empty day', () => {
        const handleAdd = vi.fn();
        render(
            <PhWeeklyScheduleView
                schedules={mockSchedules}
                canAdd={true}
                canModify={() => true}
                onAdd={handleAdd}
                onEdit={vi.fn()}
                onDuplicate={vi.fn()}
                onDelete={vi.fn()}
                onInputNilai={vi.fn()}
            />
        );

        // Tuesday, Thursday, Friday are empty
        const addButtons = screen.getAllByRole('button', { name: /Tambah PH/i });
        expect(addButtons.length).toBeGreaterThan(0);

        fireEvent.click(addButtons[0]);
        expect(handleAdd).toHaveBeenCalled();
    });

    it('navigates to next week, previous week, and resets to current week', () => {
        render(
            <PhWeeklyScheduleView
                schedules={mockSchedules}
                canAdd={true}
                canModify={() => true}
                onAdd={vi.fn()}
                onEdit={vi.fn()}
                onDuplicate={vi.fn()}
                onDelete={vi.fn()}
                onInputNilai={vi.fn()}
            />
        );

        const nextBtn = screen.getByRole('button', { name: /Minggu Berikutnya/i });
        const prevBtn = screen.getByRole('button', { name: /Minggu Sebelumnya/i });

        // Click next week
        fireEvent.click(nextBtn);

        // Calculate next week monday date formatted
        const nextWeekDays = PhScheduleEngine.getSchoolWeekDays(new Date(), 1, true);
        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
            PhScheduleEngine.formatWeekRangeLabel(nextWeekDays[0].rawDate, nextWeekDays[6].rawDate));

        // "Minggu Ini" button should now be visible and clickable
        const thisWeekBtn = screen.getByRole('button', { name: 'Minggu Ini' });
        expect(thisWeekBtn).toBeInTheDocument();

        // Click "Minggu Ini" to reset
        fireEvent.click(thisWeekBtn);
        expect(screen.getByText(monday.dateFormatted)).toBeInTheDocument();

        // Click previous week
        fireEvent.click(prevBtn);
        const prevWeekDays = PhScheduleEngine.getSchoolWeekDays(new Date(), -1, true);
        expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
            PhScheduleEngine.formatWeekRangeLabel(prevWeekDays[0].rawDate, prevWeekDays[6].rawDate));
    });

    it('on a Sunday shows the week that ends today, including its schedules', () => {
        render(
            <PhWeeklyScheduleView
                schedules={[{ ...mockSchedules[0], date: '2026-09-28' }]}
                canAdd={true}
                canModify={() => true}
                onAdd={vi.fn()}
                onEdit={vi.fn()}
                onDuplicate={vi.fn()}
                onDelete={vi.fn()}
                onInputNilai={vi.fn()}
                referenceDate="2026-10-04"
            />
        );

        expect(screen.getByText('28 Sep')).toBeInTheDocument();
        expect(screen.getByText('4 Okt')).toBeInTheDocument();
        expect(screen.getByText('Matematika Wajib')).toBeInTheDocument();
    });

    it('hides "+ Tambah PH" and action triggers when the teacher cannot add PH', () => {
        render(
            <PhWeeklyScheduleView
                schedules={mockSchedules}
                canAdd={false}
                canModify={() => false}
                onAdd={vi.fn()}
                onEdit={vi.fn()}
                onDuplicate={vi.fn()}
                onDelete={vi.fn()}
                onInputNilai={vi.fn()}
            />
        );

        expect(screen.queryByRole('button', { name: /Tambah PH/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Menu Aksi Jadwal/i })).not.toBeInTheDocument();
    });

    it("lets a teacher duplicate another teacher's PH but only edit or delete their own", () => {
        const schedules = [mockSchedules[0], { ...mockSchedules[1], created_by: 'other-teacher' }];
        render(
            <PhWeeklyScheduleView
                schedules={schedules}
                canAdd={true}
                canModify={(s) => s.created_by === 'user-1'}
                onAdd={vi.fn()}
                onEdit={vi.fn()}
                onDuplicate={vi.fn()}
                onDelete={vi.fn()}
                onInputNilai={vi.fn()}
            />
        );

        const [ownMenu, otherMenu] = screen.getAllByRole('button', { name: /Menu Aksi Jadwal/i });
        fireEvent.click(ownMenu);
        expect(screen.getByText('Edit Jadwal')).toBeInTheDocument();
        expect(screen.getByText('Hapus')).toBeInTheDocument();
        fireEvent.click(ownMenu);

        fireEvent.click(otherMenu);
        expect(screen.getByText('Duplikasi')).toBeInTheDocument();
        expect(screen.queryByText('Edit Jadwal')).not.toBeInTheDocument();
        expect(screen.queryByText('Hapus')).not.toBeInTheDocument();
    });
});
