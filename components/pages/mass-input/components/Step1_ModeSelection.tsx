import React from 'react';
import { ClipboardPenIcon, GraduationCapIcon, XCircleIcon, CheckSquareIcon, ShieldAlertIcon, PrinterIcon, FileTextIcon } from '../../../Icons';
import { InputMode } from '../types';

export const actionCards: { mode: InputMode; title: string; description: string; icon: React.FC<any> }[] = [
    { mode: 'subject_grade', title: 'Input Nilai Mapel', description: 'Masukkan nilai sumatif/akhir untuk satu kelas sekaligus.', icon: GraduationCapIcon },
    { mode: 'delete_subject_grade', title: 'Hapus Nilai Massal', description: 'Hapus data nilai untuk satu kelas dan penilaian tertentu.', icon: XCircleIcon },
    { mode: 'quiz', title: 'Input Poin Keaktifan', description: 'Beri poin untuk siswa yang aktif di kelas.', icon: CheckSquareIcon },
    { mode: 'violation', title: 'Input Pelanggaran', description: 'Catat poin pelanggaran untuk beberapa siswa.', icon: ShieldAlertIcon },
    { mode: 'bulk_report', title: 'Cetak Rapor Massal', description: 'Cetak beberapa rapor dari satu kelas dalam satu file.', icon: PrinterIcon },
    { mode: 'academic_print', title: 'Cetak Nilai Akademik', description: 'Cetak rekap nilai per mata pelajaran untuk satu kelas.', icon: FileTextIcon },
];

export const Step1_ModeSelection: React.FC<{ handleModeSelect: (mode: InputMode) => void }> = ({ handleModeSelect }) => (
    <div className="w-full max-w-6xl mx-auto space-y-8">
        <header className="relative overflow-hidden rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 md:p-10">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative flex flex-col md:flex-row items-center gap-6 md:gap-8 text-center md:text-left">
                <div className="flex-shrink-0">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-2xl flex items-center justify-center border border-white/10 shadow-inner ring-1 ring-white/20">
                        <ClipboardPenIcon className="w-10 h-10 md:w-12 md:h-12 text-purple-200 drop-shadow-lg" />
                    </div>
                </div>
                <div className="flex-1 space-y-2">
                    <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                        Pusat Input Cerdas
                    </h1>
                    <p className="text-lg text-indigo-100/80 leading-relaxed max-w-2xl mx-auto md:mx-0">
                        Pilih aksi massal yang ingin Anda lakukan untuk efisiensi maksimal. Kelola nilai, absensi, dan laporan dalam satu tempat.
                    </p>
                </div>
            </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {actionCards.map((card, index) => (
                <div key={card.mode} onClick={() => handleModeSelect(card.mode)}
                    className="step-card group bg-white/5 backdrop-blur-lg rounded-2xl p-5 sm:p-6 text-center transition-all duration-300 hover:-translate-y-2 cursor-pointer border border-white/5 hover:border-purple-500/30 hover:bg-white/10"
                    style={{ animationDelay: `${index * 100}ms` }}>
                    <div className="flex justify-center mb-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 border border-white/10 group-hover:border-purple-400/50">
                            <card.icon className="w-8 h-8 text-purple-300 transition-colors group-hover:text-purple-200" />
                        </div>
                    </div>
                    <h3 className="text-lg font-bold text-white">{card.title}</h3>
                    <p className="text-sm text-gray-400 mt-1">{card.description}</p>
                </div>
            ))}
        </div>
    </div>
);
