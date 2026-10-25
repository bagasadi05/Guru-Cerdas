import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
    StudentDetailNavHeader,
    StudentDetailProfileCard,
    StudentDetailSummaryCard,
    StudentPortalPrintSlip,
    StudentDetailTabsNav,
} from '../../src/components/pages/student/components';
import { Tabs } from '../../src/components/ui/Tabs';

// Mock SemesterSelector so test does not require full Supabase/SemesterContext
vi.mock('../../src/components/ui/SemesterSelector', () => ({
    SemesterSelector: ({ value, onChange }: any) => (
        <select
            data-testid="semester-selector"
            value={value}
            onChange={(e) => onChange(e.target.value)}
        >
            <option value="all">Semua</option>
            <option value="sem-1">Semester 1</option>
        </select>
    ),
}));

describe('StudentDetailPage Modular Components', () => {
    const mockStudent = {
        id: 'student-123',
        name: 'Ahmad Dahlan',
        gender: 'Laki-laki',
        nis: '12345',
        nisn: '0012345678',
        parent_phone: '081234567890',
        parent_name: 'Bapak Dahlan',
        access_code: 'DAHLAN88',
        class_id: 'class-4a',
        classes: {
            id: 'class-4a',
            name: '4A',
            grade_level: 4,
        },
        avatar_url: null,
    } as any;

    it('renders StudentDetailNavHeader and triggers back navigation with class memory', () => {
        const navigate = vi.fn();
        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

        render(
            <MemoryRouter>
                <StudentDetailNavHeader
                    studentName="Ahmad Dahlan"
                    classId="class-4a"
                    onNavigate={navigate}
                />
            </MemoryRouter>
        );

        expect(screen.getByText('Ahmad Dahlan')).toBeInTheDocument();
        expect(screen.getByText('Kembali ke Data Siswa')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Kembali ke Data Siswa'));
        expect(setItemSpy).toHaveBeenCalledWith('guru_cerdas_active_class_id', 'class-4a');
        expect(navigate).toHaveBeenCalledWith('/siswa?class=class-4a');
    });

    it('renders StudentDetailProfileCard with student metadata and action buttons', () => {
        const onEditProfile = vi.fn();
        const onPrintReport = vi.fn();
        const onOpenPortalAccess = vi.fn();

        render(
            <MemoryRouter>
                <StudentDetailProfileCard
                    student={mockStudent}
                    canManageStudentProfile={true}
                    isOnline={true}
                    photoInputRef={{ current: null }}
                    isUploadingPhoto={false}
                    onPhotoChange={vi.fn()}
                    onEditProfile={onEditProfile}
                    onPrintReport={onPrintReport}
                    onOpenPortalAccess={onOpenPortalAccess}
                />
            </MemoryRouter>
        );

        expect(screen.getByText('Ahmad Dahlan')).toBeInTheDocument();
        expect(screen.getByText('Kelas 4A')).toBeInTheDocument();
        expect(screen.getByText('NIS: 12345')).toBeInTheDocument();
        expect(screen.getByText('NISN: 0012345678')).toBeInTheDocument();
        expect(screen.getByText(/WA: 081234567890/i)).toBeInTheDocument();

        fireEvent.click(screen.getByText('Edit Profil'));
        expect(onEditProfile).toHaveBeenCalled();

        fireEvent.click(screen.getByText('Cetak Rapor'));
        expect(onPrintReport).toHaveBeenCalled();

        fireEvent.click(screen.getByText('Akses Portal'));
        expect(onOpenPortalAccess).toHaveBeenCalled();
    });

    it('renders StudentDetailSummaryCard with attendance and violation badges', () => {
        const attendanceSummary = {
            Hadir: 80,
            Izin: 3,
            Sakit: 2,
            Alpha: 1,
            Libur: 10,
        };

        render(
            <StudentDetailSummaryCard
                selectedSemesterId="sem-1"
                selectedSemesterLabel="Semester Ganjil 2026/2027"
                onSelectSemesterId={vi.fn()}
                attendanceSummary={attendanceSummary}
                totalViolationPoints={15}
            />
        );

        expect(screen.getByText('Semester Ganjil 2026/2027')).toBeInTheDocument();
        expect(screen.getByText('80 hari')).toBeInTheDocument();
        expect(screen.getByText('3 hari')).toBeInTheDocument();
        expect(screen.getByText('2 hari')).toBeInTheDocument();
        expect(screen.getByText('1 hari')).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument();
        expect(screen.getByText('Poin Pelanggaran')).toBeInTheDocument();
        expect(screen.getByTestId('semester-selector')).toBeInTheDocument();
    });

    it('renders StudentPortalPrintSlip with student access code', () => {
        render(<StudentPortalPrintSlip student={mockStudent} />);

        expect(screen.getByText('Informasi Akses Portal Siswa')).toBeInTheDocument();
        expect(screen.getByText('DAHLAN88')).toBeInTheDocument();
        expect(screen.getByText('Ahmad Dahlan')).toBeInTheDocument();
        expect(screen.getByText('4A')).toBeInTheDocument();
    });

    it('renders StudentDetailTabsNav with badge indicators', () => {
        const tabsScrollRef = { current: document.createElement('div') };

        render(
            <Tabs value="grades">
                <StudentDetailTabsNav
                    tabsScrollRef={tabsScrollRef}
                    tabScrollState={{ left: false, right: false }}
                    activeTab="grades"
                    totalViolationPoints={25}
                    unreadMessagesCount={3}
                />
            </Tabs>
        );

        expect(screen.getByText('Nilai')).toBeInTheDocument();
        expect(screen.getByText('Keaktifan')).toBeInTheDocument();
        expect(screen.getByText('Pelanggaran')).toBeInTheDocument();
        expect(screen.getByText('25')).toBeInTheDocument();
        expect(screen.getByText('BINTANG')).toBeInTheDocument();
        expect(screen.getByText('Ekstra')).toBeInTheDocument();
        expect(screen.getByText('Prestasi')).toBeInTheDocument();
        expect(screen.getByText('Catatan Guru')).toBeInTheDocument();
        expect(screen.getByText('Perkembangan')).toBeInTheDocument();
        expect(screen.getByText('Komunikasi')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
    });
});
