import React, { useMemo, useState } from 'react';
import {
    GraduationCap,
    FileText,
    FileSpreadsheet,
    Search,
    Sparkles,
    CheckCircle2,
    Save,
    AlertCircle,
    X,
} from 'lucide-react';
import { EnrollmentView, ExtracurricularGrade } from './types';
import {
    DEFAULT_GRADE_DESCRIPTIONS,
    getGradeFromScore,
    GradeDraft,
    isGradeDraftDirty,
    compareEnrollmentsByClassAndName,
    compareClassNames,
} from './extracurricularUtils';

export type { GradeDraft };

interface GradesTabProps {
    extracurricularId: string;
    enrollments: EnrollmentView[];
    gradesMap: Record<string, ExtracurricularGrade>;
    gradeDrafts: Record<string, GradeDraft>;
    onUpdateDraft: (key: string, patch: Partial<GradeDraft>) => void;
    onSaveGrade: (enrollment: EnrollmentView, patch?: Partial<GradeDraft>) => void;
    onAutoFillDescriptions?: () => void;
    isSavingBulk?: boolean;
    canEdit?: boolean;
    onExportPDF: () => void;
    onExportExcel: () => void;
}

const GRADE_OPTIONS = ['A', 'B', 'C', 'D'] as const;

const GRADE_LABELS: Record<string, string> = {
    A: 'Sangat Baik',
    B: 'Baik',
    C: 'Cukup',
    D: 'Perlu Bimbingan',
};

