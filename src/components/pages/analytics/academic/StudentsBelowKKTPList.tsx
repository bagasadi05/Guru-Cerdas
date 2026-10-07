import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/Card';
import type { StudentBelowKKTP } from '../../../../services/academicAnalyticsService';

interface StudentsBelowKKTPListProps {
    students: StudentBelowKKTP[];
    kktp: number;
}

interface StudentGroup {
    studentId: string;
    studentName: string;
    className: string;
    subjects: { subject: string; average: number }[];
    worstGap: number;
}

const INITIAL_VISIBLE = 10;

export const StudentsBelowKKTPList: React.FC<StudentsBelowKKTPListProps> = ({ students, kktp }) => {
    const [showAll, setShowAll] = useState(false);

    const groups = useMemo<StudentGroup[]>(() => {
        const byStudent = new Map<string, StudentGroup>();
        for (const s of students) {
            const group = byStudent.get(s.studentId) ?? {
                studentId: s.studentId,
                studentName: s.studentName,
                className: s.className,
                subjects: [],
                worstGap: 0,
            };
            group.subjects.push({ subject: s.subject, average: s.average });
            group.worstGap = Math.min(group.worstGap, s.gap);
            byStudent.set(s.studentId, group);
        }
        // Students missing the most subjects first, then the widest gap.
        return Array.from(byStudent.values())
            .map((g) => ({ ...g, subjects: g.subjects.sort((a, b) => a.average - b.average) }))
            .sort((a, b) => b.subjects.length - a.subjects.length || a.worstGap - b.worstGap);
    }, [students]);

    const visible = showAll ? groups : groups.slice(0, INITIAL_VISIBLE);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-500" />
                    Siswa di Bawah KKTP
                </CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Rata-rata per mapel di bawah {kktp}. Daftar ini bisa jadi acuan remedial.
                </p>
            </CardHeader>
            <CardContent>
                {groups.length === 0 ? (
                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">
                            Semua siswa sudah mencapai KKTP {kktp} di setiap mapel.
                        </p>
                    </div>
                ) : (
                    <>
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
                            {groups.length} siswa, {students.length} nilai mapel
                        </p>
                        <ul className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                            {visible.map((g) => (
                                <li key={g.studentId}>
                                    <Link
                                        to={`/siswa/${g.studentId}`}
                                        className="flex items-center gap-3 px-4 py-3 min-h-[44px] hover:bg-slate-50 dark:hover:bg-slate-700/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                                                {g.studentName}
                                                <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">{g.className}</span>
                                            </p>
                                            <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                                                {g.subjects.map((s) => `${s.subject} ${s.average}`).join(' · ')}
                                            </p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" aria-hidden />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        {groups.length > INITIAL_VISIBLE && (
                            <button
                                type="button"
                                onClick={() => setShowAll((v) => !v)}
                                className="mt-3 min-h-[44px] px-3 text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-lg"
                            >
                                {showAll ? 'Tampilkan lebih sedikit' : `Tampilkan semua (${groups.length})`}
                            </button>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
};
