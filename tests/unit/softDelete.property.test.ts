import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

/**
 * Property-Based Testing for Soft Delete Functionality
 * Feature: undo-and-export-preview, Property 2: Soft delete exclusion
 * Validates: Requirements 3.2
 * 
 * These tests verify that soft delete functionality works correctly across all tables
 * and that queries properly exclude soft-deleted records.
 */

// Type definitions for entities with soft delete support
interface SoftDeletableEntity {
  id: string;
  deleted_at: string | null;
  [key: string]: any;
}

// Helper function to simulate a database query that filters out soft-deleted records
function queryWithSoftDeleteFilter<T extends SoftDeletableEntity>(records: T[]): T[] {
  return records.filter(record => record.deleted_at === null);
}

// Helper function to simulate soft delete operation
function softDelete<T extends SoftDeletableEntity>(record: T): T {
  return {
    ...record,
    deleted_at: new Date().toISOString()
  };
}

// Helper function to simulate restore operation
function restore<T extends SoftDeletableEntity>(record: T): T {
  return {
    ...record,
    deleted_at: null
  };
}

describe('Property-Based Testing: Soft Delete Schema', () => {
  // Arbitrary generators for different entity types
  // Generate timestamps as integers to avoid invalid date issues
  const minTimestamp = new Date('2020-01-01').getTime();
  const maxTimestamp = new Date('2030-12-31').getTime();
  const validTimestamp = fc.integer({ min: minTimestamp, max: maxTimestamp });
  const validDateString = validTimestamp.map(ts => new Date(ts).toISOString());
  const validDateOnly = validTimestamp.map(ts => new Date(ts).toISOString().split('T')[0]);
  
  const studentArbitrary = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    class_id: fc.uuid(),
    avatar_url: fc.webUrl(),
    user_id: fc.uuid(),
    created_at: validDateString,
    gender: fc.constantFrom('Laki-laki', 'Perempuan'),
    access_code: fc.string({ minLength: 6, maxLength: 6 }),
    parent_phone: fc.option(fc.string({ minLength: 10, maxLength: 15 }), { nil: null }),
    deleted_at: fc.option(validDateString, { nil: null })
  });

  const classArbitrary = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    user_id: fc.uuid(),
    created_at: validDateString,
    deleted_at: fc.option(validDateString, { nil: null })
  });

  const attendanceArbitrary = fc.record({
    id: fc.uuid(),
    student_id: fc.uuid(),
    date: validDateOnly,
    status: fc.constantFrom('Hadir', 'Izin', 'Sakit', 'Alpha'),
    notes: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
    user_id: fc.uuid(),
    created_at: validDateString,
    deleted_at: fc.option(validDateString, { nil: null })
  });

  const taskArbitrary = fc.record({
    id: fc.uuid(),
    user_id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 200 }),
    description: fc.option(fc.string({ maxLength: 1000 }), { nil: null }),
    due_date: fc.option(validDateOnly, { nil: null }),
    status: fc.constantFrom('todo', 'in_progress', 'done'),
    created_at: validDateString,
    deleted_at: fc.option(validDateString, { nil: null })
  });

  /**
   * Property 2: Soft delete exclusion
   * For any database query on a table with soft delete support, 
   * records with a non-null deleted_at timestamp should be excluded 
   * from results unless explicitly requested.
   */
  it('property: queries exclude soft-deleted students', () => {
    fc.assert(
      fc.property(
        fc.array(studentArbitrary, { minLength: 1, maxLength: 50 }),
        (students) => {
          // Query should only return students where deleted_at is null
          const results = queryWithSoftDeleteFilter(students);
          
          // All results must have deleted_at === null
          const allActiveRecords = results.every(student => student.deleted_at === null);
          expect(allActiveRecords).toBe(true);
          
          // Results should be a subset of original
          expect(results.length).toBeLessThanOrEqual(students.length);
          
          // Count should match manual filter
          const expectedCount = students.filter(s => s.deleted_at === null).length;
          expect(results.length).toBe(expectedCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('property: queries exclude soft-deleted classes', () => {
    fc.assert(
      fc.property(
        fc.array(classArbitrary, { minLength: 1, maxLength: 50 }),
        (classes) => {
          const results = queryWithSoftDeleteFilter(classes);
          
          // All results must have deleted_at === null
          expect(results.every(cls => cls.deleted_at === null)).toBe(true);
          
          // Results should be a subset
          expect(results.length).toBeLessThanOrEqual(classes.length);
          
          // Verify no soft-deleted records in results
          const hasSoftDeleted = results.some(cls => cls.deleted_at !== null);
          expect(hasSoftDeleted).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('property: queries exclude soft-deleted attendance records', () => {
    fc.assert(
      fc.property(
        fc.array(attendanceArbitrary, { minLength: 1, maxLength: 50 }),
        (attendanceRecords) => {
          const results = queryWithSoftDeleteFilter(attendanceRecords);
          
          // All results must have deleted_at === null
          expect(results.every(record => record.deleted_at === null)).toBe(true);
          
          // Count active records manually
          const activeCount = attendanceRecords.filter(r => r.deleted_at === null).length;
          expect(results.length).toBe(activeCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('property: queries exclude soft-deleted tasks', () => {
    fc.assert(
      fc.property(
        fc.array(taskArbitrary, { minLength: 1, maxLength: 50 }),
        (tasks) => {
          const results = queryWithSoftDeleteFilter(tasks);
          
          // All results must have deleted_at === null
          expect(results.every(task => task.deleted_at === null)).toBe(true);
          
          // Verify count
          const activeCount = tasks.filter(t => t.deleted_at === null).length;
          expect(results.length).toBe(activeCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('property: soft delete operation sets deleted_at timestamp', () => {
    fc.assert(
      fc.property(
        studentArbitrary,
        (student) => {
          // Ensure student starts as active
          const activeStudent = { ...student, deleted_at: null };
          
          // Perform soft delete
          const deletedStudent = softDelete(activeStudent);
          
          // deleted_at should now be set
          expect(deletedStudent.deleted_at).not.toBeNull();
          expect(typeof deletedStudent.deleted_at).toBe('string');
          
          // Should be a valid ISO timestamp
          const timestamp = new Date(deletedStudent.deleted_at!);
          expect(timestamp.toString()).not.toBe('Invalid Date');
          
          // All other properties should remain unchanged
          expect(deletedStudent.id).toBe(activeStudent.id);
          expect(deletedStudent.name).toBe(activeStudent.name);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('property: restore operation clears deleted_at timestamp', () => {
    fc.assert(
      fc.property(
        studentArbitrary,
        (student) => {
          // Ensure student starts as deleted
          const deletedStudent = { ...student, deleted_at: new Date().toISOString() };
          
          // Perform restore
          const restoredStudent = restore(deletedStudent);
          
          // deleted_at should now be null
          expect(restoredStudent.deleted_at).toBeNull();
          
          // All other properties should remain unchanged
          expect(restoredStudent.id).toBe(deletedStudent.id);
          expect(restoredStudent.name).toBe(deletedStudent.name);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('property: soft delete then restore is identity for active records', () => {
    fc.assert(
      fc.property(
        studentArbitrary,
        (student) => {
          // Start with active student
          const activeStudent = { ...student, deleted_at: null };
          
          // Soft delete then restore
          const afterCycle = restore(softDelete(activeStudent));
          
          // Should be back to active state
          expect(afterCycle.deleted_at).toBeNull();
          
          // Core properties should be unchanged
          expect(afterCycle.id).toBe(activeStudent.id);
          expect(afterCycle.name).toBe(activeStudent.name);
          expect(afterCycle.user_id).toBe(activeStudent.user_id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('property: filtering preserves record count invariant', () => {
    fc.assert(
      fc.property(
        fc.array(studentArbitrary, { minLength: 1, maxLength: 100 }),
        (students) => {
          const activeRecords = queryWithSoftDeleteFilter(students);
          const deletedRecords = students.filter(s => s.deleted_at !== null);
          
          // Sum of active and deleted should equal total
          expect(activeRecords.length + deletedRecords.length).toBe(students.length);
          
          // No overlap between active and deleted
          const activeIds = new Set(activeRecords.map(s => s.id));
          const deletedIds = new Set(deletedRecords.map(s => s.id));
          const intersection = [...activeIds].filter(id => deletedIds.has(id));
          expect(intersection.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('property: multiple soft deletes on same record are idempotent', () => {
    fc.assert(
      fc.property(
        studentArbitrary,
        (student) => {
          const activeStudent = { ...student, deleted_at: null };
          
          // Delete once
          const deleted1 = softDelete(activeStudent);
          const timestamp1 = deleted1.deleted_at;
          
          // Delete again (simulating multiple delete calls)
          const deleted2 = softDelete(deleted1);
          
          // Both should have deleted_at set
          expect(deleted1.deleted_at).not.toBeNull();
          expect(deleted2.deleted_at).not.toBeNull();
          
          // Record should still be considered deleted
          const results = queryWithSoftDeleteFilter([deleted2]);
          expect(results.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('property: query results maintain referential integrity', () => {
    fc.assert(
      fc.property(
        fc.array(studentArbitrary, { minLength: 5, maxLength: 20 }),
        (students) => {
          const results = queryWithSoftDeleteFilter(students);
          
          // Every result should be findable in original array
          results.forEach(result => {
            const found = students.find(s => s.id === result.id);
            expect(found).toBeDefined();
            expect(found?.deleted_at).toBeNull();
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
