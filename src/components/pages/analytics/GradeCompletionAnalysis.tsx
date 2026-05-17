/**
 * @fileoverview Grade Completion Analysis Section
 *
 * Komponen analisis kelengkapan penilaian. Memperlihatkan siswa yang
 * belum melaksanakan / belum terisi nilainya untuk Penilaian Harian (PH)
 * atau jenis penilaian lain pada mata pelajaran tertentu.
 *
 * Fitur:
 * - Filter mata pelajaran (subject)
 * - Filter jenis penilaian (assessment_name) atau "Semua"
 * - Toggle "Hanya Penilaian Harian (PH)" untuk mempersempit ke pola PH/UH/Ulangan Harian
 * - Statistik: total siswa, sudah dinilai, belum dinilai, persen kelengkapan
 * - Daftar siswa yang belum dinilai (group berdasar kelas)
 * - Tombol Input Nilai → navigate ke /input-massal dengan prefill
 *
 * @module components/pages/analytics/GradeCompletionAnalysis
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/Card';
import { Select } from '../../ui/Select';
import { Button } from '../../ui/Button';
import { ClipboardPenIcon, UserMinusIcon, CheckCircleIcon, AlertCircleIcon } from '../../Icons';

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
}

interface MissingStudent {
    id: string;
    name: string;
    class_id: string | null;
    className: string;
    /** Daftar assessment yang belum diisi (saat mode "Semua" assessment) */
    missingAssessments?: string[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Pola pengenal Penilaian Harian.
 * Menangkap variasi penamaan umum: "PH", "UH", "Ulangan Harian", "Penilaian Harian".
 */
const PH_PATTERN = /(\bph\b|\buh\b|ulangan\s*harian|penilaian\s*harian)/i;

const isPHAssessment = (name: string | null | undefined): boolean => {
    if (!name) return false;
    return PH_PATTERN.test(name);
};

// =============================================================================
// COMPONENT
// =============================================================================

const GradeCompletionAnalysis: React.FC<GradeCompletionAnalysisProps> = ({
    classes,
    students,
    academicRecords,
    selectedClassId,
}) => {
    const navigate = useNavigate();

    const [phOnly, setPhOnly] = useState<boolean>(true);
    const [subjectFilter, setSubjectFilter] = useState<string>('');
    const [assessmentFilter, setAssessmentFilter] = useState<string>('');
    /** Filter kelas lokal komponen (di luar filter kelas global Analytics). 'all' = semua kelas dalam scope. */
    const [classFilter, setClassFilter] = useState<string>('all');

    // ==========================================================================
    // DERIVED DATA
    // ==========================================================================

    /** Siswa dalam scope filter kelas global */
    const scopedStudents = useMemo<StudentRef[]>(() => {
        if (selectedClassId === 'all') return students;
        return students.filter((s) => s.class_id === selectedClassId);
    }, [students, selectedClassId]);

    /** Map id kelas → nama kelas */
    const classNameMap = useMemo(() => {
        const map = new Map<string, string>();
        classes.forEach((c) => map.set(c.id, c.name));
        return map;
    }, [classes]);

    /** Opsi kelas untuk filter lokal: kelas yang punya siswa dalam scope */
    const classOptions = useMemo<ClassRef[]>(() => {
        const ids = new Set<string>();
        scopedStudents.forEach((s) => {
            if (s.class_id) ids.add(s.class_id);
        });
        return classes
            .filter((c) => ids.has(c.id))
            .sort((a, b) => a.name.localeCompare(b.name, 'id'));
    }, [classes, scopedStudents]);

    /** Reset filter kelas lokal jika opsinya tidak lagi valid (mis. global filter berubah) */
    React.useEffect(() => {
        // Force 'all' kalau cuma satu kelas (dropdown disembunyikan)
        if (classOptions.length <= 1 && classFilter !== 'all') {
            setClassFilter('all');
            return;
        }
        if (classFilter !== 'all' && !classOptions.some((c) => c.id === classFilter)) {
            setClassFilter('all');
        }
    }, [classFilter, classOptions]);

    /** Siswa target setelah filter kelas global + filter kelas lokal */
    const targetStudents = useMemo<StudentRef[]>(() => {
        if (classFilter === 'all') return scopedStudents;
        return scopedStudents.filter((s) => s.class_id === classFilter);
    }, [scopedStudents, classFilter]);

    /** Set student_id yang termasuk dalam scope kelas terpilih */
    const targetStudentIds = useMemo(() => {
        return new Set(targetStudents.map((s) => s.id));
    }, [targetStudents]);

    /** Daftar mata pelajaran unik yang muncul di academicRecords (dalam scope kelas) */
    const subjectOptions = useMemo<string[]>(() => {
        const set = new Set<string>();
        academicRecords.forEach((r) => {
            if (!r.subject) return;
            if (!targetStudentIds.has(r.student_id)) return;
            set.add(r.subject);
        });
        return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
    }, [academicRecords, targetStudentIds]);

    /** Subject efektif - default ke pilihan pertama jika belum di-set */
    const effectiveSubject = useMemo(() => {
        if (subjectFilter && subjectOptions.includes(subjectFilter)) return subjectFilter;
        return subjectOptions[0] ?? '';
    }, [subjectFilter, subjectOptions]);

    /** Daftar assessment_name unik untuk subject terpilih, dengan filter PH bila aktif */
    const assessmentOptions = useMemo<string[]>(() => {
        if (!effectiveSubject) return [];
        const set = new Set<string>();
        academicRecords.forEach((r) => {
            if (r.subject !== effectiveSubject) return;
            if (!r.assessment_name) return;
            if (!targetStudentIds.has(r.student_id)) return;
            const trimmed = r.assessment_name.trim();
            if (!trimmed) return;
            if (phOnly && !isPHAssessment(trimmed)) return;
            set.add(trimmed);
        });
        return Array.from(set).sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
        );
    }, [academicRecords, effectiveSubject, targetStudentIds, phOnly]);

    /** Reset assessment filter saat subject/PH-only berubah dan opsi tidak valid */
    React.useEffect(() => {
        if (assessmentFilter && !assessmentOptions.includes(assessmentFilter)) {
            setAssessmentFilter('');
        }
    }, [assessmentFilter, assessmentOptions]);

    /**
     * Hitung siswa yang belum mengisi nilai.
     *
     * Kasus 1 - assessmentFilter spesifik:
     *   Siswa dianggap "belum" jika tidak punya record untuk
     *   subject + assessment_name terpilih.
     *
     * Kasus 2 - assessmentFilter kosong:
     *   - phOnly true: siswa "belum" jika belum lengkap pada SETIAP
     *     PH-assessment yang terdaftar di assessmentOptions.
     *   - phOnly false: siswa "belum" jika belum lengkap pada SETIAP
     *     assessment yang terdaftar di assessmentOptions.
     *   Daftar assessment yang belum diisi disertakan sebagai missingAssessments.
     */
    const { missingStudents, totalConsidered } = useMemo<{
        missingStudents: MissingStudent[];
        totalConsidered: number;
    }>(() => {
        if (!effectiveSubject) {
            return { missingStudents: [], totalConsidered: 0 };
        }

        // Index record untuk lookup cepat: student_id -> Set<assessment_name>
        const studentAssessmentMap = new Map<string, Set<string>>();
        academicRecords.forEach((r) => {
            if (r.subject !== effectiveSubject) return;
            if (!r.assessment_name) return;
            if (!targetStudentIds.has(r.student_id)) return;
            const name = r.assessment_name.trim();
            if (!name) return;
            let set = studentAssessmentMap.get(r.student_id);
            if (!set) {
                set = new Set<string>();
                studentAssessmentMap.set(r.student_id, set);
            }
            set.add(name);
        });

        const missing: MissingStudent[] = [];

        if (assessmentFilter) {
            // Kasus 1: cek satu assessment
            for (const s of targetStudents) {
                const assessments = studentAssessmentMap.get(s.id);
                if (!assessments || !assessments.has(assessmentFilter)) {
                    missing.push({
                        id: s.id,
                        name: s.name,
                        class_id: s.class_id,
                        className: classNameMap.get(s.class_id ?? '') || '-',
                        missingAssessments: [assessmentFilter],
                    });
                }
            }
        } else {
            // Kasus 2: cek semua assessment yang ada di assessmentOptions
            // Jika belum ada assessment apapun (assessmentOptions kosong), berarti
            // belum ada satupun PH/penilaian yang diinput → semua siswa target adalah missing.
            if (assessmentOptions.length === 0) {
                for (const s of targetStudents) {
                    missing.push({
                        id: s.id,
                        name: s.name,
                        class_id: s.class_id,
                        className: classNameMap.get(s.class_id ?? '') || '-',
                        missingAssessments: [],
                    });
                }
            } else {
                for (const s of targetStudents) {
                    const assessments = studentAssessmentMap.get(s.id) ?? new Set<string>();
                    const missingForStudent = assessmentOptions.filter((a) => !assessments.has(a));
                    if (missingForStudent.length > 0) {
                        missing.push({
                            id: s.id,
                            name: s.name,
                            class_id: s.class_id,
                            className: classNameMap.get(s.class_id ?? '') || '-',
                            missingAssessments: missingForStudent,
                        });
                    }
                }
            }
        }

        // Sort: kelas dulu, lalu nama
        missing.sort((a, b) => {
            const cls = a.className.localeCompare(b.className, 'id');
            return cls !== 0 ? cls : a.name.localeCompare(b.name, 'id');
        });

        return { missingStudents: missing, totalConsidered: targetStudents.length };
    }, [
        effectiveSubject,
        assessmentFilter,
        academicRecords,
        targetStudents,
        targetStudentIds,
        assessmentOptions,
        classNameMap,
    ]);

    /** Pengelompokan missing per kelas untuk tampilan ringkas */
    const missingByClass = useMemo(() => {
        const groups = new Map<string, MissingStudent[]>();
        missingStudents.forEach((m) => {
            const key = m.className;
            const list = groups.get(key);
            if (list) list.push(m);
            else groups.set(key, [m]);
        });
        return Array.from(groups.entries())
            .map(([className, items]) => ({ className, items }))
            .sort((a, b) => a.className.localeCompare(b.className, 'id'));
    }, [missingStudents]);

    const completionPercentage = useMemo(() => {
        if (totalConsidered === 0) return 0;
        const filled = totalConsidered - missingStudents.length;
        return Math.round((filled / totalConsidered) * 100);
    }, [totalConsidered, missingStudents.length]);

    // ==========================================================================
    // HANDLERS
    // ==========================================================================

    const handleOpenInput = (overrideClassId?: string | null) => {
        if (!effectiveSubject) return;

        // Tentukan kelas tujuan
        let classIdToPass: string | null = overrideClassId ?? null;
        if (!classIdToPass) {
            if (classFilter !== 'all') {
                classIdToPass = classFilter;
            } else if (selectedClassId !== 'all') {
                classIdToPass = selectedClassId;
            }
        }
        if (!classIdToPass && missingStudents.length > 0) {
            classIdToPass = missingStudents[0].class_id;
        }

        // Tentukan assessment tujuan
        let assessmentToPass: string | null = assessmentFilter || null;
        if (!assessmentToPass) {
            const first = missingStudents[0]?.missingAssessments?.[0];
            assessmentToPass = first || null;
        }

        navigate('/input-massal', {
            state: {
                prefill: {
                    mode: 'subject_grade',
                    classId: classIdToPass,
                    subject: effectiveSubject,
                    assessment_name: assessmentToPass,
                },
            },
        });
    };

    // ==========================================================================
    // RENDER
    // ==========================================================================

    const noSubject = subjectOptions.length === 0;

    return (
        <Card className="bg-white dark:bg-slate-900 border-0 shadow-lg">
            <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                            <UserMinusIcon className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                Audit Kelengkapan Nilai
                            </CardTitle>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Lihat siswa yang belum melaksanakan PH atau yang nilainya belum terisi
                            </p>
                        </div>
                    </div>

                    {/* PH-only toggle */}
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none self-start sm:self-center">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                            Hanya PH
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
                                aria-label="Hanya tampilkan Penilaian Harian"
                            />
                            <span
                                className="w-10 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer-checked:bg-indigo-600 transition-colors"
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
                            {noSubject && <option value="">Belum ada data nilai</option>}
                            {subjectOptions.map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </Select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                            Jenis Penilaian {phOnly && <span className="normal-case font-normal text-slate-400">(filter PH)</span>}
                        </label>
                        <Select
                            value={assessmentFilter}
                            onChange={(e) => setAssessmentFilter(e.target.value)}
                            disabled={!effectiveSubject || assessmentOptions.length === 0}
                        >
                            <option value="">
                                {assessmentOptions.length === 0
                                    ? 'Belum ada penilaian'
                                    : `Semua${phOnly ? ' PH' : ''} (${assessmentOptions.length})`}
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
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center">
                            <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">
                                {totalConsidered}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Total Siswa
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-center">
                            <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                {totalConsidered - missingStudents.length}
                            </p>
                            <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">
                                Sudah Dinilai
                            </p>
                        </div>
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-center">
                            <p className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400">
                                {missingStudents.length}
                            </p>
                            <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">
                                Belum Dinilai
                            </p>
                        </div>
                    </div>
                )}

                {/* Progress bar */}
                {effectiveSubject && totalConsidered > 0 && (
                    <div className="mb-5">
                        <div className="flex justify-between text-xs mb-2 font-semibold uppercase tracking-wider">
                            <span className="text-slate-400">Kelengkapan</span>
                            <span
                                className={
                                    completionPercentage >= 80
                                        ? 'text-emerald-600'
                                        : completionPercentage >= 50
                                            ? 'text-amber-600'
                                            : 'text-rose-600'
                                }
                            >
                                {completionPercentage}%
                            </span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ease-out bg-gradient-to-r ${completionPercentage >= 80
                                    ? 'from-emerald-500 to-emerald-600'
                                    : completionPercentage >= 50
                                        ? 'from-amber-400 to-amber-500'
                                        : 'from-rose-500 to-rose-600'
                                    }`}
                                style={{ width: `${completionPercentage}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Body */}
                {!effectiveSubject ? (
                    <div className="py-10 text-center">
                        <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                            <ClipboardPenIcon className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                            Belum ada data nilai
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 max-w-sm mx-auto">
                            Input minimal satu nilai untuk mulai memantau siswa yang belum melaksanakan
                            Penilaian Harian.
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
                        <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            Semua siswa sudah dinilai
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {assessmentFilter
                                ? `Tidak ada siswa yang tertinggal pada "${assessmentFilter}".`
                                : phOnly
                                    ? 'Tidak ada siswa yang tertinggal pada PH yang terdaftar.'
                                    : 'Tidak ada siswa yang tertinggal pada penilaian yang terdaftar.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Heading row */}
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                <AlertCircleIcon className="w-4 h-4 text-rose-500" />
                                Daftar Belum Dinilai ({missingStudents.length})
                            </p>
                            <Button variant="primary" size="sm" onClick={() => handleOpenInput()}>
                                <ClipboardPenIcon className="w-4 h-4 mr-1.5" />
                                Input Nilai
                            </Button>
                        </div>

                        {/* Group by class */}
                        <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
                            {missingByClass.map(({ className, items }) => (
                                <div
                                    key={className}
                                    className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden"
                                >
                                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 px-4 py-2">
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                                            {className}
                                            <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                                                {items.length} siswa
                                            </span>
                                        </p>
                                        {/* Per-class quick action: only show if a class context exists */}
                                        {items[0]?.class_id && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 px-2 text-xs"
                                                onClick={() => handleOpenInput(items[0].class_id)}
                                            >
                                                Input untuk kelas ini
                                            </Button>
                                        )}
                                    </div>
                                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {items.map((s) => (
                                            <li
                                                key={s.id}
                                                className="px-4 py-2.5 flex items-center justify-between gap-3"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                                                        {s.name}
                                                    </p>
                                                    {!assessmentFilter &&
                                                        s.missingAssessments &&
                                                        s.missingAssessments.length > 0 && (
                                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                                Belum:{' '}
                                                                {s.missingAssessments.slice(0, 3).join(', ')}
                                                                {s.missingAssessments.length > 3 &&
                                                                    ` +${s.missingAssessments.length - 3} lagi`}
                                                            </p>
                                                        )}
                                                </div>
                                                <span className="flex-shrink-0 text-[11px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                                                    Belum
                                                </span>
                                            </li>
                                        ))}
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
