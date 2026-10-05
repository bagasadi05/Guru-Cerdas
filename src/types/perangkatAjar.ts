/**
 * @fileoverview Domain types and state interfaces for Perangkat Ajar (Prota, Promes, Kaldik, & RME).
 *
 * This file serves as the single source of truth for the Perangkat Ajar module, covering:
 * - Milestone M1: Kalender Pendidikan (Kaldik) & Rincian Minggu Efektif (RME)
 * - Milestone M2: Program Tahunan (Prota) allocation & balance validation
 * - Milestone M3: Program Semester (Promes) 2D distribution matrix & auto-fill
 * - Milestone M4: Official Kemendikbudristek document identity & export configurations
 * - Milestone M5: Supabase persistence models & bidirectional domain adapters
 *
 * @module types/perangkatAjar
 */

// =============================================================================
// 1. TAXONOMY & ENUMS (Week Types & Calendar Grid) - MILESTONE M1
// =============================================================================

/**
 * Classification of an academic week within the educational calendar (Kaldik).
 * - `KBM`: Effective teaching and learning week (Kegiatan Belajar Mengajar)
 * - `MPLS`: Masa Pengenalan Lingkungan Sekolah
 * - `STS`: Sumatif Tengah Semester / Penilaian Tengah Semester
 * - `SAS`: Sumatif Akhir Semester / Asesmen Akhir Tahun (SAT)
 * - `RAPOR`: Pembagian Rapor & Evaluasi Hasil Belajar
 * - `LIBUR_SEMESTER`: Libur Akhir Semester (Ganjil / Genap)
 * - `LIBUR_NASIONAL`: Hari Libur Nasional & Cuti Bersama
 * - `KEGIATAN_KHUSUS`: Class meeting, jeda semester, perayaan hari besar, P5 fest
 * - `NON_ACTIVE`: Minggu non-aktif / slot kosong di luar jadwal kalender
 */
export type WeekType =
  | 'KBM'
  | 'MPLS'
  | 'STS'
  | 'SAS'
  | 'RAPOR'
  | 'LIBUR_SEMESTER'
  | 'LIBUR_NASIONAL'
  | 'KEGIATAN_KHUSUS'
  | 'NON_ACTIVE';

/**
 * Array of all week classification types for iteration and validation.
 */
export const WEEK_TYPES: readonly WeekType[] = [
  'KBM',
  'MPLS',
  'STS',
  'SAS',
  'RAPOR',
  'LIBUR_SEMESTER',
  'LIBUR_NASIONAL',
  'KEGIATAN_KHUSUS',
  'NON_ACTIVE',
] as const;

/**
 * Standard Indonesian human-readable labels for week types.
 */
export const WEEK_TYPE_LABELS: Record<WeekType, string> = {
  KBM: 'KBM Efektif (Belajar Mengajar)',
  MPLS: 'Masa Pengenalan Lingkungan Sekolah (MPLS)',
  STS: 'Sumatif Tengah Semester (STS)',
  SAS: 'Sumatif Akhir Semester (SAS / SAT)',
  RAPOR: 'Penyerahan / Pembagian Rapor',
  LIBUR_SEMESTER: 'Libur Akhir Semester',
  LIBUR_NASIONAL: 'Libur Nasional & Cuti Bersama',
  KEGIATAN_KHUSUS: 'Kegiatan Khusus / Class Meeting / P5',
  NON_ACTIVE: 'Non-Aktif / Slot Kosong',
};

/**
 * Compact labels for dense calendar cells and matrix header badges.
 */
export const WEEK_TYPE_SHORT_LABELS: Record<WeekType, string> = {
  KBM: 'KBM',
  MPLS: 'MPLS',
  STS: 'STS',
  SAS: 'SAS',
  RAPOR: 'Rapor',
  LIBUR_SEMESTER: 'Libur Sem',
  LIBUR_NASIONAL: 'Libur Nas',
  KEGIATAN_KHUSUS: 'Khusus',
  NON_ACTIVE: 'Non-Aktif',
};

