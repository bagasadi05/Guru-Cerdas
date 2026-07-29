import React from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '../ui/Card';
import { Button } from '../ui/Button';
import { SettingsCard } from './SettingsCard';
import { triggerPwaInstall } from '../PwaPrompt';
import { DownloadCloudIcon } from '../Icons';
import { Smartphone, Zap, WifiOff, Bell, Share, PlusSquare } from 'lucide-react';

export const PwaSection: React.FC = () => {
    return (
        <div className="space-y-6">
            {/* Header Card */}
            <SettingsCard className="overflow-hidden">
                <CardHeader className="border-b border-slate-200/60 dark:border-slate-700/50 pb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
                            <Smartphone className="w-7 h-7" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400">
                                Aplikasi PWA
                            </CardTitle>
                            <CardDescription className="text-base mt-0.5">
                                Pasang Portal Guru di perangkat Anda untuk akses cepat dan offline.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6">
                    {/* Hero Installation Banner */}
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4 sm:p-6 md:p-8 border border-slate-700/80 shadow-xl">
                        {/* Ambient glow */}
                        <div className="absolute -top-20 -right-20 w-56 h-56 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6">
                            <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 shrink-0">
                                    <DownloadCloudIcon className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                                </div>
                                <div className="space-y-1.5 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-extrabold text-base sm:text-xl text-white leading-tight">Portal Guru App</h3>
                                        <span className="text-[10px] sm:text-xs font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                                            PWA Ready
                                        </span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                                        Nikmati pengalaman aplikasi native tanpa perlu install lewat Play Store atau App Store.
                                    </p>
                                </div>
                            </div>

                            <Button
                                onClick={triggerPwaInstall}
                                size="lg"
                                className="w-full md:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm rounded-xl shadow-xl shadow-emerald-500/30 hover:scale-[1.02] active:scale-95 transition-all duration-200 shrink-0 flex items-center justify-center gap-2"
                            >
                                <DownloadCloudIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                Install Aplikasi Sekarang
                            </Button>
                        </div>
                    </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                                <Zap className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-base">Akses Super Cepat</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Buka aplikasi langsung dari beranda/desktop tanpa membuka browser terlebih dahulu.
                            </p>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                            <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                                <WifiOff className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-base">Mode Luring / Offline</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Tetap dapat melihat data absensi dan modul ajar meskipun tidak ada jaringan internet.
                            </p>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                                <Bell className="w-5 h-5" />
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-base">Notifikasi Real-time</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                Dapatkan pemberitahuan langsung presensi siswa dan pengumuman sekolah secara efisien.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </SettingsCard>

            {/* Manual Instructions Card */}
            <SettingsCard className="overflow-hidden">
                <CardHeader className="border-b border-slate-200/60 dark:border-slate-700/50 pb-6">
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">
                        Panduan Pemasangan Manual
                    </CardTitle>
                    <CardDescription className="text-sm">
                        Jika tombol di atas tidak memicu prompt, ikuti petunjuk berikut sesuai browser Anda:
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* iOS / Safari */}
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/70 space-y-3">
                        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
                            <span className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs">iOS</span>
                            Safari (iPhone / iPad)
                        </div>
                        <ol className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 list-decimal list-inside leading-relaxed">
                            <li>Buka situs ini di browser <strong className="font-bold text-slate-900 dark:text-white">Safari</strong>.</li>
                            <li>
                                Tap ikon <Share className="w-3.5 h-3.5 inline mx-1 text-emerald-500" /> <strong className="font-bold text-slate-900 dark:text-white">Share</strong> di bilah bawah layar.
                            </li>
                            <li>
                                Gulir ke bawah lalu pilih <PlusSquare className="w-3.5 h-3.5 inline mx-1 text-emerald-500" /> <strong className="font-bold text-slate-900 dark:text-white">Add to Home Screen</strong> (Tambah ke Layar Utama).
                            </li>
                            <li>Tap <strong className="font-bold text-slate-900 dark:text-white">Add</strong> di pojok kanan atas.</li>
                        </ol>
                    </div>

                    {/* Android / Chrome / Edge */}
                    <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/70 space-y-3">
                        <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-base">
                            <span className="w-7 h-7 rounded-lg bg-teal-500 text-white flex items-center justify-center text-xs">PC</span>
                            Chrome / Edge / Android
                        </div>
                        <ol className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 list-decimal list-inside leading-relaxed">
                            <li>Klik tombol <strong className="font-bold text-slate-900 dark:text-white">Install Aplikasi Sekarang</strong> di atas.</li>
                            <li>Jika tidak muncul, klik ikon titik tiga (<strong className="font-bold text-slate-900 dark:text-white">⋮</strong>) di pojok kanan atas browser.</li>
                            <li>Pilih <strong className="font-bold text-slate-900 dark:text-white">Install Portal Guru</strong> atau <strong className="font-bold text-slate-900 dark:text-white">Simpan dan Bagikan &gt; Pasang aplikasi</strong>.</li>
                            <li>Konfirmasi dialog dengan mengklik <strong className="font-bold text-slate-900 dark:text-white">Install</strong>.</li>
                        </ol>
                    </div>
                </CardContent>
            </SettingsCard>
        </div>
    );
};

export default PwaSection;
