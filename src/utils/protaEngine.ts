/**
 * @fileoverview Pure functional calculation, curriculum mapping, and validation engine
 * for Program Tahunan (Prota).
 *
 * Implements Milestone M2 core domain logic:
 * - Kurikulum Merdeka structure mapping (Fase A-F, Capaian Pembelajaran, Elemen, TP, Lingkup Materi, JP)
 * - Kurikulum 2013 (K-13) structure mapping (KI 1-4, KD 3.x/4.x, Materi Pokok, JP)
 * - Real-time hours balance validation comparing allocated JP against RME targets
 * - Jam Cadangan (Reserve Hours) mathematical integration ($JP_{materi} + JP_{cadangan} = JP_{target}$)
 * - Recommended reserve hours calculation (5-10% of total available hours)
 * - Pure immutable utility helpers: create, sort, reorder, and filter Prota items
 * - Total defensive sanitization against NaN, null, and non-finite inputs
 * - Badge styling helper for UI status presentation
 *
 * @module utils/protaEngine
 */

import type {
  ProtaItem,
  ProtaValidationResult,
  ProtaBalanceStatus,
  CurriculumType,
  RmeSummary,
} from '../types/perangkatAjar';

export type { ProtaItem, ProtaValidationResult, ProtaBalanceStatus, CurriculumType, RmeSummary };

// =============================================================================
// 1. CURRICULUM DESCRIPTOR & LABELS (Kurikulum Merdeka & K-13 Mappings)
// =============================================================================

/**
 * Structural metadata and UI table column labels for curriculum frameworks.
 */
export interface CurriculumDescriptor {
  curriculum: CurriculumType;
  title: string;
  stageLabel: string;
  elementLabel: string;
  objectiveLabel: string;
  topicLabel: string;
  jpLabel: string;
  codePrefix: string;
  codePlaceholder: string;
  objectivePlaceholder: string;
  topicPlaceholder: string;
}

/**
 * Standard Indonesian column labels and descriptors for Kurikulum Merdeka and K-13.
 */
export const CURRICULUM_DESCRIPTORS: Record<CurriculumType, CurriculumDescriptor> = {
  MERDEKA: {
    curriculum: 'MERDEKA',
    title: 'Kurikulum Merdeka',
    stageLabel: 'Fase (A - F)',
    elementLabel: 'Elemen / Domain',
    objectiveLabel: 'Tujuan Pembelajaran (TP)',
    topicLabel: 'Materi Pokok / Lingkup Materi',
    jpLabel: 'Alokasi Waktu (JP)',
    codePrefix: 'TP',
    codePlaceholder: 'Contoh: TP 1.1 atau TP 4.1',
    objectivePlaceholder: 'Deskripsi Tujuan Pembelajaran (Capaian Pembelajaran)',
    topicPlaceholder: 'Lingkup Materi / Topik Esensial',
  },
  K13: {
    curriculum: 'K13',
    title: 'Kurikulum 2013 (K-13)',
    stageLabel: 'Kelas / Tingkat',
    elementLabel: 'Kompetensi Inti / Aspek',
    objectiveLabel: 'Kompetensi Dasar (KD 3 & KD 4)',
    topicLabel: 'Materi Pokok',
    jpLabel: 'Alokasi Waktu (JP)',
    codePrefix: 'KD',
    codePlaceholder: 'Contoh: KD 3.1 / 4.1',
    objectivePlaceholder: 'Rumusan Kompetensi Dasar (Pengetahuan & Keterampilan)',
    topicPlaceholder: 'Materi Pokok / Pokok Bahasan',
  },
};

/**
 * Returns curriculum metadata and table column labels based on curriculum type.
 *
 * @param curriculum 'MERDEKA' | 'K13'
 */
export function getCurriculumDescriptor(curriculum: CurriculumType = 'MERDEKA'): CurriculumDescriptor {
  return CURRICULUM_DESCRIPTORS[curriculum] || CURRICULUM_DESCRIPTORS.MERDEKA;
}

