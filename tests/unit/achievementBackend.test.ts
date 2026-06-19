import { describe, it, expect } from 'vitest';
import { isAchievementsBackendMissing } from '../../src/utils/achievementBackend';

describe('isAchievementsBackendMissing', () => {
    it('returns false for null or undefined errors', () => {
        expect(isAchievementsBackendMissing(null)).toBe(false);
        expect(isAchievementsBackendMissing(undefined)).toBe(false);
    });

    it('returns true for Postgres error codes representing missing objects', () => {
        // undefined_table
        expect(isAchievementsBackendMissing({ code: '42P01', message: 'relation "student_achievements" does not exist' })).toBe(true);
        // undefined_function
        expect(isAchievementsBackendMissing({ code: '42883', message: 'function get_student_portal_data does not exist' })).toBe(true);
        // PostgREST function not found
        expect(isAchievementsBackendMissing({ code: 'PGRST202', message: 'Could not find function in schema' })).toBe(true);
    });

    it('returns true for error messages containing does not exist or schema cache with relevant identifiers', () => {
        // Error object
        expect(
            isAchievementsBackendMissing(
                new Error('Database error: relation "public.student_achievements" does not exist')
            )
        ).toBe(true);

        // Supabase error structure
        expect(
            isAchievementsBackendMissing({
                message: 'Could not find get_student_portal_data in schema cache',
            })
        ).toBe(true);
    });

    it('returns false for unrelated errors', () => {
        // Generic Error
        expect(isAchievementsBackendMissing(new Error('Connection timed out'))).toBe(false);

        // Supabase foreign key violation
        expect(
            isAchievementsBackendMissing({
                code: '23503',
                message: 'insert or update on table violates foreign key constraint',
            })
        ).toBe(false);
    });
});
