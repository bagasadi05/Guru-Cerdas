import React from 'react';
import { Button } from '../ui/Button';
import { BrainCircuitIcon, DownloadCloudIcon } from '../Icons';

interface AttendanceHeaderProps {
    onAnalyze: () => void;
    onExport: () => void;
    isOnline: boolean;
}

export const AttendanceHeader: React.FC<AttendanceHeaderProps> = ({ onAnalyze, onExport, isOnline }) => {
    return (
        <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-600 via-emerald-600 to-green-700 p-6 md:p-8 shadow-xl shadow-green-500/20 mb-6">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-72 h-72 bg-emerald-500/30 rounded-full blur-[80px] pointer-events-none mix-blend-screen"></div>
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-72 h-72 bg-green-500/30 rounded-full blur-[80px] pointer-events-none mix-blend-screen"></div>
            <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }}></div>

            <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left z-10">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6">
                    <div className="flex-shrink-0 group hidden md:block">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 shadow-lg ring-1 ring-white/30 backdrop-blur-md group-hover:scale-105 transition-transform duration-300">
                            <BrainCircuitIcon className="w-8 h-8 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                        </div>
                    </div>
                    <div className="flex-1 space-y-1.5 mt-1">
                        <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight font-serif drop-shadow-sm">
                            Insight Kehadiran
                        </h1>
                        <p className="text-sm md:text-base text-green-100/90 leading-relaxed max-w-2xl mx-auto md:mx-0 font-light tracking-wide">
                            Visualisasi dan analisis cerdas untuk memonitor kedisiplinan siswa setiap harinya.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0 self-center">
                    <Button onClick={onAnalyze} variant="ghost" disabled={!isOnline} className="flex-1 sm:flex-none justify-center bg-white hover:bg-emerald-50 !text-emerald-700 border-none shadow-lg shadow-black/10 transition-all duration-300 font-semibold px-5">
                        <BrainCircuitIcon className="w-4 h-4 mr-2" />
                        Analisis Cerdas
                    </Button>
                    <Button onClick={onExport} variant="outline" className="flex-1 sm:flex-none justify-center bg-emerald-900/40 hover:bg-emerald-900/60 text-white border-emerald-400/30 backdrop-blur-md shadow-lg shadow-black/10 transition-all duration-300 font-medium px-5">
                        <DownloadCloudIcon className="w-4 h-4 mr-2" />
                        Ekspor Data
                    </Button>
                </div>
            </div>
        </header>
    );
};
