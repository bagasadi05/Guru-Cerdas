/**
 * Gamification Service
 * 
 * This module provides gamification features for the Portal Guru application,
 * including badge management, points calculation, and leaderboard generation.
 * The gamification system motivates students through achievements and friendly competition.
 * 
 * @module services/gamificationService
 * @since 1.0.0
 */

/**
 * Represents a badge that students can earn based on their performance.
 * 
 * Badges are awarded when students meet specific criteria such as academic excellence,
 * perfect attendance, or good behavior. Each badge has an associated point value
 * that contributes to the student's total score on the leaderboard.
 * 
 * @interface Badge
 * @property {string} id - Unique identifier for the badge
 * @property {string} name - Display name of the badge (in Indonesian)
 * @property {string} emoji - Emoji icon representing the badge
 * @property {string} description - Description of how to earn the badge
 * @property {number} points - Point value awarded when badge is earned
 * @property {string} color - Tailwind CSS gradient classes for badge styling
 * @property {BadgeCriteria} criteria - Conditions that must be met to earn the badge
 * 
 * @since 1.0.0
 */
export interface Badge {
    id: string;
    name: string;
    emoji: string;
    description: string;
    points: number;
    color: string;
    criteria: BadgeCriteria;
}

/**
 * Defines the criteria for earning a badge.
 * 
 * Badge criteria specify the type of achievement required and the threshold
 * that must be met. Some criteria are evaluated over a specific time period.
 * 
 * @interface BadgeCriteria
 * @property {'grade_top' | 'perfect_scores' | 'attendance' | 'quiz_top' | 'no_violations'} type - Type of achievement
 * @property {number} threshold - Minimum value required to earn the badge
 * @property {'week' | 'month' | 'semester'} [period] - Optional time period for evaluation
 * 
 * @since 1.0.0
 */
interface BadgeCriteria {
    type: 'grade_top' | 'perfect_scores' | 'attendance' | 'quiz_top' | 'no_violations';
    threshold: number;
    period?: 'week' | 'month' | 'semester';
}

/**
 * Predefined badges available in the gamification system.
 * 
 * This array contains all badges that students can earn, including:
 * - Star Student (Bintang Kelas): Top 3 overall grades
 * - Diligent Learner (Rajin Belajar): 5+ perfect scores (≥90)
 * - Perfect Attendance (Hadir Sempurna): 100% attendance this month
 * - Quiz Master: Top quiz scorer
 * - Good Behavior (Perilaku Baik): Zero violations this month
 * 
 * @constant {Badge[]}
 * @since 1.0.0
 */
export const BADGES: Badge[] = [
    {
        id: 'star_student',
        name: 'Bintang Kelas',
        emoji: '🌟',
        description: 'Top 3 nilai keseluruhan',
        points: 50,
        color: 'from-yellow-400 to-amber-500',
        criteria: { type: 'grade_top', threshold: 3 },
    },
    {
        id: 'diligent_learner',
        name: 'Rajin Belajar',
        emoji: '📚',
        description: '5+ nilai sempurna (≥90)',
        points: 30,
        color: 'from-blue-400 to-indigo-500',
        criteria: { type: 'perfect_scores', threshold: 5 },
    },
    {
        id: 'perfect_attendance',
        name: 'Hadir Sempurna',
        emoji: '✅',
        description: '100% kehadiran bulan ini',
        points: 40,
        color: 'from-green-400 to-emerald-500',
        criteria: { type: 'attendance', threshold: 100, period: 'month' },
    },
    {
        id: 'quiz_master',
        name: 'Quiz Master',
        emoji: '🎯',
        description: 'Top scorer quiz',
        points: 25,
        color: 'from-purple-400 to-violet-500',
        criteria: { type: 'quiz_top', threshold: 1 },
    },
    {
        id: 'good_behavior',
        name: 'Perilaku Baik',
        emoji: '👍',
        description: '0 pelanggaran bulan ini',
        points: 20,
        color: 'from-pink-400 to-rose-500',
        criteria: { type: 'no_violations', threshold: 0, period: 'month' },
    },
];

