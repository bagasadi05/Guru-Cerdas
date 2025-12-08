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
    <div className="w-full max-w-7xl mx-auto space-y-10 animate-fade-in-up">
        <header className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-2xl border border-white/20 p-10 md:p-14 shadow-2xl shadow-indigo-500/20">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-purple-500/30 rounded-full blur-[100px] pointer-events-none mix-blend-screen"></div>
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-96 h-96 bg-indigo-500/30 rounded-full blur-[100px] pointer-events-none mix-blend-screen"></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>

            <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-12 text-center md:text-left z-10">
                <div className="flex-shrink-0 group">
                    <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-white/20 to-white/5 rounded-3xl flex items-center justify-center border border-white/20 shadow-lg ring-1 ring-white/30 backdrop-blur-md group-hover:scale-105 transition-transform duration-500">
                        <ClipboardPenIcon className="w-12 h-12 md:w-16 md:h-16 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                    </div>
                </div>
                <div className="flex-1 space-y-3">
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight font-serif drop-shadow-sm">
                        Pusat Input Cerdas
                    </h1>
                    <p className="text-lg md:text-xl text-indigo-100/90 leading-relaxed max-w-3xl mx-auto md:mx-0 font-light tracking-wide">
                        Efisiensi tingkat lanjut untuk pengelolaan data akademik. Pilih modul aksi untuk memulai proses massal.
                    </p>
                </div>
            </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {actionCards.map((card, index) => (
                <div key={card.mode} onClick={() => handleModeSelect(card.mode)}
                    className="group relative overflow-hidden bg-white/5 backdrop-blur-xl rounded-3xl p-6 md:p-8 transition-all duration-500 hover:-translate-y-2 cursor-pointer border border-white/10 hover:border-white/30 hover:bg-white/10 hover:shadow-2xl hover:shadow-purple-500/20"
                    style={{ animationDelay: `${index * 100}ms` }}>

                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                    <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                        <div className="w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                            <card.icon className="w-10 h-10 text-indigo-200 group-hover:text-white transition-colors duration-300 drop-shadow-md" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white mb-2 tracking-wide">{card.title}</h3>
                            <p className="text-sm text-indigo-100/70 leading-relaxed">{card.description}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);
