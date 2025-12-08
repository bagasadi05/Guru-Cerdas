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
    RocketIcon
} from 'lucide-react';
import { Button } from './Button';

interface TourStep {
    target: string; // CSS selector
    title: string;
    description: string;
    icon: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

const tourSteps: TourStep[] = [
    {
        target: '[href="/dashboard"]',
        title: 'Dashboard',
        description: 'Lihat ringkasan data kelas, jadwal hari ini, dan analisis AI untuk performa siswa.',
        icon: <HomeIcon className="w-5 h-5" />,
        position: 'right',
    },
    {
        target: '[href="/absensi"]',
        title: 'Rekap Absensi',
        description: 'Catat kehadiran siswa dengan cepat, export laporan PDF/Excel, dan lihat statistik.',
        icon: <ClipboardIcon className="w-5 h-5" />,
        position: 'right',
    },
    {
        target: '[href="/siswa"]',
        title: 'Data Siswa',
        description: 'Kelola data siswa, kelas, dan generate kode akses untuk orang tua.',
        icon: <UsersIcon className="w-5 h-5" />,
        position: 'right',
    },
    {
        target: '[href="/jadwal"]',
        title: 'Jadwal Pelajaran',
        description: 'Atur jadwal mengajar mingguan dan terima notifikasi pengingat.',
        icon: <CalendarIcon className="w-5 h-5" />,
        position: 'right',
    },
    {
        target: '[href="/tugas"]',
        title: 'Manajemen Tugas',
        description: 'Buat daftar tugas dengan deadline dan pantau progress pekerjaan.',
        icon: <CheckSquareIcon className="w-5 h-5" />,
        position: 'right',
    },
];

interface OnboardingTourProps {
    onComplete: () => void;
    isOpen: boolean;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete, isOpen }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        if (!isOpen) return;

        const updateTargetPosition = () => {
            const step = tourSteps[currentStep];
            const element = document.querySelector(step.target);
            if (element) {
                const rect = element.getBoundingClientRect();
                setTargetRect(rect);

                // Scroll element into view
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        };

        updateTargetPosition();
        window.addEventListener('resize', updateTargetPosition);

        return () => window.removeEventListener('resize', updateTargetPosition);
    }, [currentStep, isOpen]);

    const handleNext = () => {
        if (currentStep < tourSteps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrev = () => {
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

    if (!isOpen) return null;

    const step = tourSteps[currentStep];
    const isLastStep = currentStep === tourSteps.length - 1;

    return createPortal(
        <div className="fixed inset-0 z-[9999]">
            {/* Backdrop overlay */}
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" />

            {/* Spotlight on current element */}
            {targetRect && (
                <div
                    className="absolute rounded-xl ring-4 ring-indigo-500 ring-offset-4 ring-offset-transparent shadow-[0_0_0_9999px_rgba(15,23,42,0.85)] transition-all duration-300"
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
                className="absolute bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-white/20 p-6 w-80 transition-all duration-300 animate-fade-in"
                style={{
                    top: targetRect ? targetRect.top + targetRect.height / 2 - 100 : '50%',
                    left: targetRect ? targetRect.right + 20 : '50%',
                    transform: targetRect ? 'none' : 'translate(-50%, -50%)',
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                            {step.icon}
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white">{step.title}</h3>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                Langkah {currentStep + 1} dari {tourSteps.length}
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={handleSkip}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        aria-label="Skip tour"
                    >
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                    {step.description}
                </p>

                {/* Progress bar */}
                <div className="flex gap-1 mb-4">
                    {tourSteps.map((_, index) => (
                        <div
                            key={index}
                            className={`h-1 flex-1 rounded-full transition-colors ${index <= currentStep
                                    ? 'bg-indigo-500'
                                    : 'bg-slate-200 dark:bg-slate-700'
                                }`}
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
                                Mulai
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
                    <span className="font-bold">Selamat Datang di Portal Guru!</span>
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

    const startTour = () => setShowTour(true);
    const endTour = () => setShowTour(false);
    const resetTour = () => {
        localStorage.removeItem('onboarding_completed');
        setShowTour(true);
    };

    return { showTour, startTour, endTour, resetTour };
};

export default OnboardingTour;
