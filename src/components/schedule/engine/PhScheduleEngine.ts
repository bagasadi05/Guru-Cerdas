/**
 * Pure In-Process Domain Engine for Penilaian Harian (PH) Schedules
 * Following Hexagonal Architecture & Deep Modules principles.
 * Zero external I/O or React dependencies — 100% testable in pure Vitest.
 */

import type { PhScheduleRow } from '../../../types';
import { comparePhPeriods, getHolidayForDate, phPeriodsOverlap, type NationalHoliday } from './phScheduleValidation';
import { parseSubjectString } from './phSchedulePresentation';

export type PhScheduleItem = PhScheduleRow;

export type ExamStatus = 'upcoming' | 'today' | 'past';

export type GradeCompletionState = 'complete' | 'partial' | 'overdue' | 'pending';

export interface AcademicRecordSnapshot {
    student_id: string;
    subject: string;
    assessment_name: string | null;
    score: number | null;
    notes?: string | null;
}

export interface GradeStatusInfo {
    state: GradeCompletionState;
    gradedCount: number;
    totalStudents: number;
    assessmentName: string;
    averageScore: number | null;
}

export interface ScheduleConflict {
    date: string;
    period: string;
    subjects: string[];
}

export interface HeavyDayWarning {
    date: string;
    count: number;
}

export interface HolidayConflictWarning {
    id: string;
    date: string;
    subject: string;
    holidayName: string;
    kind: 'LIBUR' | 'CUTI';
}

export interface ScheduleAnomalies {
    hasConflicts: boolean;
    conflicts: ScheduleConflict[];
    heavyDays: HeavyDayWarning[];
    holidaySchedules: HolidayConflictWarning[];
}

export interface ScheduleFilterOptions {
    searchQuery?: string;
    statusFilter?: ExamStatus | 'all';
    selectedMonth?: string;
    selectedSubject?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface StatusCounts {
    all: number;
    upcoming: number;
    today: number;
    past: number;
}

function canonicalSubjectKey(raw: string): string {
    return parseSubjectString(raw)
        .baseSubject.replace(/^Ass\.?\s+/i, '')
        .toLowerCase()
        .trim();
}

export class PhScheduleEngine {
    /**
     * Determines status ('today' | 'upcoming' | 'past') based on reference date.
     */
    public static getItemStatus(dateStr: string, referenceToday?: string): ExamStatus {
        const todayStr = referenceToday || new Date().toLocaleDateString('sv-SE');
        if (dateStr === todayStr) return 'today';
        if (dateStr > todayStr) return 'upcoming';
        return 'past';
    }

    /**
     * Determines the chronological assessment name (e.g. "PH 1", "PH 2", "PH 3")
     * for a scheduled ASH within the same subject in the semester.
     */
    public static getAssessmentSequenceName(
        target: PhScheduleItem,
        allSchedules: readonly PhScheduleItem[]
    ): string {
        const { topic } = parseSubjectString(target.subject);
        const explicitMatch = topic.match(/^(?:PH|ASH|UH|Sumatif)\s*(\d+)/i);
        if (explicitMatch) {
            return `PH ${explicitMatch[1]}`;
        }

        const targetSubKey = canonicalSubjectKey(target.subject);
        if (!targetSubKey) return 'PH 1';

        const sameSubjectItems = allSchedules
            .filter((item) => canonicalSubjectKey(item.subject) === targetSubKey)
            .sort((a, b) => {
                const cmp = a.date.localeCompare(b.date);
                if (cmp !== 0) return cmp;
                const periodCmp = comparePhPeriods(a.period_label, b.period_label);
                if (periodCmp !== 0) return periodCmp;
                return a.id.localeCompare(b.id);
            });

        const idx = sameSubjectItems.findIndex((item) => item.id === target.id);
        return `PH ${idx >= 0 ? idx + 1 : 1}`;
    }

