/**
 * Pure In-Process Domain Engine for Penilaian Harian (PH) Schedules
 * Following Hexagonal Architecture & Deep Modules principles.
 * Zero external I/O or React dependencies — 100% testable in pure Vitest.
 */

import type { PhScheduleRow } from '../../../types';

export type PhScheduleItem = PhScheduleRow;

export type ExamStatus = 'upcoming' | 'today' | 'past';

export interface ScheduleConflict {
    date: string;
    period: string;
    subjects: string[];
}

export interface HeavyDayWarning {
    date: string;
    count: number;
}

export interface ScheduleAnomalies {
    hasConflicts: boolean;
    conflicts: ScheduleConflict[];
    heavyDays: HeavyDayWarning[];
}

export interface ScheduleFilterOptions {
    searchQuery?: string;
    statusFilter?: ExamStatus | 'all';
    selectedMonth?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface StatusCounts {
    all: number;
    upcoming: number;
    today: number;
    past: number;
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
     * Audits schedules for period collisions and heavy assessment days (>= 3 per day).
     */
    public static auditAnomalies(schedules: readonly PhScheduleItem[]): ScheduleAnomalies {
        const periodMap = new Map<string, PhScheduleItem[]>();
        const dayCountMap = new Map<string, number>();

        schedules.forEach((s) => {
            const key = `${s.date}___${(s.period_label || '').trim().toLowerCase()}`;
            const existing = periodMap.get(key) || [];
            existing.push(s);
            periodMap.set(key, existing);

            dayCountMap.set(s.date, (dayCountMap.get(s.date) || 0) + 1);
        });

        const conflicts: ScheduleConflict[] = [];
        periodMap.forEach((items, key) => {
            if (items.length > 1) {
                const [date, period] = key.split('___');
                conflicts.push({
                    date,
                    period,
                    subjects: items.map((i) => i.subject),
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
        };
    }

    /**
     * Filters and sorts schedules based on criteria.
     */
    public static filterAndSort(
        schedules: readonly PhScheduleItem[],
        options: ScheduleFilterOptions,
        referenceToday?: string
    ): PhScheduleItem[] {
        const { searchQuery = '', statusFilter = 'all', selectedMonth = 'all', sortOrder = 'asc' } = options;

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

            return true;
        });

        return [...filtered].sort((a, b) => {
            const cmp = a.date.localeCompare(b.date);
            if (cmp !== 0) return sortOrder === 'asc' ? cmp : -cmp;
            return a.period_label.localeCompare(b.period_label);
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
        filterMode: 'all' | 'upcoming' = 'all',
        referenceToday?: string
    ): string {
        const listToShare =
            filterMode === 'upcoming'
                ? schedules.filter((s) => this.getItemStatus(s.date, referenceToday) !== 'past')
                : schedules;

        if (listToShare.length === 0) return '';

        const dateMap = this.groupByDate(listToShare);

        let message = `📅 *JADWAL PENILAIAN HARIAN (PH)*\n`;
        message += `🏫 *Kelas:* ${context.className}\n`;
        if (context.semesterName) message += `🗓️ *Semester:* ${context.semesterName}\n`;
        message += `─────────────────────────\n\n`;

        Array.from(dateMap.entries()).forEach(([date, items]) => {
            const dateHeading = this.formatDateHeading(date);
            const rel = this.getRelativeDateLabel(date);
            const relBadge = rel ? ` _(${rel})_` : '';
            message += `📌 *${dateHeading}*${relBadge}\n`;
            items.forEach((it) => {
                message += `   • *Jam Ke-${it.period_label}*: ${it.subject}\n`;
            });
            message += `\n`;
        });

        message += `_Semoga pelaksanaan Penilaian Harian berjalan lancar dan sukses. Aamiin._ 🤲`;
        return message;
    }
}