/**
 * Theme colors and Tailwind CSS class configurations for week badges and cell highlights.
 */
export interface WeekTypeStyle {
  bg: string;
  text: string;
  border: string;
  badgeBg: string;
  hex: string;
}

export const WEEK_TYPE_STYLES: Record<WeekType, WeekTypeStyle> = {
  KBM: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    hex: '#10B981',
  },
  MPLS: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    badgeBg: 'bg-blue-100 dark:bg-blue-900/50',
    hex: '#3B82F6',
  },
  STS: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/50',
    hex: '#F59E0B',
  },
  SAS: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
    badgeBg: 'bg-purple-100 dark:bg-purple-900/50',
    hex: '#8B5CF6',
  },
  RAPOR: {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    text: 'text-orange-700 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
    badgeBg: 'bg-orange-100 dark:bg-orange-900/50',
    hex: '#F97316',
  },
  LIBUR_SEMESTER: {
    bg: 'bg-rose-50 dark:bg-rose-950/30',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800',
    badgeBg: 'bg-rose-100 dark:bg-rose-900/50',
    hex: '#F43F5E',
  },
  LIBUR_NASIONAL: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-700 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
    badgeBg: 'bg-red-100 dark:bg-red-900/50',
    hex: '#EF4444',
  },
  KEGIATAN_KHUSUS: {
    bg: 'bg-teal-50 dark:bg-teal-950/30',
    text: 'text-teal-700 dark:text-teal-400',
    border: 'border-teal-200 dark:border-teal-800',
    badgeBg: 'bg-teal-100 dark:bg-teal-900/50',
    hex: '#14B8A6',
  },
  NON_ACTIVE: {
    bg: 'bg-slate-100 dark:bg-slate-800/40',
    text: 'text-slate-500 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-700',
    badgeBg: 'bg-slate-200 dark:bg-slate-800',
    hex: '#94A3B8',
  },
};

/**
 * Predicate to determine whether a week type constitutes effective teaching time (KBM).
 */
export const isEffectiveWeek = (type: WeekType): boolean => type === 'KBM';

// =============================================================================
// 2. CALENDAR GRID & RME SUMMARY - MILESTONE M1
// =============================================================================

/**
 * Metadata for a calendar month within the 12-month Indonesian academic year cycle.
 * The academic year starts in July (month 7) and ends in June (month 6).
 */
export interface MonthMeta {
  monthNumber: number; // 1-12
  name: string; // 'Juli', 'Agustus', ..., 'Juni'
  shortName: string; // 'Jul', 'Agu', ..., 'Jun'
  semesterNumber: 1 | 2;
  displayIndex: number; // 0 (Juli) to 11 (Juni)
  academicOrder: number; // 1 to 12
}

/**
 * Standard Indonesian academic year months ordered chronologically:
 * Semester 1: Juli - Desember (Months 7, 8, 9, 10, 11, 12)
 * Semester 2: Januari - Juni (Months 1, 2, 3, 4, 5, 6)
 */
export const ACADEMIC_MONTHS: readonly MonthMeta[] = [
  { monthNumber: 7, name: 'Juli', shortName: 'Jul', semesterNumber: 1, displayIndex: 0, academicOrder: 1 },
  { monthNumber: 8, name: 'Agustus', shortName: 'Agu', semesterNumber: 1, displayIndex: 1, academicOrder: 2 },
  { monthNumber: 9, name: 'September', shortName: 'Sep', semesterNumber: 1, displayIndex: 2, academicOrder: 3 },
  { monthNumber: 10, name: 'Oktober', shortName: 'Okt', semesterNumber: 1, displayIndex: 3, academicOrder: 4 },
  { monthNumber: 11, name: 'November', shortName: 'Nov', semesterNumber: 1, displayIndex: 4, academicOrder: 5 },
  { monthNumber: 12, name: 'Desember', shortName: 'Des', semesterNumber: 1, displayIndex: 5, academicOrder: 6 },
  { monthNumber: 1, name: 'Januari', shortName: 'Jan', semesterNumber: 2, displayIndex: 6, academicOrder: 7 },
  { monthNumber: 2, name: 'Februari', shortName: 'Feb', semesterNumber: 2, displayIndex: 7, academicOrder: 8 },
  { monthNumber: 3, name: 'Maret', shortName: 'Mar', semesterNumber: 2, displayIndex: 8, academicOrder: 9 },
  { monthNumber: 4, name: 'April', shortName: 'Apr', semesterNumber: 2, displayIndex: 9, academicOrder: 10 },
  { monthNumber: 5, name: 'Mei', shortName: 'Mei', semesterNumber: 2, displayIndex: 10, academicOrder: 11 },
  { monthNumber: 6, name: 'Juni', shortName: 'Jun', semesterNumber: 2, displayIndex: 11, academicOrder: 12 },
] as const;

