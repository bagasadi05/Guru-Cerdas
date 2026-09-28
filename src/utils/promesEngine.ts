/**
 * @fileoverview Pure functional calculation, distribution matrix, and validation engine
 * for Program Semester (Promes).
 *
 * Implements Milestone M3 core domain logic:
 * - 2D matrix structure generation (Rows: ProtaItems, Columns: 6 Months × 5 Weeks = 30 slots)
 * - Automatic locking and shading for non-effective calendar weeks (Kaldik)
 * - Sequential auto-distribution ("Quick Fill") with weekly teaching hours limit packing
 * - Row-level matching status indicators (SESUAI, KURANG, LEBIH) against Prota targets
 * - Column-level weekly capacity sum calculation and limit violation detection
 * - Pure immutable matrix manipulation helpers for manual inline editing
 *
 * @module utils/promesEngine
 */

import type {
  KaldikWeek,
  ProtaItem,
  WeekType,
  MatrixCell,
  MatrixRowStatus,
  AutoDistributeInput,
  ColumnWeeklySum,
  AllocationMatchStatus,
} from '../types/perangkatAjar';

export type {
  KaldikWeek,
  ProtaItem,
  WeekType,
  MatrixCell,
  MatrixRowStatus,
  AutoDistributeInput,
  ColumnWeeklySum,
  AllocationMatchStatus,
};

// =============================================================================
// 1. HELPERS & TAXONOMY
// =============================================================================

/**
 * Maps an academic month (1-12) to its 0-indexed semester position (0-5).
 * Semester 1 (Ganjil): Juli (7) -> 0, Agustus (8) -> 1, ..., Desember (12) -> 5
 * Semester 2 (Genap): Januari (1) -> 0, Februari (2) -> 1, ..., Juni (6) -> 5
 *
 * @param month Calendar month number (1-12)
 * @returns Month index within the semester (0-5)
 */
export function getSemesterMonthIndex(month: number): number {
  if (month >= 7 && month <= 12) {
    return month - 7;
  }
  if (month >= 1 && month <= 6) {
    return month - 1;
  }
  return 0;
}

/**
 * Sanitizes a numeric JP value to guarantee a non-negative integer.
 */
function sanitizeJp(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || Number.isNaN(value)) {
    return 0;
  }
  return Math.max(0, Math.floor(value));
}

export interface RowStatusBadgeProps {
  status: AllocationMatchStatus;
  label: string;
  badgeClass: string;
  iconName: 'CheckCircle' | 'AlertTriangle' | 'AlertCircle';
  diffText: string;
}

/**
 * Returns UI styling and human-readable badges for Promes row matching status.
 */
export function getRowStatusBadgeProps(
  status: AllocationMatchStatus,
  difference: number
): RowStatusBadgeProps {
  switch (status) {
    case 'SESUAI':
      return {
        status: 'SESUAI',
        label: 'Sesuai (Pas)',
        badgeClass:
          'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800',
        iconName: 'CheckCircle',
        diffText: 'Pas (0 JP)',
      };
    case 'KURANG':
      return {
        status: 'KURANG',
        label: `Kurang ${Math.abs(difference)} JP`,
        badgeClass:
          'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
        iconName: 'AlertTriangle',
        diffText: `-${Math.abs(difference)} JP`,
      };
    case 'LEBIH':
      return {
        status: 'LEBIH',
        label: `Lebih ${difference} JP`,
        badgeClass:
          'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800',
        iconName: 'AlertCircle',
        diffText: `+${difference} JP`,
      };
  }
}

// =============================================================================
// 2. MATRIX GENERATION & AUTO-DISTRIBUTION ENGINE
// =============================================================================

interface InternalColumnSlot {
  monthIndex: number;
  weekNumber: number;
  isLocked: boolean;
  lockReason?: WeekType;
  remainingCapacity: number;
}

/**
 * Builds standard 30 column slots (6 months × 5 weeks) from Kaldik weeks.
 */
