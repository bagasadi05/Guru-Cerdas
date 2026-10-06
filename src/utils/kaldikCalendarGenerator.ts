/**
 * @fileoverview Builds a Kaldik for a specific academic year from real dates instead of
 * the fixed national pattern.
 *
 * Weeks are Monday-based: a week belongs to the month its Monday falls in, so a month has
 * 4 or 5 weeks and unused fifth slots become NON_ACTIVE. School milestones follow the
 * usual national pattern and are meant as a starting point the teacher can adjust:
 *
 * - Semester 1 starts on the second Monday of July; that week is MPLS.
 * - STS is the 11th school week of each semester (moved later if it lands on a holiday week).
 * - SAS is the week of the first Monday on or after 1 December / 1 June, followed by a
 *   class meeting week, a report week, and the semester break.
 * - Semester 2 starts on the first Monday on or after 2 January.
 * - A week with 3 or more weekday holidays (libur nasional or cuti bersama) is not effective.
 *
 * @module utils/kaldikCalendarGenerator
 */

import type { KaldikWeek, WeekType } from '../types/perangkatAjar';
import { NATIONAL_HOLIDAYS, hasHolidayDataBetween, type NationalHoliday } from '../data/indonesianHolidays';

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;
const MIN_HOLIDAYS_FOR_BREAK = 3;
const STS_WEEK_OFFSET = 10;

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export interface GeneratedKaldik {
  weeks: KaldikWeek[];
  /** Semesters whose holidays are not in the bundled SKB data and must be marked by hand. */
  semestersWithoutHolidayData: Array<1 | 2>;
}

const utc = (year: number, monthIndex: number, day: number) => Date.UTC(year, monthIndex, day);
const toIso = (time: number) => new Date(time).toISOString().slice(0, 10);

/** First Monday on or after the given date. */
function mondayOnOrAfter(time: number): number {
  const day = new Date(time).getUTCDay(); // 0 = Sunday
  const offset = (8 - day) % 7;
  return time + offset * DAY_MS;
}

function formatRange(monday: number): string {
  const start = new Date(monday);
  const end = new Date(monday + 4 * DAY_MS);
  const startText =
    start.getUTCMonth() === end.getUTCMonth()
      ? String(start.getUTCDate())
      : `${start.getUTCDate()} ${SHORT_MONTHS[start.getUTCMonth()]}`;
  return `${startText}–${end.getUTCDate()} ${SHORT_MONTHS[end.getUTCMonth()]}`;
}

function holidaysInWeek(monday: number, byDate: Map<string, NationalHoliday>): NationalHoliday[] {
  const found: NationalHoliday[] = [];
  for (let d = 0; d < 5; d++) {
    const holiday = byDate.get(toIso(monday + d * DAY_MS));
    if (holiday) found.push(holiday);
  }
  return found;
}

const uniqueNames = (holidays: NationalHoliday[]) => [...new Set(holidays.map((h) => h.name))].join(', ');

