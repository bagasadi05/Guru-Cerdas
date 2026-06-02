/**
 * @fileoverview Shared date utility functions.
 *
 * Centralises date parsing and comparison logic that was previously
 * duplicated across `DashboardPage.tsx` and `StatsGrid.tsx`.
 *
 * @module utils/dateHelpers
 */

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Checks whether a string is in `YYYY-MM-DD` format (no time component).
 */
export function isDateOnly(value: string): boolean {
  return DATE_ONLY_RE.test(value);
}

/**
 * Parses a `YYYY-MM-DD` string into a `Date` at local midnight.
 */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Parses a due-date string that may be either `YYYY-MM-DD` (date-only)
 * or an ISO-8601 datetime.
 *
 * - Date-only strings are interpreted as **end of day** (23:59:59.999).
 * - Returns `null` if the string cannot be parsed.
 */
export function parseDueDate(dueDate: string | null): Date | null {
  if (!dueDate) return null;

  if (isDateOnly(dueDate)) {
    const [year, month, day] = dueDate.split('-').map(Number);
    return new Date(year, month - 1, day, 23, 59, 59, 999);
  }

  const parsed = new Date(dueDate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Returns `true` when the due date is strictly before the reference date.
 */
export function isTaskOverdue(dueDate: string | null, referenceDate: Date): boolean {
  const parsed = parseDueDate(dueDate);
  return parsed ? parsed.getTime() < referenceDate.getTime() : false;
}

/**
 * Returns `true` when the due date falls on the same calendar day as
 * the reference date (and is not already overdue).
 */
export function isTaskDueToday(dueDate: string | null, referenceDate: Date): boolean {
  const parsed = parseDueDate(dueDate);
  if (!parsed || parsed.getTime() < referenceDate.getTime()) return false;
  return (
    parsed.getFullYear() === referenceDate.getFullYear() &&
    parsed.getMonth() === referenceDate.getMonth() &&
    parsed.getDate() === referenceDate.getDate()
  );
}

/**
 * Returns `true` when the due date falls within the next 24 hours
 * from the reference date (and is not already overdue).
 */
export function isTaskDueSoon(dueDate: string | null, referenceDate: Date = new Date()): boolean {
  const parsed = parseDueDate(dueDate);
  if (!parsed) return false;
  const diff = parsed.getTime() - referenceDate.getTime();
  return diff >= 0 && diff <= 24 * 60 * 60 * 1000;
}

/**
 * Formats a task due date for display (e.g. "5 Jun").
 * Returns `"-"` if the date cannot be parsed.
 */
export function formatTaskDueDate(dueDate: string): string {
  const date = isDateOnly(dueDate) ? parseDateOnly(dueDate) : new Date(dueDate);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}
