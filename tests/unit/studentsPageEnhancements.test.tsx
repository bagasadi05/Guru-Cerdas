import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { StudentStats } from '../../src/components/students/StudentStats';
import { StudentsClassTabsHeader } from '../../src/components/students/StudentsClassTabsHeader';
import { createStudentsBulkActions } from '../../src/components/students/studentsActionHelpers';
import { generateAccessCodeMessage } from '../../src/utils/whatsappUtils';
import { StudentRow, ClassRow } from '../../src/components/students/types';
import { Tabs } from '../../src/components/ui/Tabs';

describe('StudentStats Component', () => {
  const mockStudents: StudentRow[] = [
    {
      id: 's1',
      name: 'Ahmad Dahlan',
      class_id: 'c1',
      gender: 'Laki-laki',
      access_code: 'AK8912',
      avatar_url: null,
      birth_date: '2010-01-01',
      created_at: '',
      deleted_at: null,
      nis: '1001',
      nisn: '001001001',
      parent_name: 'Bapak Dahlan',
      parent_phone: '081234567890',
      user_id: 'u1',
    },
    {
      id: 's2',
      name: 'Fatimah Zahra',
      class_id: 'c1',
      gender: 'Perempuan',
      access_code: null,
      avatar_url: null,
      birth_date: '2010-02-02',
      created_at: '',
      deleted_at: null,
      nis: '1002',
      nisn: '001001002',
      parent_name: 'Ibu Zahra',
      parent_phone: '081234567891',
      user_id: 'u1',
    },
    {
      id: 's3',
      name: 'Muhammad Ali',
      class_id: 'c1',
      gender: 'Laki-laki',
      access_code: 'AK8913',
      avatar_url: null,
      birth_date: '2010-03-03',
      created_at: '',
      deleted_at: null,
      nis: '1003',
      nisn: '001001003',
      parent_name: 'Bapak Ali',
      parent_phone: '081234567892',
      user_id: 'u1',
    },
  ];

  it('renders student statistics correctly', () => {
    const onGenderChange = vi.fn();
    const onCodeChange = vi.fn();
    const onReset = vi.fn();

    render(
      <StudentStats
        students={mockStudents}
        activeClassName="7A"
        genderFilter="all"
        onGenderFilterChange={onGenderChange}
        accessCodeFilter="all"
        onAccessCodeFilterChange={onCodeChange}
        onResetFilters={onReset}
      />
    );

    // Total: 3
    const totalBtn = screen.getByLabelText(/Tampilkan semua siswa kelas ini/i);
    expect(within(totalBtn).getByText('3')).toBeInTheDocument();
    expect(within(totalBtn).getByText('Kelas 7A')).toBeInTheDocument();

    // Laki-laki: 2 (67%)
    const maleBtn = screen.getByLabelText(/Filter siswa laki-laki/i);
    expect(within(maleBtn).getByText('2')).toBeInTheDocument();
    expect(within(maleBtn).getByText('67% dari kelas')).toBeInTheDocument();

    // Perempuan: 1 (33%)
    const femaleBtn = screen.getByLabelText(/Filter siswa perempuan/i);
    expect(within(femaleBtn).getByText('1')).toBeInTheDocument();
    expect(within(femaleBtn).getByText('33% dari kelas')).toBeInTheDocument();

    // Kesiapan: 2 / 3, 1 butuh kode
    const codeBtn = screen.getByLabelText(/Status kode akses/i);
    expect(within(codeBtn).getByText('1 butuh kode akses')).toBeInTheDocument();
  });

  it('handles clicking filter cards to toggle filters', () => {
    const onGenderChange = vi.fn();
    const onCodeChange = vi.fn();
    const onReset = vi.fn();

    render(
      <StudentStats
        students={mockStudents}
        activeClassName="7A"
        genderFilter="all"
        onGenderFilterChange={onGenderChange}
        accessCodeFilter="all"
        onAccessCodeFilterChange={onCodeChange}
        onResetFilters={onReset}
      />
    );

    // Click Laki-laki card
    fireEvent.click(screen.getByLabelText(/Filter siswa laki-laki/i));
    expect(onGenderChange).toHaveBeenCalledWith('Laki-laki');

    // Click Perempuan card
    fireEvent.click(screen.getByLabelText(/Filter siswa perempuan/i));
    expect(onGenderChange).toHaveBeenCalledWith('Perempuan');

    // Click Kode Akses card
    fireEvent.click(screen.getByLabelText(/Status kode akses/i));
    expect(onCodeChange).toHaveBeenCalledWith('no_code');

    // Click Total card (reset)
    fireEvent.click(screen.getByLabelText(/Tampilkan semua siswa kelas ini/i));
    expect(onReset).toHaveBeenCalled();
  });
});

describe('StudentsClassTabsHeader with Student Counts', () => {
  const mockClasses: ClassRow[] = [
    {
      id: 'c1',
      name: 'Kelas 7A',
      user_id: 'u1',
      created_at: '',
      deleted_at: null,
      academic_year: null,
      grade_level: null,
      is_archived: false,
      updated_at: null,
      wali_kelas_id: null,
    },
    {
      id: 'c2',
      name: 'Kelas 7B',
      user_id: 'u1',
      created_at: '',
      deleted_at: null,
      academic_year: null,
      grade_level: null,
      is_archived: false,
      updated_at: null,
      wali_kelas_id: null,
    },
  ];

  it('renders class tabs with student count badges', () => {
    render(
      <Tabs defaultValue="c1">
        <StudentsClassTabsHeader
          classes={mockClasses}
          classStudentCounts={{ c1: 28, c2: 30 }}
        />
      </Tabs>
    );

    expect(screen.getByText('Kelas 7A')).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
    expect(screen.getByText('Kelas 7B')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
  });
});

describe('createStudentsBulkActions', () => {
  it('includes copy_codes action when onBulkCopyCodes is provided', () => {
    const onExport = vi.fn();
    const onGenerate = vi.fn();
    const onIDCard = vi.fn();
    const onMove = vi.fn();
    const onDelete = vi.fn();
    const onCopyCodes = vi.fn();

    const actions = createStudentsBulkActions({
      onBulkExport: onExport,
      onBulkGenerateCodes: onGenerate,
      onOpenIDCard: onIDCard,
      onOpenBulkMove: onMove,
      onBulkDelete: onDelete,
      onBulkCopyCodes: onCopyCodes,
    });

    const copyAction = actions.find((a) => a.id === 'copy_codes');
    expect(copyAction).toBeDefined();
    expect(copyAction?.label).toBe('Salin Kode');

    copyAction?.onClick(['s1', 's2']);
    expect(onCopyCodes).toHaveBeenCalledWith(['s1', 's2']);
  });
});

describe('generateAccessCodeMessage utility', () => {
  it('formats WhatsApp message with student name, access code, and greeting', () => {
    const msg = generateAccessCodeMessage('Ahmad Dahlan', 'AK8912', 'Bapak Dahlan', '7A');
    expect(msg).toContain('Ahmad Dahlan');
    expect(msg).toContain('AK8912');
    expect(msg).toContain('Bapak Dahlan');
    expect(msg).toContain('Kelas 7A');
    expect(msg).toContain('Portal Orang Tua & Siswa');
  });

  it('handles optional parentName and className gracefully', () => {
    const msg = generateAccessCodeMessage('Siti Aminah', 'AK7777');
    expect(msg).toContain('Siti Aminah');
    expect(msg).toContain('AK7777');
    expect(msg).toContain('Ayahanda/Bunda wali murid dari ananda *Siti Aminah*');
  });
});