export function generateKaldikFromCalendar(academicYear: string): GeneratedKaldik {
  const startYear = parseInt(academicYear, 10) || new Date().getFullYear();
  const endYear = startYear + 1;

  const byDate = new Map<string, NationalHoliday>();
  for (const year of [startYear, endYear]) {
    for (const holiday of NATIONAL_HOLIDAYS[year] ?? []) byDate.set(holiday.date, holiday);
  }
  const isBreakWeek = (monday: number) =>
    holidaysInWeek(monday, byDate).length >= MIN_HOLIDAYS_FOR_BREAK;

  const firstStsAfter = (semesterStart: number) => {
    let sts = semesterStart + STS_WEEK_OFFSET * WEEK_MS;
    while (isBreakWeek(sts)) sts += WEEK_MS;
    return sts;
  };

  const sem1Start = mondayOnOrAfter(utc(startYear, 6, 1)) + WEEK_MS;
  const sem1Sas = mondayOnOrAfter(utc(startYear, 11, 1));
  const sem2Start = mondayOnOrAfter(utc(endYear, 0, 2));
  const sem2Sas = mondayOnOrAfter(utc(endYear, 5, 1));

  const milestones = new Map<number, { type: WeekType; text: string }>([
    [sem1Start, { type: 'MPLS', text: 'Awal semester ganjil, MPLS' }],
    [firstStsAfter(sem1Start), { type: 'STS', text: 'Sumatif Tengah Semester ganjil' }],
    [sem1Sas, { type: 'SAS', text: 'Sumatif Akhir Semester ganjil' }],
    [sem1Sas + WEEK_MS, { type: 'KEGIATAN_KHUSUS', text: 'Class meeting, remedial dan pengayaan' }],
    [sem1Sas + 2 * WEEK_MS, { type: 'RAPOR', text: 'Pembagian rapor semester ganjil' }],
    [firstStsAfter(sem2Start), { type: 'STS', text: 'Sumatif Tengah Semester genap' }],
    [sem2Sas, { type: 'SAS', text: 'Sumatif Akhir Tahun' }],
    [sem2Sas + WEEK_MS, { type: 'KEGIATAN_KHUSUS', text: 'Class meeting, remedial dan pengayaan' }],
    [sem2Sas + 2 * WEEK_MS, { type: 'RAPOR', text: 'Pembagian rapor kenaikan kelas' }],
  ]);

  const classify = (monday: number): { type: WeekType; text: string } => {
    if (monday < sem1Start && new Date(monday).getUTCMonth() === 6) {
      return { type: 'LIBUR_SEMESTER', text: 'Libur akhir tahun ajaran' };
    }
    if (monday > sem1Sas + 2 * WEEK_MS && monday < sem2Start) {
      return { type: 'LIBUR_SEMESTER', text: 'Libur semester ganjil' };
    }
    if (monday > sem2Sas + 2 * WEEK_MS) {
      return { type: 'LIBUR_SEMESTER', text: 'Libur akhir tahun ajaran' };
    }
    const milestone = milestones.get(monday);
    if (milestone && milestone.type !== 'STS') return milestone;

    const holidays = holidaysInWeek(monday, byDate);
    if (holidays.length >= MIN_HOLIDAYS_FOR_BREAK) {
      return { type: 'LIBUR_NASIONAL', text: `Libur ${uniqueNames(holidays)}` };
    }
    if (milestone) return milestone;
    if (holidays.length > 0) {
      return { type: 'KBM', text: `KBM (libur ${holidays.length} hari: ${uniqueNames(holidays)})` };
    }
    return { type: 'KBM', text: 'KBM' };
  };

  const weeks: KaldikWeek[] = [];
  const months: Array<[number, number]> = [
    ...[6, 7, 8, 9, 10, 11].map((m): [number, number] => [startYear, m]),
    ...[0, 1, 2, 3, 4, 5].map((m): [number, number] => [endYear, m]),
  ];

  for (const [year, monthIndex] of months) {
    let monday = mondayOnOrAfter(utc(year, monthIndex, 1));
    for (let weekNumber = 1; weekNumber <= 5; weekNumber++) {
      const inMonth = new Date(monday).getUTCMonth() === monthIndex;
      if (!inMonth) {
        weeks.push({
          month: monthIndex + 1,
          weekNumber,
          type: 'NON_ACTIVE',
          label: 'Bulan ini hanya punya 4 pekan',
          academicYear,
        });
        continue;
      }
      const { type, text } = classify(monday);
      weeks.push({
        month: monthIndex + 1,
        weekNumber,
        type,
        label: `${formatRange(monday)}: ${text}`,
        academicYear,
      });
      monday += WEEK_MS;
    }
  }

  const semestersWithoutHolidayData: Array<1 | 2> = [];
  if (!hasHolidayDataBetween(`${startYear}-07-01`, `${startYear}-12-31`)) semestersWithoutHolidayData.push(1);
  if (!hasHolidayDataBetween(`${endYear}-01-01`, `${endYear}-06-30`)) semestersWithoutHolidayData.push(2);

  return { weeks, semestersWithoutHolidayData };
}
