import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findCurriculumPreset, getCurriculumPreset } from '../../src/data/defaultProtaPresets';
import {
  getAcademicYearOptions,
  getCurrentAcademicYear,
  getPhaseForGrade,
} from '../../src/utils/kaldikEngine';

const remoteHeaders = vi.hoisted(() => ({ rows: [] as Array<Record<string, unknown>> }));

vi.mock('../../src/services/supabase', () => {
  const query = {
    select: () => query,
    eq: () => query,
    order: () => Promise.resolve({ data: remoteHeaders.rows, error: null }),
  };
  return {
    supabase: {
      from: () => query,
      auth: { getUser: () => Promise.resolve({ data: { user: { id: 'user-1' } } }) },
    },
  };
});

import { listProta } from '../../src/services/perangkatAjarService';

describe('curriculum presets per grade', () => {
  it('matches subject and grade together', () => {
    expect(findCurriculumPreset('Matematika', 'Kelas 4')?.subject).toBe('Matematika');
    expect(findCurriculumPreset('matematika', ' kelas  4 ')).not.toBeNull();
  });

  it('returns nothing for a grade the preset was not written for', () => {
    expect(findCurriculumPreset('Matematika', 'Kelas 1')).toBeNull();
    expect(findCurriculumPreset('IPAS', 'Kelas 3')).toBeNull();
    expect(getCurriculumPreset('Matematika', 'Kelas 1', 70, 70)).toBeNull();
  });

  it('does not match every preset when the subject is empty', () => {
    expect(findCurriculumPreset('', 'Kelas 4')).toBeNull();
  });
});

describe('academic year and phase helpers', () => {
  it('starts the academic year in July', () => {
    expect(getCurrentAcademicYear(new Date(2026, 5, 30))).toBe('2025/2026');
    expect(getCurrentAcademicYear(new Date(2026, 6, 1))).toBe('2026/2027');
    expect(getCurrentAcademicYear(new Date(2026, 9, 5))).toBe('2026/2027');
  });

  it('offers the neighbouring years and keeps an older saved year selectable', () => {
    const today = new Date(2026, 9, 5);
    expect(getAcademicYearOptions(today)).toEqual(['2025/2026', '2026/2027', '2027/2028']);
    expect(getAcademicYearOptions(today, '2023/2024')).toEqual([
      '2023/2024',
      '2025/2026',
      '2026/2027',
      '2027/2028',
    ]);
  });

  it('maps grades to Kurikulum Merdeka phases', () => {
    expect(getPhaseForGrade('Kelas 1')).toBe('A');
    expect(getPhaseForGrade('Kelas 4')).toBe('B');
    expect(getPhaseForGrade('kelas 6')).toBe('C');
    expect(getPhaseForGrade('Kelas 9')).toBe('D');
    expect(getPhaseForGrade('Kelas 10')).toBe('E');
    expect(getPhaseForGrade('Kelas 12')).toBe('F');
    expect(getPhaseForGrade('Kelompok B')).toBeNull();
  });
});

describe('listProta', () => {
  beforeEach(() => {
    localStorage.clear();
    remoteHeaders.rows = [];
  });

  it('merges cloud and local-only documents, newest first', async () => {
    localStorage.setItem(
      'guru_cerdas_perangkat_ajar_prota_local-1',
      JSON.stringify({
        header: { id: 'local-1', subject: 'Bahasa Jawa', gradeLevel: 'Kelas 3', academicYear: '2026/2027' },
        updatedAt: '2026-10-05T08:00:00.000Z',
      })
    );
    remoteHeaders.rows = [
      {
        id: 'cloud-1',
        subject: 'Matematika',
        grade_level: 'Kelas 4',
        academic_year: '2026/2027',
        updated_at: '2026-10-04T08:00:00.000Z',
      },
    ];

    const docs = await listProta();

    expect(docs.map((d) => d.id)).toEqual(['local-1', 'cloud-1']);
    expect(docs[1]).toMatchObject({ subject: 'Matematika', gradeLevel: 'Kelas 4' });
  });
});
