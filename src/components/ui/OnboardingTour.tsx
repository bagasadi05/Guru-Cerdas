import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    HomeIcon,
    UsersIcon,
    CalendarIcon,
    ClipboardIcon,
    CheckSquareIcon,
    XIcon,
    ChevronRightIcon,
    ChevronLeftIcon,
    SparklesIcon,
    RocketIcon,
    BarChart3Icon,
    TrophyIcon,
    HistoryIcon,
    Trash2Icon,
    SettingsIcon,
    ArchiveIcon,
    ClipboardPenIcon,
} from 'lucide-react';
import { Button } from './Button';

interface TourStep {
    target: string; // CSS selector
    title: string;
    description: string;
    icon: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    tips?: string[];
}

const tourSteps: TourStep[] = [
    {
        target: '[href="/dashboard"]',
        title: 'Dashboard (Beranda)',
        description: 'Pusat informasi Anda. Lihat ringkasan kelas, jadwal hari ini, statistik kehadiran, dan rekomendasi AI untuk performa siswa.',
        icon: <HomeIcon className="w-5 h-5" />,
        position: 'right',
        tips: ['Cek notifikasi penting di sini setiap pagi', 'Widget jadwal menampilkan pelajaran hari ini'],
    },
    {
        target: '[href="/absensi"]',
        title: 'Rekap Absensi',
        description: 'Catat kehadiran siswa harian. Pilih kelas, tandai H/I/S/A untuk setiap siswa, lalu simpan. Bisa export ke PDF/Excel.',
        icon: <ClipboardIcon className="w-5 h-5" />,
        position: 'right',
        tips: ['Gunakan tombol "Hadir Semua" untuk mempercepat', 'Export laporan bulanan dengan satu klik'],
    },
    {
        target: '[href="/siswa"]',
        title: 'Data Siswa',
        description: 'Kelola seluruh data siswa: profil, nilai, kehadiran, pelanggaran, dan prestasi. Generate kode akses portal orang tua.',
        icon: <UsersIcon className="w-5 h-5" />,
        position: 'right',
        tips: ['Klik nama siswa untuk melihat detail lengkap', 'Gunakan filter untuk mencari siswa tertentu'],
    },
    {
        target: '[href="/brankas"]',
        title: 'Brankas Kelas',
        description: 'Simpan dan kelola file penting kelas: RPP, soal ujian, materi ajar, dan dokumen lainnya secara terorganisir.',
        icon: <ArchiveIcon className="w-5 h-5" />,
        position: 'right',
        tips: ['Upload file dengan drag & drop', 'Buat folder untuk mengorganisir dokumen'],
    },
    {
        target: '[href="/jadwal"]',
        title: 'Jadwal Mengajar',
        description: 'Atur jadwal pelajaran mingguan. Tambah, edit, atau hapus jadwal. Terima pengingat otomatis sebelum kelas dimulai.',
        icon: <CalendarIcon className="w-5 h-5" />,
        position: 'right',
        tips: ['Jadwal tampil otomatis di Dashboard', 'Bisa atur notifikasi pengingat'],
    },
    {
        target: '[href="/tugas"]',
        title: 'Manajemen Tugas',
        description: 'Buat dan kelola tugas/PR untuk siswa. Atur deadline, pantau pengumpulan, dan beri nilai langsung dari sini.',
        icon: <CheckSquareIcon className="w-5 h-5" />,
        position: 'right',
        tips: ['Atur deadline agar siswa mendapat pengingat', 'Tandai tugas selesai setelah dinilai'],
    },
    {
        target: '[href="/input-massal"]',
        title: 'Manajemen Siswa',
        description: 'Input nilai banyak siswa sekaligus dalam satu halaman. Pilih kelas dan mata pelajaran, lalu isi nilai secara massal.',
        icon: <ClipboardPenIcon className="w-5 h-5" />,
        position: 'right',
        tips: ['Tekan Tab untuk pindah ke siswa berikutnya', 'Bisa import nilai dari file Excel'],
    },
    {
        target: '[href="/analytics"]',
        title: 'Performa Siswa',
        description: 'Lihat statistik dan grafik perkembangan siswa secara keseluruhan. Ini membantu Anda memantau tren akademik, kehadiran, dan kedisiplinan.',
        icon: <BarChart3Icon className="w-5 h-5" />,
        position: 'right',
        tips: ['Pilih rentang waktu untuk analisis spesifik', 'Export laporan analitik ke PDF'],
    },
    {
        target: '[href="/ekstrakurikuler"]',
        title: 'Ekstrakurikuler',
        description: 'Kelola kegiatan ekskul: daftarkan siswa, catat presensi, dan input nilai kegiatan ekstrakurikuler.',
        icon: <TrophyIcon className="w-5 h-5" />,
        position: 'right',
        tips: ['Tambah kegiatan baru dengan tombol "+"', 'Catat prestasi siswa di ekskul'],
    },
    {
        target: '[href="/riwayat"]',
        title: 'Riwayat Aksi',
        description: 'Lihat log semua aktivitas yang pernah Anda lakukan: perubahan data, input nilai, dan lainnya untuk audit trail.',
        icon: <HistoryIcon className="w-5 h-5" />,
        position: 'right',
        tips: ['Berguna untuk melacak perubahan data', 'Filter berdasarkan tanggal atau jenis aksi'],
    },
    {
        target: '[href="/sampah"]',
        title: 'Sampah',
        description: 'Data yang dihapus masuk ke sini. Anda bisa memulihkan data yang tidak sengaja terhapus dalam 30 hari.',
        icon: <Trash2Icon className="w-5 h-5" />,
        position: 'right',
        tips: ['Data otomatis terhapus permanen setelah 30 hari', 'Klik "Pulihkan" untuk mengembalikan data'],
    },
    {
        target: '[href="/pengaturan"]',
        title: 'Pengaturan Sistem',
        description: 'Atur profil, ganti password, pilih tema gelap/terang, kelola notifikasi, dan konfigurasi aplikasi lainnya.',
        icon: <SettingsIcon className="w-5 h-5" />,
        position: 'right',
        tips: ['Aktifkan mode gelap untuk kenyamanan mata', 'Atur backup data otomatis di sini'],
    },
];

