import React from 'react';
import {
    HelpCircle,
    ChevronLeft,
    ZoomIn,
    ZoomOut,
    X,
} from 'lucide-react';
import type { SimpleGuide } from '../types';

interface HelpCenterHeaderProps {
    selectedGuide: SimpleGuide | null;
    currentStep: number;
    fontSize: 'normal' | 'large' | 'xlarge';
    onBack: () => void;
    onClose: () => void;
    onIncreaseFontSize: () => void;
    onDecreaseFontSize: () => void;
}

export const HelpCenterHeader: React.FC<HelpCenterHeaderProps> = ({
    selectedGuide,
    currentStep,
    fontSize,
    onBack,
    onClose,
    onIncreaseFontSize,
    onDecreaseFontSize,
}) => {
    return (
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-brand-600 to-brand-700 text-white">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {selectedGuide ? (
                        <button
                            type="button"
                            onClick={onBack}
                            className="rounded-lg bg-white/20 p-2 transition-colors hover:bg-white/30 cursor-pointer"
                            aria-label="Kembali"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                    ) : (
                        <div className="rounded-lg bg-white/20 p-2">
                            <HelpCircle className="w-6 h-6" />
                        </div>
                    )}
                    <div>
                        <h2 className="text-2xl font-bold">
                            {selectedGuide ? selectedGuide.title : '📚 Pusat Bantuan'}
                        </h2>
                        <p className="text-white/80 text-sm">
                            {selectedGuide
                                ? `Langkah ${currentStep + 1} dari ${selectedGuide.steps.length}`
                                : 'Panduan mudah untuk Bapak/Ibu Guru'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Font Size Controls */}
                    <button
                        type="button"
                        onClick={onDecreaseFontSize}
                        className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50 cursor-pointer"
                        aria-label="Perkecil teks"
                        disabled={fontSize === 'normal'}
                    >
                        <ZoomOut className="w-5 h-5" />
                    </button>
                    <button
                        type="button"
                        onClick={onIncreaseFontSize}
                        className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50 cursor-pointer"
                        aria-label="Perbesar teks"
                        disabled={fontSize === 'xlarge'}
                    >
                        <ZoomIn className="w-5 h-5" />
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors cursor-pointer"
                        aria-label="Tutup"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};
