/**
 * @fileoverview Grade Completion Analysis Section
 *
 * Komponen analisis kelengkapan penilaian. Memperlihatkan siswa yang
 * belum melaksanakan / belum terisi nilainya untuk Asesmen Sumatif Harian (ASH / PH)
 * atau jenis penilaian lain yang sudah sebagian dinilai oleh guru di kelas tersebut.
 *
 * @module components/pages/analytics/GradeCompletionAnalysis
 */

import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Select } from '../../ui/Select';
import { Button } from '../../ui/Button';
import { ClipboardPenIcon, UserMinusIcon, CheckCircleIcon, AlertCircleIcon } from '../../Icons';
import {
    analyzeGradeCompletion,
    type StudentMissingGrades,
} from '../../../services/academicAnalyticsService';
import type { AnalyticsPhSchedule } from './types';

// =============================================================================
// TYPES
// =============================================================================

interface ClassRef {
    id: string;
    name: string;
}

interface StudentRef {
    id: string;
    name: string;
    class_id: string | null;
}

interface AcademicRecordRef {
    student_id: string;
    subject?: string | null;
    assessment_name?: string | null;
}

export interface GradeCompletionAnalysisProps {
    /** Daftar kelas (untuk lookup nama) */
    classes: ClassRef[];
    /** Daftar siswa (sudah pre-filter selectedClassId di parent kalau perlu) */
    students: StudentRef[];
    /** Catatan akademik dengan minimal field student_id, subject, assessment_name */
    academicRecords: AcademicRecordRef[];
    /** ID kelas yang dipilih dari filter global Analytics ('all' = semua) */
    selectedClassId: string;
    /** Jadwal ASH / PH (opsional) */
    phSchedules?: AnalyticsPhSchedule[];
}

// =============================================================================
// COMPONENT
// =============================================================================