export const GradesTab: React.FC<GradesTabProps> = ({
    extracurricularId: _extracurricularId,
    enrollments,
    gradesMap,
    gradeDrafts,
    onUpdateDraft,
    onSaveGrade,
    onAutoFillDescriptions,
    isSavingBulk = false,
    canEdit = true,
    onExportPDF,
    onExportExcel,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [classFilter, setClassFilter] = useState('all');
    const [gradeFilter, setGradeFilter] = useState<'all' | 'graded' | 'ungraded'>('all');

    const enrollmentsSortedByName = useMemo(() => {
        return [...enrollments].sort(compareEnrollmentsByClassAndName);
    }, [enrollments]);

    const uniqueClasses = useMemo(() => {
        const set = new Set<string>();
        enrollments.forEach((e) => {
            if (e.className) set.add(e.className);
        });
        return Array.from(set).sort(compareClassNames);
    }, [enrollments]);

    const formatScoreInput = (score: number | null | undefined) =>
        score == null ? '' : String(score);

    const summaryStats = useMemo(() => {
        let gradedCount = 0;
        let scoreSum = 0;
        let scoreCount = 0;
        let missingDescWithGrade = 0;
        const dist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };

        enrollments.forEach((e) => {
            const key = `${e.participantType}:${e.participantId}`;
            const saved = gradesMap[key];
            const draft = gradeDrafts[key];
            const grade = draft?.grade ?? saved?.grade ?? null;
            const scoreStr = draft?.score ?? formatScoreInput(saved?.score);
            const desc = (draft?.description ?? saved?.description ?? '').trim();

            if (grade || scoreStr.trim() !== '' || desc !== '') {
                gradedCount += 1;
            }
            if (grade && grade in dist) {
                dist[grade] += 1;
                if (!desc) missingDescWithGrade += 1;
            }
            if (scoreStr.trim() !== '') {
                const parsed = Number(scoreStr);
                if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) {
                    scoreSum += parsed;
                    scoreCount += 1;
                }
            }
        });

        return {
            gradedCount,
            ungradedCount: Math.max(0, enrollments.length - gradedCount),
            avgScore: scoreCount > 0 ? (scoreSum / scoreCount).toFixed(1) : '-',
            dist,
            missingDescWithGrade,
        };
    }, [enrollments, gradesMap, gradeDrafts]);

    const filteredEnrollments = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return enrollmentsSortedByName.filter((e) => {
            const key = `${e.participantType}:${e.participantId}`;
            const saved = gradesMap[key];
            const draft = gradeDrafts[key];
            const hasGrade = Boolean(
                (draft?.grade ?? saved?.grade) ||
                    (draft?.score ?? formatScoreInput(saved?.score)).trim() !== '' ||
                    (draft?.description ?? saved?.description ?? '').trim() !== ''
            );

            if (classFilter !== 'all' && (e.className || '') !== classFilter) return false;
            if (gradeFilter === 'graded' && !hasGrade) return false;
            if (gradeFilter === 'ungraded' && hasGrade) return false;
            if (!query) return true;
            return (
                e.name.toLowerCase().includes(query) ||
                (e.className && e.className.toLowerCase().includes(query))
            );
        });
    }, [enrollmentsSortedByName, gradesMap, gradeDrafts, classFilter, gradeFilter, searchTerm]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-amber-500" />
                        Input Nilai & Evaluasi Ekstrakurikuler
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Isi nilai angka (otomatis menentukan predikat) atau pilih predikat langsung beserta deskripsi capaian siswa.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {canEdit && onAutoFillDescriptions && summaryStats.missingDescWithGrade > 0 && (
                        <button
                            type="button"
                            disabled={isSavingBulk}
                            onClick={onAutoFillDescriptions}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50"
                            title="Isi deskripsi otomatis sesuai predikat untuk siswa yang belum memiliki deskripsi"
                        >
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            <span>
                                {isSavingBulk
                                    ? 'Menyimpan...'
                                    : `Isi Deskripsi Otomatis (${summaryStats.missingDescWithGrade})`}
                            </span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onExportPDF}
                        disabled={enrollments.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/50 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                        <FileText className="w-4 h-4" />
                        Export PDF
                    </button>
                    <button
                        type="button"
                        onClick={onExportExcel}
                        disabled={enrollments.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                        <FileSpreadsheet className="w-4 h-4" />
                        Export Excel
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            {enrollments.length > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                            Progres Penilaian
                        </p>
                        <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white mt-1">
                            {summaryStats.gradedCount} / {enrollments.length}{' '}
                            <span className="text-xs font-normal text-slate-500">siswa</span>
                        </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
                            Rata-rata Nilai
                        </p>
                        <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                            {summaryStats.avgScore}
                        </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 col-span-2">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                            Sebaran Predikat
                        </p>
                        <div className="grid grid-cols-4 gap-2 text-center">
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl py-1 px-2 border border-emerald-200/60 dark:border-emerald-800/40">
                                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                    A: {summaryStats.dist.A}
                                </span>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl py-1 px-2 border border-blue-200/60 dark:border-blue-800/40">
                                <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                                    B: {summaryStats.dist.B}
                                </span>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl py-1 px-2 border border-amber-200/60 dark:border-amber-800/40">
                                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                                    C: {summaryStats.dist.C}
                                </span>
                            </div>
                            <div className="bg-rose-50 dark:bg-rose-900/20 rounded-xl py-1 px-2 border border-rose-200/60 dark:border-rose-800/40">
                                <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
                                    D: {summaryStats.dist.D}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Search & Filters */}
            {enrollments.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            aria-label="Cari nama siswa di daftar nilai"
                            placeholder="Cari nama siswa atau kelas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <select
                            aria-label="Filter kelas nilai"
                            value={classFilter}
                            onChange={(e) => setClassFilter(e.target.value)}
                            className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                        >
                            <option value="all">Semua Kelas</option>
                            {uniqueClasses.map((cn) => (
                                <option key={cn} value={cn}>
                                    {cn}
                                </option>
                            ))}
                        </select>
                        <select
                            aria-label="Filter status penilaian"
                            value={gradeFilter}
                            onChange={(e) =>
                                setGradeFilter(e.target.value as 'all' | 'graded' | 'ungraded')
                            }
                            className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                        >
                            <option value="all">Semua Siswa ({enrollments.length})</option>
                            <option value="graded">Sudah Dinilai ({summaryStats.gradedCount})</option>
                            <option value="ungraded">Belum Dinilai ({summaryStats.ungradedCount})</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full block lg:table" aria-label="Tabel Nilai Ekstrakurikuler">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 hidden lg:table-header-group">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[200px] whitespace-nowrap">
                                    Nama Siswa
                                </th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[180px] whitespace-nowrap">
                                    Predikat
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[130px] whitespace-nowrap">
                                    Nilai (0-100)
                                </th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider min-w-[280px] whitespace-nowrap">
                                    Deskripsi / Catatan
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 block lg:table-row-group">
                            {enrollments.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-6 py-16 text-center text-slate-500 dark:text-slate-400"
                                    >
                                        <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-20 text-slate-400" />
                                        Belum ada siswa yang terdaftar di ekstrakurikuler ini.
                                    </td>
                                </tr>
                            ) : filteredEnrollments.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={4}
                                        className="px-6 py-12 text-center text-slate-500 dark:text-slate-400"
                                    >
                                        Tidak ada siswa yang cocok dengan filter pencarian.
                                    </td>
                                </tr>
                            ) : (
                                filteredEnrollments.map((enrollment) => {
                                    const key = `${enrollment.participantType}:${enrollment.participantId}`;
                                    const gradeData = gradesMap[key];
                                    const gradeDraft = gradeDrafts[key];

                                    const currentGrade =
                                        gradeDraft?.grade !== undefined
                                            ? gradeDraft.grade
                                            : gradeData?.grade ?? null;
                                    const currentScore =
                                        gradeDraft?.score !== undefined
                                            ? gradeDraft.score
                                            : formatScoreInput(gradeData?.score);
                                    const currentDescription =
                                        gradeDraft?.description !== undefined
                                            ? gradeDraft.description
                                            : gradeData?.description ?? '';

                                    const isDirty = isGradeDraftDirty(gradeDraft, gradeData);
                                    const isSaved =
                                        !isDirty &&
                                        Boolean(
                                            gradeData?.grade ||
                                                gradeData?.score != null ||
                                                gradeData?.description
                                        );

                                    const parsedScore =
                                        currentScore.trim() !== '' ? Number(currentScore) : null;
                                    const isScoreInvalid =
                                        parsedScore !== null &&
                                        (!Number.isFinite(parsedScore) ||
                                            parsedScore < 0 ||
                                            parsedScore > 100);

                                    return (
                                        <tr
                                            key={key}
                                            className="block lg:table-row p-4 lg:p-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group border-b border-dashed border-slate-200 lg:border-none dark:border-slate-700"
                                        >
                                            <td className="block lg:table-cell lg:px-6 lg:py-4 align-top mb-3 lg:mb-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <div className="font-semibold text-slate-800 dark:text-white">
                                                            {enrollment.name}
                                                        </div>
                                                        <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                                            {enrollment.className || 'Tidak ada kelas'}
                                                        </div>
                                                        {enrollment.participantType ===
                                                            'extracurricular_student' && (
                                                            <span className="inline-block mt-1 px-2 py-0.5 rounded text-xxs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                                                Siswa Ekskul
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Save Status Pill */}
                                                    <div className="mt-0.5">
                                                        {isDirty ? (
                                                            <button
                                                                type="button"
                                                                disabled={isScoreInvalid}
                                                                onClick={() => onSaveGrade(enrollment)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-colors disabled:opacity-50"
                                                            >
                                                                <Save className="w-3 h-3" />
                                                                Simpan
                                                            </button>
                                                        ) : isSaved ? (
                                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                Tersimpan
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="block lg:table-cell lg:px-6 lg:py-4 align-top mb-2 lg:mb-0">
                                                <div className="grid grid-cols-4 lg:flex lg:justify-center gap-1.5 lg:gap-2">
                                                    {GRADE_OPTIONS.map((grade) => {
                                                        const isSelected = currentGrade === grade;
                                                        return (
                                                            <button
                                                                key={grade}
                                                                type="button"
                                                                disabled={!canEdit}
                                                                title={`Predikat ${grade} (${GRADE_LABELS[grade]})`}
                                                                onClick={() => {
                                                                    onUpdateDraft(key, { grade });
                                                                    onSaveGrade(enrollment, { grade });
                                                                }}
                                                                className={`w-full py-2.5 lg:w-9 lg:h-9 lg:py-0 rounded-xl text-sm font-bold transition-all disabled:opacity-60 ${
                                                                    isSelected
                                                                        ? grade === 'A'
                                                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-slate-800'
                                                                            : grade === 'B'
                                                                                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800'
                                                                                : grade === 'C'
                                                                                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-slate-800'
                                                                                    : 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 ring-2 ring-rose-500 ring-offset-2 dark:ring-offset-slate-800'
                                                                        : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600'
                                                                }`}
                                                            >
                                                                {grade}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {currentGrade && (
                                                    <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 mt-1 font-medium">
                                                        {GRADE_LABELS[currentGrade] || ''}
                                                    </p>
                                                )}
                                            </td>

                                            <td className="block lg:table-cell lg:px-6 lg:py-4 align-top mb-2 lg:mb-0">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                    disabled={!canEdit}
                                                    inputMode="decimal"
                                                    aria-label={`Nilai angka untuk ${enrollment.name}`}
                                                    value={currentScore}
                                                    onChange={(e) => {
                                                        const nextScore = e.target.value;
                                                        const trimmed = nextScore.trim();
                                                        if (trimmed !== '') {
                                                            const num = Number(trimmed);
                                                            if (
                                                                Number.isFinite(num) &&
                                                                num >= 0 &&
                                                                num <= 100
                                                            ) {
                                                                const autoPred = getGradeFromScore(num);
                                                                onUpdateDraft(key, {
                                                                    score: nextScore,
                                                                    grade: autoPred,
                                                                });
                                                                return;
                                                            }
                                                        }
                                                        onUpdateDraft(key, { score: nextScore });
                                                    }}
                                                    onBlur={() => {
                                                        if (!isScoreInvalid) {
                                                            onSaveGrade(enrollment);
                                                        }
                                                    }}
                                                    placeholder="0-100"
                                                    className={`w-full px-3 py-2 text-sm rounded-xl border bg-white/80 dark:bg-slate-900/60 text-slate-800 dark:text-white focus:ring-2 transition-all shadow-sm ${
                                                        isScoreInvalid
                                                            ? 'border-rose-500 focus:ring-rose-500'
                                                            : 'border-slate-200 dark:border-slate-600 focus:ring-amber-500 focus:border-transparent'
                                                    }`}
                                                />
                                                {isScoreInvalid && (
                                                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                                                        <AlertCircle className="w-3 h-3 shrink-0" />
                                                        Rentang nilai 0–100
                                                    </p>
                                                )}
                                            </td>

                                            <td className="block lg:table-cell lg:px-6 lg:py-4 align-top">
                                                <textarea
                                                    disabled={!canEdit}
                                                    aria-label={`Deskripsi evaluasi untuk ${enrollment.name}`}
                                                    placeholder="Tulis deskripsi / evaluasi perkembangan kemampuan siswa..."
                                                    value={currentDescription}
                                                    onChange={(e) =>
                                                        onUpdateDraft(key, {
                                                            description: e.target.value,
                                                        })
                                                    }
                                                    onBlur={() => {
                                                        if (!isScoreInvalid) {
                                                            onSaveGrade(enrollment);
                                                        }
                                                    }}
                                                    rows={2}
                                                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white/80 dark:bg-slate-900/60 text-slate-800 dark:text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all shadow-sm resize-y min-h-[58px]"
                                                />
                                                {canEdit && currentGrade && !currentDescription.trim() && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const template =
                                                                DEFAULT_GRADE_DESCRIPTIONS[currentGrade] ||
                                                                '';
                                                            if (template) {
                                                                onUpdateDraft(key, {
                                                                    description: template,
                                                                });
                                                                onSaveGrade(enrollment, {
                                                                    description: template,
                                                                });
                                                            }
                                                        }}
                                                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                                                    >
                                                        <Sparkles className="w-3 h-3" />
                                                        Gunakan template deskripsi Predikat {currentGrade}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
