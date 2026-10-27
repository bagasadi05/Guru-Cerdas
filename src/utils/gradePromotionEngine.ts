export interface PromotionClassItem {
    id: string;
    name: string;
    grade_level?: number | null;
    wali_kelas_id?: string | null;
    user_id?: string | null;
}

export interface GradeInfo {
    grade: number | null;
    section: string;
}

export type PromotionMode = 'regular_promotion' | 'rolling_deliberation' | 'graduation' | 'unmapped';

export interface ClassPromotionRule {
    fromClassId: string;
    toClassId: string | null;
    mode: PromotionMode;
    grade: number | null;
}

export interface AutoClassPromotionMapResult {
    classMapping: Record<string, ClassPromotionRule>;
    classesByGrade: Record<number, PromotionClassItem[]>;
    grade3SourceClasses: PromotionClassItem[];
    grade4TargetClasses: PromotionClassItem[];
    grade6GraduationClasses: PromotionClassItem[];
}

export interface DeliberationStudentItem {
    id: string;
    name: string;
    nis?: string | null;
    gender: 'Laki-laki' | 'Perempuan' | string;
    fromClassId: string;
    fromClassName: string;
    avgScore: number | null;
    violationPoints: number;
}

export interface Grade4ClassCounter {
    classId: string;
    className: string;
    totalStudents: number;
    maleCount: number;
    femaleCount: number;
    avgScore: number | null;
    studentsWithViolationsCount: number;
}

export interface Grade4LiveCounterSummary {
    byClassId: Record<string, Grade4ClassCounter>;
    unassignedCount: number;
    retainedCount: number;
    totalGrade3Students: number;
}

export const RETAINED_TARGET = 'RETAINED';

const ROMAN_TO_GRADE: Record<string, number> = {
    VI: 6,
    V: 5,
    IV: 4,
    III: 3,
    II: 2,
    I: 1,
};

/**
 * Extracts numeric grade level (1..6) and class section identifier from class name or explicit grade_level.
 */
export function extractGradeInfo(className: string, explicitGradeLevel?: number | null): GradeInfo {
    const cleaned = className.trim();

    if (explicitGradeLevel && explicitGradeLevel >= 1 && explicitGradeLevel <= 6) {
        const withoutPrefix = cleaned
            .replace(/^(kelas|rombel|tingkat)\s*/i, '')
            .replace(new RegExp(`^${explicitGradeLevel}\\s*[-.]?\\s*`, 'i'), '')
            .trim()
            .toUpperCase();
        return {
            grade: explicitGradeLevel,
            section: withoutPrefix,
        };
    }

    const withoutKelas = cleaned.replace(/^(kelas|rombel|tingkat)\s*/i, '').trim();

    const digitMatch = withoutKelas.match(/^([1-6])(?:\s*[-.]?\s*([a-zA-Z0-9]+))?$/);
    if (digitMatch) {
        return {
            grade: Number(digitMatch[1]),
            section: (digitMatch[2] || '').trim().toUpperCase(),
        };
    }

    const romanMatch = withoutKelas.match(/^(VI|IV|V|III|II|I)(?:[\s\-.]+([a-zA-Z0-9]+))?$/i);
    if (romanMatch) {
        const romanKey = romanMatch[1].toUpperCase();
        return {
            grade: ROMAN_TO_GRADE[romanKey] ?? null,
            section: (romanMatch[2] || '').trim().toUpperCase(),
        };
    }

    const fallbackDigit = cleaned.match(/\b([1-6])\s*([A-Za-z])?\b/);
    if (fallbackDigit) {
        return {
            grade: Number(fallbackDigit[1]),
            section: (fallbackDigit[2] || '').trim().toUpperCase(),
        };
    }

    return { grade: null, section: cleaned.toUpperCase() };
}

/**
 * Builds automatic promotion mapping across all school classes:
 * - Grades 1, 2, 4, 5 -> matched to corresponding section in Grade + 1
 * - Grade 3 -> marked as 'rolling_deliberation' for Grade 4 placement
 * - Grade 6 -> marked as 'graduation' (Alumni)
 */
