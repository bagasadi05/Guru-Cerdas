import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import {
    formatLocalDate,
    getMonthDateRange,
    getScheduledDatesInMonth,
    isDateOnScheduleDay,
    getActiveMeetingDays,
    getGradeFromScore,
    gradeDraftFromSaved,
    isGradeDraftDirty,
    compareClassNames,
    compareEnrollmentsByClassAndName,
    resolveAttendancePeriod,
} from '../../src/components/pages/extracurricular/extracurricularUtils';
import { ExtracurricularMasterView } from '../../src/components/pages/extracurricular/ExtracurricularMasterView';
import { MembersTab } from '../../src/components/pages/extracurricular/MembersTab';
import { GradesTab } from '../../src/components/pages/extracurricular/GradesTab';
import { AttendanceTab } from '../../src/components/pages/extracurricular/AttendanceTab';
import { ExtracurricularDetailView } from '../../src/components/pages/extracurricular/ExtracurricularDetailView';
import { ExtracurricularAttendanceExportModal } from '../../src/components/pages/extracurricular/modals';

describe('extracurricularUtils', () => {
    it('formats local date without UTC off-by-one shift', () => {
        const d = new Date(2026, 9, 1, 0, 15, 0); // Oct 1, 2026 00:15 local
        expect(formatLocalDate(d)).toBe('2026-10-01');
    });

    it('computes accurate startDate and endDate for a month including the 31st', () => {
        const range = getMonthDateRange('2026-10-15');
        expect(range.startDate).toBe('2026-10-01');
        expect(range.endDate).toBe('2026-10-31');
        expect(range.daysInMonth).toBe(31);
        expect(range.academicYear).toBe('2026/2027');
    });

    it('returns scheduled dates in month matching schedule_day', () => {
        // October 2026 has Fridays on 2, 9, 16, 23, 30
        const fridays = getScheduledDatesInMonth('2026-10-10', 'Jumat');
        expect(fridays.map((f) => f.day)).toEqual([2, 9, 16, 23, 30]);
        expect(fridays[0].dateStr).toBe('2026-10-02');
        expect(isDateOnScheduleDay('2026-10-02', 'Jumat')).toBe(true);
        expect(isDateOnScheduleDay('2026-10-03', 'Jumat')).toBe(false);
    });

    it('merges scheduled days and recorded attendance days in getActiveMeetingDays', () => {
        const recorded = new Set<number>([10]); // Saturday Oct 10
        const active = getActiveMeetingDays(2026, 9, 31, 'Jumat', recorded);
        expect(active.map((a) => a.day)).toEqual([2, 9, 10, 16, 23, 30]);
    });

    it('derives predicate from numeric score accurately', () => {
        expect(getGradeFromScore(95)).toBe('A');
        expect(getGradeFromScore(90)).toBe('A');
        expect(getGradeFromScore(85)).toBe('B');
        expect(getGradeFromScore(75)).toBe('C');
        expect(getGradeFromScore(60)).toBe('D');
    });

    it('detects dirty grade drafts accurately', () => {
        const saved = {
            id: 'g1',
            grade: 'B',
            score: 82,
            description: 'Aktif',
        } as any;
        const cleanDraft = gradeDraftFromSaved(saved);
        expect(isGradeDraftDirty(cleanDraft, saved)).toBe(false);
        expect(isGradeDraftDirty({ ...cleanDraft, score: '91', grade: 'A' }, saved)).toBe(true);
    });

    it('sorts classes naturally and handles prefixes', () => {
        const classes = ['Kelas 2B', '10A', '1B', 'Kelas 1A', '2A', ''];
        classes.sort(compareClassNames);
        expect(classes).toEqual(['Kelas 1A', '1B', '2A', 'Kelas 2B', '10A', '']);
    });

    it('sorts enrollments primarily by class in natural order and secondarily by student name A-Z', () => {
        const enrollments = [
            { name: 'Zahra', className: '2A' },
            { name: 'Budi', className: '1B' },
            { name: 'Ahmad', className: '2A' },
            { name: 'Dewi', className: '1A' },
            { name: 'Andi', className: '1A' },
            { name: 'Citra', className: 'Kelas 1B' },
            { name: 'Zaki', className: null },
            { name: 'Alif', className: null },
        ];

        enrollments.sort(compareEnrollmentsByClassAndName);

        expect(enrollments.map((e) => `${e.className || '-'}:${e.name}`)).toEqual([
            '1A:Andi',
            '1A:Dewi',
            '1B:Budi',
            'Kelas 1B:Citra',
            '2A:Ahmad',
            '2A:Zahra',
            '-:Alif',
            '-:Zaki',
        ]);
    });
});

