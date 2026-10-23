import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, ClipboardPen, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/Card';
import type { StudentBelowKKTP } from '../../../../services/academicAnalyticsService';

interface StudentsBelowKKTPListProps {
    students: StudentBelowKKTP[];
    kktp: number;
    studentClassIds?: Map<string, string | null>;
    defaultClassId?: string | null;
    onSelectSubject?: (subjectName: string) => void;
    onInputRemedial?: (classId: string | null, subjectName?: string) => void;
}

interface StudentGroup {
    studentId: string;
    studentName: string;
    className: string;
    classId: string | null;
    subjects: { subject: string; average: number; gap: number }[];
    worstGap: number;
}

const INITIAL_VISIBLE = 10;

export const StudentsBelowKKTPList: React.FC<StudentsBelowKKTPListProps> = ({
    students,
    kktp,
    studentClassIds,
    defaultClassId = null,
    onSelectSubject,
    onInputRemedial,
}) => {
    const [showAll, setShowAll] = useState(false);
    const [subjectFilter, setSubjectFilter] = useState<string>('all');

    const subjectCounts = useMemo(() => {
        const counts = new Map<string, number>();
        for (const s of students) {
            counts.set(s.subject, (counts.get(s.subject) ?? 0) + 1);
        }
        return Array.from(counts.entries())
            .map(([subject, count]) => ({ subject, count }))
            .sort((a, b) => b.count - a.count || a.subject.localeCompare(b.subject, 'id'));
    }, [students]);

    const effectiveSubjectFilter = useMemo(() => {
        if (subjectFilter === 'all') return 'all';
        return subjectCounts.some((s) => s.subject === subjectFilter) ? subjectFilter : 'all';
    }, [subjectFilter, subjectCounts]);

    const filteredStudents = useMemo(() => {
        if (effectiveSubjectFilter === 'all') return students;
        return students.filter((s) => s.subject === effectiveSubjectFilter);
    }, [students, effectiveSubjectFilter]);

    const groups = useMemo<StudentGroup[]>(() => {
        const byStudent = new Map<string, StudentGroup>();
        for (const s of filteredStudents) {
            const group = byStudent.get(s.studentId) ?? {
                studentId: s.studentId,
                studentName: s.studentName,
                className: s.className,
                classId: studentClassIds?.get(s.studentId) ?? defaultClassId,
                subjects: [],
                worstGap: 0,
            };
            group.subjects.push({ subject: s.subject, average: s.average, gap: s.gap });
            group.worstGap = Math.min(group.worstGap, s.gap);
            byStudent.set(s.studentId, group);
        }
        // Students missing the most subjects first, then the widest gap.
        return Array.from(byStudent.values())
            .map((g) => ({ ...g, subjects: g.subjects.sort((a, b) => a.average - b.average) }))
            .sort((a, b) => b.subjects.length - a.subjects.length || a.worstGap - b.worstGap);
    }, [filteredStudents, studentClassIds, defaultClassId]);

    const visible = showAll ? groups : groups.slice(0, INITIAL_VISIBLE);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                    Siswa di Bawah KKTP
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Rata-rata per mapel di bawah batas KKTP {kktp}. Ketuk nama mapel untuk detail atau langsung input nilai remedial.
                </p>
            </CardHeader>
            <CardContent>
                {students.length === 0 ? (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">
                            Semua siswa sudah mencapai KKTP {kktp} di setiap mapel.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Subject filter pills when multiple subjects need remedial */}
                        {subjectCounts.length > 1 && (
                            <div
                                role="group"
                                aria-label="Filter mata pelajaran remedial"
                                className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1"
                            >
                                <button
                                    type="button"
                                    aria-pressed={effectiveSubjectFilter === 'all'}
                                    onClick={() => setSubjectFilter('all')}
                                    className={`shrink-0 min-h-[38px] px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                                        effectiveSubjectFilter === 'all'
                                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    Semua Mapel ({students.length})
                                </button>
                                {subjectCounts.map(({ subject, count }) => {
                                    const active = effectiveSubjectFilter === subject;
                                    return (
                                        <button
                                            key={subject}
                                            type="button"
                                            aria-pressed={active}
                                            onClick={() => setSubjectFilter(subject)}
                                            className={`shrink-0 min-h-[38px] px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
                                                active
                                                    ? 'bg-rose-600 text-white shadow-xs'
                                                    : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-800/50 hover:bg-rose-100 dark:hover:bg-rose-900/40'
                                            }`}
                                        >
                                            {subject} ({count})
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Summary & Bulk Action Row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-800/50 rounded-xl px-3.5 py-2.5">
                            <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                                {groups.length} siswa perlu perhatian ({filteredStudents.length} nilai mapel di bawah KKTP {kktp})
                            </p>
                            {onInputRemedial && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        onInputRemedial(
                                            defaultClassId,
                                            effectiveSubjectFilter !== 'all' ? effectiveSubjectFilter : undefined
                                        )
                                    }
                                    className="inline-flex items-center justify-center gap-1.5 min-h-[40px] sm:min-h-[34px] px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                                >
                                    <ClipboardPen className="w-3.5 h-3.5" />
                                    <span>
                                        {effectiveSubjectFilter !== 'all'
                                            ? `Input Remedial ${effectiveSubjectFilter}`
                                            : 'Buka Input Nilai Remedial'}
                                    </span>
                                </button>
                            )}
                        </div>

                        {/* Student List */}
                        <ul className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                            {visible.map((g) => {
                                const primarySubject = g.subjects[0]?.subject;
                                return (
                                    <li
                                        key={g.studentId}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-4 sm:py-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                                    >
                                        <div className="min-w-0 flex-1 space-y-2">
                                            <div className="flex items-center flex-wrap gap-2">
                                                <Link
                                                    to={`/siswa/${g.studentId}`}
                                                    className="text-sm font-bold text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                                                >
                                                    {g.studentName}
                                                </Link>
                                                {g.className && g.className !== '-' && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                        {/^kelas\b/i.test(g.className.trim()) ? g.className.trim() : `Kelas ${g.className.trim()}`}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Interactive Subject Chips */}
                                            <div className="flex flex-wrap gap-1.5">
                                                {g.subjects.map((s) =>
                                                    onSelectSubject ? (
                                                        <button
                                                            key={s.subject}
                                                            type="button"
                                                            onClick={() => onSelectSubject(s.subject)}
                                                            title={`Lihat detail mapel ${s.subject}`}
                                                            className="inline-flex items-center gap-1.5 min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                                                        >
                                                            <span>{s.subject}</span>
                                                            <span className="font-extrabold tabular-nums">{s.average}</span>
                                                            <span className="text-[11px] font-normal text-rose-600/80 dark:text-rose-400/80 tabular-nums">
                                                                ({s.gap})
                                                            </span>
                                                        </button>
                                                    ) : (
                                                        <span
                                                            key={s.subject}
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60"
                                                        >
                                                            <span>{s.subject}</span>
                                                            <span className="font-extrabold tabular-nums">{s.average}</span>
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        </div>

                                        {/* Actions per student */}
                                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                            <Link
                                                to={`/siswa/${g.studentId}`}
                                                aria-label={`Lihat profil ${g.studentName}`}
                                                className="inline-flex items-center gap-1 min-h-[40px] sm:min-h-[34px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                                            >
                                                <User className="w-3.5 h-3.5" />
                                                <span>Profil</span>
                                            </Link>
                                            {onInputRemedial && primarySubject && (
                                                <button
                                                    type="button"
                                                    onClick={() => onInputRemedial(g.classId, primarySubject)}
                                                    className="inline-flex items-center gap-1.5 min-h-[40px] sm:min-h-[34px] px-3 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800/60 hover:bg-brand-100 dark:hover:bg-brand-900/50 text-xs font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                                                >
                                                    <ClipboardPen className="w-3.5 h-3.5" />
                                                    <span>Input Remedial</span>
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>

                        {groups.length > INITIAL_VISIBLE && (
                            <button
                                type="button"
                                onClick={() => setShowAll((v) => !v)}
                                className="min-h-[44px] px-3 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg cursor-pointer"
                            >
                                {showAll ? 'Tampilkan lebih sedikit' : `Tampilkan semua (${groups.length})`}
                            </button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