/**
 * Represents a single weekly slot in the Educational Calendar (Kaldik).
 */
export interface KaldikWeek {
  id?: string;
  month: number; // 1-12 (July = 7, August = 8, ..., June = 6)
  weekNumber: number; // 1-5
  type: WeekType;
  label?: string;
  academicYear?: string;
  semesterNumber?: 1 | 2;
  notes?: string;
}

/**
 * Configuration options for an academic year calendar session.
 */
export interface AcademicYearConfig {
  academicYear: string; // e.g. "2024/2025" or "2026/2027"
  yearStart: number; // 2024
  yearEnd: number; // 2025
  semester1Months: readonly number[]; // [7, 8, 9, 10, 11, 12]
  semester2Months: readonly number[]; // [1, 2, 3, 4, 5, 6]
  weeksPerMonth: number; // 5
  defaultWeeklyJp: number; // Default weekly teaching hours (JP), e.g. 2, 3, or 4
  label?: string;
}

/**
 * Default configuration generator for academic years.
 */
export function createDefaultAcademicYearConfig(academicYear: string = '2024/2025'): AcademicYearConfig {
  const parts = academicYear.split('/');
  const yearStart = parseInt(parts[0], 10) || new Date().getFullYear();
  const yearEnd = parseInt(parts[1], 10) || yearStart + 1;

  return {
    academicYear,
    yearStart,
    yearEnd,
    semester1Months: [7, 8, 9, 10, 11, 12],
    semester2Months: [1, 2, 3, 4, 5, 6],
    weeksPerMonth: 5,
    defaultWeeklyJp: 2,
    label: `Tahun Ajaran ${academicYear}`,
  };
}

/**
 * Rincian Minggu Efektif (RME) mathematical calculation result for one semester.
 */
export interface RmeSummary {
  semesterNumber: 1 | 2;
  totalWeeks: number;
  effectiveWeeks: number;
  nonEffectiveWeeks: number;
  nonEffectiveBreakdown: Record<WeekType, number>;
  weeklyJpQuota: number;
  totalAvailableJp: number; // effectiveWeeks * weeklyJpQuota
  reserveJp: number;
  netTeachingJp: number; // totalAvailableJp - reserveJp
}

// =============================================================================
// 3. ANNUAL PROGRAM (PROTA) BUILDER & VALIDATION - MILESTONE M2
// =============================================================================

/** Curriculum framework types */
export type CurriculumType = 'MERDEKA' | 'K13';
export const CURRICULUM_TYPES: readonly CurriculumType[] = ['MERDEKA', 'K13'] as const;

/** Kurikulum Merdeka education phases */
export type PhaseType = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export const PHASE_TYPES: readonly PhaseType[] = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

/** Balance status comparing allocated hours against the curriculum target quota */
export type ProtaBalanceStatus = 'PAS' | 'DEFISIT' | 'SURPLUS';

export const PROTA_BALANCE_STATUS_LABELS: Record<ProtaBalanceStatus, string> = {
  PAS: 'Sesuai Target (Pas)',
  DEFISIT: 'Kurang Jam (Defisit)',
  SURPLUS: 'Kelebihan Jam (Surplus)',
};

