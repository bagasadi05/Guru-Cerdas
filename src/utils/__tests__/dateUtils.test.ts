import { describe, it, expect } from 'vitest';
import { getMonthEndDate } from '../dateHelpers';

const formatDate = (d: Date) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
const getWeekStart = (d: Date) => { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); return r; };
const getMonthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);

describe('date utilities', () => {
  it('formats date in Indonesian locale', () => {
    expect(formatDate(new Date(2026, 5, 30))).toBe('30 Juni 2026');
  });
  it('calculates week start (Sunday)', () => {
    const wed = new Date(2026, 5, 30); // Tuesday
    expect(getWeekStart(wed).getDay()).toBe(0);
  });
  it('calculates month start', () => {
    const r = getMonthStart(new Date(2026, 5, 15));
    expect(r.getDate()).toBe(1);
    expect(r.getMonth()).toBe(5);
  });

  describe('getMonthEndDate', () => {
    it('returns the 31st for 31-day months (e.g. October, December)', () => {
      expect(getMonthEndDate('2026-10')).toBe('2026-10-31');
      expect(getMonthEndDate('2026-12')).toBe('2026-12-31');
    });

    it('returns the 30th for 30-day months (e.g. April, September)', () => {
      expect(getMonthEndDate('2026-04')).toBe('2026-04-30');
      expect(getMonthEndDate('2026-09')).toBe('2026-09-30');
    });

    it('returns the 28th for February in common non-leap years (e.g. 2026)', () => {
      expect(getMonthEndDate('2026-02')).toBe('2026-02-28');
    });

    it('returns the 29th for February in leap years (e.g. 2024)', () => {
      expect(getMonthEndDate('2024-02')).toBe('2024-02-29');
    });

    it('falls back gracefully to today for invalid inputs', () => {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      const expected = `${y}-${m}-${d}`;

      expect(getMonthEndDate('')).toBe(expected);
      expect(getMonthEndDate('invalid-month')).toBe(expected);
    });
  });
});