export function buildAutoClassPromotionMap(classes: PromotionClassItem[]): AutoClassPromotionMapResult {
    const classesByGrade: Record<number, PromotionClassItem[]> = {
        1: [],
        2: [],
        3: [],
        4: [],
        5: [],
        6: [],
    };

    const parsedMap = new Map<string, GradeInfo>();

    for (const cls of classes) {
        const info = extractGradeInfo(cls.name, cls.grade_level);
        parsedMap.set(cls.id, info);
        if (info.grade && info.grade >= 1 && info.grade <= 6) {
            classesByGrade[info.grade].push(cls);
        }
    }

    for (const grade of [1, 2, 3, 4, 5, 6]) {
        classesByGrade[grade].sort((a, b) => a.name.localeCompare(b.name, 'id'));
    }

    const classMapping: Record<string, ClassPromotionRule> = {};

    for (const cls of classes) {
        const info = parsedMap.get(cls.id) || { grade: null, section: '' };
        const grade = info.grade;

        if (grade === 6) {
            classMapping[cls.id] = {
                fromClassId: cls.id,
                toClassId: null,
                mode: 'graduation',
                grade: 6,
            };
            continue;
        }

        if (grade === 3) {
            classMapping[cls.id] = {
                fromClassId: cls.id,
                toClassId: null,
                mode: 'rolling_deliberation',
                grade: 3,
            };
            continue;
        }

        if (grade === 1 || grade === 2 || grade === 4 || grade === 5) {
            const nextGradeClasses = classesByGrade[grade + 1] || [];
            let matchedTarget: PromotionClassItem | undefined;

            if (info.section) {
                matchedTarget = nextGradeClasses.find(target => {
                    const targetInfo = parsedMap.get(target.id);
                    return targetInfo?.section === info.section;
                });
            }

            if (!matchedTarget && nextGradeClasses.length === 1 && classesByGrade[grade].length === 1) {
                matchedTarget = nextGradeClasses[0];
            }

            if (!matchedTarget) {
                const sourceIdx = classesByGrade[grade].findIndex(c => c.id === cls.id);
                if (sourceIdx >= 0 && sourceIdx < nextGradeClasses.length) {
                    matchedTarget = nextGradeClasses[sourceIdx];
                }
            }

            classMapping[cls.id] = {
                fromClassId: cls.id,
                toClassId: matchedTarget ? matchedTarget.id : null,
                mode: 'regular_promotion',
                grade,
            };
            continue;
        }

        classMapping[cls.id] = {
            fromClassId: cls.id,
            toClassId: null,
            mode: 'unmapped',
            grade: null,
        };
    }

    return {
        classMapping,
        classesByGrade,
        grade3SourceClasses: classesByGrade[3],
        grade4TargetClasses: classesByGrade[4],
        grade6GraduationClasses: classesByGrade[6],
    };
}

/**
 * Generates an initial balanced draft for Grade 3 -> Grade 4 deliberation
 * using serpentine (snake) distribution per gender sorted by academic average.
 */
export function generateBalancedGrade4Draft(
    students: DeliberationStudentItem[],
    grade4Classes: PromotionClassItem[]
): Record<string, string> {
    if (grade4Classes.length === 0) return {};

    const allocations: Record<string, string> = {};
    const classCount = grade4Classes.length;

    const sortByScoreDesc = (a: DeliberationStudentItem, b: DeliberationStudentItem) => {
        const scoreA = a.avgScore ?? -1;
        const scoreB = b.avgScore ?? -1;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.name.localeCompare(b.name, 'id');
    };

    const males = students.filter(s => s.gender === 'Laki-laki').sort(sortByScoreDesc);
    const females = students.filter(s => s.gender !== 'Laki-laki').sort(sortByScoreDesc);

    const distributeSerpentine = (group: DeliberationStudentItem[], startReverse = false) => {
        group.forEach((student, index) => {
            const row = Math.floor(index / classCount);
            const col = index % classCount;
            const isReverseRow = startReverse ? row % 2 === 0 : row % 2 === 1;
            const targetIdx = isReverseRow ? classCount - 1 - col : col;
            allocations[student.id] = grade4Classes[targetIdx].id;
        });
    };

    distributeSerpentine(males, false);
    distributeSerpentine(females, true);

    return allocations;
}

/**
 * Computes real-time deliberation counters (total, L/P ratio, average academic score, and violation count)
 * for each Grade 4 target class.
 */
export function computeGrade4LiveCounters(
    grade3Students: DeliberationStudentItem[],
    allocations: Record<string, string>,
    grade4Classes: PromotionClassItem[]
): Grade4LiveCounterSummary {
    const byClassId: Record<string, Grade4ClassCounter> = {};
    const scoreAccumulators: Record<string, { sum: number; count: number }> = {};

    for (const cls of grade4Classes) {
        byClassId[cls.id] = {
            classId: cls.id,
            className: cls.name,
            totalStudents: 0,
            maleCount: 0,
            femaleCount: 0,
            avgScore: null,
            studentsWithViolationsCount: 0,
        };
        scoreAccumulators[cls.id] = { sum: 0, count: 0 };
    }

    let unassignedCount = 0;
    let retainedCount = 0;

    for (const student of grade3Students) {
        const targetId = allocations[student.id];

        if (!targetId) {
            unassignedCount++;
            continue;
        }

        if (targetId === RETAINED_TARGET) {
            retainedCount++;
            continue;
        }

        const bucket = byClassId[targetId];
        if (!bucket) {
            unassignedCount++;
            continue;
        }

        bucket.totalStudents++;
        if (student.gender === 'Laki-laki') {
            bucket.maleCount++;
        } else {
            bucket.femaleCount++;
        }

        if (student.violationPoints > 0) {
            bucket.studentsWithViolationsCount++;
        }

        if (typeof student.avgScore === 'number' && !Number.isNaN(student.avgScore)) {
            scoreAccumulators[targetId].sum += student.avgScore;
            scoreAccumulators[targetId].count += 1;
        }
    }

    for (const cls of grade4Classes) {
        const acc = scoreAccumulators[cls.id];
        if (acc && acc.count > 0) {
            byClassId[cls.id].avgScore = Math.round((acc.sum / acc.count) * 10) / 10;
        }
    }

    return {
        byClassId,
        unassignedCount,
        retainedCount,
        totalGrade3Students: grade3Students.length,
    };
}