/**
 * Single learning objective row in the Annual Program (Prota).
 * Supports both Kurikulum Merdeka (CP/Elemen/TP) and K-13 (KI/KD/Materi Pokok).
 */
export interface ProtaItem {
  id: string;
  semesterNumber: 1 | 2;
  elementOrDomain: string; // Elemen (Kurikulum Merdeka) or KI/KD (K-13)
  learningObjectiveCode: string; // e.g. "TP 1.1", "10.1" or "KD 3.1"
  learningObjectiveText: string; // Deskripsi TP / KD
  coreTopic: string; // Materi Pokok / Lingkup Materi
  targetJp: number; // Alokasi Waktu (JP)
  orderIndex: number;
}

/**
 * Evaluation of annual and semester-level JP allocations against RME targets.
 */
export interface ProtaValidationResult {
  totalTargetJp: number;
  allocatedSemester1Jp: number;
  allocatedSemester2Jp: number;
  allocatedAnnualJp: number;
  diffSemester1: number; // allocatedSemester1Jp - targetSemester1Jp
  diffSemester2: number; // allocatedSemester2Jp - targetSemester2Jp
  diffAnnual: number; // allocatedAnnualJp - totalTargetJp
  statusSemester1: ProtaBalanceStatus;
  statusSemester2: ProtaBalanceStatus;
  statusAnnual: ProtaBalanceStatus;
  deficitJpSemester1: number;
  surplusJpSemester1: number;
  deficitJpSemester2: number;
  surplusJpSemester2: number;
}

/**
 * Top-level header metadata for an Annual Program (Prota).
 */
export interface ProtaHeader {
  id: string;
  userId: string;
  academicYear: string;
  subject: string;
  gradeLevel: string;
  phase?: PhaseType;
  curriculum: CurriculumType;
  weeklyJpQuota: number;
  reserveJpSem1: number;
  reserveJpSem2: number;
  createdAt?: string;
  updatedAt?: string;
}

// =============================================================================
// 4. SEMESTER PROGRAM (PROMES) MATRIX ENGINE - MILESTONE M3
// =============================================================================

/** Match status of distributed hours against a ProtaItem's target JP */
export type AllocationMatchStatus = 'SESUAI' | 'KURANG' | 'LEBIH';

/**
 * Individual cell in the Promes 2D distribution spreadsheet matrix.
 * Dimensions: Rows (ProtaItem) × Columns (6 Months × 5 Weeks = 30 week slots).
 */
export interface MatrixCell {
  rowId: string; // Foreign key to ProtaItem.id
  monthIndex: number; // 0 to 5 for semester months (e.g. 0=Jul, 5=Des in Sem 1)
  weekNumber: number; // 1 to 5
  allocatedJp: number; // Number of hours assigned to this week
  isLocked: boolean; // Locked if non-effective week in Kaldik
  lockReason?: WeekType; // Reason if locked (e.g. 'MPLS', 'STS', 'LIBUR_SEMESTER')
  /** Set by the teacher's own edit; auto-distribution keeps it as is. */
  isManual?: boolean;
}

/**
 * Row-level status indicator tracking whether a ProtaItem has been fully distributed.
 */
export interface MatrixRowStatus {
  rowId: string;
  targetJp: number;
  distributedJp: number;
  difference: number; // distributedJp - targetJp
  status: AllocationMatchStatus;
}

/**
 * Input parameters for the sequential auto-distribution ("Quick Fill") algorithm.
 */
export interface AutoDistributeInput {
  items: Array<{ id: string; targetJp: number }>;
  semesterWeeks: KaldikWeek[];
  weeklyJpLimit: number;
  /** When set, `semesterWeeks` may hold the whole year; only this semester's weeks are used. */
  semesterNumber?: 1 | 2;
  /** Current cells; those marked `isManual` are kept and count toward their item's hours. */
  fixedCells?: MatrixCell[];
}

