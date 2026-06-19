/**
 * @fileoverview Types for the Student Achievement (Portofolio Prestasi) feature.
 *
 * Defines the structured record of a student who won a competition (lomba),
 * including a reference to the stored certificate file. This is distinct from
 * the free-text `prestasi` category in `reports`.
 *
 * NOTE: These types mirror the `public.student_achievements` table created in
 * `supabase/migrations/20260619000000_create_student_achievements.sql`. They
 * are declared manually (rather than relying solely on the generated
 * `database.types.ts`) so the feature stays type-safe even before Supabase
 * types are regenerated.
 *
 * @module types/studentAchievement
 */

/** Achievement category (bidang prestasi). */
export const ACHIEVEMENT_CATEGORIES = [
    'akademik',
    'non_akademik',
    'seni',
    'olahraga',
    'keagamaan',
    'lainnya',
] as const;
export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number];

/** Competition level (tingkat lomba). */
export const ACHIEVEMENT_LEVELS = [
    'sekolah',
    'kecamatan',
    'kabupaten_kota',
    'provinsi',
    'nasional',
    'internasional',
] as const;
export type AchievementLevel = (typeof ACHIEVEMENT_LEVELS)[number];

/** Rank / placing achieved (peringkat). */
export const ACHIEVEMENT_RANKS = [
    'juara_1',
    'juara_2',
    'juara_3',
    'harapan',
    'finalis',
    'partisipan',
] as const;
export type AchievementRank = (typeof ACHIEVEMENT_RANKS)[number];

/** A persisted student achievement row. */
export interface StudentAchievement {
    id: string;
    user_id: string;
    student_id: string;
    semester_id: string | null;
    title: string;
    category: AchievementCategory;
    level: AchievementLevel;
    rank: AchievementRank | null;
    organizer: string | null;
    /** ISO date string (YYYY-MM-DD) of the achievement. */
    date: string;
    description: string | null;
    /** Public/storage URL of the uploaded certificate file, if any. */
    certificate_url: string | null;
    /** Original filename of the uploaded certificate, if any. */
    certificate_name: string | null;
    points: number | null;
    created_at: string;
    updated_at: string;
}

/** Payload for creating a new achievement. */
export interface StudentAchievementInsert {
    id?: string;
    user_id: string;
    student_id: string;
    semester_id?: string | null;
    title: string;
    category: AchievementCategory;
    level: AchievementLevel;
    rank?: AchievementRank | null;
    organizer?: string | null;
    date: string;
    description?: string | null;
    certificate_url?: string | null;
    certificate_name?: string | null;
    points?: number | null;
    created_at?: string;
    updated_at?: string;
}

/** Payload for updating an existing achievement. */
export type StudentAchievementUpdate = Partial<
    Omit<StudentAchievementInsert, 'user_id' | 'student_id'>
>;
