import React, { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { SunIcon, MoonIcon, CheckCircleIcon, RefreshCwIcon, SparklesIcon, ContrastIcon, ZapOffIcon, SmartphoneIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';
import { SettingsCard } from './SettingsCard';

const AppearanceSection: React.FC = () => {
    const { theme, setTheme } = useTheme();
    const { shouldReduceMotion, setReducedMotion, autoLowPerfMode } = useReducedMotion();

    const [highContrast, setHighContrast] = useState(() => {
        return localStorage.getItem('portal_guru_high_contrast') === 'true';
    });

    useEffect(() => {
        if (highContrast) {
            document.documentElement.classList.add('high-contrast');
        } else {
            document.documentElement.classList.remove('high-contrast');
        }
        localStorage.setItem('portal_guru_high_contrast', String(highContrast));
    }, [highContrast]);

    const handleResetTour = () => {
        localStorage.removeItem('onboarding_completed');
        window.location.reload();
    };

    const handleReducedMotionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setReducedMotion(e.target.checked);
    };

    return (
        <div className="space-y-6">
            <SettingsCard className="overflow-hidden">
                <CardHeader className="border-b border-slate-200/60 dark:border-slate-700/50 pb-6">
                    <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400">Tampilan Aplikasi</CardTitle>
                    <CardDescription className="text-base">Sesuaikan tema aplikasi dengan preferensi visual Anda.</CardDescription>
                </CardHeader>
                <CardContent className="pt-8 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <button
                            onClick={() => setTheme('light')}
                            className={`
                                group relative p-6 rounded-2xl border-2 transition-all duration-300 overflow-hidden
                                ${theme === 'light'
                                    ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10 ring-4 ring-green-500/10'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-700 bg-white dark:bg-slate-800/50'
                                }
                            `}
                        >
                            <div className="flex items-start gap-4 relative z-10">
                                <div className={`p-3 rounded-xl ${theme === 'light' ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                    <SunIcon className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <p className={`font-bold text-lg ${theme === 'light' ? 'text-green-900 dark:text-green-100' : 'text-slate-700 dark:text-slate-200'}`}>Mode Terang</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Tampilan cerah dan bersih untuk siang hari.</p>
                                </div>
                            </div>
                            {theme === 'light' && (
                                <div className="absolute top-4 right-4 text-green-500 animate-scale-in">
                                    <CheckCircleIcon className="w-6 h-6" />
                                </div>
                            )}
                        </button>

                        <button
                            onClick={() => setTheme('dark')}
                            className={`
                                group relative p-6 rounded-2xl border-2 transition-all duration-300 overflow-hidden
                                ${theme === 'dark'
                                    ? 'border-green-500 bg-green-50/50 dark:bg-green-900/10 ring-4 ring-green-500/10'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-green-300 dark:hover:border-green-700 bg-white dark:bg-slate-800/50'
                                }
                            `}
                        >
                            <div className="flex items-start gap-4 relative z-10">
                                <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                    <MoonIcon className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <p className={`font-bold text-lg ${theme === 'dark' ? 'text-green-900 dark:text-green-100' : 'text-slate-700 dark:text-slate-200'}`}>Mode Gelap</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Tampilan elegan dan nyaman untuk malam hari.</p>
                                </div>
                            </div>
                            {theme === 'dark' && (
                                <div className="absolute top-4 right-4 text-green-500 animate-scale-in">
                                    <CheckCircleIcon className="w-6 h-6" />
                                </div>
                            )}
                        </button>
                    </div>
                </CardContent>
            </SettingsCard>

            {/* Accessibility Section */}
            <SettingsCard className="overflow-hidden">
                <CardHeader className="border-b border-slate-200/60 dark:border-slate-700/50 pb-6">
                    <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-400">Aksesibilitas</CardTitle>
                    <CardDescription className="text-base">Pengaturan untuk meningkatkan aksesibilitas aplikasi.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    {/* High Contrast */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="p-2 sm:p-3 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 flex-shrink-0">
                                <ContrastIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-200">Mode Kontras Tinggi</p>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Meningkatkan kontras warna.</p>
                            </div>
                        </div>
                        <Switch
                            checked={highContrast}
                            onChange={(e) => setHighContrast(e.target.checked)}
                            className="data-[state=checked]:bg-cyan-600 flex-shrink-0"
                        />
                    </div>

                    {/* Reduced Motion */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="p-2 sm:p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex-shrink-0">
                                <ZapOffIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-200">Kurangi Gerakan</p>
                                    {autoLowPerfMode && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                                            <SmartphoneIcon className="w-3 h-3" />
                                            Auto
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                    {autoLowPerfMode
                                        ? 'Diaktifkan otomatis untuk performa lebih baik.'
                                        : 'Mengurangi animasi untuk performa lebih baik.'}
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={shouldReduceMotion}
                            onChange={handleReducedMotionChange}
                            className="data-[state=checked]:bg-blue-600 flex-shrink-0"
                        />
                    </div>
                </CardContent>
            </SettingsCard>

            {/* Onboarding Tour Section */}
            <SettingsCard className="overflow-hidden">
                <CardHeader className="border-b border-slate-200/60 dark:border-slate-700/50 pb-6">
                    <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400">Tutorial Aplikasi</CardTitle>
                    <CardDescription className="text-base">Pelajari fitur-fitur aplikasi dengan panduan interaktif.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800/50">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 flex-shrink-0">
                                <SparklesIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-200">Onboarding Tour</p>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Jalankan ulang tutorial fitur.</p>
                            </div>
                        </div>
                        <Button
                            onClick={handleResetTour}
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-3 sm:px-4 py-2 rounded-xl shadow-lg shadow-emerald-500/30 flex items-center gap-2 text-sm flex-shrink-0"
                        >
                            <RefreshCwIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Mulai Ulang</span>
                            <span className="sm:hidden">Reset</span>
                        </Button>
                    </div>
                </CardContent>
            </SettingsCard>
        </div>
    );
};

export default AppearanceSection;

