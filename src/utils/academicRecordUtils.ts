import type { AcademicRecordRow, ViolationRow } from '../components/pages/student/types';

type AcademicRecordIdentity = Pick<
    AcademicRecordRow,
    'student_id' | 'subject' | 'assessment_name' | 'semester_id' | 'user_id'
>;

const normalizeText = (value?: string | null) => value?.trim().toLowerCase() || '';

export const buildAcademicRecordIdentityKey = (record: Partial<Omit<AcademicRecordIdentity, 'user_id'>> & Pick<AcademicRecordIdentity, 'student_id'>) => (
    [
        record.student_id,
        normalizeText(record.subject),
        normalizeText(record.assessment_name),
        record.semester_id || 'no-semester',
    ].join('::')
);

type DedupableAcademicRecord = Pick<AcademicRecordRow, 'student_id' | 'subject' | 'created_at'>
    & Partial<Pick<AcademicRecordRow, 'assessment_name' | 'semester_id' | 'version'>>;

const getRecordPriority = (record: DedupableAcademicRecord) => {
    const versionScore = typeof record.version === 'number' ? record.version : 0;
    const createdAtScore = new Date(record.created_at).getTime();
    return Number.isNaN(createdAtScore) ? versionScore : versionScore * 1_000_000_000_000 + createdAtScore;
};

export const dedupeAcademicRecords = <T extends DedupableAcademicRecord>(records: T[]): T[] => {
    const latestByKey = new Map<string, T>();

    records.forEach((record) => {
        const key = buildAcademicRecordIdentityKey(record);
        const existing = latestByKey.get(key);

        if (!existing || getRecordPriority(record) >= getRecordPriority(existing)) {
            latestByKey.set(key, record);
        }
    });

    return Array.from(latestByKey.values());
};

type QuizPointIdentity = {
    student_id: string;
    subject?: string | null;
    quiz_name?: string | null;
    quiz_date?: string | null;
    semester_id?: string | null;
    user_id?: string | null;
    points?: number | null;
};

export const buildQuizPointIdentityKey = (record: QuizPointIdentity) => (
    [
        record.student_id,
        normalizeText(record.subject),
        normalizeText(record.quiz_name),
        record.quiz_date || 'no-date',
        record.semester_id || 'no-semester',
    ].join('::')
);

/**
 * Write-side duplicate key: one keaktifan point per student, subject, activity
 * and day, whichever teacher records it. Matches what dedupeQuizPoints keeps
 * on read (the semester follows from the date).
 */
export const buildQuizPointDailyKey = (record: Pick<QuizPointIdentity, 'student_id' | 'subject' | 'quiz_name' | 'quiz_date'>) => (
    [
        record.student_id,
        normalizeText(record.subject),
        normalizeText(record.quiz_name),
        record.quiz_date || 'no-date',
    ].join('::')
);

export const dedupeQuizPoints = <T extends QuizPointIdentity & { created_at?: string | null }>(records: T[]): T[] => {
    const latestByKey = new Map<string, T>();

    records.forEach((record) => {
        const key = buildQuizPointIdentityKey(record);
        const existing = latestByKey.get(key);
        const currentCreatedAt = record.created_at ? new Date(record.created_at).getTime() : 0;
        const existingCreatedAt = existing?.created_at ? new Date(existing.created_at).getTime() : 0;

        if (!existing || currentCreatedAt >= existingCreatedAt) {
            latestByKey.set(key, record);
        }
    });

    return Array.from(latestByKey.values());
};

type ViolationIdentity = Pick<
    ViolationRow,
    'student_id' | 'description' | 'date'
> & Partial<Pick<ViolationRow, 'semester_id' | 'user_id' | 'points' | 'type'>>;

export const buildViolationIdentityKey = (record: ViolationIdentity) => (
    [
        record.student_id,
        normalizeText(record.description),
        record.date || 'no-date',
    ].join('::')
);

export const dedupeViolations = <T extends ViolationIdentity & { created_at?: string | null }>(records: T[]): T[] => {
    const latestByKey = new Map<string, T>();

    records.forEach((record) => {
        const key = buildViolationIdentityKey(record);
        const existing = latestByKey.get(key);
        const currentCreatedAt = record.created_at ? new Date(record.created_at).getTime() : 0;
        const existingCreatedAt = existing?.created_at ? new Date(existing.created_at).getTime() : 0;

        if (!existing || currentCreatedAt >= existingCreatedAt) {
            latestByKey.set(key, record);
        }
    });

    return Array.from(latestByKey.values());
};
