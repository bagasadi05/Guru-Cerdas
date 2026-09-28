/**
 * @fileoverview Pure functional calculation engine for Kalender Pendidikan (Kaldik) &
 * Rincian Minggu Efektif (RME).
 *
 * Implements Milestone M1 core domain logic:
 * - Semester month partitioning (Jul-Dec for Sem 1, Jan-Jun for Sem 2)
 * - Effective (KBM) vs Non-Effective week calculations
 * - Non-effective week taxonomy breakdown
 * - Available teaching hours (JP) and net teaching hours after jam cadangan
 * - Loading immutable national default presets
 *
 * @module utils/kaldikEngine
 */

import type {
  KaldikWeek,
  RmeSummary,
  WeekType,
} from '../types/perangkatAjar';
import {
  DEFAULT_NATIONAL_KALDIK_PRESET,
  SEMESTER_1_MONTHS,
  SEMESTER_2_MONTHS,
} from '../data/defaultKaldikPresets';

export type { KaldikWeek, RmeSummary, WeekType };
export { SEMESTER_1_MONTHS, SEMESTER_2_MONTHS };

/**
 * Returns the month numbers (1-12) belonging to the given semester.
 * Semester 1: July (7) - December (12)
 * Semester 2: January (1) - June (6)
 */
export function getSemesterMonths(semester: 1 | 2): readonly number[] {
  return semester === 1 ? SEMESTER_1_MONTHS : SEMESTER_2_MONTHS;
}

/**
 * Checks whether a given week type counts as an effective teaching week (KBM).
 */
export function isEffectiveWeek(type: WeekType): boolean {
  return type === 'KBM';
}

/**
 * Checks whether a given week slot is an active calendar week
 * (i.e. not an excluded 5th-week placeholder in a 4-week month).
 */
export function isActiveWeek(type: WeekType): boolean {
  return type !== 'NON_ACTIVE';
}

/**
 * Calculates the Rincian Minggu Efektif (RME) for a specified semester.
 *
 * Guaranteed Invariants & Rules:
 * 1. totalWeeks = effectiveWeeks + nonEffectiveWeeks
 * 2. effectiveWeeks = count(w in semesterWeeks where w.type === 'KBM')
 * 3. nonEffectiveWeeks = count(w in semesterWeeks where w.type !== 'KBM')
 * 4. sum(nonEffectiveBreakdown) = nonEffectiveWeeks
 * 5. totalAvailableJp = effectiveWeeks * sanitizedQuota
 * 6. netTeachingJp = Math.max(0, totalAvailableJp - sanitizedReserve)
 *
 * @param weeks Full academic year or semester KaldikWeek array
 * @param semester 1 (Ganjil) or 2 (Genap)
 * @param weeklyJpQuota Weekly subject hours quota (sanitized to integer >= 0)
 * @param reserveJp Optional reserve hours / Jam Cadangan (sanitized to integer >= 0)
 */
export function calculateRme(
  weeks: KaldikWeek[],
  semester: 1 | 2,
  weeklyJpQuota: number,
  reserveJp: number = 0
): RmeSummary {
  const targetMonths = getSemesterMonths(semester);

  // Filter weeks strictly belonging to target semester
  const semesterWeeks = Array.isArray(weeks)
    ? weeks.filter((w) => w && targetMonths.includes(w.month))
    : [];

  // Sanitize numerical inputs to avoid negative, decimal, or NaN values
  const sanitizedQuota = Number.isFinite(weeklyJpQuota) ? Math.max(0, Math.floor(weeklyJpQuota)) : 0;
  const sanitizedReserve = Number.isFinite(reserveJp) ? Math.max(0, Math.floor(reserveJp)) : 0;

  // Initialize breakdown record with all WeekType keys
  const nonEffectiveBreakdown: Record<WeekType, number> = {
    KBM: 0,
    MPLS: 0,
    STS: 0,
    SAS: 0,
    RAPOR: 0,
    LIBUR_SEMESTER: 0,
    LIBUR_NASIONAL: 0,
    KEGIATAN_KHUSUS: 0,
    NON_ACTIVE: 0,
  };

  let totalWeeks = 0;
  let effectiveWeeks = 0;
  let nonEffectiveWeeks = 0;

  for (const week of semesterWeeks) {
    totalWeeks++;

    if (week.type === 'KBM') {
      effectiveWeeks++;
    } else {
      nonEffectiveWeeks++;
      if (week.type in nonEffectiveBreakdown) {
        nonEffectiveBreakdown[week.type]++;
      }
    }
  }

  const totalAvailableJp = effectiveWeeks * sanitizedQuota;
  const netTeachingJp = Math.max(0, totalAvailableJp - sanitizedReserve);

  return {
    semesterNumber: semester,
    totalWeeks,
    effectiveWeeks,
    nonEffectiveWeeks,
    nonEffectiveBreakdown,
    weeklyJpQuota: sanitizedQuota,
    totalAvailableJp,
    reserveJp: sanitizedReserve,
    netTeachingJp,
  };
}

/**
 * Returns a fresh, mutable deep copy of the default national Kaldik preset
 * for the requested academic year.
 */
export function getDefaultNationalKaldik(academicYear: string = '2024/2025'): KaldikWeek[] {
  const preset = DEFAULT_NATIONAL_KALDIK_PRESET;
  return preset.map((w) => ({
    month: w.month,
    weekNumber: w.weekNumber,
    type: w.type,
    label: w.label,
    academicYear,
  }));
}
