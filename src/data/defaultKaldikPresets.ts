/**
 * Official Indonesian National Academic Calendar Presets
 * Standar Kalender Pendidikan Nasional (Permendikbudristek No. 12 Tahun 2024 / Kurikulum Merdeka & K-13)
 *
 * Structure:
 * - 12 Months: Juli (7) to Juni (6)
 * - 5 Weeks per month = 60 total slots per academic year (30 slots per semester)
 * - Semester 1: Juli - Desember (19 Minggu Efektif, 11 Minggu Tidak Efektif)
 * - Semester 2: Januari - Juni (19 Minggu Efektif, 11 Minggu Tidak Efektif termasuk NON_ACTIVE)
 */

import type { KaldikWeek, WeekType } from '../types/perangkatAjar';

// ============================================================================
// 1. MONTH CONSTANTS & LABELS (INDONESIAN)
// ============================================================================

export const SEMESTER_1_MONTHS = [7, 8, 9, 10, 11, 12] as const;
export const SEMESTER_2_MONTHS = [1, 2, 3, 4, 5, 6] as const;
export const ACADEMIC_MONTH_NUMBERS = [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6] as const;

export const MONTH_NAMES_ID: Record<number, string> = {
  1: 'Januari',
  2: 'Februari',
  3: 'Maret',
  4: 'April',
  5: 'Mei',
  6: 'Juni',
  7: 'Juli',
  8: 'Agustus',
  9: 'September',
  10: 'Oktober',
  11: 'November',
  12: 'Desember',
};

export const MONTH_SHORT_NAMES_ID: Record<number, string> = {
  1: 'Jan',
  2: 'Feb',
  3: 'Mar',
  4: 'Apr',
  5: 'Mei',
  6: 'Jun',
  7: 'Jul',
  8: 'Agu',
  9: 'Sep',
  10: 'Okt',
  11: 'Nov',
  12: 'Des',
};

// ============================================================================
// 2. WEEK TYPE METADATA & COLOR TOKEN MAPPINGS
// ============================================================================

export interface WeekTypeMetadata {
  type: WeekType;
  label: string;
  shortLabel: string;
  description: string;
  isEffective: boolean;
  isLockedInPromes: boolean;
  color: 'emerald' | 'sky' | 'amber' | 'purple' | 'indigo' | 'rose' | 'red' | 'teal' | 'slate';
  badgeClass: string;
  cellBgClass: string;
  cellBorderClass: string;
  patternClass: string;
  excelFillColor: string; // Hex for Excel exporter
}

