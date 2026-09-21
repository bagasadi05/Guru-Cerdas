import React from 'react';
import { Modal } from '../../../ui/Modal';
import { Button } from '../../../ui/Button';
import { StudentRow } from '../types';
import { useVoiceGradeEngine } from '../engine/useVoiceGradeEngine';
import {
    Mic,
    MicOff,
    Volume2,
    VolumeX,
    SkipForward,
    SkipBack,
    Trash2,
    CheckCircle2,
    Sparkles,
    Check,
    AlertCircle,
    RotateCcw,
    Zap,
    ShieldCheck,
} from 'lucide-react';

export interface VoiceGradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: StudentRow[];
    scores: Record<string, string>;
    onScoreChange: (studentId: string, value: string) => void;
    kkm: number;
    subjectName?: string;
    assessmentName?: string;
}

export const VoiceGradeModal: React.FC<VoiceGradeModalProps> = ({
    isOpen,
    onClose,
    students,
    scores,
    onScoreChange,
    kkm,
    subjectName,
    assessmentName,
}) => {
    const effectiveKkm = kkm && kkm > 0 ? kkm : 75;

    const engine = useVoiceGradeEngine({
        isOpen,
        students,
        scores,
        onScoreChange,
        kkm: effectiveKkm,
    });

    if (!isOpen) return null;

    const handleClose = () => {
        engine.stopListening();
        onClose();
    };

    const activeStudent = engine.activeStudent;
    const activeScore = activeStudent ? (scores[activeStudent.id] ?? '') : '';

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={`🎙️ Dikte Suara Nilai ${subjectName ? `— ${subjectName}` : ''} ${assessmentName ? `(${assessmentName})` : ''}`}
            maxWidth="max-w-4xl"
        >
            <div className="space-y-4 pt-1">
                {/* Warning if Brave Browser detected */}
                {engine.isBrave && (
                    <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 flex items-start gap-2.5 sm:gap-3 text-xs sm:text-sm">
                        <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-amber-600 mt-0.5" />
                        <div>
                            <p className="font-bold">Browser Brave Terdeteksi</p>
                            <p className="mt-0.5 text-[11px] sm:text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                                Browser Brave memblokir layanan Speech Recognition bawaan demi privasi. Silakan buka aplikasi ini di <strong>Google Chrome</strong> atau <strong>Microsoft Edge</strong>.
                            </p>
                        </div>
                    </div>
                )}

                {/* Warning if browser does not support Web Speech API */}
                {!engine.isSupported && (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 flex items-start gap-3 text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                        <div>
                            <p className="font-bold">Browser tidak mendukung Web Speech API</p>
                            <p className="mt-1 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                                Fitur dikte suara memerlukan browser berbasis Chromium atau WebKit. Disarankan menggunakan <strong>Google Chrome</strong> atau <strong>Microsoft Edge</strong>.
                            </p>
                        </div>
                    </div>
                )}

                {/* Error Banner if mic denied or other error with Android Chrome helper */}
                {engine.errorMessage && (
                    <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 text-xs sm:text-sm animate-in fade-in">
                        <div className="flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-rose-900 dark:text-rose-100">{engine.errorMessage}</p>
                                {engine.errorMessage.toLowerCase().includes('ditolak') && (
                                    <div className="mt-2 text-xs text-rose-700 dark:text-rose-300 space-y-1 bg-white/60 dark:bg-black/20 p-2 sm:p-2.5 rounded-lg border border-rose-200/60 dark:border-rose-800/40">
                                        <p className="font-semibold text-rose-900 dark:text-rose-200">Cara mengizinkan di Chrome Android:</p>
                                        <ol className="list-decimal list-inside space-y-0.5 text-[11px] sm:text-xs">
                                            <li>Ketuk ikon setelan / gembok 🔒 di sebelah kiri address bar URL Chrome.</li>
                                            <li>Pilih <strong>Izin situs</strong> &gt; aktifkan <strong>Mikrofon</strong>.</li>
                                            <li>Bila masih diblokir, buka Pengaturan HP &gt; Aplikasi &gt; Chrome &gt; Izin &gt; aktifkan Mikrofon.</li>
                                        </ol>
                                    </div>
                                )}
                                <div className="mt-2 flex items-center gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={engine.startListening}
                                        className="h-7 sm:h-8 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg sm:rounded-xl flex items-center gap-1.5 shadow-sm px-2.5 sm:px-3"
                                    >
                                        <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Coba Lagi / Minta Izin
                                    </Button>
                                    <button
                                        type="button"
                                        onClick={() => engine.showFeedback('', 'command')}
                                        className="text-xs text-rose-600 hover:text-rose-800 dark:text-rose-300 font-medium px-2 py-1"
                                    >
                                        Tutup
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Mode Tabs & Sound Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5 sm:pb-3">
                    <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl sm:rounded-2xl w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => {
                                engine.stopListening();
                                engine.setActiveTab('sequential');
                            }}
                            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all text-center cursor-pointer ${
                                engine.activeTab === 'sequential'
                                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm font-bold'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="hidden sm:inline">Mode Berurutan (Hands-Free)</span>
                            <span className="sm:hidden">Berurutan</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                engine.stopListening();
                                engine.setActiveTab('name_match');
                            }}
                            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all text-center cursor-pointer ${
                                engine.activeTab === 'name_match'
                                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm font-bold'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                            <span className="hidden sm:inline">Mode Bebas (Absen / Nama + Nilai)</span>
                            <span className="sm:hidden">Mode Bebas</span>
                        </button>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                        {/* Safety Mode Toggle */}
                        {engine.activeTab === 'sequential' && (
                            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl text-xs border border-slate-200/80 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => engine.setSafetyMode('accurate')}
                                    className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg font-medium transition-all text-[11px] sm:text-xs cursor-pointer ${
                                        engine.safetyMode === 'accurate'
                                            ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-xs font-bold'
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                    title="Hanya simpan setelah selesai bicara (Mencegah salah dengar angka parsial)"
                                >
                                    <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                                    <span>Akurat</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => engine.setSafetyMode('fast')}
                                    className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg font-medium transition-all text-[11px] sm:text-xs cursor-pointer ${
                                        engine.safetyMode === 'fast'
                                            ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-xs font-bold'
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                    title="Langsung simpan saat jeda hening singkat"
                                >
                                    <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                                    <span>Cepat</span>
                                </button>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => engine.setSoundEnabled(!engine.soundEnabled)}
                            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[11px] sm:text-xs font-semibold border transition-all ${
                                engine.soundEnabled
                                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                            }`}
                            title={engine.soundEnabled ? 'Suara umpan balik aktif' : 'Suara dimatikan'}
                        >
                            {engine.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                            <span>{engine.soundEnabled ? 'Suara Aktif' : 'Mute'}</span>
                        </button>
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* TAB 1: MODE BERURUTAN (HANDS-FREE) */}
                {/* ========================================================================= */}
                {engine.activeTab === 'sequential' && (
                    <div className="space-y-4">
                        {/* Overwrite Undo Notification Banner */}
                        {engine.lastOverwrittenRecord && (
                            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-700/80 text-amber-900 dark:text-amber-100 flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1">
                                <div className="flex items-center gap-2">
                                    <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <span>
                                        Nilai <strong>{engine.lastOverwrittenRecord.studentName}</strong> (Absen #{engine.lastOverwrittenRecord.index + 1}) ditimpa dari <span className="line-through font-semibold text-amber-700 dark:text-amber-300">{engine.lastOverwrittenRecord.oldScore}</span> menjadi <strong>{engine.lastOverwrittenRecord.newScore}</strong>.
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={engine.undoLastOverwrite}
                                        className="px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1"
                                    >
                                        <RotateCcw className="w-3 h-3" /> Urungkan
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Active Student Card */}
                        {activeStudent ? (
                            <div className="p-3.5 sm:p-5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-brand-50/70 via-white to-brand-50/30 dark:from-slate-800 dark:via-slate-900 dark:to-brand-950/30 border border-brand-200/80 dark:border-brand-900/40 shadow-lg shadow-brand-600/5 relative overflow-hidden">
                                <div className="flex items-center justify-between gap-2.5 sm:gap-4">
                                    <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                                        <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-brand-600 text-white font-bold text-base sm:text-xl flex items-center justify-center shadow-md shadow-brand-600/20 shrink-0">
                                            {engine.currentIndex + 1}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-[10px] sm:text-xs font-bold text-brand-600 dark:text-brand-300 uppercase tracking-wider">
                                                    Siswa {engine.currentIndex + 1} dari {students.length}
                                                </span>
                                                {engine.recentlySavedId === activeStudent.id ? (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 px-1.5 py-0.5 rounded-md animate-pulse">
                                                        <Check className="w-3 h-3" /> Tersimpan
                                                    </span>
                                                ) : null}
                                            </div>
                                            <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-white truncate">
                                                {activeStudent.name}
                                            </h3>
                                            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                <span>Absen #{engine.currentIndex + 1}</span>
                                                <span>•</span>
                                                <span>{activeStudent.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Big Score Box */}
                                    <div className="flex flex-col items-end shrink-0">
                                        <span className="text-[10px] sm:text-xs font-semibold text-slate-400 mb-0.5">Nilai</span>
                                        <div
                                            className={`min-w-14 sm:min-w-20 px-2 sm:px-3 py-1 sm:py-2 text-center rounded-xl sm:rounded-2xl border-2 font-black text-xl sm:text-3xl transition-all shadow-xs ${
                                                activeScore !== ''
                                                    ? Number(activeScore) >= effectiveKkm
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-600'
                                                        : 'bg-rose-50 text-rose-700 border-rose-400 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-600'
                                                    : 'bg-slate-50 text-slate-300 border-slate-200 dark:bg-slate-800 dark:text-slate-600 dark:border-slate-700'
                                            }`}
                                        >
                                            {activeScore !== '' ? activeScore : '—'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-400 text-sm">Tidak ada siswa yang terdaftar.</div>
                        )}

                        {/* Listening & Transcript Feedback Area */}
                        <div
                            className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all ${
                                engine.isListening
                                    ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/60 shadow-xs'
                                    : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                            }`}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                        className={`w-3 h-3 rounded-full shrink-0 ${
                                            engine.isListening ? 'bg-rose-500 animate-ping' : 'bg-slate-300 dark:bg-slate-600'
                                        }`}
                                    />
                                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                                        {engine.isListening ? 'Mendengarkan ucapan guru...' : 'Mikrofon dijeda'}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={engine.toggleListening}
                                    title={engine.isListening ? 'Jeda Mendengar (Spasi)' : 'Mulai Mendengar (Spasi)'}
                                    className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg sm:rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                                        engine.isListening
                                            ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                                            : 'bg-brand-600 hover:bg-brand-700 text-white'
                                    }`}
                                >
                                    {engine.isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                                    <span>{engine.isListening ? 'Jeda Dikte' : 'Mulai Dikte'}</span>
                                </button>
                            </div>

                            {/* Transcript live badge */}
                            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 min-h-6 flex items-center">
                                {engine.interimText ? (
                                    <span className="text-brand-600 dark:text-brand-400 font-medium italic">
                                        "{engine.interimText}"
                                    </span>
                                ) : engine.feedbackMessage ? (
                                    <span
                                        className={`font-semibold ${
                                            engine.feedbackMessage.variant === 'success'
                                                ? 'text-emerald-600 dark:text-emerald-400'
                                                : engine.feedbackMessage.variant === 'error'
                                                ? 'text-rose-600 dark:text-rose-400'
                                                : 'text-brand-600 dark:text-brand-400'
                                        }`}
                                    >
                                        {engine.feedbackMessage.text}
                                    </span>
                                ) : (
                                    <span className="text-slate-400 text-[11px] sm:text-xs">
                                        Sebutkan angka nilai (misal: "85", "sembilan puluh", "ralat 80", "lanjut", "kembali").
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Navigation and Actions Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 p-2 sm:p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-1 sm:gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={engine.navigatePrev}
                                    disabled={engine.currentIndex === 0}
                                    className="h-8 sm:h-9 text-xs font-semibold px-2.5 sm:px-3 rounded-lg sm:rounded-xl"
                                    title="Siswa Sebelumnya (Panah Kiri)"
                                >
                                    <SkipBack className="w-3.5 h-3.5 mr-1" /> Prev
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={engine.navigateNext}
                                    disabled={engine.currentIndex >= students.length - 1}
                                    className="h-8 sm:h-9 text-xs font-semibold px-2.5 sm:px-3 rounded-lg sm:rounded-xl"
                                    title="Siswa Berikutnya (Panah Kanan)"
                                >
                                    Next <SkipForward className="w-3.5 h-3.5 ml-1" />
                                </Button>
                            </div>

                            <div className="flex items-center gap-1 sm:gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={engine.clearCurrentScore}
                                    className="h-8 sm:h-9 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 px-2.5 sm:px-3 rounded-lg sm:rounded-xl font-medium"
                                    title="Kosongkan nilai siswa saat ini"
                                >
                                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus Nilai
                                </Button>

                                <Button
                                    type="button"
                                    variant="primary"
                                    size="sm"
                                    onClick={handleClose}
                                    className="h-8 sm:h-9 text-xs px-3 sm:px-4 rounded-lg sm:rounded-xl font-bold bg-brand-600 hover:bg-brand-700 text-white"
                                >
                                    Selesai
                                </Button>
                            </div>
                        </div>

                        {/* Recent History Chips */}
                        {engine.recentHistory.length > 0 && (
                            <div className="space-y-1.5">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    Riwayat Terakhir Dikte:
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    {engine.recentHistory.map((item) => (
                                        <div
                                            key={item.id}
                                            onClick={() => engine.setCurrentIndex(item.index - 1)}
                                            className="cursor-pointer text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-2xs hover:border-brand-300 transition-all"
                                        >
                                            <span className="font-bold text-slate-400">#{item.index}</span>
                                            <span className="font-medium text-slate-700 dark:text-slate-200 max-w-[120px] truncate">
                                                {item.name}
                                            </span>
                                            <span className="font-black text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-1 rounded">
                                                {item.score}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ========================================================================= */}
                {/* TAB 2: MODE BEBAS (NAMA / ABSEN + NILAI) */}
                {/* ========================================================================= */}
                {engine.activeTab === 'name_match' && (
                    <div className="space-y-4">
                        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-brand-50/60 dark:bg-slate-800/60 border border-brand-200/60 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={engine.isListening ? engine.stopListening : engine.startListening}
                                        disabled={!engine.isSupported}
                                        className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs font-bold transition-all ${
                                            engine.isListening
                                                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                                                : 'bg-brand-600 hover:bg-brand-700 text-white'
                                        }`}
                                    >
                                        {engine.isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                        <span>{engine.isListening ? 'Hentikan Rekam' : 'Mulai Rekam Suara'}</span>
                                    </button>
                                    <span className="text-[11px] sm:text-xs text-slate-500 hidden xs:inline truncate">
                                        {engine.isListening ? 'Mendengarkan ucapan...' : 'Klik untuk mulai'}
                                    </span>
                                </div>
                                {engine.transcript && (
                                    <button
                                        type="button"
                                        onClick={engine.clearPairs}
                                        className="text-xs text-slate-500 hover:text-rose-600 font-semibold"
                                    >
                                        Bersihkan
                                    </button>
                                )}
                            </div>

                            <textarea
                                value={engine.transcript + (engine.interimText ? ` [mendengar: ${engine.interimText}]` : '')}
                                onChange={(e) => engine.setFreeformTranscript(e.target.value)}
                                rows={2}
                                placeholder="Katakan: 'absen 1 85, absen 2 sembilan puluh, absen 3 75' ATAU 'Ahmad Fauzi 85, Siti Rahma 90'..."
                                className="w-full text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 sm:p-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>

                        {/* Batch Applied Undo Notification Banner */}
                        {engine.lastBatchAppliedRecords && engine.lastBatchAppliedRecords.length > 0 && (
                            <div className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 text-xs animate-in fade-in slide-in-from-top-1">
                                <div className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>
                                        <strong>{engine.lastBatchAppliedRecords.length} nilai</strong> telah diterapkan ke tabel.
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                    <button
                                        type="button"
                                        onClick={engine.undoBatchApply}
                                        aria-label="Urungkan Penerapan"
                                        className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1"
                                    >
                                        <RotateCcw className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Urungkan Penerapan
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Matched Results Preview Table */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-500" />
                                    Hasil Deteksi ({engine.recognizedPairs.length})
                                </h4>
                                {engine.recognizedPairs.length > 0 && (
                                    <Button
                                        type="button"
                                        variant="primary"
                                        size="sm"
                                        onClick={engine.applyFreeformPairs}
                                        className="rounded-lg sm:rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 px-2.5 sm:px-3"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Terapkan ke Tabel ({engine.recognizedPairs.length})
                                    </Button>
                                )}
                            </div>

                            {engine.recognizedPairs.length > 0 ? (
                                <div className="max-h-56 sm:max-h-60 overflow-y-auto rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                                    {engine.recognizedPairs.map((pair, idx) => {
                                        const currentVal = pair.studentId ? scores[pair.studentId] : undefined;
                                        const willOverwrite = Boolean(currentVal && currentVal.trim() !== '' && currentVal !== String(pair.score));

                                        return (
                                            <div
                                                key={`${pair.studentId || 'unknown'}-${idx}`}
                                                className="p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-900 text-sm hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                                            >
                                                <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0">
                                                    <span className="w-6 sm:w-7 text-center text-xs font-bold text-slate-400 mt-0.5 sm:mt-0 shrink-0">
                                                        #{pair.rollNumber ?? (pair.studentIndex !== undefined ? pair.studentIndex + 1 : idx + 1)}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                            <p className="font-bold text-slate-900 dark:text-white truncate">{pair.studentName}</p>
                                                            {pair.matchType === 'roll_number' ? (
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                                                                    Absen #{pair.rollNumber}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                                    Cocok ({pair.confidence}%)
                                                                </span>
                                                            )}
                                                            {willOverwrite && (
                                                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                                                    Menimpa: {currentVal}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-slate-400 truncate">Dari: "{pair.rawText}"</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center self-end sm:self-auto gap-2 shrink-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs text-slate-400 font-semibold hidden sm:inline">Nilai:</span>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={100}
                                                            value={pair.score}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value, 10);
                                                                engine.updatePairScore(idx, isNaN(val) ? 0 : val);
                                                            }}
                                                            aria-label={`Nilai untuk ${pair.studentName}`}
                                                            className={`w-14 text-center font-black py-1 px-1 rounded-lg sm:rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
                                                                pair.score >= effectiveKkm
                                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 focus:ring-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700'
                                                                    : 'bg-rose-50 text-rose-800 border-rose-300 focus:ring-rose-400 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700'
                                                            }`}
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => engine.deletePair(idx)}
                                                        aria-label={`Hapus ${pair.studentName}`}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                        title="Hapus baris ini"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-4 sm:p-6 text-center rounded-xl sm:rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                                    Belum ada nomor absen atau nama siswa yang terdeteksi. Silakan mulai bicara dengan menyebut nomor absen (misal: "absen 1 85, absen 2 90") atau nama siswa dan nilainya.
                                </div>
                            )}
                        </div>

                        {/* Tab 2 Bottom Action Toolbar */}
                        <div className="flex items-center justify-between gap-2 p-2 sm:p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700">
                            <span className="text-[11px] sm:text-xs text-slate-500 font-medium">
                                <strong className="text-emerald-600 dark:text-emerald-400">{engine.filledCount}</strong>/{students.length} terisi
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleClose}
                                className="rounded-lg sm:rounded-xl h-8 sm:h-9 px-3 sm:px-4 text-xs font-semibold"
                            >
                                Selesai
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};
