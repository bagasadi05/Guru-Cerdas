import { describe, expect, it } from 'vitest';
import {
    buildStudentCommunicationSignals,
    extractStoragePathFromPublicUrl,
    getAvailableQuizPoints,
    getLatestRecordForSubject,
    resolveSubmitSemesterId,
} from '../../src/components/pages/student/studentDetailHelpers';
import { AcademicRecordRow, AttendanceRow, QuizPointRow, ViolationRow } from '../../src/components/pages/student/types';

describe('StudentDetailPage helper logic', () => {
    it('preserves existing semester when editing an old record', () => {
        expect(resolveSubmitSemesterId('semester-old', 'semester-selected', 'semester-active')).toBe('semester-old');
    });

    it('uses selected semester for new records before falling back to active semester', () => {
        expect(resolveSubmitSemesterId(null, 'semester-selected', 'semester-active')).toBe('semester-selected');
        expect(resolveSubmitSemesterId(null, null, 'semester-active')).toBe('semester-active');
    });

    it('only counts unused quiz points for apply-points preview', () => {
        const points = [
            { id: '1', is_used: false },
            { id: '2', is_used: true },
            { id: '3', is_used: null },
        ] as QuizPointRow[];

        expect(getAvailableQuizPoints(points).map(point => point.id)).toEqual(['1', '3']);
    });

    it('uses latest grade record for the selected subject', () => {
        const records = [
            { id: 'old', subject: 'IPA', created_at: '2026-01-01T00:00:00Z', score: 70 },
            { id: 'new', subject: 'IPA', created_at: '2026-02-01T00:00:00Z', score: 85 },
            { id: 'other', subject: 'IPS', created_at: '2026-03-01T00:00:00Z', score: 90 },
        ] as AcademicRecordRow[];

        expect(getLatestRecordForSubject(records, 'IPA')?.id).toBe('new');
    });

    it('extracts storage object path from public URL', () => {
        const url = 'https://demo.supabase.co/storage/v1/object/public/student_assets/violation_evidence/student-1.jpg';
        expect(extractStoragePathFromPublicUrl(url, 'student_assets')).toBe('violation_evidence/student-1.jpg');
    });

    it('builds contextual parent communication templates from student conditions', () => {
        const signals = buildStudentCommunicationSignals({
            studentName: 'Rani',
            academicRecords: [{ id: 'g1', subject: 'Matematika', score: 60, created_at: '2026-02-01T00:00:00Z' }] as AcademicRecordRow[],
            attendanceRecords: [{ id: 'a1', status: 'Alpha' }] as AttendanceRow[],
            violations: [{ id: 'v1', points: 10, description: 'Terlambat', date: '2026-02-01', student_id: 's1', user_id: 'u1', created_at: '2026-02-01T00:00:00Z' }] as ViolationRow[],
        });

        expect(signals.map(signal => signal.id)).toEqual(['academic-support', 'attendance-alpha', 'behavior-followup']);
        expect(signals[0].message).toContain('Rani');
    });
});
