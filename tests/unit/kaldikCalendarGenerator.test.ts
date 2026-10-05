import { describe, it, expect } from 'vitest';
import { generateKaldikFromCalendar } from '../../src/utils/kaldikCalendarGenerator';
import { calculateRme } from '../../src/utils/kaldikEngine';

const find = (weeks: ReturnType<typeof generateKaldikFromCalendar>['weeks'], month: number, weekNumber: number) =>
  weeks.find((w) => w.month === month && w.weekNumber === weekNumber);

describe('generateKaldikFromCalendar 2026/2027', () => {
  const { weeks, semestersWithoutHolidayData } = generateKaldikFromCalendar('2026/2027');

  it('has 60 slots and marks months with four Mondays', () => {
    expect(weeks).toHaveLength(60);
    expect(find(weeks, 7, 5)?.type).toBe('NON_ACTIVE'); // July 2026 has 4 Mondays
    expect(find(weeks, 8, 5)?.label).toContain('31 Agu–4 Sep'); // August has 5
  });

  it('starts the year with MPLS on the second Monday of July', () => {
    expect(find(weeks, 7, 1)?.type).toBe('LIBUR_SEMESTER');
    expect(find(weeks, 7, 2)).toMatchObject({ type: 'MPLS' });
    expect(find(weeks, 7, 2)?.label).toMatch(/^13–17 Jul/);
  });

  it('turns weeks with three or more holiday weekdays into holidays', () => {
    expect(find(weeks, 3, 2)).toMatchObject({ type: 'LIBUR_NASIONAL' }); // 8–12 Mar 2027: Nyepi + Idulfitri
    expect(find(weeks, 5, 3)).toMatchObject({ type: 'LIBUR_NASIONAL' }); // 17–21 Mei 2027: Iduladha + Waisak
    expect(find(weeks, 8, 3)).toMatchObject({ type: 'KBM' }); // 17 Agustus alone
    expect(find(weeks, 8, 3)?.label).toContain('Proklamasi Kemerdekaan');
  });

  it('places assessments, report weeks and breaks', () => {
    expect(find(weeks, 9, 3)?.type).toBe('STS');
    expect(find(weeks, 12, 1)?.type).toBe('SAS');
    expect(find(weeks, 12, 3)?.type).toBe('RAPOR');
    expect(find(weeks, 12, 4)?.type).toBe('LIBUR_SEMESTER');
    expect(find(weeks, 1, 1)?.type).toBe('KBM'); // semester 2 starts 4 Jan 2027
    expect(find(weeks, 3, 3)?.type).toBe('STS'); // STS genap after the Lebaran week
    expect(find(weeks, 6, 1)?.type).toBe('SAS');
    expect(find(weeks, 6, 4)?.type).toBe('LIBUR_SEMESTER');
  });

  it('gives 19 effective weeks per semester and has holiday data for both', () => {
    expect(calculateRme(weeks, 1, 4, 0).effectiveWeeks).toBe(19);
    expect(calculateRme(weeks, 2, 4, 0).effectiveWeeks).toBe(19);
    expect(semestersWithoutHolidayData).toEqual([]);
  });
});

describe('years without SKB data', () => {
  it('reports the semester whose holidays are not bundled', () => {
    expect(generateKaldikFromCalendar('2027/2028').semestersWithoutHolidayData).toEqual([2]);
    expect(generateKaldikFromCalendar('2030/2031').semestersWithoutHolidayData).toEqual([1, 2]);
  });

  it('still builds a full calendar with every week labelled by date', () => {
    const { weeks } = generateKaldikFromCalendar('2030/2031');
    expect(weeks).toHaveLength(60);
    expect(weeks.filter((w) => w.type !== 'NON_ACTIVE').every((w) => /\d/.test(w.label ?? ''))).toBe(true);
  });
});
