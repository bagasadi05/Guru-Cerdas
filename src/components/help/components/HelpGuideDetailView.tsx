import React from 'react';
import {
    ChevronRight,
    ChevronLeft,
    CheckCircle,
    Lightbulb,
    Star,
    ZoomIn,
} from 'lucide-react';
import type { SimpleGuide } from '../types';

interface HelpGuideDetailViewProps {
    selectedGuide: SimpleGuide;
    currentStep: number;
    onSelectStep: (step: number) => void;
    onPrevStep: () => void;
    onNextStep: () => void;
    onBackToHome: () => void;
    onEnlargeImage: (imgUrl: string) => void;
}

export const HelpGuideDetailView: React.FC<HelpGuideDetailViewProps> = ({
    selectedGuide,
    currentStep,
    onSelectStep,
    onPrevStep,
    onNextStep,
    onBackToHome,
    onEnlargeImage,
}) => {
    return (
        <div className="space-y-6">
            {/* Progress Bar */}
            <div className="flex items-center gap-2">
                {selectedGuide.steps.map((_, index) => (
                    <div
                        key={index}
                        className={`flex-1 h-3 rounded-full transition-all cursor-pointer ${
                            index <= currentStep
                                ? 'bg-gradient-to-r from-brand-600 to-brand-700'
                                : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                        onClick={() => onSelectStep(index)}
                    />
                ))}
            </div>

            {/* Current Step */}
            <div
                className={`p-8 rounded-3xl ${selectedGuide.bgColor} border-2 ${selectedGuide.color.replace(
                    'text-',
                    'border-'
                )}`}
            >
                <div className="flex items-start gap-4">
                    <div
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold ${selectedGuide.color} bg-white dark:bg-slate-800 shadow-lg flex-shrink-0`}
                    >
                        {currentStep + 1}
                    </div>
                    <div className="flex-1">
                        <h3 className={`text-2xl font-bold ${selectedGuide.color} mb-4`}>
                            {selectedGuide.steps[currentStep].title}
                        </h3>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line text-lg">
                            {selectedGuide.steps[currentStep].description}
                        </p>
                    </div>
                </div>

                {/* Tip Box */}
                {selectedGuide.steps[currentStep].tip && (
                    <div className="mt-6 p-4 bg-white dark:bg-slate-800 rounded-2xl border-2 border-amber-300 dark:border-amber-600 flex items-start gap-3">
                        <Lightbulb className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold text-amber-700 dark:text-amber-400">💡 Tips: </span>
                            <span className="text-slate-700 dark:text-slate-300">
                                {selectedGuide.steps[currentStep].tip}
                            </span>
                        </div>
                    </div>
                )}

                {/* Tutorial Image */}
                {selectedGuide.steps[currentStep].image && (
                    <div className="mt-6">
                        <button
                            type="button"
                            onClick={() => onEnlargeImage(selectedGuide.steps[currentStep].image!)}
                            className="w-full relative group rounded-2xl overflow-hidden shadow-md border-2 border-slate-200 dark:border-slate-700 hover:border-brand-500 transition-all cursor-pointer"
                        >
                            <img
                                src={selectedGuide.steps[currentStep].image}
                                alt="Panduan visual"
                                className="w-full h-auto max-h-64 object-contain bg-slate-50 dark:bg-slate-900"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                <div className="opacity-0 group-hover:opacity-100 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all">
                                    <ZoomIn className="w-4 h-4" />
                                    Perbesar Gambar
                                </div>
                            </div>
                        </button>
                    </div>
                )}
            </div>

            {/* Completion Message */}
            {currentStep === selectedGuide.steps.length - 1 && (
                <div className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 p-6 text-center dark:border-emerald-700 dark:from-emerald-900/20 dark:to-teal-900/20">
                    <CheckCircle className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
                    <h3 className="mb-2 text-xl font-bold text-emerald-700 dark:text-emerald-400">
                        🎉 Selamat! Anda sudah selesai belajar!
                    </h3>
                    <p className="text-emerald-600 dark:text-emerald-500">
                        Silakan coba langsung di aplikasi. Semangat!
                    </p>
                </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-4 pt-4">
                <button
                    type="button"
                    onClick={onPrevStep}
                    disabled={currentStep === 0}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold cursor-pointer"
                >
                    <ChevronLeft className="w-5 h-5" />
                    Kembali
                </button>

                {currentStep < selectedGuide.steps.length - 1 ? (
                    <button
                        type="button"
                        onClick={onNextStep}
                        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 px-8 py-3 font-semibold text-white shadow-lg transition-colors hover:from-brand-600 hover:to-brand-700 cursor-pointer"
                    >
                        Lanjut
                        <ChevronRight className="w-5 h-5" />
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onBackToHome}
                        className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand-600 to-brand-700 px-8 py-3 font-semibold text-white shadow-lg transition-colors hover:from-brand-600 hover:to-brand-700 cursor-pointer"
                    >
                        <Star className="w-5 h-5" />
                        Selesai
                    </button>
                )}
            </div>

            {/* Keyboard hint */}
            <p className="text-center text-sm text-slate-400">
                Gunakan tombol ← → untuk navigasi
            </p>
        </div>
    );
};