    /**
     * Evaluates grade completion status for every scheduled ASH in the class/semester.
     */
    public static evaluateAllGradeStatuses(
        schedules: readonly PhScheduleItem[],
        academicRecords: readonly AcademicRecordSnapshot[],
        totalStudents: number,
        referenceToday?: string
    ): Map<string, GradeStatusInfo> {
        const result = new Map<string, GradeStatusInfo>();

        schedules.forEach((item) => {
            const assessmentName = this.getAssessmentSequenceName(item, schedules);
            const seqNumber = assessmentName.replace(/\D+/g, '') || '1';
            const subKey = canonicalSubjectKey(item.subject);
            const { topic } = parseSubjectString(item.subject);
            const cleanTopic = topic.trim().toLowerCase();

            const validNames = new Set([
                `ph ${seqNumber}`,
                `ph${seqNumber}`,
                `ash ${seqNumber}`,
                `ash${seqNumber}`,
                `uh ${seqNumber}`,
                `sumatif ${seqNumber}`,
            ]);

            const studentScores = new Map<string, number>();

            academicRecords.forEach((rec) => {
                if (rec.score === null || rec.score === undefined || Number.isNaN(Number(rec.score))) return;
                if (canonicalSubjectKey(rec.subject) !== subKey) return;

                const recAssessment = (rec.assessment_name || '').trim().toLowerCase();
                const recNotes = (rec.notes || '').trim().toLowerCase();

                const matchesByAssessmentName = validNames.has(recAssessment);
                const matchesByTopic =
                    cleanTopic.length >= 3 &&
                    (recAssessment.includes(cleanTopic) || recNotes.includes(cleanTopic));

                if (matchesByAssessmentName || matchesByTopic) {
                    studentScores.set(rec.student_id, Number(rec.score));
                }
            });

            const gradedCount = studentScores.size;
            const scoresArray = Array.from(studentScores.values());
            const averageScore =
                scoresArray.length > 0
                    ? Math.round((scoresArray.reduce((sum, val) => sum + val, 0) / scoresArray.length) * 10) / 10
                    : null;

            const itemStatus = this.getItemStatus(item.date, referenceToday);
            let state: GradeCompletionState = 'pending';

            if (totalStudents > 0 && gradedCount >= totalStudents) {
                state = 'complete';
            } else if (gradedCount > 0) {
                state = 'partial';
            } else if (itemStatus === 'past') {
                state = 'overdue';
            } else {
                state = 'pending';
            }

            result.set(item.id, {
                state,
                gradedCount,
                totalStudents,
                assessmentName,
                averageScore,
            });
        });

        return result;
    }

    /**
     * Formats Indonesian relative date badges (e.g. "Hari Ini", "Besok", "3 hari lagi").
     */
    public static getRelativeDateLabel(dateStr: string, referenceDate?: Date): string {
        const today = referenceDate ? new Date(referenceDate) : new Date();
        today.setHours(0, 0, 0, 0);

        const target = new Date(`${dateStr}T00:00:00`);
        target.setHours(0, 0, 0, 0);

        const diffMs = target.getTime() - today.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Hari Ini';
        if (diffDays === 1) return 'Besok';
        if (diffDays === 2) return 'Lusa';
        if (diffDays > 2 && diffDays <= 7) return `${diffDays} hari lagi`;
        if (diffDays > 7 && diffDays <= 30) {
            const weeks = Math.round(diffDays / 7);
            return `${weeks} pekan lagi`;
        }
        if (diffDays === -1) return 'Kemarin';
        if (diffDays < -1) return `${Math.abs(diffDays)} hari lalu`;
        return '';
    }