interface OnboardingTourProps {
    onComplete: () => void;
    isOpen: boolean;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete, isOpen }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [showTips, setShowTips] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            const resetTimer = setTimeout(() => {
                setCurrentStep(0);
                setShowTips(false);
            }, 0);
            return () => clearTimeout(resetTimer);
        }

        const updateTargetPosition = () => {
            const step = tourSteps[currentStep];
            const element = document.querySelector(step.target);
            if (element) {
                const rect = element.getBoundingClientRect();
                setTargetRect(rect);
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                setTargetRect(null);
            }
        };

        // Small delay to allow DOM to settle
        const timer = setTimeout(updateTargetPosition, 100);
        window.addEventListener('resize', updateTargetPosition);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updateTargetPosition);
        };
    }, [currentStep, isOpen]);

    const handleNext = () => {
        setShowTips(false);
        if (currentStep < tourSteps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrev = () => {
        setShowTips(false);
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const handleComplete = () => {
        localStorage.setItem('onboarding_completed', 'true');
        onComplete();
    };

    const handleSkip = () => {
        localStorage.setItem('onboarding_completed', 'true');
        onComplete();
    };

    const handleGoTo = (index: number) => {
        setShowTips(false);
        setCurrentStep(index);
    };

    if (!isOpen) return null;

    const step = tourSteps[currentStep];
    const isLastStep = currentStep === tourSteps.length - 1;
    const progress = ((currentStep + 1) / tourSteps.length) * 100;

    // Calculate popup position to stay within viewport
    const getPopupStyle = (): React.CSSProperties => {
        if (!targetRect) {
            return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
        }

        const popupWidth = 360;
        const popupHeight = 320;
        const padding = 20;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Try right side first
        let left = targetRect.right + padding;
        let top = targetRect.top + targetRect.height / 2 - popupHeight / 2;

        // If overflows right, try left
        if (left + popupWidth > viewportWidth - padding) {
            left = targetRect.left - popupWidth - padding;
        }

        // If overflows left too, center it
        if (left < padding) {
            left = (viewportWidth - popupWidth) / 2;
            top = targetRect.bottom + padding;
        }

        // Clamp vertical position
        top = Math.max(padding, Math.min(top, viewportHeight - popupHeight - padding));

        return { top, left };
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true" aria-label="Tutorial aplikasi">
            {/* Backdrop overlay */}
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" />

            {/* Spotlight on current element */}
            {targetRect && (
                <div
                    className="absolute rounded-xl ring-4 ring-indigo-500 ring-offset-4 ring-offset-transparent shadow-[0_0_0_9999px_rgba(15,23,42,0.85)] transition-all duration-500 ease-out"
                    style={{
                        top: targetRect.top - 8,
                        left: targetRect.left - 8,
                        width: targetRect.width + 16,
                        height: targetRect.height + 16,
                    }}
                />
            )}

            {/* Tour popup */}
            <div
                className="absolute bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700 p-6 w-[360px] transition-all duration-500 ease-out animate-fade-in"
                style={getPopupStyle()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                            {step.icon}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white text-base">{step.title}</h3>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                {currentStep + 1} / {tourSteps.length}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={handleSkip}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        aria-label="Lewati tutorial"
                    >
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                    {step.description}
                </p>

                {/* Tips section */}
                {step.tips && step.tips.length > 0 && (
                    <div className="mb-4">
                        <button
                            onClick={() => setShowTips(!showTips)}
                            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 transition-colors"
                        >
                            <SparklesIcon className="w-3 h-3" />
                            {showTips ? 'Sembunyikan tips' : 'Lihat tips'}
                        </button>
                        {showTips && (
                            <ul className="mt-2 space-y-1.5 animate-fade-in">
                                {step.tips.map((tip, i) => (
                                    <li key={i} className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
                                        <span className="text-indigo-500 mt-0.5">💡</span>
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {/* Progress bar */}
                <div className="relative h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mb-4 overflow-hidden">
                    <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Step dots - clickable */}
                <div className="flex gap-1 mb-4 flex-wrap justify-center">
                    {tourSteps.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => handleGoTo(index)}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                index === currentStep
                                    ? 'bg-indigo-500 w-4'
                                    : index < currentStep
                                    ? 'bg-indigo-300 dark:bg-indigo-700'
                                    : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
                            }`}
                            aria-label={`Langkah ${index + 1}: ${tourSteps[index].title}`}
                        />
                    ))}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={handlePrev}
                        disabled={currentStep === 0}
                        className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeftIcon className="w-4 h-4" />
                        Kembali
                    </button>

                    <Button
                        onClick={handleNext}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2 rounded-xl shadow-lg shadow-indigo-500/30 flex items-center gap-2"
                    >
                        {isLastStep ? (
                            <>
                                <RocketIcon className="w-4 h-4" />
                                Selesai!
                            </>
                        ) : (
                            <>
                                Lanjut
                                <ChevronRightIcon className="w-4 h-4" />
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Welcome message for first step */}
            {currentStep === 0 && (
                <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-bounce">
                    <SparklesIcon className="w-5 h-5" />
                    <span className="font-bold text-sm sm:text-base">Kenali Semua Menu Portal Guru!</span>
                </div>
            )}

            {/* Completion celebration for last step */}
            {isLastStep && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
                    <RocketIcon className="w-5 h-5" />
                    <span className="font-bold text-sm">Anda sudah mengenal semua menu!</span>
                </div>
            )}
        </div>,
        document.body
    );
};

// Hook to manage onboarding state
export const useOnboarding = () => {
    const [showTour, setShowTour] = useState(false);

    useEffect(() => {
        // Check if onboarding has been completed
        const completed = localStorage.getItem('onboarding_completed');
        if (!completed) {
            // Delay showing tour to let page load
            const timer = setTimeout(() => setShowTour(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const startTour = () => {
        localStorage.removeItem('onboarding_completed');
        setShowTour(true);
    };
    const endTour = () => setShowTour(false);
    const resetTour = () => {
        localStorage.removeItem('onboarding_completed');
        setShowTour(true);
    };

    return { showTour, startTour, endTour, resetTour };
};

export default OnboardingTour;