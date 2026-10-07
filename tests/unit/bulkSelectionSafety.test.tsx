import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useBulkSelection } from '../../src/components/advanced-features/useBulkSelection';

describe('bulk selection safety', () => {
  it('drops selected students when switching classes and does not restore them on return', () => {
    const { result, rerender } = renderHook(({ items }) => useBulkSelection(items), {
      initialProps: { items: [{ id: 'student-a' }] },
    });
    act(() => result.current.toggleItem('student-a'));
    rerender({ items: [{ id: 'student-b' }] });
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.isAllSelected).toBe(false);
    rerender({ items: [{ id: 'student-a' }] });
    expect(result.current.isSelected('student-a')).toBe(false);
  });

  it('retains only visible selections when a filter changes', () => {
    const { result, rerender } = renderHook(({ items }) => useBulkSelection(items), {
      initialProps: { items: [{ id: 'student-a' }, { id: 'student-b' }] },
    });
    act(() => result.current.selectAll());
    rerender({ items: [{ id: 'student-b' }] });
    expect([...result.current.selectedItems]).toEqual(['student-b']);
    expect(result.current.selectedCount).toBe(1);
    expect(result.current.isAllSelected).toBe(true);
  });
});