/**
 * Aggregated student data used for gamification calculations.
 * 
 * This interface consolidates all relevant student performance metrics
 * needed to calculate points and determine badge eligibility.
 * 
 * @interface StudentGameData
 * @property {string} studentId - Unique identifier for the student
 * @property {string} studentName - Full name of the student
 * @property {string | null} classId - ID of the student's class, or null if unassigned
 * @property {string} className - Name of the student's class
 * @property {number} averageScore - Average academic score across all subjects
 * @property {number} perfectScoreCount - Number of scores ≥90
 * @property {number} attendanceRate - Percentage of days attended (0-100)
 * @property {number} quizPoints - Total points earned from quizzes
 * @property {number} violationCount - Number of behavioral violations
 * 
 * @since 1.0.0
 */
export interface StudentGameData {
    studentId: string;
    studentName: string;
    classId: string | null;
    className: string;
    averageScore: number;
    perfectScoreCount: number;
    attendanceRate: number;
    quizPoints: number;
    violationCount: number;
}

/**
 * Represents a badge that has been earned by a student.
 * 
 * @interface EarnedBadge
 * @property {Badge} badge - The badge that was earned
 * @property {Date} earnedAt - Timestamp when the badge was earned
 * 
 * @since 1.0.0
 */
export interface EarnedBadge {
    badge: Badge;
    earnedAt: Date;
}

/**
 * Represents a student's entry on the leaderboard.
 * 
 * Leaderboard entries include the student's rank, total points,
 * and all badges they have earned. Entries are sorted by total points
 * in descending order.
 * 
 * @interface LeaderboardEntry
 * @property {number} rank - Student's position on the leaderboard (1-based)
 * @property {string} studentId - Unique identifier for the student
 * @property {string} studentName - Full name of the student
 * @property {string} className - Name of the student's class
 * @property {number} totalPoints - Total points including base points and badge bonuses
 * @property {Badge[]} badges - Array of all badges earned by the student
 * @property {string} [avatarUrl] - Optional URL to student's avatar image
 * 
 * @since 1.0.0
 */
export interface LeaderboardEntry {
    rank: number;
    studentId: string;
    studentName: string;
    className: string;
    totalPoints: number;
    badges: Badge[];
    avatarUrl?: string;
}

/**
 * Calculates the base points for a student based on their performance metrics.
 * 
 * Points are calculated from multiple sources:
 * - Academic performance: 2 points per score point above 70
 * - Attendance: Up to 30 points for 100% attendance
 * - Quiz performance: Direct quiz points earned
 * - Violations: -5 points per violation
 * 
 * The final score is clamped to a minimum of 0 (no negative scores).
 * 
 * @param {StudentGameData} data - Student performance data
 * @returns {number} Total base points (excluding badge bonuses)
 * 
 * @example
 * ```typescript
 * const studentData: StudentGameData = {
 *   studentId: '123',
 *   studentName: 'Ahmad',
 *   classId: 'class-1',
 *   className: 'Kelas 5A',
 *   averageScore: 85,
 *   perfectScoreCount: 3,
 *   attendanceRate: 95,
 *   quizPoints: 50,
 *   violationCount: 1
 * };
 * 
 * const points = calculateStudentPoints(studentData);
 * // Returns: (85-70)*2 + (95/100)*30 + 50 - 1*5 = 30 + 28.5 + 50 - 5 = 103.5 ≈ 104
 * ```
 * 
 * @since 1.0.0
 */
export const calculateStudentPoints = (data: StudentGameData): number => {
    let points = 0;

    // Points from grades (1 point per score above 70)
    points += Math.max(0, Math.round((data.averageScore - 70) * 2));

    // Points from attendance (max 30 points for 100%)
    points += Math.round((data.attendanceRate / 100) * 30);

    // Points from quiz
    points += data.quizPoints;

    // Penalty for violations
    points -= data.violationCount * 5;

    return Math.max(0, points);
};

/**
 * Checks if a student is eligible to earn a specific badge.
 * 
 * This function evaluates the badge's criteria against the student's performance data.
 * For competitive badges (grade_top, quiz_top), the student's rank is calculated
 * relative to all other students in the dataset.
 * 
 * @param {Badge} badge - The badge to check eligibility for
 * @param {StudentGameData} studentData - Performance data for the student being evaluated
 * @param {StudentGameData[]} allStudentsData - Performance data for all students (used for ranking)
 * @returns {boolean} True if the student meets the badge criteria, false otherwise
 * 
 * @example
 * ```typescript
 * const badge = BADGES.find(b => b.id === 'star_student')!;
 * const isEligible = checkBadgeEligibility(badge, studentData, allStudents);
 * 
 * if (isEligible) {
 *   console.log(`${studentData.studentName} earned the ${badge.name} badge!`);
 * }
 * ```
 * 
 * @since 1.0.0
 */