const GradeCompletionAnalysis: React.FC<GradeCompletionAnalysisProps> = ({
    classes,
    students,
    academicRecords,
    selectedClassId,
    phSchedules = [],
}) => {
    const navigate = useNavigate();

    const [phOnly, setPhOnly] = useState<boolean>(true);
    const [subjectFilter, setSubjectFilter] = useState<string>('all');
    const [assessmentFilter, setAssessmentFilter] = useState<string>('');
    /** Filter kelas lokal komponen (di luar filter kelas global Analytics). 'all' = semua kelas dalam scope. */
    const [classFilter, setClassFilter] = useState<string>('all');
    const [studentSearch, setStudentSearch] = useState<string>('');

    // ==========================================================================
    // DERIVED DATA
    // ==========================================================================

    /** Siswa dalam scope filter kelas global */
    const scopedStudents = useMemo<StudentRef[]>(() => {
        if (selectedClassId === 'all') return students;
        return students.filter((s) => s.class_id === selectedClassId);
    }, [students, selectedClassId]);

    /** Opsi kelas untuk filter lokal: kelas yang punya siswa dalam scope */
    const classOptions = useMemo<ClassRef[]>(() => {
        const ids = new Set<string>();
        scopedStudents.forEach((s) => {
            if (s.class_id) ids.add(s.class_id);
        });
        return classes
            .filter((c) => ids.has(c.id))
            .sort((a, b) => a.name.localeCompare(b.name, 'id', { numeric: true, sensitivity: 'base' }));
    }, [classes, scopedStudents]);

    /** Reset filter kelas lokal jika opsinya tidak lagi valid (mis. global filter berubah) */
    React.useEffect(() => {
        if (classOptions.length <= 1 && classFilter !== 'all') {
            setClassFilter('all');
            return;
        }
        if (classFilter !== 'all' && !classOptions.some((c) => c.id === classFilter)) {
            setClassFilter('all');
        }
    }, [classFilter, classOptions]);

    /** Ringkasan awal untuk mendapatkan daftar mapel yang sudah ada nilainya di kelas terpilih */
    const baseSummary = useMemo(
        () =>
            analyzeGradeCompletion(scopedStudents, classes, academicRecords, phSchedules, {
                classId: classFilter,
                subject: 'all',
                phOnly,
            }),
        [scopedStudents, classes, academicRecords, phSchedules, classFilter, phOnly],
    );

    const subjectOptions = baseSummary.availableSubjects;

    /** Subject efektif - 'all' untuk semua mapel atau nama mapel valid */
    const effectiveSubject = useMemo(() => {
        if (subjectOptions.length === 0) return '';
        if (subjectFilter === 'all') return 'all';
        if (subjectOptions.includes(subjectFilter)) return subjectFilter;
        return 'all';
    }, [subjectFilter, subjectOptions]);

    /** Analisis kelengkapan sesuai filter aktif */
    const completion = useMemo(
        () =>
            analyzeGradeCompletion(scopedStudents, classes, academicRecords, phSchedules, {
                classId: classFilter,
                subject: effectiveSubject || 'all',
                assessmentName: assessmentFilter,
                phOnly,
            }),
        [scopedStudents, classes, academicRecords, phSchedules, classFilter, effectiveSubject, assessmentFilter, phOnly],
    );

    const assessmentOptions = completion.availableAssessments;

    /** Reset assessment filter saat subject/PH-only berubah dan opsi tidak valid */
    React.useEffect(() => {
        if (assessmentFilter && !assessmentOptions.includes(assessmentFilter)) {
            setAssessmentFilter('');
        }
    }, [assessmentFilter, assessmentOptions]);

    const {
        missingStudents,
        totalStudents: totalConsidered,
        completionPercentage,
    } = completion;

    /** Filter nama siswa secara lokal */
    const searchedMissingStudents = useMemo(() => {
        const q = studentSearch.trim().toLowerCase();
        if (!q) return missingStudents;
        return missingStudents.filter(
            (s) =>
                s.studentName.toLowerCase().includes(q) ||
                s.className.toLowerCase().includes(q) ||
                s.missingItems.some(
                    (i) =>
                        i.subject.toLowerCase().includes(q) ||
                        i.assessmentName.toLowerCase().includes(q),
                ),
        );
    }, [missingStudents, studentSearch]);

    /** Pengelompokan missing per kelas untuk tampilan ringkas */
    const missingByClass = useMemo(() => {
        const groups = new Map<string, StudentMissingGrades[]>();
        searchedMissingStudents.forEach((m) => {
            const key = m.className;
            const list = groups.get(key);
            if (list) list.push(m);
            else groups.set(key, [m]);
        });
        return Array.from(groups.entries())
            .map(([className, items]) => ({ className, items }))
            .sort((a, b) => a.className.localeCompare(b.className, 'id', { numeric: true }));
    }, [searchedMissingStudents]);

    // ==========================================================================
    // HANDLERS
    // ==========================================================================

    const handleOpenInput = (params?: {
        classId?: string | null;
        subject?: string | null;
        assessmentName?: string | null;
    }) => {
        let classIdToPass: string | null = params?.classId ?? null;
        if (!classIdToPass) {
            if (classFilter !== 'all') {
                classIdToPass = classFilter;
            } else if (selectedClassId !== 'all') {
                classIdToPass = selectedClassId;
            }
        }
        if (!classIdToPass && missingStudents.length > 0) {
            classIdToPass = missingStudents[0].classId;
        }

        const firstMissingItem = missingStudents[0]?.missingItems[0];
        const subjectToPass =
            params?.subject ||
            (effectiveSubject && effectiveSubject !== 'all' ? effectiveSubject : firstMissingItem?.subject) ||
            subjectOptions[0] ||
            '';

        const assessmentToPass =
            params?.assessmentName ||
            assessmentFilter ||
            firstMissingItem?.assessmentName ||
            null;

        navigate('/input-massal', {
            state: {
                prefill: {
                    mode: 'subject_grade',
                    ...(classIdToPass ? { classId: classIdToPass } : {}),
                    ...(subjectToPass ? { subject: subjectToPass } : {}),
                    ...(assessmentToPass ? { assessment_name: assessmentToPass } : {}),
                },
            },
        });
    };

    // ==========================================================================
    // RENDER
    // ==========================================================================

    const noSubject = subjectOptions.length === 0;

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                            <UserMinusIcon className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                Audit Kelengkapan Nilai
                            </CardTitle>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Lihat siswa yang nilainya belum terisi pada mapel dan ASH / PH yang sudah dinilai oleh guru
                            </p>
                        </div>
                    </div>

                    {/* ASH/PH-only toggle */}
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none self-start sm:self-center">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                            Hanya ASH / PH
                        </span>
                        <span className="relative inline-flex">
                            <input
                                type="checkbox"
                                checked={phOnly}
                                onChange={(e) => {
                                    setPhOnly(e.target.checked);
                                    setAssessmentFilter('');
                                }}
                                className="sr-only peer"
                                aria-label="Hanya tampilkan Asesmen Sumatif Harian (ASH / PH)"
                            />
                            <span
                                className="w-10 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer-checked:bg-brand-600 transition-colors"
                                aria-hidden
                            />
                            <span
                                className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transform transition-transform peer-checked:translate-x-5"
                                aria-hidden
                            />
                        </span>
                    </label>
                </div>
            </CardHeader>

            <CardContent>
                {/* Filters */}
                <div
                    className={`grid grid-cols-1 ${
                        classOptions.length > 1 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'
                    } gap-3 mb-5`}
                >
                    {classOptions.length > 1 && (
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                Kelas
                            </label>
                            <Select
                                value={classFilter}
                                onChange={(e) => setClassFilter(e.target.value)}
                            >
                                <option value="all">Semua Kelas ({classOptions.length})</option>
                                {classOptions.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    )}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                            Mata Pelajaran
                        </label>
                        <Select
                            value={effectiveSubject}
                            onChange={(e) => {
                                setSubjectFilter(e.target.value);
                                setAssessmentFilter('');
                            }}
                            disabled={noSubject}
                        >
                            {noSubject ? (
                                <option value="">Belum ada data nilai</option>
                            ) : (
                                <>
                                    <option value="all">Semua Mata Pelajaran ({subjectOptions.length})</option>
                                    {subjectOptions.map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </>
                            )}
                        </Select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                            Jenis Penilaian {phOnly && <span className="normal-case font-normal text-slate-500">(filter ASH / PH)</span>}
                        </label>
                        <Select
                            value={assessmentFilter}
                            onChange={(e) => setAssessmentFilter(e.target.value)}
                            disabled={!effectiveSubject || assessmentOptions.length === 0}
                        >
                            <option value="">
                                {assessmentOptions.length === 0
                                    ? 'Belum ada penilaian'
                                    : `Semua${phOnly ? ' ASH / PH' : ''} (${assessmentOptions.length})`}
                            </option>
                            {assessmentOptions.map((a) => (
                                <option key={a} value={a}>
                                    {a}
                                </option>
                            ))}
                        </Select>
                    </div>
                </div>

                {/* Stats summary */}
                {effectiveSubject && totalConsidered > 0 && (
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-center">
                            <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums">
                                {totalConsidered}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Total Siswa
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-center">
                            <p className="text-xl sm:text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                                {totalConsidered - missingStudents.length}
                            </p>
                            <p className="text-xs text-emerald-700 dark:text-emerald-400/80 mt-0.5">
                                Sudah Lengkap
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-center">
                            <p className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                                {missingStudents.length}
                            </p>
                            <p className="text-xs text-rose-700 dark:text-rose-400/80 mt-0.5">
                                Belum Lengkap
                            </p>
                        </div>
                    </div>
                )}

                {/* Progress bar */}
                {effectiveSubject && totalConsidered > 0 && (
                    <div className="mb-5">
                        <div className="flex justify-between text-xs mb-2 font-semibold uppercase tracking-wider">
                            <span className="text-slate-500">Kelengkapan Penilaian</span>
                            <span
                                className={
                                    completionPercentage >= 80
                                        ? 'text-emerald-700 dark:text-emerald-400'
                                        : completionPercentage >= 50
                                            ? 'text-amber-700 dark:text-amber-400'
                                            : 'text-rose-600 dark:text-rose-400'
                                }
                            >
                                {completionPercentage}%
                            </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r ${
                                    completionPercentage >= 80
                                        ? 'from-emerald-500 to-emerald-600'
                                        : completionPercentage >= 50
                                            ? 'from-amber-500 to-orange-600'
                                            : 'from-rose-500 to-red-600'
                                }`}
                                style={{ width: `${completionPercentage}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Body */}
                {!effectiveSubject ? (
                    <div className="py-10 text-center">
                        <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-3">
                            <ClipboardPenIcon className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                            Belum ada data nilai
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 max-w-sm mx-auto">
                            Input minimal satu nilai untuk mulai memantau siswa yang belum melaksanakan Asesmen Sumatif Harian (ASH / PH).
                        </p>
                        <Button variant="primary" size="sm" onClick={() => navigate('/input-massal')}>
                            <ClipboardPenIcon className="w-4 h-4 mr-1.5" />
                            Buka Input Nilai
                        </Button>
                    </div>
                ) : missingStudents.length === 0 ? (
                    <div className="py-8 text-center">
                        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
                            <CheckCircleIcon className="w-7 h-7 text-emerald-500" />
                        </div>
                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                            Semua siswa sudah dinilai
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {assessmentFilter
                                ? `Tidak ada siswa yang tertinggal pada "${assessmentFilter}".`
                                : phOnly
                                    ? 'Tidak ada siswa yang tertinggal pada ASH / PH yang sudah berjalan.'
                                    : 'Tidak ada siswa yang tertinggal pada penilaian yang sudah berjalan.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Heading & search row */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                <AlertCircleIcon className="w-4 h-4 text-rose-500 shrink-0" />
                                <span>Daftar Belum Dinilai ({searchedMissingStudents.length} siswa)</span>
                            </p>

                            <div className="flex items-center gap-2">
                                {missingStudents.length > 5 && (
                                    <div className="relative flex-1 sm:w-56">
                                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        <input
                                            type="search"
                                            value={studentSearch}
                                            onChange={(e) => setStudentSearch(e.target.value)}
                                            placeholder="Cari nama siswa..."
                                            aria-label="Cari nama siswa yang belum dinilai"
                                            className="w-full min-h-[36px] pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                                        />
                                    </div>
                                )}
                                <Button variant="primary" size="sm" onClick={() => handleOpenInput()}>
                                    <ClipboardPenIcon className="w-4 h-4 mr-1.5" />
                                    Input Nilai
                                </Button>
                            </div>
                        </div>

                        {/* Group by class */}
                        <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-1">
                            {missingByClass.map(({ className, items }) => (
                                <div
                                    key={className}
                                    className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
                                >
                                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/40 px-4 py-2">
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                            {className}
                                            <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                                                {items.length} siswa
                                            </span>
                                        </p>
                                        {items[0]?.classId && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="min-h-[44px] px-2 text-xs"
                                                onClick={() =>
                                                    handleOpenInput({
                                                        classId: items[0].classId,
                                                        subject: items[0].missingItems[0]?.subject,
                                                        assessmentName: items[0].missingItems[0]?.assessmentName,
                                                    })
                                                }
                                            >
                                                Input untuk kelas ini
                                            </Button>
                                        )}
                                    </div>
                                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {items.map((s) => {
                                            const firstItem = s.missingItems[0];
                                            return (
                                                <li
                                                    key={s.studentId}
                                                    className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                                                >
                                                    <div className="min-w-0 flex-1 space-y-1.5">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <Link
                                                                to={`/siswa/${s.studentId}`}
                                                                className="text-sm font-semibold text-slate-800 dark:text-slate-100 hover:text-brand-600 dark:hover:text-brand-400 hover:underline truncate"
                                                            >
                                                                {s.studentName}
                                                            </Link>
                                                            <span className="flex-shrink-0 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                                                                {s.missingItems.length > 0
                                                                    ? `Belum ${s.missingItems.length} PH`
                                                                    : 'Belum'}
                                                            </span>
                                                        </div>

                                                        {s.missingItems.length > 0 && (
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {s.missingItems.map((item) => {
                                                                    const label =
                                                                        effectiveSubject === 'all'
                                                                            ? `${item.subject} · ${item.assessmentName}`
                                                                            : item.assessmentName;
                                                                    return (
                                                                        <button
                                                                            key={`${item.subject}::${item.assessmentName}`}
                                                                            type="button"
                                                                            onClick={() =>
                                                                                handleOpenInput({
                                                                                    classId: s.classId,
                                                                                    subject: item.subject,
                                                                                    assessmentName: item.assessmentName,
                                                                                })
                                                                            }
                                                                            title={`Sudah dinilai ${item.gradedCount}/${item.classSize} siswa di kelas — klik untuk input nilai ${item.subject} (${item.assessmentName})`}
                                                                            className="inline-flex items-center gap-1 min-h-[28px] px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                                                                        >
                                                                            <span>{label}</span>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleOpenInput({
                                                                    classId: s.classId,
                                                                    subject: firstItem?.subject,
                                                                    assessmentName: firstItem?.assessmentName,
                                                                })
                                                            }
                                                            className="inline-flex items-center gap-1 min-h-[34px] px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800/60 hover:bg-brand-100 dark:hover:bg-brand-900/50 text-xs font-bold transition-colors cursor-pointer"
                                                        >
                                                            <ClipboardPenIcon className="w-3.5 h-3.5" />
                                                            <span>Input Nilai</span>
                                                        </button>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default GradeCompletionAnalysis;