    /**
     * Formats standard Indonesian date heading (e.g. "Senin, 23 September 2026").
     */
    public static formatDateHeading(dateStr: string): string {
        try {
            return new Date(`${dateStr}T00:00:00`).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            });
        } catch {
            return dateStr;
        }
    }

    /**
     * Audits schedules for period collisions, heavy assessment days (>= 3 per day),
     * and national holiday collisions.
     */
    public static auditAnomalies(schedules: readonly PhScheduleItem[]): ScheduleAnomalies {
        const periodMap = new Map<string, PhScheduleItem[]>();
        const dayCountMap = new Map<string, number>();
        const holidaySchedules: HolidayConflictWarning[] = [];

        schedules.forEach((s) => {
            const key = s.date;
            const existing = periodMap.get(key) || [];
            existing.push(s);
            periodMap.set(key, existing);

            dayCountMap.set(s.date, (dayCountMap.get(s.date) || 0) + 1);

            const holiday = getHolidayForDate(s.date);
            if (holiday) {
                holidaySchedules.push({
                    id: s.id,
                    date: s.date,
                    subject: s.subject,
                    holidayName: holiday.name,
                    kind: holiday.kind,
                });
            }
        });

        const conflicts: ScheduleConflict[] = [];
        periodMap.forEach((items, key) => {
            if (items.length > 1) {
                items.forEach((left, index) => {
                    items.slice(index + 1).forEach((right) => {
                        if (phPeriodsOverlap(left.period_label, right.period_label)) {
                            conflicts.push({
                                date: key,
                                period: left.period_label === right.period_label ? left.period_label : `${left.period_label} / ${right.period_label}`,
                                subjects: [left.subject, right.subject],
                            });
                        }
                    });
                });
            }
        });

        const heavyDays: HeavyDayWarning[] = [];
        dayCountMap.forEach((count, date) => {
            if (count >= 3) {
                heavyDays.push({ date, count });
            }
        });

        return {
            hasConflicts: conflicts.length > 0,
            conflicts,
            heavyDays,
            holidaySchedules,
        };
    }

    /**
     * Extracts distinct base subjects present in the schedules.
     */
    public static getAvailableSubjects(schedules: readonly PhScheduleItem[]): string[] {
        const map = new Map<string, string>();
        schedules.forEach((s) => {
            const base = parseSubjectString(s.subject).baseSubject.trim();
            if (!base) return;
            const key = base.toLowerCase();
            if (!map.has(key)) {
                map.set(key, base);
            }
        });
        return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'id'));
    }

    /**
     * Filters and sorts schedules based on criteria.
     */
    public static filterAndSort(
        schedules: readonly PhScheduleItem[],
        options: ScheduleFilterOptions,
        referenceToday?: string
    ): PhScheduleItem[] {
        const {
            searchQuery = '',
            statusFilter = 'all',
            selectedMonth = 'all',
            selectedSubject = 'all',
            sortOrder = 'asc',
        } = options;

        const filtered = schedules.filter((item) => {
            const matchesSearch =
                !searchQuery.trim() ||
                item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.period_label.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesSearch) return false;

            if (statusFilter !== 'all' && this.getItemStatus(item.date, referenceToday) !== statusFilter) {
                return false;
            }

            if (selectedMonth !== 'all' && !item.date.startsWith(selectedMonth)) {
                return false;
            }

            if (
                selectedSubject !== 'all' &&
                parseSubjectString(item.subject).baseSubject.toLowerCase() !== selectedSubject.toLowerCase()
            ) {
                return false;
            }

            return true;
        });

        return [...filtered].sort((a, b) => {
            const cmp = a.date.localeCompare(b.date);
            if (cmp !== 0) return sortOrder === 'asc' ? cmp : -cmp;
            return comparePhPeriods(a.period_label, b.period_label);
        });
    }

    /**
     * Groups schedules by date.
     */
    public static groupByDate(schedules: readonly PhScheduleItem[]): Map<string, PhScheduleItem[]> {
        const map = new Map<string, PhScheduleItem[]>();
        schedules.forEach((s) => {
            const existing = map.get(s.date) || [];
            existing.push(s);
            map.set(s.date, existing);
        });
        return map;
    }

    /**
     * Calculates status counts.
     */
    public static getStatusCounts(schedules: readonly PhScheduleItem[], referenceToday?: string): StatusCounts {
        let upcoming = 0;
        let today = 0;
        let past = 0;

        schedules.forEach((s) => {
            const status = this.getItemStatus(s.date, referenceToday);
            if (status === 'upcoming') upcoming++;
            else if (status === 'today') today++;
            else if (status === 'past') past++;
        });

        return {
            all: schedules.length,
            upcoming,
            today,
            past,
        };
    }

    /**
     * Finds next upcoming exam.
     */
    public static getNextUpcoming(schedules: readonly PhScheduleItem[], referenceToday?: string): PhScheduleItem | null {
        const upcoming = schedules
            .filter((s) => this.getItemStatus(s.date, referenceToday) !== 'past')
            .sort((a, b) => a.date.localeCompare(b.date));
        return upcoming.length > 0 ? upcoming[0] : null;
    }

    /**
     * Extracts distinct available months.
     */
    public static getAvailableMonths(schedules: readonly PhScheduleItem[]): Array<{ value: string; label: string }> {
        const map = new Map<string, string>();
        schedules.forEach((s) => {
            if (!s.date) return;
            const parts = s.date.split('-');
            if (parts.length < 2) return;
            const [y, m] = parts;
            const key = `${y}-${m}`;
            if (!map.has(key)) {
                try {
                    const d = new Date(Number(y), Number(m) - 1, 1);
                    const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                    map.set(key, label);
                } catch {
                    map.set(key, key);
                }
            }
        });
        return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
    }

    /**
     * Generates formatted WhatsApp broadcast copy.
     */
    public static generateWhatsAppText(
        schedules: readonly PhScheduleItem[],
        context: { className: string; semesterName?: string },
        filterMode: 'all' | 'upcoming' | 'this_week' = 'all',
        referenceToday?: string
    ): string {
        let listToShare: PhScheduleItem[] = [];

        if (filterMode === 'this_week') {
            const refDate = referenceToday ? new Date(`${referenceToday}T12:00:00`) : new Date();
            const weekDays = this.getSchoolWeekDays(refDate, 0, true);
            const weekDateSet = new Set(weekDays.map((d) => d.dateStr));
            listToShare = schedules.filter((s) => weekDateSet.has(s.date));
        } else if (filterMode === 'upcoming') {
            listToShare = schedules.filter((s) => this.getItemStatus(s.date, referenceToday) !== 'past');
        } else {
            listToShare = [...schedules];
        }

        if (listToShare.length === 0) return '';

        const dateMap = this.groupByDate(this.filterAndSort(listToShare, {}, referenceToday));

        const title =
            filterMode === 'this_week'
                ? `📅 *AGENDA ASESMEN SUMATIF HARIAN (ASH) PEKAN INI*\n`
                : `📅 *JADWAL ASESMEN SUMATIF HARIAN (ASH)*\n`;

        let message = title;
        message += `🏫 *Kelas:* ${context.className}\n`;
        if (context.semesterName) message += `🗓️ *Semester:* ${context.semesterName}\n`;
        message += `─────────────────────────\n\n`;

        Array.from(dateMap.entries()).forEach(([date, items]) => {
            const dateHeading = this.formatDateHeading(date);
            const rel = this.getRelativeDateLabel(date);
            const relBadge = rel ? ` _(${rel})_` : '';
            message += `📌 *${dateHeading}*${relBadge}\n`;
            items.forEach((it) => {
                const { baseSubject, topic } = parseSubjectString(it.subject);
                const seqName = this.getAssessmentSequenceName(it, schedules);
                const topicLabel = topic ? ` — Materi: ${topic}` : '';
                message += `   • *Jam Ke-${it.period_label}*: ${baseSubject} [${seqName}]${topicLabel}\n`;
            });
            message += `\n`;
        });

        message += `_Mohon pendampingan Bapak/Ibu di rumah agar putra/putrinya dapat mempersiapkan diri dengan baik. Semoga berjalan lancar dan sukses. Aamiin._ 🤲`;
        return message;
    }

    /**
     * Calculates the Monday-to-Friday (or Sunday) dates for a given reference date and week offset.
     * offset: 0 for reference week, +1 for next week, -1 for previous week, etc.
     */
    public static getSchoolWeekDays(referenceDate: Date = new Date(), weekOffset: number = 0, includeWeekends = false): SchoolWeekDayInfo[] {
        const today = new Date(referenceDate);
        const day = today.getDay(); // 0 is Sunday, 1 is Monday, ..., 6 is Saturday
        // If Sunday (0), the upcoming school week begins tomorrow (Monday). Otherwise target Monday of this week.
        const diffToMonday = day === 0 ? (includeWeekends ? -6 : 1) : 1 - day;
        const monday = new Date(today);
        monday.setDate(today.getDate() + diffToMonday + (weekOffset * 7));
        monday.setHours(0, 0, 0, 0);

        const realTodayStr = new Date().toLocaleDateString('sv-SE');
        const dayNames: SchoolWeekDayInfo['dayName'][] = [
            'Senin',
            'Selasa',
            'Rabu',
            'Kamis',
            'Jumat',
        ];
        if (includeWeekends) dayNames.push('Sabtu', 'Minggu');

        return dayNames.map((dayName, index) => {
            const d = new Date(monday);
            d.setDate(monday.getDate() + index);
            const dateStr = d.toLocaleDateString('sv-SE');
            const dayNumber = d.getDate();
            const monthShort = d.toLocaleDateString('id-ID', { month: 'short' });
            return {
                dayName,
                dateStr,
                dateFormatted: `${dayNumber} ${monthShort}`,
                dayNumber,
                isToday: dateStr === realTodayStr,
                rawDate: d,
                holiday: getHolidayForDate(dateStr),
            };
        });
    }

    /**
     * Formats week range label, e.g. "28 September – 2 Oktober 2026".
     */
    public static formatWeekRangeLabel(mondayDate: Date, fridayDate: Date): string {
        const d1 = mondayDate.getDate();
        const d2 = fridayDate.getDate();
        const m1 = mondayDate.toLocaleDateString('id-ID', { month: 'long' });
        const m2 = fridayDate.toLocaleDateString('id-ID', { month: 'long' });
        const y1 = mondayDate.getFullYear();
        const y2 = fridayDate.getFullYear();

        if (y1 !== y2) {
            return `${d1} ${m1} ${y1} – ${d2} ${m2} ${y2}`;
        }
        if (m1 !== m2) {
            return `${d1} ${m1} – ${d2} ${m2} ${y1}`;
        }
        return `${d1} – ${d2} ${m1} ${y1}`;
    }
}

export interface SchoolWeekDayInfo {
    dayName: 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat' | 'Sabtu' | 'Minggu';
    dateStr: string;
    dateFormatted: string;
    dayNumber: number;
    isToday: boolean;
    rawDate: Date;
    holiday?: NationalHoliday | null;
}