describe('ExtracurricularMasterView', () => {
    const sampleEkskul = [
        {
            id: 'ek-1',
            name: 'Pramuka',
            category: 'Pramuka & Kepanduan',
            description: 'Latihan rutin kepramukaan',
            schedule_day: 'Jumat',
            schedule_time: '14:00 - 15:30',
            coach_name: 'Kak Budi',
            max_participants: 30,
            is_active: true,
            created_at: null,
            deleted_at: null,
            updated_at: '2026-10-01',
            user_id: 'u-1',
        },
    ];

    it('displays participant enrollment counts and quota bar on cards', () => {
        render(
            <ExtracurricularMasterView
                extracurriculars={sampleEkskul}
                enrollmentCountsByEkskul={{ 'ek-1': 18 }}
                loading={false}
                onSelectExtracurricular={vi.fn()}
                onOpenModal={vi.fn()}
                onDeleteExtracurricular={vi.fn()}
                canAdd={true}
            />
        );

        expect(screen.getByText('Pramuka')).toBeTruthy();
        expect(screen.getByText('18 / 30')).toBeTruthy();
        expect(screen.getByText('18')).toBeTruthy(); // Total Anggota stat card
    });

    it('hides Edit and Hapus buttons when canAdd is false (leadership role)', () => {
        render(
            <ExtracurricularMasterView
                extracurriculars={sampleEkskul}
                enrollmentCountsByEkskul={{ 'ek-1': 18 }}
                loading={false}
                onSelectExtracurricular={vi.fn()}
                onOpenModal={vi.fn()}
                onDeleteExtracurricular={vi.fn()}
                canAdd={false}
            />
        );

        expect(screen.queryByLabelText('Edit Pramuka')).toBeNull();
        expect(screen.queryByLabelText('Hapus Pramuka')).toBeNull();
    });
});