export const WEEK_TYPE_METADATA: Record<WeekType, WeekTypeMetadata> = {
  KBM: {
    type: 'KBM',
    label: 'Kegiatan Belajar Mengajar',
    shortLabel: 'KBM',
    description: 'Minggu Efektif Belajar (MEB) untuk tatap muka dan kegiatan intrakurikuler',
    isEffective: true,
    isLockedInPromes: false,
    color: 'emerald',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
    cellBgClass: 'bg-emerald-50/50 hover:bg-emerald-100/50 dark:bg-emerald-950/20 dark:hover:bg-emerald-900/30',
    cellBorderClass: 'border-emerald-200 dark:border-emerald-800',
    patternClass: '',
    excelFillColor: 'FFFFFF',
  },
  MPLS: {
    type: 'MPLS',
    label: 'Masa Pengenalan Lingkungan Sekolah',
    shortLabel: 'MPLS',
    description: 'Orientasi peserta didik baru di awal semester 1',
    isEffective: false,
    isLockedInPromes: true,
    color: 'sky',
    badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border-sky-300 dark:border-sky-700',
    cellBgClass: 'bg-sky-50 dark:bg-sky-950/30',
    cellBorderClass: 'border-sky-200 dark:border-sky-800',
    patternClass: 'bg-[repeating-linear-gradient(45deg,rgba(14,165,233,0.1),rgba(14,165,233,0.1)_6px,transparent_6px,transparent_12px)]',
    excelFillColor: 'E0F2FE',
  },
  STS: {
    type: 'STS',
    label: 'Sumatif Tengah Semester',
    shortLabel: 'STS',
    description: 'Penilaian Tengah Semester (PTS) / Sumatif Tengah Semester',
    isEffective: false,
    isLockedInPromes: true,
    color: 'amber',
    badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    cellBgClass: 'bg-amber-50 dark:bg-amber-950/30',
    cellBorderClass: 'border-amber-200 dark:border-amber-800',
    patternClass: 'bg-[repeating-linear-gradient(45deg,rgba(245,158,11,0.1),rgba(245,158,11,0.1)_6px,transparent_6px,transparent_12px)]',
    excelFillColor: 'FEF3C7',
  },
  SAS: {
    type: 'SAS',
    label: 'Sumatif Akhir Semester / Tahun',
    shortLabel: 'SAS',
    description: 'Penilaian Akhir Semester (PAS / SAS) atau Penilaian Akhir Tahun (PAT / SAT)',
    isEffective: false,
    isLockedInPromes: true,
    color: 'purple',
    badgeClass: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-300 dark:border-purple-700',
    cellBgClass: 'bg-purple-50 dark:bg-purple-950/30',
    cellBorderClass: 'border-purple-200 dark:border-purple-800',
    patternClass: 'bg-[repeating-linear-gradient(45deg,rgba(168,85,247,0.1),rgba(168,85,247,0.1)_6px,transparent_6px,transparent_12px)]',
    excelFillColor: 'F3E8FF',
  },
  RAPOR: {
    type: 'RAPOR',
    label: 'Penyerahan Buku Rapor',
    shortLabel: 'Rapor',
    description: 'Pengolahan nilai akhir dan pembagian laporan hasil belajar peserta didik',
    isEffective: false,
    isLockedInPromes: true,
    color: 'indigo',
    badgeClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700',
    cellBgClass: 'bg-indigo-50 dark:bg-indigo-950/30',
    cellBorderClass: 'border-indigo-200 dark:border-indigo-800',
    patternClass: 'bg-[repeating-linear-gradient(45deg,rgba(99,102,241,0.1),rgba(99,102,241,0.1)_6px,transparent_6px,transparent_12px)]',
    excelFillColor: 'E0E7FF',
  },
  LIBUR_SEMESTER: {
    type: 'LIBUR_SEMESTER',
    label: 'Libur Akhir Semester',
    shortLabel: 'Libur Sem',
    description: 'Libur semester ganjil atau libur kenaikan kelas (akhir tahun pelajaran)',
    isEffective: false,
    isLockedInPromes: true,
    color: 'rose',
    badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-300 dark:border-rose-700',
    cellBgClass: 'bg-rose-50 dark:bg-rose-950/30',
    cellBorderClass: 'border-rose-200 dark:border-rose-800',
    patternClass: 'bg-[repeating-linear-gradient(45deg,rgba(244,63,94,0.12),rgba(244,63,94,0.12)_6px,transparent_6px,transparent_12px)]',
    excelFillColor: 'FFE4E6',
  },
  LIBUR_NASIONAL: {
    type: 'LIBUR_NASIONAL',
    label: 'Libur Nasional & Cuti Bersama',
    shortLabel: 'Libur Nas',
    description: 'Hari libur resmi nasional, keagamaan, atau cuti bersama pemerintah',
    isEffective: false,
    isLockedInPromes: true,
    color: 'red',
    badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-300 dark:border-red-700',
    cellBgClass: 'bg-red-50 dark:bg-red-950/30',
    cellBorderClass: 'border-red-200 dark:border-red-800',
    patternClass: 'bg-[repeating-linear-gradient(45deg,rgba(239,68,68,0.12),rgba(239,68,68,0.12)_6px,transparent_6px,transparent_12px)]',
    excelFillColor: 'FEE2E2',
  },
  KEGIATAN_KHUSUS: {
    type: 'KEGIATAN_KHUSUS',
    label: 'Kegiatan Khusus Sekolah',
    shortLabel: 'Khusus',
    description: 'Class meeting, projek penguatan profil pelajar Pancasila (P5), HUT RI, atau jeda semester',
    isEffective: false,
    isLockedInPromes: true,
    color: 'teal',
    badgeClass: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300 border-teal-300 dark:border-teal-700',
    cellBgClass: 'bg-teal-50 dark:bg-teal-950/30',
    cellBorderClass: 'border-teal-200 dark:border-teal-800',
    patternClass: 'bg-[repeating-linear-gradient(45deg,rgba(20,184,166,0.1),rgba(20,184,166,0.1)_6px,transparent_6px,transparent_12px)]',
    excelFillColor: 'CCFBF1',
  },
  NON_ACTIVE: {
    type: 'NON_ACTIVE',
    label: 'Minggu Tidak Aktif Kalender',
    shortLabel: 'Non-Aktif',
    description: 'Slot minggu ke-5 pada bulan kalender yang hanya memiliki 4 pekan aktif (contoh: Februari)',
    isEffective: false,
    isLockedInPromes: true,
    color: 'slate',
    badgeClass: 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700',
    cellBgClass: 'bg-slate-100/70 text-slate-400 dark:bg-slate-900/50 dark:text-slate-600 cursor-not-allowed',
    cellBorderClass: 'border-slate-200 dark:border-slate-800',
    patternClass: 'bg-[repeating-linear-gradient(45deg,rgba(100,116,139,0.15),rgba(100,116,139,0.15)_4px,transparent_4px,transparent_8px)] opacity-50 cursor-not-allowed',
    excelFillColor: 'E2E8F0',
  },
};

