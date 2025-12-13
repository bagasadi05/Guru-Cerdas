import React, { useState, useEffect } from 'react';
import { useTheme } from '../../hooks/useTheme';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { SunIcon, MoonIcon, CheckCircleIcon, RefreshCwIcon, SparklesIcon, ContrastIcon, ZapOffIcon, EyeIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { Switch } from '../ui/Switch';

const AppearanceSection: React.FC = () => {
    const { theme, setTheme } = useTheme();
    const [highContrast, setHighContrast] = useState(() => {
        return localStorage.getItem('portal_guru_high_contrast') === 'true';
    });
    const [reducedMotion, setReducedMotion] = useState(() => {
        return localStorage.getItem('portal_guru_reduced_motion') === 'true' ||
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });

    useEffect(() => {
        if (highContrast) {
            document.documentElement.classList.add('high-contrast');
        } else {
            document.documentElement.classList.remove('high-contrast');
        }
        localStorage.setItem('portal_guru_high_contrast', String(highContrast));
    }, [highContrast]);

    useEffect(() => {
        if (reducedMotion) {
            document.documentElement.classList.add('reduce-motion');
        } else {
            document.documentElement.classList.remove('reduce-motion');
        }
        localStorage.setItem('portal_guru_reduced_motion', String(reducedMotion));
    }, [reducedMotion]);

    const handleResetTour = () => {
        localStorage.removeItem('onboarding_completed');
        window.location.reload();
    };

    return (
        <div className="space-y-6">
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-white/20 dark:border-white/10 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-6">
                    <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">Tampilan Aplikasi</CardTitle>
                    <CardDescription className="text-base">Sesuaikan tema aplikasi dengan preferensi visual Anda.</CardDescription>
                </CardHeader>
                <CardContent className="pt-8 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <button
                            onClick={() => setTheme('light')}
                            className={`
                                group relative p-6 rounded-2xl border-2 transition-all duration-300 overflow-hidden
                                ${theme === 'light'
                                    ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10 ring-4 ring-indigo-500/10'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700 bg-white dark:bg-slate-800/50'
                                }
                            `}
                        >
                            <div className="flex items-start gap-4 relative z-10">
                                <div className={`p-3 rounded-xl ${theme === 'light' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                    <SunIcon className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <p className={`font-bold text-lg ${theme === 'light' ? 'text-indigo-900 dark:text-indigo-100' : 'text-slate-700 dark:text-slate-200'}`}>Mode Terang</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Tampilan cerah dan bersih untuk siang hari.</p>
                                </div>
                            </div>
                            {theme === 'light' && (
                                <div className="absolute top-4 right-4 text-indigo-500 animate-scale-in">
                                    <CheckCircleIcon className="w-6 h-6" />
                                </div>
                            )}
                        </button>

                        <button
                            onClick={() => setTheme('dark')}
                            className={`
                                group relative p-6 rounded-2xl border-2 transition-all duration-300 overflow-hidden
                                ${theme === 'dark'
                                    ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-900/10 ring-4 ring-purple-500/10'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-700 bg-white dark:bg-slate-800/50'
                                }
                            `}
                        >
                            <div className="flex items-start gap-4 relative z-10">
                                <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                                    <MoonIcon className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <p className={`font-bold text-lg ${theme === 'dark' ? 'text-purple-900 dark:text-purple-100' : 'text-slate-700 dark:text-slate-200'}`}>Mode Gelap</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Tampilan elegan dan nyaman untuk malam hari.</p>
                                </div>
                            </div>
                            {theme === 'dark' && (
                                <div className="absolute top-4 right-4 text-purple-500 animate-scale-in">
                                    <CheckCircleIcon className="w-6 h-6" />
                                </div>
                            )}
                        </button>
                    </div>
                </CardContent>
            </Card>

            {/* Accessibility Section */}
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-white/20 dark:border-white/10 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-6">
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
                                <p className="font-semibold text-sm sm:text-base text-slate-800 dark:text-slate-200">Kurangi Gerakan</p>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Mengurangi animasi.</p>
                            </div>
                        </div>
                        <Switch
                            checked={reducedMotion}
                            onChange={(e) => setReducedMotion(e.target.checked)}
                            className="data-[state=checked]:bg-blue-600 flex-shrink-0"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Onboarding Tour Section */}
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-white/20 dark:border-white/10 shadow-xl rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-gray-100 dark:border-gray-800 pb-6">
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
            </Card>
        </div>
    );
};

export default AppearanceSection;