describe('MembersTab', () => {
    const enrollments = [
        {
            id: 'en-1',
            participantId: 's-1',
            participantType: 'student' as const,
            name: 'Ahmad Fauzi',
            className: '5A',
            gender: 'Laki-laki' as const,
        },
    ];
    const participants = [
        {
            id: 's-1',
            type: 'student' as const,
            name: 'Ahmad Fauzi',
            className: '5A',
            gender: 'Laki-laki' as const,
        },
        {
            id: 's-2',
            type: 'student' as const,
            name: 'Bunga Citra',
            className: '5A',
            gender: 'Perempuan' as const,
        },
        {
            id: 'ex-1',
            type: 'extracurricular_student' as const,
            name: 'Dani Eksternal',
            className: '5B',
            gender: 'Laki-laki' as const,
        },
    ];

    it('shows only enrolled members by default and allows switching to add mode with bulk selection', () => {
        const onBulkEnroll = vi.fn();

        render(
            <MembersTab
                extracurricularId="ek-1"
                enrollments={enrollments}
                participants={participants}
                enrolledParticipantIds={new Set(['student:s-1'])}
                classes={[{ id: 'c-1', name: '5A' }]}
                selectedClassId=""
                onClassIdChange={vi.fn()}
                onEnrollmentChange={vi.fn()}
                onBulkEnroll={onBulkEnroll}
                onAddExternalStudent={vi.fn()}
                onEditExternalStudent={vi.fn()}
            />
        );

        // In default enrolled view, only Ahmad Fauzi is shown, not Bunga Citra
        expect(screen.getByText('Ahmad Fauzi')).toBeTruthy();
        expect(screen.queryByText('Bunga Citra')).toBeNull();

        // Switch to "+ Daftarkan Siswa" mode
        fireEvent.click(screen.getByText('+ Daftarkan Siswa'));

        // Unenrolled candidates Bunga Citra and Dani Eksternal appear
        expect(screen.getByText('Bunga Citra')).toBeTruthy();
        expect(screen.getByText('Dani Eksternal')).toBeTruthy();

        // Select all unenrolled candidates and bulk enroll
        fireEvent.click(screen.getByText(/Pilih Semua/i));
        fireEvent.click(screen.getByText(/Daftarkan 2 Siswa/i));

        expect(onBulkEnroll).toHaveBeenCalledWith([
            { studentId: 's-2', studentType: 'student' },
            { studentId: 'ex-1', studentType: 'extracurricular_student' },
        ]);
    });

    it('renders enrolled members ordered primarily by class and then by name', () => {
        const unsorted = [
            { id: 'en-3', participantId: 's-3', participantType: 'student' as const, name: 'Zahra', className: '2A', gender: 'Perempuan' as const },
            { id: 'en-1', participantId: 's-1', participantType: 'student' as const, name: 'Budi', className: '1B', gender: 'Laki-laki' as const },
            { id: 'en-2', participantId: 's-2', participantType: 'student' as const, name: 'Ahmad', className: '1A', gender: 'Laki-laki' as const },
        ];

        render(
            <MembersTab
                extracurricularId="ek-1"
                enrollments={unsorted}
                participants={[]}
                enrolledParticipantIds={new Set()}
                classes={[]}
                selectedClassId=""
                onClassIdChange={vi.fn()}
                onEnrollmentChange={vi.fn()}
                onAddExternalStudent={vi.fn()}
                onEditExternalStudent={vi.fn()}
            />
        );

        const unenrollBtns = screen.getAllByRole('button', { name: /^Keluarkan / });
        expect(unenrollBtns.map((b) => b.getAttribute('aria-label'))).toEqual([
            'Keluarkan Ahmad',
            'Keluarkan Budi',
            'Keluarkan Zahra',
        ]);
    });
});

describe('GradesTab', () => {
    const enrollments = [
        {
            id: 'en-1',
            participantId: 's-1',
            participantType: 'student' as const,
            name: 'Ahmad Fauzi',
            className: '5A',
        },
    ];

    it('auto-computes predicate when numeric score is typed', () => {
        const onUpdateDraft = vi.fn();
        const onSaveGrade = vi.fn();

        render(
            <GradesTab
                extracurricularId="ek-1"
                enrollments={enrollments}
                gradesMap={{}}
                gradeDrafts={{}}
                onUpdateDraft={onUpdateDraft}
                onSaveGrade={onSaveGrade}
                onExportPDF={vi.fn()}
                onExportExcel={vi.fn()}
            />
        );

        const scoreInput = screen.getByLabelText('Nilai angka untuk Ahmad Fauzi');
        fireEvent.change(scoreInput, { target: { value: '92' } });

        expect(onUpdateDraft).toHaveBeenCalledWith('student:s-1', {
            score: '92',
            grade: 'A',
        });
    });

    it('renders enrollments ordered primarily by class and then by name', () => {
        const unsorted = [
            { id: 'en-3', participantId: 's-3', participantType: 'student' as const, name: 'Zahra', className: '2A', gender: 'Perempuan' as const },
            { id: 'en-1', participantId: 's-1', participantType: 'student' as const, name: 'Budi', className: '1B', gender: 'Laki-laki' as const },
            { id: 'en-2', participantId: 's-2', participantType: 'student' as const, name: 'Ahmad', className: '1A', gender: 'Laki-laki' as const },
        ];

        render(
            <GradesTab
                extracurricularId="ek-1"
                enrollments={unsorted}
                gradesMap={{}}
                gradeDrafts={{}}
                onUpdateDraft={vi.fn()}
                onSaveGrade={vi.fn()}
                onExportPDF={vi.fn()}
                onExportExcel={vi.fn()}
            />
        );

        const inputs = screen.getAllByLabelText(/^Nilai angka untuk /);
        expect(inputs.map((inp) => inp.getAttribute('aria-label'))).toEqual([
            'Nilai angka untuk Ahmad',
            'Nilai angka untuk Budi',
            'Nilai angka untuk Zahra',
        ]);
    });
});

