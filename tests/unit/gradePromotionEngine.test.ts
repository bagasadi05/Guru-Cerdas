import { describe, it, expect } from 'vitest';
import {
    extractGradeInfo,
    buildAutoClassPromotionMap,
    computeGrade4LiveCounters,
    generateBalancedGrade4Draft,
    type PromotionClassItem,
    type DeliberationStudentItem,
} from '../../src/utils/gradePromotionEngine';

describe('gradePromotionEngine', () => {
    describe('extractGradeInfo', () => {
        it('parses standard SD class names with grade and section', () => {
            expect(extractGradeInfo('Kelas 1A')).toEqual({ grade: 1, section: 'A' });
            expect(extractGradeInfo('3B')).toEqual({ grade: 3, section: 'B' });
            expect(extractGradeInfo('Kelas 4 - C')).toEqual({ grade: 4, section: 'C' });
            expect(extractGradeInfo('6')).toEqual({ grade: 6, section: '' });
        });

        it('parses Roman numeral class names', () => {
            expect(extractGradeInfo('Kelas IV A')).toEqual({ grade: 4, section: 'A' });
            expect(extractGradeInfo('VI-B')).toEqual({ grade: 6, section: 'B' });
        });

        it('uses explicit grade_level when provided', () => {
            expect(extractGradeInfo('Rombel Melati', 2)).toEqual({ grade: 2, section: 'MELATI' });
        });
    });

    describe('buildAutoClassPromotionMap', () => {
        const classes: PromotionClassItem[] = [
            { id: 'c-1a', name: 'Kelas 1A', grade_level: 1 },
            { id: 'c-1b', name: 'Kelas 1B', grade_level: 1 },
            { id: 'c-2a', name: 'Kelas 2A', grade_level: 2 },
            { id: 'c-2b', name: 'Kelas 2B', grade_level: 2 },
            { id: 'c-3a', name: 'Kelas 3A', grade_level: 3 },
            { id: 'c-3b', name: 'Kelas 3B', grade_level: 3 },
            { id: 'c-4a', name: 'Kelas 4A', grade_level: 4 },
            { id: 'c-4b', name: 'Kelas 4B', grade_level: 4 },
            { id: 'c-5a', name: 'Kelas 5A', grade_level: 5 },
            { id: 'c-6a', name: 'Kelas 6A', grade_level: 6 },
        ];

        it('maps regular grades (1, 2, 4, 5) to matching section in next grade, marks grade 3 as rolling, and grade 6 as graduated', () => {
            const result = buildAutoClassPromotionMap(classes);

            expect(result.classMapping['c-1a']).toEqual({
                fromClassId: 'c-1a',
                toClassId: 'c-2a',
                mode: 'regular_promotion',
                grade: 1,
            });
            expect(result.classMapping['c-1b']?.toClassId).toBe('c-2b');
            expect(result.classMapping['c-2a']?.toClassId).toBe('c-3a');
            expect(result.classMapping['c-4a']?.toClassId).toBe('c-5a');
            expect(result.classMapping['c-5a']?.toClassId).toBe('c-6a');

            expect(result.classMapping['c-3a']?.mode).toBe('rolling_deliberation');
            expect(result.classMapping['c-3a']?.toClassId).toBeNull();

            expect(result.classMapping['c-6a']?.mode).toBe('graduation');
            expect(result.classMapping['c-6a']?.toClassId).toBeNull();

            expect(result.grade4TargetClasses.map(c => c.id)).toEqual(['c-4a', 'c-4b']);
        });
    });

    describe('generateBalancedGrade4Draft & computeGrade4LiveCounters', () => {
        const grade4Classes: PromotionClassItem[] = [
            { id: 'c-4a', name: 'Kelas 4A', grade_level: 4 },
            { id: 'c-4b', name: 'Kelas 4B', grade_level: 4 },
        ];

        const students: DeliberationStudentItem[] = [
            { id: 's1', name: 'Putra 1', gender: 'Laki-laki', fromClassId: 'c-3a', fromClassName: '3A', avgScore: 95, violationPoints: 0 },
            { id: 's2', name: 'Putra 2', gender: 'Laki-laki', fromClassId: 'c-3a', fromClassName: '3A', avgScore: 85, violationPoints: 10 },
            { id: 's3', name: 'Putra 3', gender: 'Laki-laki', fromClassId: 'c-3b', fromClassName: '3B', avgScore: 75, violationPoints: 0 },
            { id: 's4', name: 'Putra 4', gender: 'Laki-laki', fromClassId: 'c-3b', fromClassName: '3B', avgScore: 65, violationPoints: 5 },
            { id: 's5', name: 'Putri 1', gender: 'Perempuan', fromClassId: 'c-3a', fromClassName: '3A', avgScore: 92, violationPoints: 0 },
            { id: 's6', name: 'Putri 2', gender: 'Perempuan', fromClassId: 'c-3b', fromClassName: '3B', avgScore: 82, violationPoints: 0 },
        ];

        it('distributes male and female students evenly across Grade 4 classes with balanced scores', () => {
            const draft = generateBalancedGrade4Draft(students, grade4Classes);
            const counters = computeGrade4LiveCounters(students, draft, grade4Classes);

            expect(counters.unassignedCount).toBe(0);
            expect(counters.retainedCount).toBe(0);

            const stats4A = counters.byClassId['c-4a'];
            const stats4B = counters.byClassId['c-4b'];

            expect(stats4A.totalStudents).toBe(3);
            expect(stats4B.totalStudents).toBe(3);
            expect(stats4A.maleCount).toBe(2);
            expect(stats4B.maleCount).toBe(2);
            expect(stats4A.femaleCount).toBe(1);
            expect(stats4B.femaleCount).toBe(1);
        });

        it('counts unassigned and retained students accurately', () => {
            const partialAllocations: Record<string, string> = {
                s1: 'c-4a',
                s2: 'RETAINED',
            };
            const counters = computeGrade4LiveCounters(students, partialAllocations, grade4Classes);

            expect(counters.byClassId['c-4a'].totalStudents).toBe(1);
            expect(counters.byClassId['c-4a'].avgScore).toBe(95);
            expect(counters.retainedCount).toBe(1);
            expect(counters.unassignedCount).toBe(4);
        });
    });
});
