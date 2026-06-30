import { describe, it, expect } from 'vitest';

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
});
