import { ExtracurricularGrade } from './types';

export const DAY_NAME_TO_INDEX: Record<string, number> = {
    minggu: 0,
    ahad: 0,
    sunday: 0,
    senin: 1,
    monday: 1,
    selasa: 2,
    tuesday: 2,
    rabu: 3,
    wednesday: 3,
    kamis: 4,
    thursday: 4,
    jumat: 5,
    "jum'at": 5,
    friday: 5,
    sabtu: 6,
    saturday: 6,
};

export const DAY_INDEX_TO_SHORT_NAME: Record<number, string> = {
    0: 'Min',
    1: 'Sen',
    2: 'Sel',
    3: 'Rab',
    4: 'Kam',
    5: 'Jum',
    6: 'Sab',
};

export const DAY_INDEX_TO_FULL_NAME: Record<number, string> = {
    0: 'Minggu',
    1: 'Senin',
    2: 'Selasa',
    3: 'Rabu',
    4: 'Kamis',
    5: 'Jumat',
    6: 'Sabtu',
};

/**
 * Formats a Date object as YYYY-MM-DD in local time (avoiding UTC off-by-one bugs).
 */
export function formatLocalDate(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD string into year, month (0-indexed), and day in local time.
 * Gracefully handles undefined/null by falling back to current local date.
 */
export function parseLocalDate(dateStr?: string | null): { year: number; month: number; day: number; dateObj: Date } {
    if (typeof dateStr === 'string' && dateStr.trim()) {
        const parts = dateStr.trim().split('-').map(Number);
        if (parts.length >= 2 && parts.every((n) => Number.isFinite(n))) {
            const year = parts[0];
            const monthNum = parts[1];
            const day = parts.length >= 3 ? parts[2] : 1;
            const month = monthNum - 1;
            return { year, month, day, dateObj: new Date(year, month, day) };
        }
    }
    const fallback = new Date();
    return {
        year: fallback.getFullYear(),
        month: fallback.getMonth(),
        day: fallback.getDate(),
        dateObj: new Date(fallback.getFullYear(), fallback.getMonth(), fallback.getDate()),
    };
}

/**
 * Returns timezone-safe start and end date strings (YYYY-MM-DD) for a given YYYY-MM-DD date's month.
 */
export function getMonthDateRange(selectedDate: string): {
    year: number;
    month: number;
    daysInMonth: number;
    startDate: string;
    endDate: string;
    monthName: string;
    academicYear: string;
} {
    const { year, month, dateObj } = parseLocalDate(selectedDate);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthStr = String(month + 1).padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-${String(daysInMonth).padStart(2, '0')}`;
    const monthName = dateObj.toLocaleDateString('id-ID', { month: 'long' });
    const acadYearStart = month >= 6 ? year : year - 1;
    const academicYear = `${acadYearStart}/${acadYearStart + 1}`;

    return {
        year,
        month,
        daysInMonth,
        startDate,
        endDate,
        monthName,
        academicYear,
    };
}

/**
 * Parses schedule_day string (e.g., "Senin, Jumat") into a Set of JS day-of-week indexes (0-6).
 */
export function parseScheduleDayIndexes(scheduleDayStr: string | null | undefined): Set<number> {
    const rawTokens = (scheduleDayStr || '')
        .toLowerCase()
        .split(/[,/&+\s]+/)
        .map((t) => t.trim())
        .filter(Boolean);

    const targetDayIndexes = new Set<number>();
    rawTokens.forEach((t) => {
        if (t in DAY_NAME_TO_INDEX) {
            targetDayIndexes.add(DAY_NAME_TO_INDEX[t]);
        }
    });
    return targetDayIndexes;
}

/**
 * Checks whether a given YYYY-MM-DD date falls on one of the extracurricular's scheduled days.
 */
export function isDateOnScheduleDay(dateStr: string, scheduleDayStr: string | null | undefined): boolean {
    const indexes = parseScheduleDayIndexes(scheduleDayStr);
    if (indexes.size === 0) return true;
    const { dateObj } = parseLocalDate(dateStr);
    return indexes.has(dateObj.getDay());
}

/**
 * Returns all scheduled dates (YYYY-MM-DD) within the month of selectedDate.
 */
export function getScheduledDatesInMonth(
    selectedDate: string,
    scheduleDayStr: string | null | undefined
): Array<{ dateStr: string; day: number; dayName: string; fullDayName: string }> {
    const { year, month, daysInMonth } = getMonthDateRange(selectedDate);
    const targetDayIndexes = parseScheduleDayIndexes(scheduleDayStr);
    if (targetDayIndexes.size === 0) return [];

    const monthStr = String(month + 1).padStart(2, '0');
    const result: Array<{ dateStr: string; day: number; dayName: string; fullDayName: string }> = [];

    for (let d = 1; d <= daysInMonth; d++) {
        const jsDate = new Date(year, month, d);
        const dayOfWeek = jsDate.getDay();
        if (targetDayIndexes.has(dayOfWeek)) {
            result.push({
                dateStr: `${year}-${monthStr}-${String(d).padStart(2, '0')}`,
                day: d,
                dayName: DAY_INDEX_TO_SHORT_NAME[dayOfWeek] || '',
                fullDayName: DAY_INDEX_TO_FULL_NAME[dayOfWeek] || '',
            });
        }
    }

    return result;
}

/**
 * Computes active meeting days in a month for PDF/Excel attendance exports.
 */
export function getActiveMeetingDays(
    year: number,
    month: number, // 0-indexed
    daysInMonth: number,
    scheduleDayStr: string | null | undefined,
    recordedDaySet: Set<number>
): { day: number; dayName: string }[] {
    const targetDayIndexes = parseScheduleDayIndexes(scheduleDayStr);
    const activeDays: { day: number; dayName: string }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
        const jsDate = new Date(year, month, d);
        const dayOfWeek = jsDate.getDay();
        const isScheduled = targetDayIndexes.has(dayOfWeek);
        const hasRecord = recordedDaySet.has(d);

        if (isScheduled || hasRecord) {
            activeDays.push({
                day: d,
                dayName: DAY_INDEX_TO_SHORT_NAME[dayOfWeek] || '',
            });
        }
    }

    if (activeDays.length === 0) {
        for (let d = 1; d <= daysInMonth; d++) {
            const jsDate = new Date(year, month, d);
            const dayOfWeek = jsDate.getDay();
            activeDays.push({
                day: d,
                dayName: DAY_INDEX_TO_SHORT_NAME[dayOfWeek] || '',
            });
        }
    }

    return activeDays;
}

export function getGradeFromScore(score: number): 'A' | 'B' | 'C' | 'D' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    return 'D';
}

export const DEFAULT_GRADE_DESCRIPTIONS: Record<string, string> = {
    A: 'Sangat baik dalam mengikuti kegiatan ekstrakurikuler, menunjukkan antusiasme, kedisiplinan, dan penguasaan keterampilan yang sangat memuaskan.',
    B: 'Baik dan aktif dalam mengikuti kegiatan ekstrakurikuler serta mampu menguasai materi dan keterampilan dasar dengan baik.',
    C: 'Cukup baik dalam mengikuti kegiatan ekstrakurikuler, namun masih perlu meningkatkan keaktifan dan latihan secara rutin.',
    D: 'Perlu bimbingan dan motivasi lebih lanjut untuk meningkatkan kehadiran serta partisipasi dalam kegiatan ekstrakurikuler.',
};

export interface GradeDraft {
    grade: string | null;
    score: string;
    description: string;
}

export function gradeDraftFromSaved(saved?: ExtracurricularGrade | null): GradeDraft {
    return {
        grade: saved?.grade ?? null,
        score: saved?.score == null ? '' : String(saved.score),
        description: saved?.description ?? '',
    };
}

export function isGradeDraftDirty(draft: GradeDraft | undefined, saved?: ExtracurricularGrade | null): boolean {
    if (!draft) return false;
    const base = gradeDraftFromSaved(saved);
    return (
        (draft.grade ?? null) !== (base.grade ?? null) ||
        draft.score.trim() !== base.score.trim() ||
        draft.description.trim() !== base.description.trim()
    );
}

/**
 * Compares two class name strings using Indonesian natural sorting (e.g. 1A < 1B < 2A < 10A).
 * Strips common prefixes like "Kelas " or "Class " for uniform comparison.
 * Null/empty class names are sorted to the end.
 */
export function compareClassNames(a?: string | null, b?: string | null): number {
    const rawA = (a || '').trim();
    const rawB = (b || '').trim();

    if (!rawA && !rawB) return 0;
    if (!rawA) return 1;
    if (!rawB) return -1;

    const normA = rawA.replace(/^(?:kelas|class)\s+/i, '').trim();
    const normB = rawB.replace(/^(?:kelas|class)\s+/i, '').trim();

    const comp = normA.localeCompare(normB, 'id-ID', { numeric: true, sensitivity: 'base' });
    if (comp !== 0) return comp;

    return rawA.localeCompare(rawB, 'id-ID', { numeric: true, sensitivity: 'base' });
}

/**
 * Standard comparator to sort students/enrollments:
 * 1. Primary sort: Class name in natural order (e.g. 1A, 1B, 2A, 10A...). Students with no class sort to the end.
 * 2. Secondary sort: Student name alphabetically (A-Z).
 */
export function compareEnrollmentsByClassAndName(
    a: { name: string; className?: string | null },
    b: { name: string; className?: string | null }
): number {
    const rawClassA = (a.className || '').trim();
    const rawClassB = (b.className || '').trim();

    if (!rawClassA && rawClassB) return 1;
    if (rawClassA && !rawClassB) return -1;

    if (rawClassA && rawClassB) {
        const normA = rawClassA.replace(/^(?:kelas|class)\s+/i, '').trim();
        const normB = rawClassB.replace(/^(?:kelas|class)\s+/i, '').trim();

        const classComp = normA.localeCompare(normB, 'id-ID', { numeric: true, sensitivity: 'base' });
        if (classComp !== 0) return classComp;
    }

    return (a.name || '').localeCompare(b.name || '', 'id-ID', { sensitivity: 'base' });
}

export const MONTH_NAMES_ID = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
];

export const MONTH_SHORT_NAMES_ID = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Agt',
    'Sep',
    'Okt',
    'Nov',
    'Des',
];

export type AttendanceExportPeriodType = 'single_month' | 'month_range' | 'semester';
export type AttendanceExportFormat = 'pdf' | 'excel';

export interface AttendanceExportPeriodConfig {
    periodType?: AttendanceExportPeriodType;
    // single_month
    month?: number; // 0-11
    year?: number;
    // month_range
    startMonth?: number; // 0-11
    startYear?: number;
    endMonth?: number; // 0-11
    endYear?: number;
    // semester
    semesterType?: 'Ganjil' | 'Genap';
    academicYear?: string; // e.g. "2026/2027"
    includeMonthlyDetails?: boolean;
    // legacy fallback
    selectedDate?: string;
}

export interface MonthPeriodItem {
    year: number;
    month: number; // 0-11
    monthName: string;
    shortMonthName: string;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    daysInMonth: number;
}

export interface ResolvedAttendancePeriod {
    periodType: AttendanceExportPeriodType;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    titlePeriodText: string;
    filePeriodName: string;
    academicYear: string;
    months: MonthPeriodItem[];
    includeMonthlyDetails: boolean;
}

export function resolveAttendancePeriod(
    config: AttendanceExportPeriodConfig = {}
): ResolvedAttendancePeriod {
    const periodType = config.periodType || 'single_month';

    if (periodType === 'semester') {
        const semesterType =
            config.semesterType || (new Date().getMonth() >= 6 ? 'Ganjil' : 'Genap');
        let baseYear: number;
        if (config.academicYear && config.academicYear.includes('/')) {
            baseYear =
                parseInt(config.academicYear.split('/')[0], 10) || new Date().getFullYear();
        } else {
            const now = new Date();
            baseYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
        }
        const academicYear = config.academicYear || `${baseYear}/${baseYear + 1}`;

        const isGanjil = semesterType === 'Ganjil';
        const startMonth = isGanjil ? 6 : 0;
        const endMonth = isGanjil ? 11 : 5;
        const year = isGanjil ? baseYear : baseYear + 1;

        const months: MonthPeriodItem[] = [];
        for (let m = startMonth; m <= endMonth; m++) {
            const daysInMonth = new Date(year, m + 1, 0).getDate();
            const mStr = String(m + 1).padStart(2, '0');
            months.push({
                year,
                month: m,
                monthName: MONTH_NAMES_ID[m],
                shortMonthName: MONTH_SHORT_NAMES_ID[m],
                startDate: `${year}-${mStr}-01`,
                endDate: `${year}-${mStr}-${String(daysInMonth).padStart(2, '0')}`,
                daysInMonth,
            });
        }

        const semNumber = isGanjil ? '1' : '2';
        return {
            periodType: 'semester',
            startDate: months[0].startDate,
            endDate: months[months.length - 1].endDate,
            titlePeriodText: `SEMESTER ${semNumber} (${semesterType.toUpperCase()}) - TAHUN PELAJARAN ${academicYear}`,
            filePeriodName: `Semester_${semesterType}_${academicYear.replace('/', '-')}`,
            academicYear,
            months,
            includeMonthlyDetails: config.includeMonthlyDetails ?? true,
        };
    }

    if (periodType === 'month_range') {
        let sYear = config.startYear ?? new Date().getFullYear();
        let sMonth = config.startMonth ?? 0;
        let eYear = config.endYear ?? sYear;
        let eMonth = config.endMonth ?? Math.min(11, sMonth + 2);

        // Normalize order if end is before start
        if (sYear > eYear || (sYear === eYear && sMonth > eMonth)) {
            const tY = sYear;
            sYear = eYear;
            eYear = tY;
            const tM = sMonth;
            sMonth = eMonth;
            eMonth = tM;
        }

        const months: MonthPeriodItem[] = [];
        let curY = sYear;
        let curM = sMonth;
        while (curY < eYear || (curY === eYear && curM <= eMonth)) {
            const daysInMonth = new Date(curY, curM + 1, 0).getDate();
            const mStr = String(curM + 1).padStart(2, '0');
            months.push({
                year: curY,
                month: curM,
                monthName: MONTH_NAMES_ID[curM],
                shortMonthName: MONTH_SHORT_NAMES_ID[curM],
                startDate: `${curY}-${mStr}-01`,
                endDate: `${curY}-${mStr}-${String(daysInMonth).padStart(2, '0')}`,
                daysInMonth,
            });
            curM++;
            if (curM > 11) {
                curM = 0;
                curY++;
            }
        }

        const acadYearStart = sMonth >= 6 ? sYear : sYear - 1;
        const academicYear = config.academicYear || `${acadYearStart}/${acadYearStart + 1}`;
        const firstM = months[0];
        const lastM = months[months.length - 1];

        return {
            periodType: 'month_range',
            startDate: firstM.startDate,
            endDate: lastM.endDate,
            titlePeriodText: `PERIODE: ${firstM.monthName.toUpperCase()} ${firstM.year} - ${lastM.monthName.toUpperCase()} ${lastM.year} - TAHUN PELAJARAN ${academicYear}`,
            filePeriodName: `${firstM.shortMonthName}_sd_${lastM.shortMonthName}_${firstM.year}`,
            academicYear,
            months,
            includeMonthlyDetails: config.includeMonthlyDetails ?? true,
        };
    }

    // Default: 'single_month'
    let year: number;
    let month: number;

    if (config.month !== undefined && config.year !== undefined) {
        year = config.year;
        month = config.month;
    } else if (config.selectedDate) {
        const parsed = parseLocalDate(config.selectedDate);
        year = parsed.year;
        month = parsed.month;
    } else {
        const now = new Date();
        year = now.getFullYear();
        month = now.getMonth();
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const mStr = String(month + 1).padStart(2, '0');
    const startDate = `${year}-${mStr}-01`;
    const endDate = `${year}-${mStr}-${String(daysInMonth).padStart(2, '0')}`;
    const acadYearStart = month >= 6 ? year : year - 1;
    const academicYear = config.academicYear || `${acadYearStart}/${acadYearStart + 1}`;

    return {
        periodType: 'single_month',
        startDate,
        endDate,
        titlePeriodText: `BULAN: ${MONTH_NAMES_ID[month].toUpperCase()} ${year} - TAHUN PELAJARAN ${academicYear}`,
        filePeriodName: `${MONTH_SHORT_NAMES_ID[month]}_${year}`,
        academicYear,
        months: [
            {
                year,
                month,
                monthName: MONTH_NAMES_ID[month],
                shortMonthName: MONTH_SHORT_NAMES_ID[month],
                startDate,
                endDate,
                daysInMonth,
            },
        ],
        includeMonthlyDetails: true,
    };
}