/**
 * Column sum metric per week column in the Promes matrix.
 */
export interface ColumnWeeklySum {
  monthIndex: number;
  weekNumber: number;
  totalJp: number;
  exceedsLimit: boolean;
}

/**
 * Header metadata for a Semester Program (Promes).
 */
export interface PromesHeader {
  id: string;
  protaId: string;
  userId: string;
  semesterNumber: 1 | 2;
  weeklyJpLimit: number;
  createdAt?: string;
  updatedAt?: string;
}

// =============================================================================
// 5. OFFICIAL EXPORT & DOCUMENT IDENTITY - MILESTONE M4
// =============================================================================

/**
 * Standard 2-column Kemendikbudristek document identity and formal signature block.
 */
export interface DocumentIdentity {
  ministryName?: string;
  regionalOffice?: string;
  schoolName: string;
  schoolAddress: string;
  schoolPhone?: string;
  schoolEmail?: string;
  schoolWebsite?: string;
  schoolNpsn?: string;
  schoolNsm?: string;
  showLogos?: boolean;
  subject: string;
  gradeLevel: string;
  phase?: string;
  curriculum?: CurriculumType;
  academicYear: string;
  semesterNumber?: 1 | 2;
  principalRole?: string;
  principalName: string;
  principalNip: string;
  teacherRole?: string;
  teacherName: string;
  teacherNip: string;
  city: string;
  signatureDate: string;
}

export type ExportDocumentType = 'PROTA' | 'PROMES' | 'KALDIK' | 'RME';
export type ExportFileFormat = 'XLSX' | 'DOCX' | 'PDF' | 'PRINT';

export interface ExportPerangkatAjarOptions {
  paperSize?: 'A4';
  orientation?: 'portrait' | 'landscape';
  includeKopSurat?: boolean;
  includeSignatures?: boolean;
}

// =============================================================================
// 6. PERSISTENCE MODELS (SUPABASE POSTGRESQL & OFFLINE CACHE) - MILESTONE M5
// =============================================================================

