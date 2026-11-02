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

/**
 * Calculates the last calendar day of a given month in `YYYY-MM-DD` format.
 * Expects a `YYYY-MM` month string (e.g. "2026-10" -> "2026-10-31").
 * Correctly accounts for leap years and months with 28, 29, 30, or 31 days.
 * Falls back to today's local date if the string is empty or invalid.
 */
export function getMonthEndDate(monthStr: string): string {
  if (!monthStr || !monthStr.includes('-')) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const [yearStr, monthNumStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthNumStr, 10);
  if (Number.isNaN(year) || Number.isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const lastDay = new Date(year, monthNum, 0).getDate();
  return `${year}-${String(monthNum).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}
