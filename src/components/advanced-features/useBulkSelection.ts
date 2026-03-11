import { useCallback, useMemo, useState } from 'react';

export interface BulkSelectionState {
  selectedItems: Set<string>;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  toggleItem: (id: string) => void;
  toggleAll: () => void;
  selectItems: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  selectedCount: number;
}

export function useBulkSelection<T extends { id: string }>(
  items: T[]
): BulkSelectionState {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const allIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);

  const toggleItem = useCallback((id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedItems((prev) => {
      if (prev.size === allIds.size) {
        return new Set();
      }
      return new Set(allIds);
    });
  }, [allIds]);

  const selectItems = useCallback((ids: string[]) => {
    setSelectedItems(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  const isSelected = useCallback((id: string) => selectedItems.has(id), [selectedItems]);

  return {
    selectedItems,
    isAllSelected: selectedItems.size === allIds.size && allIds.size > 0,
    isPartiallySelected: selectedItems.size > 0 && selectedItems.size < allIds.size,
    toggleItem,
    toggleAll,
    selectItems,
    clearSelection,
    isSelected,
    selectedCount: selectedItems.size,
  };
}