export const checkBadgeEligibility = (
    badge: Badge,
    studentData: StudentGameData,
    allStudentsData: StudentGameData[]
): boolean => {
    const { criteria } = badge;

    switch (criteria.type) {
        case 'grade_top': {
            // Check if student is in top N by average score
            const sorted = [...allStudentsData].sort((a, b) => b.averageScore - a.averageScore);
            const rank = sorted.findIndex(s => s.studentId === studentData.studentId) + 1;
            return rank > 0 && rank <= criteria.threshold;
        }

        case 'perfect_scores': {
            return studentData.perfectScoreCount >= criteria.threshold;
        }

        case 'attendance': {
            return studentData.attendanceRate >= criteria.threshold;
        }

        case 'quiz_top': {
            const sorted = [...allStudentsData].sort((a, b) => b.quizPoints - a.quizPoints);
            const rank = sorted.findIndex(s => s.studentId === studentData.studentId) + 1;
            return rank > 0 && rank <= criteria.threshold;
        }

        case 'no_violations': {
            return studentData.violationCount === 0;
        }

        default:
            return false;
    }
};

/**
 * Gets all badges earned by a student.
 * 
 * This function checks each badge in the BADGES array against the student's
 * performance data and returns an array of all badges they have earned.
 * 
 * @param {StudentGameData} studentData - Performance data for the student
 * @param {StudentGameData[]} allStudentsData - Performance data for all students (used for ranking)
 * @returns {Badge[]} Array of badges earned by the student
 * 
 * @example
 * ```typescript
 * const earnedBadges = getEarnedBadges(studentData, allStudents);
 * console.log(`Student earned ${earnedBadges.length} badges`);
 * earnedBadges.forEach(badge => {
 *   console.log(`- ${badge.name}: ${badge.description}`);
 * });
 * ```
 * 
 * @since 1.0.0
 */
export const getEarnedBadges = (
    studentData: StudentGameData,
    allStudentsData: StudentGameData[]
): Badge[] => {
    return BADGES.filter(badge => checkBadgeEligibility(badge, studentData, allStudentsData));
};

/**
 * Generates a complete leaderboard with rankings and points.
 * 
 * This function creates a leaderboard by calculating total points (base points + badge bonuses)
 * for each student, sorting by points in descending order, and assigning ranks.
 * Optionally filters to show only students from a specific class.
 * 
 * @param {StudentGameData[]} studentsData - Performance data for all students
 * @param {string} [classFilter] - Optional class ID to filter students by
 * @returns {LeaderboardEntry[]} Sorted array of leaderboard entries with ranks
 * 
 * @example
 * ```typescript
 * // Generate leaderboard for all students
 * const leaderboard = generateLeaderboard(allStudents);
 * 
 * // Generate leaderboard for a specific class
 * const classLeaderboard = generateLeaderboard(allStudents, 'class-5a');
 * 
 * // Display top 3
 * leaderboard.slice(0, 3).forEach(entry => {
 *   console.log(`${entry.rank}. ${entry.studentName}: ${entry.totalPoints} points`);
 * });
 * ```
 * 
 * @since 1.0.0
 */
export const generateLeaderboard = (
    studentsData: StudentGameData[],
    classFilter?: string
): LeaderboardEntry[] => {
    let filtered = studentsData;

    if (classFilter) {
        filtered = studentsData.filter(s => s.classId === classFilter);
    }

    // Calculate total points and badges for each student
    const entries: LeaderboardEntry[] = filtered.map(student => {
        const basePoints = calculateStudentPoints(student);
        const badges = getEarnedBadges(student, studentsData);
        const badgePoints = badges.reduce((sum, b) => sum + b.points, 0);

        return {
            rank: 0,
            studentId: student.studentId,
            studentName: student.studentName,
            className: student.className,
            totalPoints: basePoints + badgePoints,
            badges,
        };
    });

    // Sort by points and assign ranks
    entries.sort((a, b) => b.totalPoints - a.totalPoints);
    entries.forEach((entry, index) => {
        entry.rank = index + 1;
    });

    return entries;
};