function buildColumnSlots(semesterWeeks: KaldikWeek[], weeklyLimit: number): InternalColumnSlot[] {
  const slots: InternalColumnSlot[] = [];

  for (let mIdx = 0; mIdx < 6; mIdx++) {
    for (let w = 1; w <= 5; w++) {
      // Find matching Kaldik week for this semester monthIndex and weekNumber
      const matchedWeek = semesterWeeks.find(
        (kw) => getSemesterMonthIndex(kw.month) === mIdx && kw.weekNumber === w
      );

      const type: WeekType = matchedWeek ? matchedWeek.type : 'KBM';
      const isLocked = type !== 'KBM';
      const lockReason = isLocked ? type : undefined;
      const capacity = isLocked ? 0 : Math.max(0, weeklyLimit);

      slots.push({
        monthIndex: mIdx,
        weekNumber: w,
        isLocked,
        lockReason,
        remainingCapacity: capacity,
      });
    }
  }

  return slots;
}

/**
 * Creates an empty 2D distribution matrix initialized with 0 JP for all cells.
 * Non-effective weeks according to Kaldik are locked.
 *
 * @param items ProtaItems in this semester
 * @param semesterWeeks 30 weeks of Kaldik for the semester
 */
export function buildEmptyMatrix(
  items: Array<{ id: string }>,
  semesterWeeks: KaldikWeek[]
): MatrixCell[] {
  const slots = buildColumnSlots(semesterWeeks, 0);
  const cells: MatrixCell[] = [];

  for (const item of items) {
    if (!item?.id) continue;
    for (const slot of slots) {
      cells.push({
        rowId: item.id,
        monthIndex: slot.monthIndex,
        weekNumber: slot.weekNumber,
        allocatedJp: 0,
        isLocked: slot.isLocked,
        lockReason: slot.lockReason,
      });
    }
  }

  return cells;
}

/**
 * Sequentially auto-distributes teaching hours for Prota items into effective weeks.
 *
 * Invariants & Rules:
 * 1. Non-effective weeks (`type !== 'KBM'`) are locked and receive 0 JP.
 * 2. Effective weeks receive hours up to `weeklyJpLimit`.
 * 3. Items are packed sequentially in given order.
 * 4. Non-divisible items spill over to the subsequent effective week.
 * 5. Multiple small items pack into the same week if capacity allows.
 * 6. Safely halts when semester capacity is exhausted.
 *
 * @param input AutoDistributeInput parameters
 * @returns Complete MatrixCell array (items.length × 30 cells)
 */
export function autoDistributePromes(input: AutoDistributeInput): MatrixCell[] {
  const { items = [], semesterWeeks = [], weeklyJpLimit = 4 } = input;
  const limit = Math.max(0, sanitizeJp(weeklyJpLimit));

  const slots = buildColumnSlots(semesterWeeks, limit);

  // Initialize all matrix cells with 0 JP
  const cellMap = new Map<string, MatrixCell>();

  for (const item of items) {
    if (!item?.id) continue;
    for (const slot of slots) {
      const key = `${item.id}-${slot.monthIndex}-${slot.weekNumber}`;
      cellMap.set(key, {
        rowId: item.id,
        monthIndex: slot.monthIndex,
        weekNumber: slot.weekNumber,
        allocatedJp: 0,
        isLocked: slot.isLocked,
        lockReason: slot.lockReason,
      });
    }
  }

  // Sequential packing loop
  let slotIdx = 0;

  for (const item of items) {
    if (!item?.id) continue;
    let remainingNeeded = sanitizeJp(item.targetJp);

    while (remainingNeeded > 0 && slotIdx < slots.length) {
      const currentSlot = slots[slotIdx];

      // Skip locked weeks or weeks with no remaining capacity
      if (currentSlot.isLocked || currentSlot.remainingCapacity <= 0) {
        slotIdx++;
        continue;
      }

      const alloc = Math.min(remainingNeeded, currentSlot.remainingCapacity);
      const key = `${item.id}-${currentSlot.monthIndex}-${currentSlot.weekNumber}`;
      const existingCell = cellMap.get(key);

      if (existingCell) {
        existingCell.allocatedJp = alloc;
      }

      currentSlot.remainingCapacity -= alloc;
      remainingNeeded -= alloc;

      // If this column slot is fully filled, advance to next slot
      if (currentSlot.remainingCapacity === 0) {
        slotIdx++;
      }
    }
  }

  // Return flat array preserving item row ordering
  const result: MatrixCell[] = [];
  for (const item of items) {
    if (!item?.id) continue;
    for (let mIdx = 0; mIdx < 6; mIdx++) {
      for (let w = 1; w <= 5; w++) {
        const key = `${item.id}-${mIdx}-${w}`;
        const cell = cellMap.get(key);
        if (cell) {
          result.push(cell);
        }
      }
    }
  }

  return result;
}