/** Persisted Kaldik week entry in public.kaldik_entries */
export interface KaldikEntryRow {
  id: string;
  user_id: string;
  academic_year: string;
  semester_number: number;
  month: number;
  week_number: number;
  type: WeekType;
  label: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type KaldikEntryInsert = Omit<KaldikEntryRow, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

export type KaldikEntryUpdate = Partial<Omit<KaldikEntryRow, 'id' | 'user_id' | 'created_at'>>;

/** Persisted Prota header in public.prota_headers */
export interface ProtaHeaderRow {
  id: string;
  user_id: string;
  academic_year: string;
  subject: string;
  grade_level: string;
  phase: string | null;
  curriculum: string;
  weekly_jp_quota: number;
  reserve_jp_sem1: number;
  reserve_jp_sem2: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type ProtaHeaderInsert = Omit<ProtaHeaderRow, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

export type ProtaHeaderUpdate = Partial<Omit<ProtaHeaderRow, 'id' | 'user_id' | 'created_at'>>;

/** Persisted Prota item in public.prota_items */
export interface ProtaItemRow {
  id: string;
  prota_id: string;
  user_id: string;
  semester_number: number;
  element_or_domain: string;
  learning_objective_code: string;
  learning_objective_text: string;
  core_topic: string;
  target_jp: number;
  order_index: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type ProtaItemInsert = Omit<ProtaItemRow, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

export type ProtaItemUpdate = Partial<Omit<ProtaItemRow, 'id' | 'prota_id' | 'user_id' | 'created_at'>>;

/** Persisted Promes header in public.promes_headers */
export interface PromesHeaderRow {
  id: string;
  prota_id: string;
  user_id: string;
  semester_number: number;
  weekly_jp_limit: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type PromesHeaderInsert = Omit<PromesHeaderRow, 'id' | 'created_at' | 'updated_at' | 'deleted_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

export type PromesHeaderUpdate = Partial<Omit<PromesHeaderRow, 'id' | 'prota_id' | 'user_id' | 'created_at'>>;

/** Persisted Promes weekly cell allocation in public.promes_weekly_allocations */
export interface PromesWeeklyAllocationRow {
  id: string;
  promes_id: string;
  prota_item_id: string;
  user_id: string;
  month_index: number;
  week_number: number;
  allocated_jp: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type PromesWeeklyAllocationInsert = Omit<
  PromesWeeklyAllocationRow,
  'id' | 'created_at' | 'updated_at' | 'deleted_at'
> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

export type PromesWeeklyAllocationUpdate = Partial<
  Omit<PromesWeeklyAllocationRow, 'id' | 'promes_id' | 'user_id' | 'created_at'>
>;

// =============================================================================
// 7. BIDIRECTIONAL DOMAIN <-> PERSISTENCE ADAPTERS
// =============================================================================

/**
 * Converts a domain KaldikWeek entity into a database insert payload.
 */
export function kaldikWeekToRowInsert(
  week: KaldikWeek,
  userId: string,
  academicYear: string,
  semesterNumber: 1 | 2
): KaldikEntryInsert {
  return {
    id: week.id,
    user_id: userId,
    academic_year: academicYear,
    semester_number: semesterNumber,
    month: week.month,
    week_number: week.weekNumber,
    type: week.type,
    label: week.label ?? null,
    notes: week.notes ?? null,
  };
}

/**
 * Converts a database KaldikEntryRow into a domain KaldikWeek entity.
 */
export function rowToKaldikWeek(row: KaldikEntryRow): KaldikWeek {
  return {
    id: row.id,
    month: row.month,
    weekNumber: row.week_number,
    type: row.type,
    label: row.label ?? undefined,
    semesterNumber: row.semester_number === 1 || row.semester_number === 2 ? row.semester_number : undefined,
    notes: row.notes ?? undefined,
    academicYear: row.academic_year,
  };
}

/**
 * Converts a domain ProtaItem entity into a database insert payload.
 */
export function protaItemToRowInsert(
  item: ProtaItem,
  protaId: string,
  userId: string
): ProtaItemInsert {
  return {
    id: item.id,
    prota_id: protaId,
    user_id: userId,
    semester_number: item.semesterNumber,
    element_or_domain: item.elementOrDomain,
    learning_objective_code: item.learningObjectiveCode,
    learning_objective_text: item.learningObjectiveText,
    core_topic: item.coreTopic,
    target_jp: item.targetJp,
    order_index: item.orderIndex,
  };
}

/**
 * Converts a database ProtaItemRow into a domain ProtaItem entity.
 */
export function rowToProtaItem(row: ProtaItemRow): ProtaItem {
  return {
    id: row.id,
    semesterNumber: (row.semester_number as 1 | 2) || 1,
    elementOrDomain: row.element_or_domain,
    learningObjectiveCode: row.learning_objective_code,
    learningObjectiveText: row.learning_objective_text,
    coreTopic: row.core_topic,
    targetJp: row.target_jp,
    orderIndex: row.order_index,
  };
}

/**
 * Converts a domain MatrixCell entity into a database insert payload.
 */
export function matrixCellToRowInsert(
  cell: MatrixCell,
  promesId: string,
  userId: string
): PromesWeeklyAllocationInsert {
  return {
    promes_id: promesId,
    prota_item_id: cell.rowId,
    user_id: userId,
    month_index: cell.monthIndex,
    week_number: cell.weekNumber,
    allocated_jp: cell.allocatedJp,
  };
}

/**
 * Converts a database PromesWeeklyAllocationRow into a domain MatrixCell entity.
 */
export function rowToMatrixCell(
  row: PromesWeeklyAllocationRow,
  isLocked: boolean = false,
  lockReason?: WeekType
): MatrixCell {
  return {
    rowId: row.prota_item_id,
    monthIndex: row.month_index,
    weekNumber: row.week_number,
    allocatedJp: row.allocated_jp,
    isLocked,
    lockReason,
  };
}
