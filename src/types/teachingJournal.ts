/**
 * @fileoverview Types for the Teaching Journal (Jurnal Mengajar / Agenda KBM) feature.
 *
 * Defines the structured daily teaching journal entry including class, subject,
 * meeting number, topic, objectives, activities, notes, and optional attachment.
 *
 * NOTE: These types mirror the `public.teaching_journals` table created in
 * `supabase/migrations/20260621100000_create_teaching_journals.sql`. They
 * are declared manually (rather than relying solely on the generated
 * `database.types.ts`) so the feature stays type-safe even before Supabase
 * types are regenerated.
 *
 * @module types/teachingJournal
 */

import type { Tables, TablesInsert, TablesUpdate } from '../services/database.types';

// ---------------------------------------------------------------------------
// Row types (convenience aliases)
// ---------------------------------------------------------------------------

/** A persisted teaching journal row. */
export type TeachingJournal = Tables<'teaching_journals'>;

/** Payload for creating a new teaching journal entry. */
export type TeachingJournalInsert = TablesInsert<'teaching_journals'>;

/** Payload for updating an existing teaching journal entry. */
export type TeachingJournalUpdate = TablesUpdate<'teaching_journals'>;

// ---------------------------------------------------------------------------
// Filter / query types
// ---------------------------------------------------------------------------

/** Filter parameters for teaching journal queries. */
export interface TeachingJournalFilters {
    /** Filter by class ID */
    classId?: string;
    /** Filter by subject name */
    subject?: string;
    /** Filter by specific date (YYYY-MM-DD) */
    date?: string;
    /** Filter by start of date range (inclusive, YYYY-MM-DD) */
    startDate?: string;
    /** Filter by end of date range (inclusive, YYYY-MM-DD) */
    endDate?: string;
    /** Flag to fetch all teachers' journals (requires leadership role) */
    allTeachers?: boolean;
}

// ---------------------------------------------------------------------------
// Rekap / summary types
// ---------------------------------------------------------------------------

/** Summary row returned by the rekap (recap) query. */
export interface TeachingJournalRekap {
    classId: string;
    className: string;
    subject: string;
    userId: string;
    teacherName: string;
    totalMeetings: number;
    journalsFilled: number;
    lastJournalDate: string | null;
}
