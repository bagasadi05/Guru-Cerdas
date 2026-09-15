import { describe, expect, it } from 'vitest';
import { BINTANG_ATTITUDE_ASPECTS, ATTITUDE_SUGGESTIONS } from '../../src/components/pages/mass-input/constants';
import { dedupeQuizPoints } from '../../src/utils/academicRecordUtils';

describe('massInputAttitudePoints - Constants & Utilities', () => {
    it('defines all 5 BINTANG attitude aspects with correct metadata', () => {
        expect(BINTANG_ATTITUDE_ASPECTS).toHaveLength(5);
        const expectedValues = [
            'Adab & Akhlak',
            'Kedisiplinan & Sikap',
            'Kerapian & Kebersihan',
            'Pembiasaan Ibadah',
            'Keaktifan & Inisiatif',
        ];
        const actualValues = BINTANG_ATTITUDE_ASPECTS.map(a => a.value);
        expect(actualValues).toEqual(expectedValues);

        for (const aspect of BINTANG_ATTITUDE_ASPECTS) {
            expect(aspect.value).toBeTruthy();
            expect(aspect.label).toBeTruthy();
            expect(aspect.icon).toBeTruthy();
            expect(aspect.menunjang).toBeTruthy();
            expect(aspect.defaultActivity).toBeTruthy();
        }
    });

    it('provides quick suggestions for every attitude aspect', () => {
        for (const aspect of BINTANG_ATTITUDE_ASPECTS) {
            const suggestions = ATTITUDE_SUGGESTIONS[aspect.value];
            expect(suggestions).toBeDefined();
            expect(Array.isArray(suggestions)).toBe(true);
            expect(suggestions.length).toBeGreaterThanOrEqual(3);
            for (const item of suggestions) {
                expect(typeof item).toBe('string');
                expect(item.trim().length).toBeGreaterThan(0);
            }
        }
    });

    it('matches default activities with suggestions', () => {
        for (const aspect of BINTANG_ATTITUDE_ASPECTS) {
            const suggestions = ATTITUDE_SUGGESTIONS[aspect.value];
            expect(suggestions).toContain(aspect.defaultActivity);
        }
    });

    it('deduplicates attitude quiz_points keeping the latest record', () => {
        const mockAttitudePoints = [
            {
                id: 'qp-older',
                student_id: 'student-1',
                quiz_name: 'Adab & Kesantunan',
                category: 'Adab & Akhlak',
                subject: null,
                quiz_date: '2026-09-15',
                created_at: '2026-09-15T08:00:00Z',
                points: 1,
            },
            {
                id: 'qp-newer',
                student_id: 'student-1',
                quiz_name: 'Adab & Kesantunan',
                category: 'Adab & Akhlak',
                subject: null,
                quiz_date: '2026-09-15',
                created_at: '2026-09-15T08:05:00Z',
                points: 1,
            },
            {
                id: 'qp-diff-student',
                student_id: 'student-2',
                quiz_name: 'Adab & Kesantunan',
                category: 'Adab & Akhlak',
                subject: null,
                quiz_date: '2026-09-15',
                created_at: '2026-09-15T08:00:00Z',
                points: 1,
            },
        ];

        const deduped = dedupeQuizPoints(mockAttitudePoints);
        expect(deduped).toHaveLength(2);
        const student1 = deduped.find(d => d.student_id === 'student-1');
        expect(student1?.id).toBe('qp-newer');
    });
});