// ============================================================================
// 3. CANONICAL 60-SLOT NATIONAL KALDIK PRESET (SEMESTER 1 & SEMESTER 2)
// ============================================================================

export const DEFAULT_NATIONAL_KALDIK_PRESET: readonly KaldikWeek[] = Object.freeze([
  // --------------------------------------------------------------------------
  // SEMESTER 1 (GANJIL) — 30 SLOTS (JULI - DESEMBER)
  // --------------------------------------------------------------------------
  // Juli (Month 7)
  { month: 7, weekNumber: 1, type: 'LIBUR_SEMESTER', label: 'Libur Akhir Tahun Ajaran Lalu' },
  { month: 7, weekNumber: 2, type: 'LIBUR_SEMESTER', label: 'Libur Akhir Tahun Ajaran Lalu / Masa Persiapan' },
  { month: 7, weekNumber: 3, type: 'MPLS', label: 'Masa Pengenalan Lingkungan Sekolah (MPLS)' },
  { month: 7, weekNumber: 4, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 7, weekNumber: 5, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },

  // Agustus (Month 8)
  { month: 8, weekNumber: 1, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 8, weekNumber: 2, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 8, weekNumber: 3, type: 'KEGIATAN_KHUSUS', label: 'Peringatan HUT Kemerdekaan RI & Porseni' },
  { month: 8, weekNumber: 4, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 8, weekNumber: 5, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },

  // September (Month 9)
  { month: 9, weekNumber: 1, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 9, weekNumber: 2, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 9, weekNumber: 3, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 9, weekNumber: 4, type: 'STS', label: 'Sumatif Tengah Semester (STS) Ganjil' },
  { month: 9, weekNumber: 5, type: 'KEGIATAN_KHUSUS', label: 'Jeda Tengah Semester / Projek P5' },

  // Oktober (Month 10)
  { month: 10, weekNumber: 1, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 10, weekNumber: 2, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 10, weekNumber: 3, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 10, weekNumber: 4, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 10, weekNumber: 5, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },

  // November (Month 11)
  { month: 11, weekNumber: 1, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 11, weekNumber: 2, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 11, weekNumber: 3, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 11, weekNumber: 4, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 11, weekNumber: 5, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },

  // Desember (Month 12)
  { month: 12, weekNumber: 1, type: 'SAS', label: 'Sumatif Akhir Semester (SAS) Ganjil' },
  { month: 12, weekNumber: 2, type: 'KEGIATAN_KHUSUS', label: 'Class Meeting / Remedial & Pengayaan' },
  { month: 12, weekNumber: 3, type: 'RAPOR', label: 'Pembagian Buku Rapor Semester 1' },
  { month: 12, weekNumber: 4, type: 'LIBUR_SEMESTER', label: 'Libur Akhir Semester Ganjil & Natal' },
  { month: 12, weekNumber: 5, type: 'LIBUR_SEMESTER', label: 'Libur Akhir Semester Ganjil & Tahun Baru' },

  // --------------------------------------------------------------------------
  // SEMESTER 2 (GENAP) — 30 SLOTS (JANUARI - JUNI)
  // --------------------------------------------------------------------------
  // Januari (Month 1)
  { month: 1, weekNumber: 1, type: 'LIBUR_NASIONAL', label: 'Tahun Baru Masehi & Transisi Libur Semester 1' },
  { month: 1, weekNumber: 2, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 1, weekNumber: 3, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 1, weekNumber: 4, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 1, weekNumber: 5, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },

  // Februari (Month 2) — Catatan: W5 adalah NON_ACTIVE (Februari 4 pekan kalender)
  { month: 2, weekNumber: 1, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 2, weekNumber: 2, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 2, weekNumber: 3, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 2, weekNumber: 4, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 2, weekNumber: 5, type: 'NON_ACTIVE', label: 'Minggu Tidak Aktif Kalender (Februari 4 Pekan)' },

  // Maret (Month 3)
  { month: 3, weekNumber: 1, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 3, weekNumber: 2, type: 'STS', label: 'Sumatif Tengah Semester (STS) Genap' },
  { month: 3, weekNumber: 3, type: 'KEGIATAN_KHUSUS', label: 'Jeda STS / Pesantren Kilat Ramadhan' },
  { month: 3, weekNumber: 4, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 3, weekNumber: 5, type: 'LIBUR_NASIONAL', label: 'Libur Hari Raya Idul Fitri / Hari Besar' },

  // April (Month 4)
  { month: 4, weekNumber: 1, type: 'LIBUR_NASIONAL', label: 'Cuti Bersama Hari Raya Idul Fitri' },
  { month: 4, weekNumber: 2, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 4, weekNumber: 3, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 4, weekNumber: 4, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 4, weekNumber: 5, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },

  // Mei (Month 5)
  { month: 5, weekNumber: 1, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 5, weekNumber: 2, type: 'KEGIATAN_KHUSUS', label: 'Asesmen Sekolah / Ujian Sekolah Tingkat Akhir' },
  { month: 5, weekNumber: 3, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 5, weekNumber: 4, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 5, weekNumber: 5, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },

  // Juni (Month 6)
  { month: 6, weekNumber: 1, type: 'KBM', label: 'Kegiatan Belajar Mengajar Efektif' },
  { month: 6, weekNumber: 2, type: 'SAS', label: 'Sumatif Akhir Tahun (SAT) / SAS Genap' },
  { month: 6, weekNumber: 3, type: 'RAPOR', label: 'Pembagian Buku Rapor Kenaikan Kelas' },
  { month: 6, weekNumber: 4, type: 'LIBUR_SEMESTER', label: 'Libur Akhir Tahun Ajaran / Kenaikan Kelas' },
  { month: 6, weekNumber: 5, type: 'LIBUR_SEMESTER', label: 'Libur Akhir Tahun Ajaran / Kenaikan Kelas' },
]);