// =============================================================================
// 3. ROW STATUS & COLUMN SUMMARY EVALUATORS
// =============================================================================

/**
 * Evaluates row-level distribution status for every Prota item against its target JP.
 *
 * @param items Array of ProtaItems
 * @param cells Array of MatrixCells
 * @returns Map of rowId to MatrixRowStatus
 */
export function evaluateMatrixRowStatuses(
  items: ProtaItem[],
  cells: MatrixCell[]
): Record<string, MatrixRowStatus> {
  const result: Record<string, MatrixRowStatus> = {};

  // Build sum map per rowId
  const distributedMap = new Map<string, number>();
  if (Array.isArray(cells)) {
    for (const cell of cells) {
      if (!cell?.rowId) continue;
      const current = distributedMap.get(cell.rowId) ?? 0;
      distributedMap.set(cell.rowId, current + sanitizeJp(cell.allocatedJp));
    }
  }

  if (Array.isArray(items)) {
    for (const item of items) {
      if (!item?.id) continue;
      const targetJp = sanitizeJp(item.targetJp);
      const distributedJp = distributedMap.get(item.id) ?? 0;
      const difference = distributedJp - targetJp;

      let status: AllocationMatchStatus = 'SESUAI';
      if (difference < 0) {
        status = 'KURANG';
      } else if (difference > 0) {
        status = 'LEBIH';
      }

      result[item.id] = {
        rowId: item.id,
        targetJp,
        distributedJp,
        difference,
        status,
      };
    }
  }

  return result;
}

/**
 * Evaluates weekly total allocations across all learning objectives for each week column.
 *
 * @param cells Array of MatrixCells
 * @param semesterWeeks Kaldik weeks for the semester
 * @param weeklyLimit Allowed teaching hours limit per week
 * @returns 30 weekly column summary metrics
 */
export function evaluateColumnWeeklySums(
  cells: MatrixCell[],
  semesterWeeks: KaldikWeek[],
  weeklyLimit: number
): ColumnWeeklySum[] {
  const limit = Math.max(0, sanitizeJp(weeklyLimit));
  const sums: ColumnWeeklySum[] = [];

  for (let mIdx = 0; mIdx < 6; mIdx++) {
    for (let w = 1; w <= 5; w++) {
      let totalJp = 0;
      if (Array.isArray(cells)) {
        for (const cell of cells) {
          if (cell && cell.monthIndex === mIdx && cell.weekNumber === w) {
            totalJp += sanitizeJp(cell.allocatedJp);
          }
        }
      }

      sums.push({
        monthIndex: mIdx,
        weekNumber: w,
        totalJp,
        exceedsLimit: totalJp > limit,
      });
    }
  }

  return sums;
}

/**
 * Pure immutability helper: updates the allocated hours of a single cell in the matrix.
 *
 * @param cells Existing matrix cells
 * @param rowId Target ProtaItem id
 * @param monthIndex 0-5
 * @param weekNumber 1-5
 * @param newJp New hours allocation (non-negative)
 * @returns New array with updated cell
 */
export function updateCellAllocation(
  cells: MatrixCell[],
  rowId: string,
  monthIndex: number,
  weekNumber: number,
  newJp: number
): MatrixCell[] {
  if (!Array.isArray(cells)) return [];
  const sanitized = sanitizeJp(newJp);

  return cells.map((cell) => {
    if (
      cell.rowId === rowId &&
      cell.monthIndex === monthIndex &&
      cell.weekNumber === weekNumber
    ) {
      if (cell.isLocked) return cell; // Locked cells cannot be allocated hours
      return {
        ...cell,
        allocatedJp: sanitized,
      };
    }
    return cell;
  });
}
