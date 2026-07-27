import { describe, it, expect } from 'vitest';
import {
  isDateOnly,
  parseDateOnly,
  parseDueDate,
  isTaskOverdue,
  isTaskDueToday,
  isTaskDueSoon,
  formatTaskDueDate,
} from '../../src/utils/dateHelpers';

describe('dateHelpers', () => {
  describe('isDateOnly', () => {
    it('should return true for YYYY-MM-DD', () => {
      expect(isDateOnly('2026-07-27')).toBe(true);
      expect(isDateOnly('2024-01-01')).toBe(true);
    });

    it('should return false for invalid formats', () => {
      expect(isDateOnly('2026/07/27')).toBe(false);
      expect(isDateOnly('27-07-2026')).toBe(false);
      expect(isDateOnly('2026-07-27T10:00:00Z')).toBe(false);
      expect(isDateOnly('random-string')).toBe(false);
    });
  });

  describe('parseDateOnly', () => {
    it('should parse YYYY-MM-DD to local midnight Date', () => {
      const date = parseDateOnly('2026-07-27');
      expect(date.getFullYear()).toBe(2026);
      expect(date.getMonth()).toBe(6); // 0-indexed, so 6 is July
      expect(date.getDate()).toBe(27);
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
    });
  });

  describe('parseDueDate', () => {
    it('should parse YYYY-MM-DD to end of day', () => {
      const date = parseDueDate('2026-07-27');
      expect(date).not.toBeNull();
      if (date) {
        expect(date.getHours()).toBe(23);
        expect(date.getMinutes()).toBe(59);
        expect(date.getSeconds()).toBe(59);
        expect(date.getMilliseconds()).toBe(999);
      }
    });

    it('should parse full ISO string correctly', () => {
      const dateStr = '2026-07-27T14:30:00.000Z';
      const date = parseDueDate(dateStr);
      expect(date).not.toBeNull();
      if (date) {
        expect(date.getTime()).toBe(new Date(dateStr).getTime());
      }
    });

    it('should return null for invalid inputs', () => {
      expect(parseDueDate(null)).toBeNull();
      expect(parseDueDate('invalid-date')).toBeNull();
    });
  });

  describe('isTaskOverdue', () => {
    it('should return true if due date is strictly before reference date', () => {
      const reference = new Date('2026-07-27T12:00:00Z');
      expect(isTaskOverdue('2026-07-26', reference)).toBe(true); // End of 26th is before 12:00 on 27th
      expect(isTaskOverdue('2026-07-25T10:00:00Z', reference)).toBe(true);
    });

    it('should return false if due date is exactly or after reference date', () => {
      const reference = new Date('2026-07-27T12:00:00Z');
      expect(isTaskOverdue('2026-07-28', reference)).toBe(false);
      expect(isTaskOverdue('2026-07-27T15:00:00Z', reference)).toBe(false);
    });

    it('should return false for invalid or null due dates', () => {
      const reference = new Date();
      expect(isTaskOverdue(null, reference)).toBe(false);
      expect(isTaskOverdue('invalid', reference)).toBe(false);
    });
  });

  describe('isTaskDueToday', () => {
    it('should return true if due date falls on the same calendar day as reference date', () => {
      const reference = new Date(2026, 6, 27, 10, 0, 0); // Local time
      expect(isTaskDueToday('2026-07-27', reference)).toBe(true);
    });

    it('should return false if overdue or on a different day', () => {
      const reference = new Date(2026, 6, 27, 10, 0, 0);
      expect(isTaskDueToday('2026-07-26', reference)).toBe(false); // Overdue
      expect(isTaskDueToday('2026-07-28', reference)).toBe(false); // Future day
    });
  });

  describe('isTaskDueSoon', () => {
    it('should return true if due date is within the next 24 hours', () => {
      const reference = new Date('2026-07-27T12:00:00Z');
      expect(isTaskDueSoon('2026-07-28T11:00:00Z', reference)).toBe(true);
    });

    it('should return false if overdue or more than 24 hours away', () => {
      const reference = new Date('2026-07-27T12:00:00Z');
      expect(isTaskDueSoon('2026-07-26T12:00:00Z', reference)).toBe(false); // overdue
      expect(isTaskDueSoon('2026-07-29T12:00:00Z', reference)).toBe(false); // > 24 hours
    });

    it('should handle missing reference date gracefully', () => {
      // Create a due date exactly 1 hour from now
      const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      expect(isTaskDueSoon(future)).toBe(true);
    });
  });

  describe('formatTaskDueDate', () => {
    it('should format date correctly', () => {
      // In ID locale: "27 Jul" or "27 Juli" depending on engine, typically 'short' month implies 'Jul'
      const formatted = formatTaskDueDate('2026-07-27');
      expect(formatted).toMatch(/27 Jul(i)?/);
    });

    it('should return "-" for invalid date', () => {
      expect(formatTaskDueDate('invalid')).toBe('-');
    });
  });
});