// =============================================================================
// 2. DEFENSIVE SANITIZATION & VALUE EXTRACTION
// =============================================================================

/**
 * Sanitizes a numeric JP (Jam Pelajaran) value to guarantee a non-negative integer.
 * Falls back to 0 for null, undefined, NaN, Infinity, negative, or non-numeric values.
 *
 * @param value Raw input value
 * @returns Non-negative integer (>= 0)
 */
export function sanitizeJp(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

/**
 * Extracts the effective teaching target hours (JP) from an RmeSummary.
 *
 * Mathematical rule:
 * Target JP is defined by `netTeachingJp` (total available JP minus Jam Cadangan).
 * If `netTeachingJp` is absent, falls back to `Math.max(0, totalAvailableJp - reserveJp)`.
 *
 * @param rme RmeSummary object or null/undefined
 * @returns Non-negative integer target JP
 */
export function extractTargetJp(rme?: RmeSummary | null): number {
  if (!rme) return 0;

  if (typeof rme.netTeachingJp === 'number' && Number.isFinite(rme.netTeachingJp)) {
    return Math.max(0, Math.floor(rme.netTeachingJp));
  }

  const available = Number.isFinite(rme.totalAvailableJp)
    ? rme.totalAvailableJp
    : (Number.isFinite(rme.effectiveWeeks) ? rme.effectiveWeeks : 0) *
      (Number.isFinite(rme.weeklyJpQuota) ? rme.weeklyJpQuota : 0);

  const reserve = Number.isFinite(rme.reserveJp) ? rme.reserveJp : 0;
  return Math.max(0, Math.floor(available - reserve));
}

// =============================================================================
// 3. JAM CADANGAN (RESERVE HOURS) MECHANICS
// =============================================================================

/**
 * Calculates recommended reserve hours (Jam Cadangan) for a semester or school year.
 * Standard Kemendikbudristek curriculum planning allocates 5% to 10% of total available hours
 * (typically 1 to 2 teaching weeks, or 2 to 6 JP) for remedial, enrichment, and contingency.
 *
 * Mathematical formula:
 * $$JP_{cadangan} = \text{round}(totalAvailableJp \times percentage)$$
 *
 * @param totalAvailableJp Total available teaching hours (effectiveWeeks * weeklyJpQuota)
 * @param percentage Recommendation ratio (defaults to 0.05, i.e. 5%, clamped to [0.01, 0.25])
 * @returns Non-negative integer representing recommended reserve JP
 */
export function calculateRecommendedReserveJp(
  totalAvailableJp: number,
  percentage: number = 0.05
): number {
  if (!Number.isFinite(totalAvailableJp) || totalAvailableJp <= 0) {
    return 0;
  }

  const sanitizedPercentage = Number.isFinite(percentage)
    ? Math.min(0.25, Math.max(0.01, percentage))
    : 0.05;

  const rawReserve = totalAvailableJp * sanitizedPercentage;
  const rounded = Math.round(rawReserve);

  // Guarantee reserve cannot exceed total available hours
  return Math.min(Math.floor(totalAvailableJp), Math.max(0, rounded));
}

/**
 * Generates a standardized ProtaItem representing Jam Cadangan (Reserve Hours).
 * Supports both signatures: (reserveJp, semester, orderIndex) and (semester, reserveJp, orderIndex).
 */
export function createJamCadanganProtaItem(
  reserveJp: number,
  semester: 1 | 2,
  orderIndex?: number
): ProtaItem;
export function createJamCadanganProtaItem(
  semester: 1 | 2,
  reserveJp: number,
  orderIndex?: number
): ProtaItem;
export function createJamCadanganProtaItem(
  arg1: number,
  arg2: 1 | 2 | number,
  orderIndex: number = 999
): ProtaItem {
  let semester: 1 | 2 = 1;
  let reserveJp = 0;

  // Determine whether called as (reserveJp, semester) or (semester, reserveJp)
  if (arg2 === 1 || arg2 === 2) {
    // Second argument is a semester (1 or 2)
    semester = arg2 as 1 | 2;
    reserveJp = arg1;
  } else if (arg1 === 1 || arg1 === 2) {
    // First argument is a semester (1 or 2)
    semester = arg1 as 1 | 2;
    reserveJp = arg2;
  } else {
    // Fallback: treat first argument as reserveJp, default semester to 1
    reserveJp = arg1;
    semester = 1;
  }

  return createProtaItem({
    semesterNumber: semester,
    elementOrDomain: 'Jam Cadangan',
    learningObjectiveCode: 'CADANGAN',
    learningObjectiveText:
      'Alokasi waktu cadangan untuk kegiatan remedial, pengayaan, asesmen akhir/susulan, atau antisipasi kegiatan insidental sekolah.',
    coreTopic: 'Cadangan / Remedial / Pengayaan',
    targetJp: sanitizeJp(reserveJp),
    orderIndex,
  });
}

/**
 * Tests whether a ProtaItem represents a Jam Cadangan row item.
 *
 * @param item ProtaItem to check
 */
export function isJamCadanganItem(item: ProtaItem): boolean {
  if (!item) return false;
  const code = (item.learningObjectiveCode || '').trim().toUpperCase();
  const domain = (item.elementOrDomain || '').trim().toLowerCase();
  return code === 'CADANGAN' || domain.includes('cadangan');
}

// =============================================================================
// 4. PROTA ITEM UTILITY HELPERS (Create, Sort, Reorder, Filter)
// =============================================================================

/**
 * Generates a guaranteed valid ProtaItem entity with sanitized values and default fields.
 *
 * @param data Optional partial fields for the ProtaItem
 * @returns Fully populated, immutable ProtaItem
 */
export function createProtaItem(data: Partial<ProtaItem> = {}): ProtaItem {
  const semesterNumber: 1 | 2 = data.semesterNumber === 2 ? 2 : 1;
  const targetJp = sanitizeJp(data.targetJp);
  const orderIndex = Number.isFinite(data.orderIndex) ? Math.max(0, Math.floor(data.orderIndex!)) : 0;

  // Generate robust identifier if not provided
  let id = typeof data.id === 'string' && data.id.trim().length > 0 ? data.id.trim() : '';
  if (!id) {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      id = crypto.randomUUID();
    } else {
      id = `prota-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
  }

  return {
    id,
    semesterNumber,
    elementOrDomain: (data.elementOrDomain || '').trim(),
    learningObjectiveCode: (data.learningObjectiveCode || '').trim(),
    learningObjectiveText: (data.learningObjectiveText || '').trim(),
    coreTopic: (data.coreTopic || '').trim(),
    targetJp,
    orderIndex,
  };
}

/**
 * Sorts ProtaItems deterministically without mutating the input array.
 * Primary sort key: semesterNumber (ascending: 1 before 2).
 * Secondary sort key: orderIndex (ascending).
 * Tertiary sort key (tie-breaker): learningObjectiveCode (natural alphanumeric collation).
 * Quaternary sort key: id (localeCompare).
 *
 * @param items Readonly array of ProtaItems
 * @returns Fresh sorted array of ProtaItems
 */
export function sortProtaItems(items: readonly ProtaItem[]): ProtaItem[] {
  if (!Array.isArray(items)) return [];

  return [...items].sort((a, b) => {
    // 1. Semester 1 before Semester 2
    const semA = a.semesterNumber ?? 1;
    const semB = b.semesterNumber ?? 1;
    if (semA !== semB) {
      return semA - semB;
    }

    // 2. Order index ascending
    const orderA = a.orderIndex ?? 0;
    const orderB = b.orderIndex ?? 0;
    if (orderA !== orderB) {
      return orderA - orderB;
    }

    // 3. Learning objective code alphanumeric tie-breaker
    const codeA = a.learningObjectiveCode || '';
    const codeB = b.learningObjectiveCode || '';
    const codeComparison = codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
    if (codeComparison !== 0) {
      return codeComparison;
    }

    // 4. Stable tie-breaker by ID
    return (a.id || '').localeCompare(b.id || '');
  });
}

/**
 * Reorders a ProtaItem from startIndex to endIndex and normalizes orderIndex
 * across all items sequentially (0, 1, 2, ..., n-1).
 * Pure functional: zero mutation on the original array.
 *
 * @param items Readonly array of ProtaItems
 * @param startIndex Current 0-based index of item to move
 * @param endIndex Target 0-based index
 * @returns Fresh array of ProtaItems with updated orderIndex values
 */
export function reorderProtaItems(
  items: readonly ProtaItem[],
  startIndex: number,
  endIndex: number
): ProtaItem[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  if (startIndex < 0 || startIndex >= items.length) {
    return items.map((item, idx) => ({ ...item, orderIndex: idx }));
  }

  const result = [...items];
  const clampedEnd = Math.max(0, Math.min(items.length - 1, endIndex));

  const [removed] = result.splice(startIndex, 1);
  result.splice(clampedEnd, 0, removed);

  // Normalize orderIndex sequentially
  return result.map((item, idx) => ({
    ...item,
    orderIndex: idx,
  }));
}

/**
 * Filters ProtaItems by semester number and returns them sorted by orderIndex.
 *
 * @param items Readonly array of ProtaItems
 * @param semester Target semester (1 or 2)
 * @returns Filtered and sorted array
 */
export function filterProtaItemsBySemester(
  items: readonly ProtaItem[],
  semester: 1 | 2
): ProtaItem[] {
  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => item && item.semesterNumber === semester)
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
}

/**
 * Computes subtotals of allocated JP grouped by semester and annual sum.
 *
 * @param items Readonly array of ProtaItems
 * @returns Object with semester1Jp, semester2Jp, and annualJp
 */
export function calculateProtaSubtotals(items: readonly ProtaItem[]): {
  semester1Jp: number;
  semester2Jp: number;
  annualJp: number;
} {
  if (!Array.isArray(items)) {
    return { semester1Jp: 0, semester2Jp: 0, annualJp: 0 };
  }

  let semester1Jp = 0;
  let semester2Jp = 0;

  for (const item of items) {
    if (!item) continue;
    const jp = sanitizeJp(item.targetJp);
    if (item.semesterNumber === 1) {
      semester1Jp += jp;
    } else if (item.semesterNumber === 2) {
      semester2Jp += jp;
    }
  }

  return {
    semester1Jp,
    semester2Jp,
    annualJp: semester1Jp + semester2Jp,
  };
}

/**
 * Moves a ProtaItem within its semester (either 'up' or 'down').
 * Maintains pure immutability and recalculates orderIndex sequentially.
 *
 * @param items Original items list
 * @param itemId ID of the item to move
 * @param direction 'up' (earlier) or 'down' (later)
 * @returns New array of ProtaItem with recomputed orderIndex
 */
export function moveProtaItem(
  items: readonly ProtaItem[],
  itemId: string,
  direction: 'up' | 'down'
): ProtaItem[] {
  if (!Array.isArray(items) || items.length <= 1) return [...items];

  const targetItem = items.find((i) => i.id === itemId);
  if (!targetItem) return [...items];

  const semNumber = targetItem.semesterNumber ?? 1;
  const sameSemItems = items
    .filter((i) => (i.semesterNumber ?? 1) === semNumber)
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
  const otherSemItems = items.filter((i) => (i.semesterNumber ?? 1) !== semNumber);

  const currentIndex = sameSemItems.findIndex((i) => i.id === itemId);
  if (currentIndex === -1) return [...items];

  const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (newIndex < 0 || newIndex >= sameSemItems.length) {
    return [...items];
  }

  const reorderedSameSem = [...sameSemItems];
  const [removed] = reorderedSameSem.splice(currentIndex, 1);
  reorderedSameSem.splice(newIndex, 0, removed);

  const normalizedSameSem = reorderedSameSem.map((it, idx) => ({
    ...it,
    orderIndex: idx,
  }));

  return [...normalizedSameSem, ...otherSemItems].sort((a, b) => {
    const semA = a.semesterNumber ?? 1;
    const semB = b.semesterNumber ?? 1;
    if (semA !== semB) return semA - semB;
    return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
  });
}

/**
 * Moves a ProtaItem to the opposite semester (1 -> 2 or 2 -> 1).
 * Appends the item to the end of the destination semester with proper orderIndex.
 *
 * @param items Original items list
 * @param itemId ID of the item to move
 * @returns New array of ProtaItem with updated semesterNumber and orderIndex
 */
export function swapItemSemester(
  items: readonly ProtaItem[],
  itemId: string
): ProtaItem[] {
  if (!Array.isArray(items)) return [];

  const targetItem = items.find((i) => i.id === itemId);
  if (!targetItem) return [...items];

  const currentSem = targetItem.semesterNumber ?? 1;
  const newSem: 1 | 2 = currentSem === 1 ? 2 : 1;

  const destSemItems = items
    .filter((i) => (i.semesterNumber ?? 1) === newSem && i.id !== itemId)
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  const remCurrentSemItems = items
    .filter((i) => (i.semesterNumber ?? 1) === currentSem && i.id !== itemId)
    .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
    .map((it, idx) => ({ ...it, orderIndex: idx }));

  const movedItem: ProtaItem = {
    ...targetItem,
    semesterNumber: newSem,
    orderIndex: destSemItems.length,
  };

  const updatedDestSemItems = [...destSemItems, movedItem].map((it, idx) => ({
    ...it,
    orderIndex: idx,
  }));

  return [...remCurrentSemItems, ...updatedDestSemItems].sort((a, b) => {
    const semA = a.semesterNumber ?? 1;
    const semB = b.semesterNumber ?? 1;
    if (semA !== semB) return semA - semB;
    return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
  });
}

// =============================================================================
// 5. BALANCE EVALUATION & STATUS BADGES
// =============================================================================

/**
 * Evaluates the balance status comparing allocated hours against target hours.
 *
 * @param diff Difference between allocated and target (allocated - target)
 * @returns 'PAS' if diff === 0, 'DEFISIT' if diff < 0, 'SURPLUS' if diff > 0
 */
export function getProtaBalanceStatus(diff: number): ProtaBalanceStatus {
  if (diff === 0) return 'PAS';
  if (diff < 0) return 'DEFISIT';
  return 'SURPLUS';
}

/**
 * UI Badge configuration for balance status rendering.
 */
export interface ProtaBadgeProps {
  status: ProtaBalanceStatus;
  label: string;
  badgeClass: string;
  iconName: 'CheckCircle' | 'AlertCircle' | 'AlertTriangle';
  diffText: string;
}

/**
 * Generates styling and metadata props for status badges in the UI.
 *
 * @param status Balance status ('PAS' | 'DEFISIT' | 'SURPLUS')
 * @param diff Numerical difference (allocated - target)
 */
export function getProtaBalanceBadgeProps(
  status: ProtaBalanceStatus,
  diff: number
): ProtaBadgeProps {
  switch (status) {
    case 'PAS':
      return {
        status: 'PAS',
        label: 'Sesuai Target (Pas)',
        badgeClass:
          'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
        iconName: 'CheckCircle',
        diffText: '0 JP',
      };
    case 'DEFISIT':
      return {
        status: 'DEFISIT',
        label: `Kurang ${Math.abs(diff)} JP (Defisit)`,
        badgeClass:
          'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
        iconName: 'AlertTriangle',
        diffText: `-${Math.abs(diff)} JP`,
      };
    case 'SURPLUS':
      return {
        status: 'SURPLUS',
        label: `Kelebihan ${diff} JP (Surplus)`,
        badgeClass:
          'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
        iconName: 'AlertCircle',
        diffText: `+${diff} JP`,
      };
  }
}

// =============================================================================
// 6. CORE BALANCE VALIDATION ENGINE
// =============================================================================

/**
 * Validates the Annual Program (Prota) hours balance against RME target quotas.
 *
 * Guaranteed Invariants & Rules:
 * 1. allocatedAnnualJp = allocatedSemester1Jp + allocatedSemester2Jp
 * 2. totalTargetJp = targetSemester1Jp + targetSemester2Jp
 * 3. diffSemester1 = allocatedSemester1Jp - targetSemester1Jp
 * 4. diffSemester2 = allocatedSemester2Jp - targetSemester2Jp
 * 5. diffAnnual = allocatedAnnualJp - totalTargetJp = diffSemester1 + diffSemester2
 * 6. statusSemester1 is 'PAS' (diff === 0), 'DEFISIT' (diff < 0), or 'SURPLUS' (diff > 0)
 * 7. statusSemester2 is 'PAS' (diff === 0), 'DEFISIT' (diff < 0), or 'SURPLUS' (diff > 0)
 * 8. statusAnnual is 'PAS' (diff === 0), 'DEFISIT' (diff < 0), or 'SURPLUS' (diff > 0)
 * 9. deficitJp = max(0, -diff) (always positive integer or 0)
 * 10. surplusJp = max(0, diff) (always positive integer or 0)
 * 11. min(deficitJp, surplusJp) === 0 (mutually exclusive)
 * 12. Pure functional execution with zero mutations and zero NaN guarantees
 *
 * @param items Array of ProtaItems across Semester 1 and Semester 2
 * @param rmeSem1 RME summary calculation for Semester 1 (Ganjil)
 * @param rmeSem2 RME summary calculation for Semester 2 (Genap)
 * @returns Complete ProtaValidationResult object
 */
export function validateProtaBalance(
  items: ProtaItem[],
  rmeSem1: RmeSummary,
  rmeSem2: RmeSummary
): ProtaValidationResult {
  // Extract target JP per semester from RME summaries (based on netTeachingJp)
  const targetSemester1Jp = extractTargetJp(rmeSem1);
  const targetSemester2Jp = extractTargetJp(rmeSem2);
  const totalTargetJp = targetSemester1Jp + targetSemester2Jp;

  // Aggregate allocated JP strictly partitioned by semesterNumber
  let allocatedSemester1Jp = 0;
  let allocatedSemester2Jp = 0;

  if (Array.isArray(items)) {
    for (const item of items) {
      if (!item) continue;
      const jp = sanitizeJp(item.targetJp);
      if (item.semesterNumber === 1) {
        allocatedSemester1Jp += jp;
      } else if (item.semesterNumber === 2) {
        allocatedSemester2Jp += jp;
      }
    }
  }

  const allocatedAnnualJp = allocatedSemester1Jp + allocatedSemester2Jp;

  // Calculate mathematical differences (allocated - target)
  const diffSemester1 = allocatedSemester1Jp - targetSemester1Jp;
  const diffSemester2 = allocatedSemester2Jp - targetSemester2Jp;
  const diffAnnual = allocatedAnnualJp - totalTargetJp;

  // Evaluate discrete statuses
  const statusSemester1 = getProtaBalanceStatus(diffSemester1);
  const statusSemester2 = getProtaBalanceStatus(diffSemester2);
  const statusAnnual = getProtaBalanceStatus(diffAnnual);

  // Compute non-negative deficit and surplus magnitudes
  const deficitJpSemester1 = diffSemester1 < 0 ? Math.abs(diffSemester1) : 0;
  const surplusJpSemester1 = diffSemester1 > 0 ? diffSemester1 : 0;

  const deficitJpSemester2 = diffSemester2 < 0 ? Math.abs(diffSemester2) : 0;
  const surplusJpSemester2 = diffSemester2 > 0 ? diffSemester2 : 0;

  return {
    totalTargetJp,
    allocatedSemester1Jp,
    allocatedSemester2Jp,
    allocatedAnnualJp,
    diffSemester1,
    diffSemester2,
    diffAnnual,
    statusSemester1,
    statusSemester2,
    statusAnnual,
    deficitJpSemester1,
    surplusJpSemester1,
    deficitJpSemester2,
    surplusJpSemester2,
  };
}

// =============================================================================
// 7. AUTO-BALANCE PROTA JP ALGORITHM (1-Click Intelligent Equalizer)
// =============================================================================

export interface ProtaAutoBalanceResult {
  items: ProtaItem[];
  adjustedSem1: number;
  adjustedSem2: number;
  adjustedItemIds: string[];
  isBalanced: boolean;
  message: string;
}

/**
 * Distributes JP difference (positive for deficit, negative for surplus) across semester items.
 *
 * Rules:
 * 1. Prioritizes largest topics first to maintain pedagogical weight.
 * 2. Distributes in 2 JP increments whenever possible to keep lessons in even blocks.
 * 3. Operates in round-robin fashion so extra hours are not dumped into a single topic.
 * 4. Ensures no topic drops below MIN_JP (2 JP default, 1 JP fallback).
 *
 * @param semItems Mutable list of items for the semester
 * @param delta Target JP minus Current JP (positive = add JP, negative = deduct JP)
 * @param changedIds Set to collect modified item IDs
 */
function distributeSemesterJpDelta(
  semItems: ProtaItem[],
  delta: number,
  changedIds: Set<string>
): void {
  if (semItems.length === 0 || delta === 0) return;

  if (delta > 0) {
    // Deficit: need to add JP
    let remaining = delta;
    const sortedIndices = semItems
      .map((_, i) => i)
      .sort(
        (a, b) =>
          semItems[b].targetJp - semItems[a].targetJp ||
          (semItems[a].orderIndex ?? 0) - (semItems[b].orderIndex ?? 0)
      );

    while (remaining > 0) {
      let allocatedInPass = false;
      for (const idx of sortedIndices) {
        if (remaining <= 0) break;
        const chunk = remaining >= 2 && delta % 2 === 0 ? 2 : remaining >= 2 ? 2 : 1;
        semItems[idx].targetJp += chunk;
        remaining -= chunk;
        changedIds.add(semItems[idx].id);
        allocatedInPass = true;
      }
      if (!allocatedInPass) break;
    }
  } else {
    // Surplus: need to deduct JP
    let remaining = Math.abs(delta);
    const MIN_JP = 2;
    const sortedIndices = semItems
      .map((_, i) => i)
      .sort(
        (a, b) =>
          semItems[b].targetJp - semItems[a].targetJp ||
          (semItems[a].orderIndex ?? 0) - (semItems[b].orderIndex ?? 0)
      );

    while (remaining > 0) {
      let anyDeducted = false;

      // Pass 1: Deduct keeping items >= MIN_JP (2 JP)
      for (const idx of sortedIndices) {
        if (remaining <= 0) break;
        const current = semItems[idx].targetJp;
        if (current <= MIN_JP) continue;

        const maxPossible = current - MIN_JP;
        const desiredChunk = remaining >= 2 && Math.abs(delta) % 2 === 0 ? 2 : 1;
        const chunk = Math.min(desiredChunk, maxPossible, remaining);

        if (chunk > 0) {
          semItems[idx].targetJp -= chunk;
          remaining -= chunk;
          changedIds.add(semItems[idx].id);
          anyDeducted = true;
        }
      }

      // Pass 2: Fallback down to 1 JP if necessary
      if (!anyDeducted) {
        for (const idx of sortedIndices) {
          if (remaining <= 0) break;
          if (semItems[idx].targetJp > 1) {
            semItems[idx].targetJp -= 1;
            remaining -= 1;
            changedIds.add(semItems[idx].id);
            anyDeducted = true;
          }
        }
        if (!anyDeducted) break; // Cannot deduct further without hitting 0
      }
    }
  }
}

/**
 * Intelligently balances Prota items allocation against Semester 1 and Semester 2
 * target hours from RME.
 *
 * Automatically resolves both deficits (under-allocated hours) and surpluses (over-allocated hours),
 * distributing or deducting hours cleanly so that the final validation status reaches 'PAS' (0 JP difference).
 *
 * @param items Array of current ProtaItems
 * @param rmeSem1 RME summary calculation for Semester 1 (Ganjil)
 * @param rmeSem2 RME summary calculation for Semester 2 (Genap)
 * @returns ProtaAutoBalanceResult with re-balanced items and metadata
 */
export function autoBalanceProtaJp(
  items: ProtaItem[],
  rmeSem1: RmeSummary,
  rmeSem2: RmeSummary
): ProtaAutoBalanceResult {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      items: [],
      adjustedSem1: 0,
      adjustedSem2: 0,
      adjustedItemIds: [],
      isBalanced: false,
      message: 'Belum ada materi pembelajaran yang dapat diseimbangkan.',
    };
  }

  const targetSem1 = extractTargetJp(rmeSem1);
  const targetSem2 = extractTargetJp(rmeSem2);

  // Deep clone items defensively
  const clonedItems: ProtaItem[] = items.map((it) => ({
    ...it,
    targetJp: sanitizeJp(it.targetJp),
  }));

  const sem1Items = clonedItems.filter((it) => it.semesterNumber === 1);
  const sem2Items = clonedItems.filter((it) => it.semesterNumber === 2);

  const curSem1 = sem1Items.reduce((acc, it) => acc + it.targetJp, 0);
  const curSem2 = sem2Items.reduce((acc, it) => acc + it.targetJp, 0);

  // Only balance semesters where target > 0 and items exist
  const deltaSem1 = targetSem1 > 0 && sem1Items.length > 0 ? targetSem1 - curSem1 : 0;
  const deltaSem2 = targetSem2 > 0 && sem2Items.length > 0 ? targetSem2 - curSem2 : 0;

  const changedIds = new Set<string>();

  if (deltaSem1 !== 0) {
    distributeSemesterJpDelta(sem1Items, deltaSem1, changedIds);
  }

  if (deltaSem2 !== 0) {
    distributeSemesterJpDelta(sem2Items, deltaSem2, changedIds);
  }

  // Recombine preserving original order
  const finalItems = clonedItems.map((original) => {
    const updated =
      original.semesterNumber === 1
        ? sem1Items.find((s) => s.id === original.id)
        : sem2Items.find((s) => s.id === original.id);
    return updated || original;
  });

  const finalSem1 = finalItems
    .filter((it) => it.semesterNumber === 1)
    .reduce((acc, it) => acc + it.targetJp, 0);
  const finalSem2 = finalItems
    .filter((it) => it.semesterNumber === 2)
    .reduce((acc, it) => acc + it.targetJp, 0);

  const netAdj1 = finalSem1 - curSem1;
  const netAdj2 = finalSem2 - curSem2;

  const isBalanced =
    (targetSem1 === 0 || sem1Items.length === 0 || finalSem1 === targetSem1) &&
    (targetSem2 === 0 || sem2Items.length === 0 || finalSem2 === targetSem2);

  let message = 'Alokasi jam sudah pas dengan target minggu efektif.';
  if (netAdj1 !== 0 || netAdj2 !== 0) {
    const parts: string[] = [];
    if (netAdj1 !== 0) {
      parts.push(`Semester 1 (${netAdj1 > 0 ? `+${netAdj1}` : netAdj1} JP)`);
    }
    if (netAdj2 !== 0) {
      parts.push(`Semester 2 (${netAdj2 > 0 ? `+${netAdj2}` : netAdj2} JP)`);
    }
    message = `Alokasi jam berhasil diseimbangkan otomatis: ${parts.join(', ')}. Target minggu efektif kini pas!`;
  }

  return {
    items: finalItems,
    adjustedSem1: netAdj1,
    adjustedSem2: netAdj2,
    adjustedItemIds: Array.from(changedIds),
    isBalanced,
    message,
  };
}
