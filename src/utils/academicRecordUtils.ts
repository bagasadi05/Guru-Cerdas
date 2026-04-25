import type { AcademicRecordRow, QuizPointRow, ViolationRow } from '../components/pages/student/types';

type AcademicRecordIdentity = Pick<
    AcademicRecordRow,
    'student_id' | 'subject' | 'assessment_name' | 'semester_id' | 'user_id'
>;

const normalizeText = (value?: string | null) => value?.trim().toLowerCase() || '';

export const buildAcademicRecordIdentityKey = (record: AcademicRecordIdentity) => (
    [
        record.student_id,
        normalizeText(record.subject),
        normalizeText(record.assessment_name),
        record.semester_id || 'no-semester',
        record.user_id,
    ].join('::')
);

const getRecordPriority = (record: AcademicRecordRow) => {
    const versionScore = typeof record.version === 'number' ? record.version : 0;
    const createdAtScore = new Date(record.created_at).getTime();
    return Number.isNaN(createdAtScore) ? versionScore : versionScore * 1_000_000_000_000 + createdAtScore;
};

export const dedupeAcademicRecords = (records: AcademicRecordRow[]) => {
    const latestByKey = new Map<string, AcademicRecordRow>();

    records.forEach((record) => {
        const key = buildAcademicRecordIdentityKey(record);
        const existing = latestByKey.get(key);

        if (!existing || getRecordPriority(record) >= getRecordPriority(existing)) {
            latestByKey.set(key, record);
        }
    });

    return Array.from(latestByKey.values());
};

type QuizPointIdentity = Pick<
    QuizPointRow,
    'student_id' | 'subject' | 'quiz_name' | 'quiz_date' | 'semester_id' | 'user_id'
>;

export const buildQuizPointIdentityKey = (record: QuizPointIdentity) => (
    [
        record.student_id,
        normalizeText(record.subject),
        normalizeText(record.quiz_name),
        record.quiz_date || 'no-date',
        record.semester_id || 'no-semester',
        record.user_id,
    ].join('::')
);

export const dedupeQuizPoints = (records: QuizPointRow[]) => {
    const latestByKey = new Map<string, QuizPointRow>();

    records.forEach((record) => {
        const key = buildQuizPointIdentityKey(record);
        const existing = latestByKey.get(key);
        const currentCreatedAt = new Date(record.created_at).getTime();
        const existingCreatedAt = existing ? new Date(existing.created_at).getTime() : 0;

        if (!existing || currentCreatedAt >= existingCreatedAt) {
            latestByKey.set(key, record);
        }
    });

    return Array.from(latestByKey.values());
};

type ViolationIdentity = Pick<
    ViolationRow,
    'student_id' | 'description' | 'date' | 'semester_id' | 'user_id' | 'points' | 'type'
>;

export const buildViolationIdentityKey = (record: ViolationIdentity) => (
    [
        record.student_id,
        normalizeText(record.description),
        record.date || 'no-date',
        record.semester_id || 'no-semester',
        record.user_id,
        record.points,
        record.type || 'no-type',
    ].join('::')
);

export const dedupeViolations = (records: ViolationRow[]) => {
    const latestByKey = new Map<string, ViolationRow>();

    records.forEach((record) => {
        const key = buildViolationIdentityKey(record);
        const existing = latestByKey.get(key);
        const currentCreatedAt = new Date(record.created_at).getTime();
        const existingCreatedAt = existing ? new Date(existing.created_at).getTime() : 0;

        if (!existing || currentCreatedAt >= existingCreatedAt) {
            latestByKey.set(key, record);
        }
    });

    return Array.from(latestByKey.values());
};
