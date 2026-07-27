import { describe, it, expect } from 'vitest';
import {
  daysOfWeek,
  getColorForSubject,
  formatTime,
  formatTimeRange,
  isUUID,
  resolveClassName,
} from '../../src/utils/scheduleUtils';

describe('scheduleUtils', () => {
  describe('daysOfWeek', () => {
    it('should contain 6 days from Senin to Sabtu', () => {
      expect(daysOfWeek).toHaveLength(6);
      expect(daysOfWeek).toEqual(['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']);
    });
  });

  describe('getColorForSubject', () => {
    it('should return default color when subject is empty', () => {
      expect(getColorForSubject()).toBe('border-l-slate-400');
      expect(getColorForSubject('')).toBe('border-l-slate-400');
    });

    it('should return consistent colors for the same subject', () => {
      const color1 = getColorForSubject('Matematika');
      const color2 = getColorForSubject('Matematika');
      expect(color1).toBe(color2);
    });

    it('should return different colors for different subjects', () => {
      // It is possible for hash collisions, but generally they differ
      const color1 = getColorForSubject('Matematika');
      const color2 = getColorForSubject('Bahasa Indonesia');
      expect(color1).not.toEqual(color2);
    });
  });

  describe('formatTime', () => {
    it('should format time correctly', () => {
      expect(formatTime('9:5')).toBe('09:05');
      expect(formatTime('14:30')).toBe('14:30');
    });

    it('should return empty string if time is empty', () => {
      expect(formatTime('')).toBe('');
    });
  });

  describe('formatTimeRange', () => {
    it('should format time range correctly', () => {
      expect(formatTimeRange('9:5', '10:30')).toBe('09:05 - 10:30');
    });
  });

  describe('isUUID', () => {
    it('should identify valid UUIDs', () => {
      expect(isUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      expect(isUUID('123e4567-e89b-12d3-a456-42661417400')).toBe(false);
      expect(isUUID('kelas-a')).toBe(false);
      expect(isUUID('')).toBe(false);
      expect(isUUID(null)).toBe(false);
    });
  });

  describe('resolveClassName', () => {
    it('should use classNameLabel if provided', () => {
      expect(resolveClassName('1A', 'uuid')).toBe('Kelas 1A');
      expect(resolveClassName('Kelas 1B', 'uuid')).toBe('Kelas 1B');
    });

    it('should fallback to classId if classNameLabel is empty and classId is not UUID', () => {
      expect(resolveClassName('', '1C')).toBe('Kelas 1C');
      expect(resolveClassName(null, 'Kelas 1D')).toBe('Kelas 1D');
    });

    it('should return placeholder if both are invalid or classId is UUID', () => {
      expect(resolveClassName('', '123e4567-e89b-12d3-a456-426614174000')).toBe('Kelas (Tidak Ditemukan)');
      expect(resolveClassName('', '')).toBe('Kelas (Tidak Ditemukan)');
      expect(resolveClassName(null, null)).toBe('Kelas (Tidak Ditemukan)');
    });
  });
});
