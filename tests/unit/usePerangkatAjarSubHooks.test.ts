import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePerangkatAjarProta } from '../../src/components/pages/perangkat-ajar/hooks/usePerangkatAjarProta';
import { usePerangkatAjarKaldik } from '../../src/components/pages/perangkat-ajar/hooks/usePerangkatAjarKaldik';
import type { ProtaItem, RmeSummary } from '../../src/types/perangkatAjar';

vi.mock('../../src/hooks/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

vi.mock('../../src/services/perangkatAjarService', () => ({
  loadKaldikWeeks: vi.fn().mockResolvedValue([]),
  saveKaldikWeeks: vi.fn().mockResolvedValue(undefined),
  loadSchoolKaldik: vi.fn().mockResolvedValue(null),
  publishSchoolKaldik: vi.fn().mockResolvedValue(undefined),
}));

describe('usePerangkatAjarSubHooks', () => {
  describe('usePerangkatAjarProta', () => {
    it('manages prota item additions and auto-saves', () => {
      let items: ProtaItem[] = [];
      const setItems = vi.fn((update) => {
        items = typeof update === 'function' ? update(items) : update;
      });
      const triggerProtaSave = vi.fn();
      const rememberForUndo = vi.fn();

      const rme: RmeSummary = {
        totalWeeks: 18,
        effectiveWeeks: 16,
        allocatedWeeks: 14,
        reserveWeeks: 2,
        examWeeks: 2,
        holidayWeeks: 0,
        otherWeeks: 0,
        totalJp: 64,
        allocatedJp: 56,
        reserveJp: 8,
      };

      const { result } = renderHook(() =>
        usePerangkatAjarProta({
          protaItems: items,
          setProtaItems: setItems,
          rmeSem1: rme,
          rmeSem2: rme,
          subject: 'Matematika',
          gradeLevel: 'Kelas 4',
          curriculum: 'MERDEKA',
          triggerProtaSave,
          rememberForUndo,
        })
      );

      act(() => {
        result.current.handleAddProtaItem({
          semester: 1,
          chapterNumber: 'Bab 1',
          topic: 'Bilangan Cacah',
          subTopics: ['Membaca bilangan'],
          allocatedJp: 8,
        });
      });

      expect(setItems).toHaveBeenCalled();
      expect(triggerProtaSave).toHaveBeenCalled();
    });
  });

  describe('usePerangkatAjarKaldik', () => {
    it('initializes academic year and provides calculated RME', async () => {
      const { result } = renderHook(() =>
        usePerangkatAjarKaldik({
          academicYear: '2024/2025',
          weeklyJpQuota: 4,
          reserveJpSem1: 4,
          reserveJpSem2: 4,
          rememberForUndo: vi.fn(),
        })
      );

      await waitFor(() => {
        expect(result.current.weeks.length).toBeGreaterThan(0);
      });
      expect(result.current.rmeSem1).toBeDefined();
      expect(result.current.rmeSem2).toBeDefined();
      expect(typeof result.current.rmeSem1.totalWeeks).toBe('number');
    });

    it('updates a specific kaldik week type and triggers save', async () => {
      const { result } = renderHook(() =>
        usePerangkatAjarKaldik({
          academicYear: '2024/2025',
          weeklyJpQuota: 4,
          reserveJpSem1: 4,
          reserveJpSem2: 4,
          rememberForUndo: vi.fn(),
        })
      );

      await waitFor(() => {
        expect(result.current.weeks.length).toBeGreaterThan(0);
      });

      act(() => {
        result.current.handleUpdateWeek(7, 1, 'LIBUR_SEMESTER');
      });

      const updatedWeek = result.current.weeks.find((w) => w.month === 7 && w.weekNumber === 1);
      expect(updatedWeek?.type).toBe('LIBUR_SEMESTER');
    });
  });
});
