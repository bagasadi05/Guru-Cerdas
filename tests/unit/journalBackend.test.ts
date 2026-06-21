import { describe, it, expect } from 'vitest';
import { isTeachingJournalsBackendMissing } from '../../src/utils/journalBackend';

describe('isTeachingJournalsBackendMissing', () => {
    it('returns false for null or undefined errors', () => {
        expect(isTeachingJournalsBackendMissing(null)).toBe(false);
        expect(isTeachingJournalsBackendMissing(undefined)).toBe(false);
    });

    it('returns true for Postgres error codes representing missing objects', () => {
        // undefined_table
        expect(isTeachingJournalsBackendMissing({ code: '42P01', message: 'relation "teaching_journals" does not exist' })).toBe(true);
        // undefined_function
        expect(isTeachingJournalsBackendMissing({ code: '42883', message: 'function get_journal_rekap does not exist' })).toBe(true);
        // PostgREST function not found
        expect(isTeachingJournalsBackendMissing({ code: 'PGRST202', message: 'Could not find function in schema' })).toBe(true);
    });

    it('returns true for error messages containing does not exist or schema cache with relevant identifiers', () => {
        // Error object
        expect(
            isTeachingJournalsBackendMissing(
                new Error('Database error: relation "public.teaching_journals" does not exist')
            )
        ).toBe(true);

        // Supabase error structure
        expect(
            isTeachingJournalsBackendMissing({
                message: 'Could not find teaching_journals in schema cache',
            })
        ).toBe(true);
    });

    it('returns false for unrelated errors', () => {
        // Generic Error
        expect(isTeachingJournalsBackendMissing(new Error('Connection timed out'))).toBe(false);

        // Supabase foreign key violation
        expect(
            isTeachingJournalsBackendMissing({
                code: '23503',
                message: 'insert or update on table violates foreign key constraint',
            })
        ).toBe(false);
    });
});
