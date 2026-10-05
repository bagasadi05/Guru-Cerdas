/**
 * National holidays (libur nasional) and joint leave (cuti bersama) from the SKB 3 Menteri.
 *
 * Sources:
 * - 2025: SKB No. 1017/2024, 2/2024, 2/2024, plus the 18 Aug 2025 HUT RI ke-80 cuti bersama
 *   (setneg.go.id) and the revised ASN cuti bersama (setneg.go.id). Only July–December is
 *   listed; earlier dates fall outside any supported academic year.
 * - 2026: SKB No. 1497/2025, 2/2025, 5/2025 (setneg.go.id).
 * - 2027: SKB No. 1205/2026, 3/2026, 2/2026 (setneg.go.id).
 *
 * Add a year here once its SKB is published; years without data are reported as such
 * so the teacher marks holidays manually instead of trusting an empty calendar.
 */

export interface NationalHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  kind: 'LIBUR' | 'CUTI';
}

export const NATIONAL_HOLIDAYS: Readonly<Record<number, readonly NationalHoliday[]>> = {
  2025: [
    { date: '2025-08-17', name: 'Proklamasi Kemerdekaan', kind: 'LIBUR' },
    { date: '2025-08-18', name: 'HUT ke-80 RI', kind: 'CUTI' },
    { date: '2025-09-05', name: 'Maulid Nabi Muhammad saw.', kind: 'LIBUR' },
    { date: '2025-12-25', name: 'Kelahiran Yesus Kristus', kind: 'LIBUR' },
    { date: '2025-12-26', name: 'Kelahiran Yesus Kristus', kind: 'CUTI' },
  ],
  2026: [
    { date: '2026-01-01', name: 'Tahun Baru Masehi', kind: 'LIBUR' },
    { date: '2026-01-16', name: 'Isra Mikraj Nabi Muhammad saw.', kind: 'LIBUR' },
    { date: '2026-02-16', name: 'Tahun Baru Imlek', kind: 'CUTI' },
    { date: '2026-02-17', name: 'Tahun Baru Imlek', kind: 'LIBUR' },
    { date: '2026-03-18', name: 'Hari Suci Nyepi', kind: 'CUTI' },
    { date: '2026-03-19', name: 'Hari Suci Nyepi', kind: 'LIBUR' },
    { date: '2026-03-20', name: 'Idulfitri', kind: 'CUTI' },
    { date: '2026-03-21', name: 'Idulfitri', kind: 'LIBUR' },
    { date: '2026-03-22', name: 'Idulfitri', kind: 'LIBUR' },
    { date: '2026-03-23', name: 'Idulfitri', kind: 'CUTI' },
    { date: '2026-03-24', name: 'Idulfitri', kind: 'CUTI' },
    { date: '2026-04-03', name: 'Wafat Yesus Kristus', kind: 'LIBUR' },
    { date: '2026-04-05', name: 'Paskah', kind: 'LIBUR' },
    { date: '2026-05-01', name: 'Hari Buruh Internasional', kind: 'LIBUR' },
    { date: '2026-05-14', name: 'Kenaikan Yesus Kristus', kind: 'LIBUR' },
    { date: '2026-05-15', name: 'Kenaikan Yesus Kristus', kind: 'CUTI' },
    { date: '2026-05-27', name: 'Iduladha', kind: 'LIBUR' },
    { date: '2026-05-28', name: 'Iduladha', kind: 'CUTI' },
    { date: '2026-05-31', name: 'Waisak', kind: 'LIBUR' },
    { date: '2026-06-01', name: 'Hari Lahir Pancasila', kind: 'LIBUR' },
    { date: '2026-06-16', name: 'Tahun Baru Islam', kind: 'LIBUR' },
    { date: '2026-08-17', name: 'Proklamasi Kemerdekaan', kind: 'LIBUR' },
    { date: '2026-08-25', name: 'Maulid Nabi Muhammad saw.', kind: 'LIBUR' },
    { date: '2026-12-24', name: 'Kelahiran Yesus Kristus', kind: 'CUTI' },
    { date: '2026-12-25', name: 'Kelahiran Yesus Kristus', kind: 'LIBUR' },
  ],
  2027: [
    { date: '2027-01-01', name: 'Tahun Baru Masehi', kind: 'LIBUR' },
    { date: '2027-01-05', name: 'Isra Mikraj Nabi Muhammad saw.', kind: 'LIBUR' },
    { date: '2027-02-05', name: 'Tahun Baru Imlek', kind: 'CUTI' },
    { date: '2027-02-06', name: 'Tahun Baru Imlek', kind: 'LIBUR' },
    { date: '2027-03-08', name: 'Hari Suci Nyepi', kind: 'LIBUR' },
    { date: '2027-03-09', name: 'Idulfitri', kind: 'CUTI' },
    { date: '2027-03-10', name: 'Idulfitri', kind: 'LIBUR' },
    { date: '2027-03-11', name: 'Idulfitri', kind: 'LIBUR' },
    { date: '2027-03-12', name: 'Idulfitri', kind: 'CUTI' },
    { date: '2027-03-15', name: 'Idulfitri', kind: 'CUTI' },
    { date: '2027-03-25', name: 'Wafat Yesus Kristus', kind: 'CUTI' },
    { date: '2027-03-26', name: 'Wafat Yesus Kristus', kind: 'LIBUR' },
    { date: '2027-03-28', name: 'Paskah', kind: 'LIBUR' },
    { date: '2027-05-01', name: 'Hari Buruh Internasional', kind: 'LIBUR' },
    { date: '2027-05-06', name: 'Kenaikan Yesus Kristus', kind: 'LIBUR' },
    { date: '2027-05-17', name: 'Iduladha', kind: 'LIBUR' },
    { date: '2027-05-18', name: 'Iduladha', kind: 'CUTI' },
    { date: '2027-05-19', name: 'Waisak', kind: 'CUTI' },
    { date: '2027-05-20', name: 'Waisak', kind: 'LIBUR' },
    { date: '2027-06-01', name: 'Hari Lahir Pancasila', kind: 'LIBUR' },
    { date: '2027-06-06', name: 'Tahun Baru Islam', kind: 'LIBUR' },
    { date: '2027-08-15', name: 'Maulid Nabi Muhammad saw.', kind: 'LIBUR' },
    { date: '2027-08-17', name: 'Proklamasi Kemerdekaan', kind: 'LIBUR' },
    { date: '2027-12-24', name: 'Kelahiran Yesus Kristus', kind: 'CUTI' },
    { date: '2027-12-25', name: 'Kelahiran Yesus Kristus', kind: 'LIBUR' },
    { date: '2027-12-26', name: 'Isra Mikraj Nabi Muhammad saw.', kind: 'LIBUR' },
  ],
};

/** First and last date (inclusive) covered by `NATIONAL_HOLIDAYS`. */
export const HOLIDAY_DATA_RANGE = { from: '2025-07-01', to: '2027-12-31' } as const;

/** Whether every date from `from` to `to` (YYYY-MM-DD) falls inside the covered range. */
export function hasHolidayDataBetween(from: string, to: string): boolean {
  return from >= HOLIDAY_DATA_RANGE.from && to <= HOLIDAY_DATA_RANGE.to;
}