describe('AttendanceTab', () => {
    const enrollments = [
        {
            id: 'en-1',
            participantId: 's-1',
            participantType: 'student' as const,
            name: 'Ahmad Fauzi',
            className: '5A',
        },
    ];

    it('guards against switching dates when unsaved manual attendance changes exist', () => {
        const onDateChange = vi.fn();
        const onDiscardManual = vi.fn();

        render(
            <AttendanceTab
                extracurricularId="ek-1"
                scheduleDay="Jumat"
                enrollments={enrollments}
                selectedDate="2026-10-02"
                onDateChange={onDateChange}
                attendanceMap={{}}
                localAttendance={{ 'student:s-1': 'Hadir' }}
                autoSaveAttendance={false}
                onToggleAutoSave={vi.fn()}
                onAttendanceClick={vi.fn()}
                onMarkAll={vi.fn()}
                onSaveManual={vi.fn()}
                onDiscardManual={onDiscardManual}
                isSaving={false}
                onExportPDF={vi.fn()}
                onExportExcel={vi.fn()}
            />
        );

        // Click another scheduled Friday pill (Jum, 9)
        fireEvent.click(screen.getByText('Jum, 9'));

        // Should NOT call onDateChange immediately; should show guard modal
        expect(onDateChange).not.toHaveBeenCalled();
        expect(screen.getByText('Perubahan Presensi Belum Disimpan')).toBeTruthy();

        // Confirm discard & switch date
        fireEvent.click(screen.getByText('Buang & Pindah Tanggal'));
        expect(onDiscardManual).toHaveBeenCalled();
        expect(onDateChange).toHaveBeenCalledWith('2026-10-09');
    });

    it('renders enrollments ordered primarily by class and then by name', () => {
        const unsorted = [
            { id: 'en-3', participantId: 's-3', participantType: 'student' as const, name: 'Zahra', className: '2A', gender: 'Perempuan' as const },
            { id: 'en-1', participantId: 's-1', participantType: 'student' as const, name: 'Budi', className: '1B', gender: 'Laki-laki' as const },
            { id: 'en-2', participantId: 's-2', participantType: 'student' as const, name: 'Ahmad', className: '1A', gender: 'Laki-laki' as const },
        ];

        render(
            <AttendanceTab
                extracurricularId="ek-1"
                scheduleDay="Jumat"
                enrollments={unsorted}
                selectedDate="2026-10-02"
                onDateChange={vi.fn()}
                attendanceMap={{}}
                localAttendance={{}}
                autoSaveAttendance={false}
                onToggleAutoSave={vi.fn()}
                onAttendanceClick={vi.fn()}
                onMarkAll={vi.fn()}
                onSaveManual={vi.fn()}
                onDiscardManual={vi.fn()}
                isSaving={false}
                onExportPDF={vi.fn()}
                onExportExcel={vi.fn()}
            />
        );

        const headings = screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent);
        expect(headings).toEqual(['Ahmad', 'Budi', 'Zahra']);
    });

    it('renders centered, equal-width tabs with badges in ExtracurricularDetailView', () => {
        const onTabChange = vi.fn();
        const mockEkskul = {
            id: 'ekskul-1',
            name: 'Catur',
            category: 'Olahraga',
            description: 'ekstrakurikuler catur',
            schedule_day: 'Jumat',
            schedule_time: '09.30-10.40',
            coach_name: 'Bagas Riyadi, S.Pd.',
            max_participants: 30,
            is_active: true,
            created_at: '',
            updated_at: '',
            deleted_at: null,
            user_id: 'u-1',
        };

        render(
            <ExtracurricularDetailView
                extracurricular={mockEkskul}
                onBack={vi.fn()}
                activeTab="members"
                onTabChange={onTabChange}
                enrolledCount={23}
                attendanceFilledCount={0}
                gradedCount={0}
            >
                {(tab) => <div>Konten aktif: {tab}</div>}
            </ExtracurricularDetailView>
        );

        // Check tabs exist
        const tabList = screen.getByRole('tablist');
        expect(tabList.className).toContain('grid');
        expect(tabList.className).toContain('grid-cols-3');

        const tabs = screen.getAllByRole('tab');
        expect(tabs).toHaveLength(3);

        // Check tab names & badges
        expect(within(tabs[0]).getByText('Anggota')).toBeTruthy();
        expect(within(tabs[0]).getByText('23')).toBeTruthy();
        expect(within(tabs[1]).getByText('Presensi')).toBeTruthy();
        expect(within(tabs[1]).getByText('0/23')).toBeTruthy();
        expect(within(tabs[2]).getByText('Nilai')).toBeTruthy();

        // Click Presensi tab
        fireEvent.click(tabs[1]);
        expect(onTabChange).toHaveBeenCalledWith('attendance');
    });

    describe('Attendance Export Period & Modal', () => {
        it('resolves single month period correctly', () => {
            const period = resolveAttendancePeriod({
                periodType: 'single_month',
                year: 2026,
                month: 9, // October (0-indexed)
                includeMonthlyDetails: true,
            });
            expect(period.startDate).toBe('2026-10-01');
            expect(period.endDate).toBe('2026-10-31');
            expect(period.months).toHaveLength(1);
            expect(period.months[0].monthName).toBe('Oktober');
            expect(period.titlePeriodText).toContain('OKTOBER 2026');
            expect(period.titlePeriodText).toContain('2026/2027');
            expect(period.periodType).toBe('single_month');
        });

        it('resolves month range period and auto-normalizes inverted dates', () => {
            const forward = resolveAttendancePeriod({
                periodType: 'month_range',
                startYear: 2026,
                startMonth: 7, // August
                endYear: 2026,
                endMonth: 9, // October
            });
            expect(forward.startDate).toBe('2026-08-01');
            expect(forward.endDate).toBe('2026-10-31');
            expect(forward.months).toHaveLength(3);
            expect(forward.titlePeriodText).toContain('AGUSTUS 2026 - OKTOBER 2026');

            // Inverted order auto-normalizes start & end
            const inverted = resolveAttendancePeriod({
                periodType: 'month_range',
                startYear: 2026,
                startMonth: 9,
                endYear: 2026,
                endMonth: 7,
            });
            expect(inverted.startDate).toBe('2026-08-01');
            expect(inverted.endDate).toBe('2026-10-31');
            expect(inverted.months).toHaveLength(3);
        });

        it('resolves semester Ganjil (Jul-Dec) and Genap (Jan-Jun) accurately', () => {
            const ganjil = resolveAttendancePeriod({
                periodType: 'semester',
                academicYear: '2026/2027',
                semesterType: 'Ganjil',
            });
            expect(ganjil.startDate).toBe('2026-07-01');
            expect(ganjil.endDate).toBe('2026-12-31');
            expect(ganjil.months).toHaveLength(6);
            expect(ganjil.months[0].monthName).toBe('Juli');
            expect(ganjil.months[5].monthName).toBe('Desember');
            expect(ganjil.titlePeriodText).toContain('SEMESTER 1 (GANJIL)');
            expect(ganjil.titlePeriodText).toContain('2026/2027');

            const genap = resolveAttendancePeriod({
                periodType: 'semester',
                academicYear: '2026/2027',
                semesterType: 'Genap',
            });
            expect(genap.startDate).toBe('2027-01-01');
            expect(genap.endDate).toBe('2027-06-30');
            expect(genap.months).toHaveLength(6);
            expect(genap.months[0].monthName).toBe('Januari');
            expect(genap.months[5].monthName).toBe('Juni');
            expect(genap.titlePeriodText).toContain('SEMESTER 2 (GENAP)');
            expect(genap.titlePeriodText).toContain('2026/2027');
        });

        it('triggers onOpenExportModal in AttendanceTab when export buttons are clicked', () => {
            const onOpenExportModal = vi.fn();
            const legacyPDF = vi.fn();
            const legacyExcel = vi.fn();
            const enrollments = [
                { id: 'en-1', participantId: 's-1', participantType: 'student' as const, name: 'Ahmad', className: '1A', gender: 'Laki-laki' as const },
            ];

            render(
                <AttendanceTab
                    extracurricularId="ek-1"
                    scheduleDay="Jumat"
                    enrollments={enrollments}
                    selectedDate="2026-10-02"
                    onDateChange={vi.fn()}
                    attendanceMap={{}}
                    localAttendance={{}}
                    autoSaveAttendance={false}
                    onToggleAutoSave={vi.fn()}
                    onAttendanceClick={vi.fn()}
                    onMarkAll={vi.fn()}
                    onSaveManual={vi.fn()}
                    onDiscardManual={vi.fn()}
                    isSaving={false}
                    onExportPDF={legacyPDF}
                    onExportExcel={legacyExcel}
                    onOpenExportModal={onOpenExportModal}
                />
            );

            const exportPdfBtn = screen.getByTitle(/export rekap presensi pdf/i);
            fireEvent.click(exportPdfBtn);
            expect(onOpenExportModal).toHaveBeenCalledWith('pdf');
            expect(legacyPDF).not.toHaveBeenCalled();

            const exportExcelBtn = screen.getByTitle(/export rekap presensi excel/i);
            fireEvent.click(exportExcelBtn);
            expect(onOpenExportModal).toHaveBeenCalledWith('excel');
            expect(legacyExcel).not.toHaveBeenCalled();
        });

        it('interacts with ExtracurricularAttendanceExportModal properly', async () => {
            const onClose = vi.fn();
            const onExport = vi.fn().mockResolvedValue(undefined);
            const mockEkskul = {
                id: 'ek-1',
                name: 'Pramuka',
                category: 'Kepanduan',
                coach_name: 'Kak Bagas',
            };
            const mockEnrollments = [
                { id: 'en-1', participantId: 's-1', participantType: 'student' as const, name: 'Ahmad', className: '1A', gender: 'Laki-laki' as const },
            ];

            const { rerender } = render(
                <ExtracurricularAttendanceExportModal
                    isOpen={true}
                    onClose={onClose}
                    onExport={onExport}
                    initialFormat="pdf"
                    extracurricular={mockEkskul}
                    enrollments={mockEnrollments}
                    selectedDate="2026-10-15"
                />
            );

            expect(screen.getByText('Export Rekap Presensi Ekstrakurikuler')).toBeTruthy();
            expect(screen.getByText('Pramuka')).toBeTruthy();

            // Test cancel / close
            const cancelBtn = screen.getByRole('button', { name: /Batal/i });
            fireEvent.click(cancelBtn);
            expect(onClose).toHaveBeenCalled();

            // Click Semester period card
            const semesterCard = screen.getByText(/1 Semester/i).closest('button');
            expect(semesterCard).toBeTruthy();
            if (semesterCard) {
                fireEvent.click(semesterCard);
            }

            // Click Microsoft Excel format
            const excelBtn = screen.getByRole('button', { name: /Microsoft Excel/i });
            fireEvent.click(excelBtn);

            // Click submit
            const submitBtn = screen.getByRole('button', { name: /Download Excel/i });
            fireEvent.click(submitBtn);

            await waitFor(() => {
                expect(onExport).toHaveBeenCalledWith(
                    expect.objectContaining({
                        periodType: 'semester',
                    }),
                    'excel'
                );
            });

            // When closed, nothing renders
            rerender(
                <ExtracurricularAttendanceExportModal
                    isOpen={false}
                    onClose={onClose}
                    onExport={onExport}
                    extracurricular={mockEkskul}
                    enrollments={mockEnrollments}
                />
            );
            expect(screen.queryByText('Export Rekap Presensi Ekstrakurikuler')).toBeNull();
        });
    });
});
