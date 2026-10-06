/** Return the school's date even when the browser uses another timezone. */
export function schoolDate(now = new Date()): string {
  return new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** Count calendar days between ISO dates without local midnight conversion. */
export function daysUntilDeadline(date: string, today = schoolDate()): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
}
