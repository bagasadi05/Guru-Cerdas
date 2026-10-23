import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ClipboardPen,
    CheckCircle,
    User,
    UserMinus,
    ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/Card';
import type {
    GradeCompletionSummary,
    MissingAssessmentItem,
} from '../../../../services/academicAnalyticsService';

export interface MissingGradesAlertCardProps {
    summary: GradeCompletionSummary;
    onInputGrade: (params: {
        classId?: string | null;
        subject?: string;
        assessmentName?: string;
        notes?: string;
    }) => void;
    onOpenFullAudit?: () => void;
}

const INITIAL_VISIBLE = 8;

const formatClassBadge = (className: string) =>
    /^kelas\b/i.test(className.trim()) ? className.trim() : `Kelas ${className.trim()}`;

export const MissingGradesAlertCard: React.FC<MissingGradesAlertCardProps> = ({
    summary,
    onInputGrade,
    onOpenFullAudit,
}) => {
    const [showAll, setShowAll] = useState(false);
    const [subjectFilter, setSubjectFilter] = useState<string>('all');

    const { missingStudents, expectedSlotCount } = summary;

    // Count how many students are missing assessments per subject (only subjects that already have grades entered)
    const subjectCounts = useMemo(() => {
        const counts = new Map<string, Set<string>>();
        for (const student of missingStudents) {
            for (const item of student.missingItems) {
                const set = counts.get(item.subject) ?? new Set<string>();
                set.add(student.studentId);
                counts.set(item.subject, set);
            }
        }
        return Array.from(counts.entries())
            .map(([subject, set]) => ({ subject, count: set.size }))
            .sort((a, b) => b.count - a.count || a.subject.localeCompare(b.subject, 'id'));
    }, [missingStudents]);

    const effectiveSubjectFilter = useMemo(() => {
        if (subjectFilter === 'all') return 'all';
        return subjectCounts.some((s) => s.subject === subjectFilter) ? subjectFilter : 'all';
    }, [subjectFilter, subjectCounts]);

    const filteredStudents = useMemo(() => {
        const list = missingStudents
            .map((student) => {
                const items = effectiveSubjectFilter === 'all'
                    ? student.missingItems
                    : student.missingItems.filter((i) => i.subject === effectiveSubjectFilter);
                return {
                    ...student,
                    filteredItems: items,
                };
            })
            .filter((s) => s.filteredItems.length > 0);

        // Sort by most missing PH items first, then alphabetically
        return list.sort(
            (a, b) =>
                b.filteredItems.length - a.filteredItems.length ||
                a.className.localeCompare(b.className, 'id', { numeric: true }) ||
                a.studentName.localeCompare(b.studentName, 'id'),
        );
    }, [missingStudents, effectiveSubjectFilter]);

    const totalMissingSlotsInFilter = useMemo(
        () => filteredStudents.reduce((acc, s) => acc + s.filteredItems.length, 0),
        [filteredStudents],
    );

    const visibleStudents = showAll ? filteredStudents : filteredStudents.slice(0, INITIAL_VISIBLE);

    const hasMissing = missingStudents.length > 0;

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <UserMinus className="w-5 h-5 text-amber-500 shrink-0" />
                            <span>Siswa Belum PH / Nilai Belum Masuk</span>
                        </CardTitle>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Daftar siswa yang nilainya masih kosong pada Penilaian Harian (ASH/PH) yang sudah diisi nilainya oleh guru untuk siswa lain di kelas tersebut.
                        </p>
                    </div>
                    {onOpenFullAudit && (
                        <button
                            type="button"
                            onClick={onOpenFullAudit}
                            className="inline-flex items-center gap-1 self-start sm:self-center min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/40 dark:hover:text-brand-300 transition-colors cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        >
                            <span>Audit Lengkap</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </CardHeader>

            <CardContent>
                {expectedSlotCount === 0 && !hasMissing ? (
                    <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60">
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                            Belum ada Penilaian Harian (ASH/PH) yang diinput pada semester ini.
                        </p>
                        <button
                            type="button"
                            onClick={() => onInputGrade({})}
                            className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                        >
                            <ClipboardPen className="w-3.5 h-3.5" />
                            <span>Input PH</span>
                        </button>
                    </div>
                ) : !hasMissing ? (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">
                            Semua siswa sudah memiliki nilai lengkap pada seluruh Penilaian Harian (ASH/PH) yang sudah berjalan.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Subject filter pills when multiple subjects have missing grades */}
                        {subjectCounts.length > 1 && (
                            <div
                                role="group"
                                aria-label="Filter mata pelajaran PH belum tuntas"
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
                                    Semua Mapel ({missingStudents.length})
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
                                                    ? 'bg-amber-600 text-white shadow-xs'
                                                    : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/50 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                                            }`}
                                        >
                                            {subject} ({count})
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Summary bar */}
                        {filteredStudents.length > 0 && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 rounded-xl px-3.5 py-2.5">
                                <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    {filteredStudents.length} siswa belum lengkap ({totalMissingSlotsInFilter} nilai PH belum masuk)
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const firstStudent = filteredStudents[0];
                                        const firstItem = firstStudent?.filteredItems[0];
                                        onInputGrade({
                                            classId: firstStudent?.classId,
                                            subject: effectiveSubjectFilter !== 'all' ? effectiveSubjectFilter : firstItem?.subject,
                                            assessmentName: firstItem?.assessmentName,
                                        });
                                    }}
                                    className="inline-flex items-center justify-center gap-1.5 min-h-[38px] sm:min-h-[32px] px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                                >
                                    <ClipboardPen className="w-3.5 h-3.5" />
                                    <span>
                                        {effectiveSubjectFilter !== 'all'
                                            ? `Input Nilai ${effectiveSubjectFilter}`
                                            : 'Input Nilai Susulan'}
                                    </span>
                                </button>
                            </div>
                        )}

                        {/* Student rows */}
                        {filteredStudents.length > 0 && (
                            <ul className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                                {visibleStudents.map((student) => {
                                    const primaryItem: MissingAssessmentItem | undefined = student.filteredItems[0];
                                    return (
                                        <li
                                            key={student.studentId}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:px-4 sm:py-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                                        >
                                            <div className="min-w-0 flex-1 space-y-2">
                                                <div className="flex items-center flex-wrap gap-2">
                                                    <Link
                                                        to={`/siswa/${student.studentId}`}
                                                        className="text-sm font-bold text-slate-900 dark:text-white hover:text-brand-600 dark:hover:text-brand-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                                                    >
                                                        {student.studentName}
                                                    </Link>
                                                    {student.className && student.className !== '-' && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                            {formatClassBadge(student.className)}
                                                        </span>
                                                    )}
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                                        Belum {student.filteredItems.length} PH
                                                    </span>
                                                </div>

                                                {/* Interactive chips for each missing PH */}
                                                <div className="flex flex-wrap gap-1.5">
                                                    {student.filteredItems.map((item) => {
                                                        const key = `${item.subject}::${item.assessmentName}`;
                                                        return (
                                                            <button
                                                                key={key}
                                                                type="button"
                                                                onClick={() =>
                                                                    onInputGrade({
                                                                        classId: student.classId,
                                                                        subject: item.subject,
                                                                        assessmentName: item.assessmentName,
                                                                    })
                                                                }
                                                                title={`Sudah dinilai ${item.gradedCount}/${item.classSize} siswa di kelas — klik untuk input nilai ${item.subject} (${item.assessmentName})`}
                                                                className="inline-flex items-center gap-1.5 min-h-[32px] px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                                                            >
                                                                <span>{item.subject}</span>
                                                                <span className="font-extrabold tabular-nums">
                                                                    {item.assessmentName}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Actions per student */}
                                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                                <Link
                                                    to={`/siswa/${student.studentId}`}
                                                    aria-label={`Lihat profil ${student.studentName}`}
                                                    className="inline-flex items-center gap-1 min-h-[40px] sm:min-h-[34px] px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                                                >
                                                    <User className="w-3.5 h-3.5" />
                                                    <span>Profil</span>
                                                </Link>
                                                {primaryItem && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            onInputGrade({
                                                                classId: student.classId,
                                                                subject: primaryItem.subject,
                                                                assessmentName: primaryItem.assessmentName,
                                                            })
                                                        }
                                                        className="inline-flex items-center gap-1.5 min-h-[40px] sm:min-h-[34px] px-3 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800/60 hover:bg-brand-100 dark:hover:bg-brand-900/50 text-xs font-bold transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                                                    >
                                                        <ClipboardPen className="w-3.5 h-3.5" />
                                                        <span>Input Nilai</span>
                                                    </button>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}

                        {filteredStudents.length > INITIAL_VISIBLE && (
                            <button
                                type="button"
                                onClick={() => setShowAll((v) => !v)}
                                className="min-h-[44px] px-3 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg cursor-pointer"
                            >
                                {showAll ? 'Tampilkan lebih sedikit' : `Tampilkan semua (${filteredStudents.length})`}
                            </button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
