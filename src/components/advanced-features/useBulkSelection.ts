import { useCallback, useMemo, useState } from 'react';

export interface BulkSelectionState {
  selectedItems: Set<string>;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  toggleItem: (id: string) => void;
  toggleAll: () => void;
  selectAll: () => void;
  selectItems: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  selectedCount: number;
}

export function useBulkSelection<T extends { id: string }>(
  items: T[]
): BulkSelectionState {
  const [selection, setSelectedItems] = useState<Set<string>>(new Set());

  const allIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const selectedItems = useMemo(
    () => new Set([...selection].filter((id) => allIds.has(id))),
    [selection, allIds],
  );

  if (selectedItems.size !== selection.size) {
    setSelectedItems(selectedItems);
  }

  const toggleItem = useCallback((id: string) => {
    if (!allIds.has(id)) return;
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, [allIds]);

  const toggleAll = useCallback(() => {
    setSelectedItems((prev) => {
      if ([...allIds].every((id) => prev.has(id))) {
        return new Set();
      }
      return new Set(allIds);
    });
  }, [allIds]);

  const selectAll = useCallback(() => {
    setSelectedItems(new Set(allIds));
  }, [allIds]);

  const selectItems = useCallback((ids: string[]) => {
    setSelectedItems(new Set(ids.filter((id) => allIds.has(id))));
  }, [allIds]);

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
    selectAll,
    selectItems,
    clearSelection,
    isSelected,
    selectedCount: selectedItems.size,
  };
}
