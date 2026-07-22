import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';
import { calculateFormulaScore, analyzeAndAdjustGradesWithAI, AIStudentAdjustment } from '../../services/gradeAdjustmentService';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { exportGradesWithTemplate } from '../../utils/gradeExporter';
import { 
    SparklesIcon, 
    PrinterIcon, 
    FileSpreadsheetIcon, 
    SaveIcon, 
    PlayCircleIcon, 
    RefreshCwIcon
} from '../Icons';

interface UnifiedGradeAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: Array<{ id: string; name: string }>;
    scores: Record<string, string>; // original inputted scores from page
    onApply: (finalScores: Record<string, string>) => void;
    kkm?: number;
    subject: string;
    assessmentName: string;
    className: string;
    semesterLabel?: string;
}

export const UnifiedGradeAdjustmentModal: React.FC<UnifiedGradeAdjustmentModalProps> = ({
    isOpen,
    onClose,
    students,
    scores,
    onApply,
    kkm = 75,
    subject,
    assessmentName,
    className,
    semesterLabel = 'Semester Ganjil'
}) => {
    const toast = useToast();
    const { user } = useAuth();

    const targetAvgRange = useMemo(() => {
        if (!className) return { min: 81, max: 98 };
        const match = className.match(/([1-6])/);
        if (match) {
            const level = parseInt(match[1]);
            if (level >= 4 && level <= 6) return { min: 84, max: 98 };
        }
        return { min: 81, max: 98 };
    }, [className]);

    // Excel formula configuration: Score * weight + constant
    const [weight, setWeight] = useState<number>(0.6);
    const [constant, setConstant] = useState<number>(40);

    // AI Adjustment state
    const [aiAdjustments, setAiAdjustments] = useState<AIStudentAdjustment[]>([]);
    const [classAnalysis, setClassAnalysis] = useState<string>('');
    const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

    // Selected scenario for mass apply: 'original' | 'formula' | 'ai'
    const [activeScenario, setActiveScenario] = useState<'original' | 'formula' | 'ai'>('original');

    // Final scores to save (local state in modal, manually editable)
    const [finalScores, setFinalScores] = useState<Record<string, string>>({});

    // Keep track of which students have manual overrides
    const [manualOverrides, setManualOverrides] = useState<Set<string>>(new Set());

    // Generate list of student adjustments with calculated values
    const listData = useMemo(() => {
        return students.map((s, index) => {
            const original = scores[s.id] !== undefined && scores[s.id] !== '' ? Number(scores[s.id]) : 0;
            const formula = calculateFormulaScore(original, weight, constant, targetAvgRange.min, targetAvgRange.max);
            const aiData = aiAdjustments.find(a => a.student_id === s.id);
            const aiVal = aiData ? aiData.ai_score : formula;
            const aiRationale = aiData ? aiData.rationale : '';

            return {
                id: s.id,
                name: s.name,
                original,
                formula,
                ai: aiVal,
                aiRationale,
                index: index + 1
            };
        });
    }, [students, scores, weight, constant, aiAdjustments, targetAvgRange]);

    // Initialize final scores when modal opens or scenario/formula changes
    useEffect(() => {
        if (!isOpen) return;

        setFinalScores(prev => {
            const next: Record<string, string> = {};
            listData.forEach(item => {
                // If student already has a manual override, preserve it
                if (manualOverrides.has(item.id)) {
                    next[item.id] = prev[item.id] || String(item.original);
                    return;
                }

                if (activeScenario === 'original') {
                    const originalStr = scores[item.id] !== undefined ? String(scores[item.id]) : '';
                    next[item.id] = originalStr;
                } else if (activeScenario === 'formula') {
                    next[item.id] = String(item.formula);
                } else if (activeScenario === 'ai') {
                    next[item.id] = String(item.ai);
                }
            });
            return next;
        });
    }, [isOpen, activeScenario, listData, scores, manualOverrides]);

    // Reset settings when modal closes
    useEffect(() => {
        if (!isOpen) {
            setAiAdjustments([]);
            setClassAnalysis('');
            setActiveScenario('original');
            setManualOverrides(new Set());
            setFinalScores({});
        }
    }, [isOpen]);

    // Calculate class averages for the preview header
    const stats = useMemo(() => {
        const values = Object.values(finalScores)
            .map(Number)
            .filter(n => !isNaN(n));
        
        if (values.length === 0) return { avg: 0, passingCount: 0, passingPct: 0 };
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = Math.round(sum / values.length);
        const passingCount = values.filter(v => v >= kkm).length;
        const passingPct = Math.round((passingCount / values.length) * 100);

        return {
            avg,
            passingCount,
            passingPct
        };
    }, [finalScores, kkm]);

    // Trigger AI Audit via OpenRouter
    const handleRunAiAudit = async () => {
        setIsAiLoading(true);
        toast.info('Menghubungi AI untuk menganalisis sebaran nilai...');
        
        try {
            const studentPayload = listData.map(d => ({
                id: d.id,
                name: d.name,
                score: d.original
            }));

            const result = await analyzeAndAdjustGradesWithAI(
                studentPayload,
                subject,
                assessmentName,
                kkm,
                weight,
                constant,
                targetAvgRange
            );

            setAiAdjustments(result.adjustments);
            setClassAnalysis(result.class_analysis);
            setActiveScenario('ai'); // Auto switch to AI scenario
            toast.success('Analisis AI berhasil diterapkan!');
        } catch (error: any) {
            toast.error(`Gagal melakukan audit AI: ${error.message}`);
        } finally {
            setIsAiLoading(false);
        }
    };

    // Apply manual override to a specific student
    const handleManualScoreChange = (studentId: string, value: string) => {
        const parsed = parseInt(value) || 0;
        const clamped = Math.max(0, Math.min(parsed, 100));
        const val = value === '' ? '' : String(clamped);
        setFinalScores(prev => ({ ...prev, [studentId]: val }));
        
        const nextOverrides = new Set(manualOverrides);
        nextOverrides.add(studentId);
        setManualOverrides(nextOverrides);
    };

    // Clear overrides and reset to scenario
    const handleResetOverrides = () => {
        setManualOverrides(new Set());
        toast.info('Penyesuaian manual direset.');
    };

    // Print functionality: triggers browser print with styles
    const handlePrint = () => {
        window.print();
    };

    // Export preview grades to Excel
    const handleExportExcel = async () => {
        try {
            await exportGradesWithTemplate(
                listData,
                finalScores,
                subject,
                assessmentName,
                [assessmentName],
                className,
                activeScenario
            );
            toast.success('Daftar nilai berhasil diexport ke Excel menggunakan template sekolah!');
        } catch (error: any) {
            console.error(error);
            toast.error(`Gagal mengekspor data: ${error.message || error}`);
        }
    };

    // Save final scores and close modal
    const handleSave = () => {
        onApply(finalScores);
        toast.success('Nilai katrol berhasil diterapkan ke lembar nilai utama!');
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Katrol Nilai & Pratinjau Cetak Lembar Nilai"
            maxWidth="max-w-[98vw]"
        >
            <div className="flex flex-col lg:flex-row gap-6 h-[80vh] overflow-hidden">
                {/* LEFT COLUMN: Controls & Configurations */}
                <div className="w-full lg:w-1/3 flex flex-col gap-4 overflow-y-auto pr-2 pb-4 custom-scrollbar h-full">
                    {/* Excel Formula Config Card */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                            <span className="w-2 h-4 rounded-sm bg-indigo-500"></span>
                            Bobot Rumus Katrol
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                            Formula: <code>(NilaiAsli * Bobot) + Konstanta</code>
                        </p>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                    Persentase Bobot (Decimal)
                                </label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        step="0.05"
                                        min="0"
                                        max="1"
                                        value={weight}
                                        onChange={(e) => setWeight(Math.max(0, Math.min(1, parseFloat(e.target.value) || 0.6)))}
                                        className="h-9 py-1 text-sm text-center font-semibold"
                                    />
                                    <span className="text-xs text-slate-500 font-medium">({Math.round(weight * 100)}%)</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                    Konstanta Tambahan
                                </label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={constant}
                                    onChange={(e) => setConstant(Math.max(0, Math.min(100, parseFloat(e.target.value) || 40)))}
                                    className="h-9 py-1 text-sm text-center font-semibold"
                                />
                            </div>
                        </div>
                    </div>

                    {/* AI Audit Activation */}
                    <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-200/50 dark:border-indigo-900/30 rounded-2xl">
                        <h3 className="text-sm font-bold text-indigo-950 dark:text-indigo-300 mb-2 flex items-center gap-1.5">
                            <SparklesIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            Audit AI Cerdas (81-98)
                        </h3>
                        <p className="text-xs text-indigo-900/70 dark:text-indigo-400/70 mb-4 leading-relaxed">
                            AI akan mendeteksi bias kompresi nilai, melindungi siswa berprestasi tinggi agar tetap adil.
                        </p>
                        
                        <Button
                            onClick={handleRunAiAudit}
                            disabled={isAiLoading || listData.length === 0}
                            className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20"
                        >
                            {isAiLoading ? (
                                <>
                                    <RefreshCwIcon className="w-4 h-4 animate-spin" />
                                    Menganalisis...
                                </>
                            ) : (
                                <>
                                    <PlayCircleIcon className="w-4 h-4" />
                                    Jalankan Audit AI
                                </>
                            )}
                        </Button>

                        {/* AI Summary feedback if loaded */}
                        {classAnalysis && (
                            <div className="mt-4 p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-950 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 max-h-36 overflow-y-auto">
                                <strong className="text-indigo-600 dark:text-indigo-400">Analisis Kelas AI:</strong>
                                <p className="mt-1">{classAnalysis}</p>
                            </div>
                        )}
                    </div>

                    {/* Scenario Selector */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
                            <span className="w-2 h-4 rounded-sm bg-emerald-500"></span>
                            Pilih Skenario Nilai
                        </h3>
                        <div className="flex flex-col gap-2">
                            <button type="button"
                                onClick={() => setActiveScenario('original')}
                                className={`text-left px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                                    activeScenario === 'original'
                                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                }`}
                            >
                                Skenario A: Nilai Asli
                            </button>
                            <button type="button"
                                onClick={() => setActiveScenario('formula')}
                                className={`text-left px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                                    activeScenario === 'formula'
                                        ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white'
                                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                                }`}
                            >
                                Skenario B: Rumus Excel Default
                            </button>
                            <button type="button"
                                onClick={() => setActiveScenario('ai')}
                                disabled={aiAdjustments.length === 0}
                                className={`text-left px-3 py-2 text-xs font-semibold rounded-lg border transition-all flex items-center justify-between ${
                                    activeScenario === 'ai'
                                        ? 'bg-indigo-900 text-white border-indigo-900 dark:bg-indigo-400 dark:text-slate-950 dark:border-indigo-400'
                                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 disabled:opacity-40'
                                }`}
                            >
                                <span>Skenario C: Rekomendasi AI</span>
                                <SparklesIcon className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {manualOverrides.size > 0 && (
                            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <span className="text-xxs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                    {manualOverrides.size} Edit Manual
                                </span>
                                <button type="button"
                                    onClick={handleResetOverrides}
                                    className="text-xxs font-bold text-slate-400 hover:text-red-500 transition-colors"
                                >
                                    Reset Manual
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Action Cards */}
                    <div className="flex flex-col gap-2 mt-auto">
                        <Button
                            onClick={handlePrint}
                            variant="outline"
                            className="w-full flex items-center justify-center gap-1.5 font-bold h-11 border-slate-200 dark:border-slate-700"
                        >
                            <PrinterIcon className="w-4 h-4" />
                            Cetak Laporan
                        </Button>
                        <Button
                            onClick={handleExportExcel}
                            variant="outline"
                            className="w-full flex items-center justify-center gap-1.5 font-bold h-11 text-emerald-600 border-emerald-200 dark:border-emerald-950 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                        >
                            <FileSpreadsheetIcon className="w-4 h-4" />
                            Export Excel
                        </Button>
                        <Button
                            onClick={handleSave}
                            className="w-full flex items-center justify-center gap-1.5 font-bold h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-lg shadow-green-500/20"
                        >
                            <SaveIcon className="w-4 h-4" />
                            Terapkan & Simpan Nilai
                        </Button>
                    </div>
                </div>

                {/* RIGHT COLUMN: Print Preview Paper document */}
                <div className="w-full lg:w-2/3 bg-slate-200/50 dark:bg-slate-900/50 p-3 sm:p-5 rounded-3xl flex flex-col items-center overflow-y-auto overflow-x-auto custom-scrollbar h-full">
                    {/* Paper Document Container (Target for print) */}
                    <div className="print-area w-full bg-white text-slate-900 p-5 sm:p-8 rounded-lg shadow-xl border border-slate-300/40 relative min-h-[70vh] flex flex-col justify-between font-sans overflow-x-auto">
                        
                        {/* Printable CSS style wrapper */}
                        <style>{`
                            @media print {
                                body * {
                                    visibility: hidden;
                                }
                                .print-area, .print-area * {
                                    visibility: visible;
                                }
                                .print-area {
                                    position: absolute;
                                    left: 0;
                                    top: 0;
                                    width: 100% !important;
                                    padding: 0 !important;
                                    margin: 0 !important;
                                    border: none !important;
                                    box-shadow: none !important;
                                    background: white !important;
                                }
                                .no-print {
                                    display: none !important;
                                }
                            }
                        `}</style>

                        <div>
                            {/* Kop Surat Sekolah */}
                            <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900 mb-6">
                                <div className="w-16">
                                    <img src="/logo_sekolah.png" alt="Logo Sekolah" className="w-full h-auto object-contain" />
                                </div>
                                <div className="flex-1 flex flex-col items-center justify-center text-center">
                                    <h1 className="text-xl font-bold uppercase tracking-wider leading-snug">
                                        {user?.school_name || 'MI AL IRSYAD KOTA MADIUN'}
                                    </h1>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Kementerian Agama Republik Indonesia – Kantor Kota Madiun
                                    </p>
                                    <h2 className="text-sm font-extrabold uppercase mt-4 tracking-widest text-slate-800 bg-slate-100 px-3 py-1 rounded">
                                        LEMBAR NILAI HASIL KATROL & PRATINJAU EVALUASI
                                    </h2>
                                </div>
                                <div className="w-16">
                                    <img src="/logo_kemenag.png" alt="Logo Kemenag" className="w-full h-auto object-contain" />
                                </div>
                            </div>

                            {/* Meta Info Grid */}
                            <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-xs text-slate-700 mb-6 pb-4 border-b border-slate-200">
                                <div className="flex justify-between border-b border-slate-100 py-1">
                                    <span className="font-semibold">Mata Pelajaran:</span>
                                    <span className="font-bold text-slate-900">{subject}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-100 py-1">
                                    <span className="font-semibold">Kelas:</span>
                                    <span className="font-bold text-slate-900">{className}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-100 py-1">
                                    <span className="font-semibold">Jenis Evaluasi:</span>
                                    <span className="font-bold text-slate-900">{assessmentName}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-100 py-1">
                                    <span className="font-semibold">Semester:</span>
                                    <span className="font-bold text-slate-900">{semesterLabel}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-100 py-1">
                                    <span className="font-semibold">KKM:</span>
                                    <span className="font-bold text-slate-900">{kkm}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-100 py-1">
                                    <span className="font-semibold">Rerata Kelas (Akhir):</span>
                                    <span className="font-bold text-slate-900">{stats.avg}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-100 py-1">
                                    <span className="font-semibold">Kelulusan Kelas:</span>
                                    <span className="font-bold text-slate-900">{stats.passingPct}% ({stats.passingCount} Siswa Tuntas)</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-100 py-1">
                                    <span className="font-semibold">Skenario Terpilih:</span>
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400 capitalize">{activeScenario}</span>
                                </div>
                            </div>

                            {/* Core Grading Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left border-collapse border border-slate-300">
                                    <thead>
                                        <tr className="bg-slate-100 text-slate-800 uppercase text-xxs tracking-wider border-b border-slate-300">
                                            <th className="border border-slate-300 p-2 text-center w-8">No</th>
                                            <th className="border border-slate-300 p-2">Nama Siswa</th>
                                            <th className="border border-slate-300 p-2 text-center w-20">Nilai Asli</th>
                                            <th className="border border-slate-300 p-2 text-center w-20">Rumus ({Math.round(weight * 100)}%+{constant})</th>
                                            <th className="border border-slate-300 p-2 text-center w-20">Rekomendasi AI</th>
                                            <th className="border border-slate-300 p-2 text-center w-24">Nilai Akhir</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {listData.map((item) => {
                                            const scoreValue = finalScores[item.id] !== undefined ? finalScores[item.id] : '';
                                            const numericScore = scoreValue !== '' ? Number(scoreValue) : 0;
                                            const isFailed = scoreValue !== '' && numericScore < kkm;
                                            const isAiAdjusted = aiAdjustments.length > 0 && item.ai !== item.formula;

                                            return (
                                                <tr key={item.id} className="hover:bg-slate-50 border-b border-slate-200">
                                                    <td className="border border-slate-300 p-2 text-center font-medium text-slate-500">{item.index}</td>
                                                    <td className="border border-slate-300 p-2 font-bold text-slate-800">
                                                        <div className="flex flex-col">
                                                            <span>{item.name}</span>
                                                            {isAiAdjusted && activeScenario === 'ai' && item.aiRationale && (
                                                                <span className="no-print text-xxs text-indigo-500 font-medium italic mt-0.5">
                                                                    ✨ {item.aiRationale}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="border border-slate-300 p-2 text-center text-slate-500 font-semibold">{item.original}</td>
                                                    <td className="border border-slate-300 p-2 text-center text-slate-500 font-semibold">{item.formula}</td>
                                                    <td className="border border-slate-300 p-2 text-center text-slate-500 font-semibold flex-row justify-center items-center gap-1">
                                                        <span>{item.ai}</span>
                                                        {isAiAdjusted && <span className="no-print text-indigo-500">✨</span>}
                                                    </td>
                                                    <td className="border border-slate-300 p-1 text-center font-bold">
                                                        {/* Editable score in screen view, static score in print view */}
                                                        <div className="relative flex items-center justify-center">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={targetAvgRange.max}
                                                                value={scoreValue}
                                                                onChange={(e) => handleManualScoreChange(item.id, e.target.value)}
                                                                className={`no-print w-16 text-center text-xs font-bold border rounded p-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                                                                    isFailed 
                                                                        ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400' 
                                                                        : manualOverrides.has(item.id)
                                                                            ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400'
                                                                            : 'border-slate-200 text-slate-900 bg-white dark:border-slate-700 dark:text-white dark:bg-slate-800'
                                                                }`}
                                                            />
                                                            <span className="hidden print:inline-block font-extrabold text-sm">
                                                                {scoreValue || '-'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Signatures section at bottom of paper */}
                        <div className="mt-12 flex justify-between items-end text-xs text-slate-700">
                            <div>
                                <p className="mb-12">Mengetahui,<br />Kepala Madrasah</p>
                                <p className="font-bold border-t border-slate-500 pt-1 w-44">( ______________________ )</p>
                            </div>
                            <div className="text-right">
                                <p className="mb-12">Madiun, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />Guru Kelas / Mapel</p>
                                <p className="font-bold border-t border-slate-500 pt-1 w-44 ml-auto">( {user?.name || 'Nama Guru'} )</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};