/**
 * Gets the top N students from the leaderboard.
 * 
 * This is a convenience function that generates the full leaderboard
 * and returns only the top entries. Useful for displaying top performers
 * in dashboards or summary views.
 * 
 * @param {StudentGameData[]} studentsData - Performance data for all students
 * @param {number} [limit=10] - Maximum number of top students to return
 * @param {string} [classFilter] - Optional class ID to filter students by
 * @returns {LeaderboardEntry[]} Array of top N leaderboard entries
 * 
 * @example
 * ```typescript
 * // Get top 5 students overall
 * const topFive = getTopStudents(allStudents, 5);
 * 
 * // Get top 3 students in a specific class
 * const classTopThree = getTopStudents(allStudents, 3, 'class-5a');
 * ```
 * 
 * @since 1.0.0
 */
export const getTopStudents = (
    studentsData: StudentGameData[],
    limit: number = 10,
    classFilter?: string
): LeaderboardEntry[] => {
    return generateLeaderboard(studentsData, classFilter).slice(0, limit);
};

/**
 * Transforms raw database records into aggregated StudentGameData.
 * 
 * This function takes raw data from multiple database tables and aggregates it
 * into a single StudentGameData object containing all metrics needed for
 * gamification calculations. It filters records by student ID and performs
 * calculations for averages, counts, and rates.
 * 
 * @param {Object} student - Basic student information
 * @param {string} student.id - Student's unique identifier
 * @param {string} student.name - Student's full name
 * @param {string | null} student.class_id - ID of student's class
 * @param {string | null} [student.avatar_url] - Optional avatar URL
 * @param {string} className - Name of the student's class
 * @param {Array<{student_id: string, score: number}>} academicRecords - All academic records
 * @param {Array<{student_id: string, status: string}>} attendanceRecords - All attendance records
 * @param {Array<{student_id: string, points: number}>} quizPoints - All quiz point records
 * @param {Array<{student_id: string, points: number}>} violations - All violation records
 * @returns {StudentGameData} Aggregated student performance data
 * 
 * @example
 * ```typescript
 * const student = { id: '123', name: 'Ahmad', class_id: 'class-1' };
 * const gameData = transformToGameData(
 *   student,
 *   'Kelas 5A',
 *   academicRecords,
 *   attendanceRecords,
 *   quizPoints,
 *   violations
 * );
 * 
 * console.log(`${gameData.studentName} has an average score of ${gameData.averageScore}`);
 * ```
 * 
 * @since 1.0.0
 */
export const transformToGameData = (
    student: { id: string; name: string; class_id: string | null; avatar_url?: string | null },
    className: string,
    academicRecords: { student_id: string; score: number }[],
    attendanceRecords: { student_id: string; status: string }[],
    quizPoints: { student_id: string; points: number }[],
    violations: { student_id: string; points: number }[]
): StudentGameData => {
    const studentRecords = academicRecords.filter(r => r.student_id === student.id);
    const studentAttendance = attendanceRecords.filter(r => r.student_id === student.id);
    const studentQuiz = quizPoints.filter(r => r.student_id === student.id);
    const studentViolations = violations.filter(r => r.student_id === student.id);

    const avgScore = studentRecords.length > 0
        ? studentRecords.reduce((sum, r) => sum + r.score, 0) / studentRecords.length
        : 0;

    const perfectCount = studentRecords.filter(r => r.score >= 90).length;

    const presentCount = studentAttendance.filter(r => r.status === 'Hadir').length;
    const attendanceRate = studentAttendance.length > 0
        ? (presentCount / studentAttendance.length) * 100
        : 0;

    const totalQuizPoints = studentQuiz.reduce((sum, r) => sum + r.points, 0);
    const totalViolations = studentViolations.length;

    return {
        studentId: student.id,
        studentName: student.name,
        classId: student.class_id,
        className,
        averageScore: Math.round(avgScore),
        perfectScoreCount: perfectCount,
        attendanceRate: Math.round(attendanceRate),
        quizPoints: totalQuizPoints,
        violationCount: totalViolations,
    };
};