// ============================================================================
// 4. FACTORY & HELPER FUNCTIONS
// ============================================================================

/**
 * Returns a fresh, deeply-cloned 60-week array for the specified academic year.
 * Ensures caller modifications do not mutate the constant preset.
 */
export function getDefaultNationalKaldik(academicYear: string = '2024/2025'): KaldikWeek[] {
  return DEFAULT_NATIONAL_KALDIK_PRESET.map((w) => ({
    month: w.month,
    weekNumber: w.weekNumber,
    type: w.type,
    label: w.label,
    academicYear,
  }));
}

/**
 * Helper to determine if a week type counts as effective teaching (KBM)
 */
export function isEffectiveWeek(type: WeekType): boolean {
  return type === 'KBM';
}

/**
 * Returns semester number (1 or 2) given a calendar month (1-12)
 * July (7) - December (12) -> Semester 1
 * January (1) - June (6) -> Semester 2
 */
export function getSemesterForMonth(month: number): 1 | 2 {
  return month >= 7 && month <= 12 ? 1 : 2;
}

/**
 * Returns 0-based monthIndex (0 to 5) for Promes matrix columns
 * Semester 1: Jul (7)->0, Agu (8)->1, Sep (9)->2, Okt (10)->3, Nov (11)->4, Des (12)->5
 * Semester 2: Jan (1)->0, Feb (2)->1, Mar (3)->2, Apr (4)->3, Mei (5)->4, Jun (6)->5
 */
export function getMonthIndexInSemester(month: number): number {
  return month >= 7 ? month - 7 : month - 1;
}

/**
 * Inverse mapping: converts semester and 0-based monthIndex (0-5) back to calendar month (1-12)
 */
export function getMonthFromSemesterIndex(semester: 1 | 2, monthIndex: number): number {
  if (monthIndex < 0 || monthIndex > 5) {
    throw new RangeError(`Invalid monthIndex: ${monthIndex}. Must be between 0 and 5.`);
  }
  return semester === 1 ? monthIndex + 7 : monthIndex + 1;
}

/**
 * Returns metadata for a given week type (label, color, styling tokens)
 */
export function getWeekTypeMetadata(type: WeekType): WeekTypeMetadata {
  return WEEK_TYPE_METADATA[type];
}

/**
 * Returns the 30 weeks belonging to the specified semester
 */
export function getWeeksForSemester(weeks: KaldikWeek[], semester: 1 | 2): KaldikWeek[] {
  const allowedMonths = semester === 1 ? SEMESTER_1_MONTHS : SEMESTER_2_MONTHS;
  return weeks.filter((w) => (allowedMonths as readonly number[]).includes(w.month));
}

/**
 * Computes effective weeks (MEB) count for the specified semester
 */
export function getEffectiveWeeksCount(weeks: KaldikWeek[], semester: 1 | 2): number {
  const semesterWeeks = getWeeksForSemester(weeks, semester);
  return semesterWeeks.filter((w) => w.type === 'KBM').length;
}
