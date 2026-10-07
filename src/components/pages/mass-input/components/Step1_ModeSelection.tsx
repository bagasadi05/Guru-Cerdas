import React from 'react';
import { ClipboardPenIcon } from '../../../Icons';
import { ArrowUpRight, Layers, FileSpreadsheet } from 'lucide-react';
import { InputMode } from '../types';
import { inputCards, exportCards, CardAccent, ModeCardConfig } from '../constants';

const ACCENT_STYLES: Record<CardAccent, {
    iconBox: string;
    badge: string;
    cardHover: string;
    glow: string;
    ctaArrow: string;
    topBar: string;
}> = {
    emerald: {
        iconBox: 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25',
        badge: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-500/20',
        cardHover: 'hover:border-emerald-400/70 dark:hover:border-emerald-500/40 focus-visible:ring-emerald-500',
        glow: 'from-emerald-500/8 to-transparent',
        ctaArrow: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-emerald-500 group-hover:text-white',
        topBar: 'bg-emerald-500',
    },
    amber: {
        iconBox: 'bg-amber-500 text-white shadow-sm shadow-amber-500/25',
        badge: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-500/20',
        cardHover: 'hover:border-amber-400/70 dark:hover:border-amber-500/40 focus-visible:ring-amber-500',
        glow: 'from-amber-500/8 to-transparent',
        ctaArrow: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-amber-500 group-hover:text-white',
        topBar: 'bg-amber-500',
    },
    brand: {
        iconBox: 'bg-brand-600 text-white shadow-sm shadow-brand-600/25',
        badge: 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 border-brand-200/80 dark:border-brand-500/20',
        cardHover: 'hover:border-brand-400/70 dark:hover:border-brand-500/40 focus-visible:ring-brand-500',
        glow: 'from-brand-500/8 to-transparent',
        ctaArrow: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-brand-600 group-hover:text-white',
        topBar: 'bg-brand-500',
    },
    teal: {
        iconBox: 'bg-teal-500 text-white shadow-sm shadow-teal-500/25',
        badge: 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200/80 dark:border-teal-500/20',
        cardHover: 'hover:border-teal-400/70 dark:hover:border-teal-500/40 focus-visible:ring-teal-500',
        glow: 'from-teal-500/8 to-transparent',
        ctaArrow: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-teal-500 group-hover:text-white',
        topBar: 'bg-teal-500',
    },
    rose: {
        iconBox: 'bg-rose-500 text-white shadow-sm shadow-rose-500/25',
        badge: 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-500/20',
        cardHover: 'hover:border-rose-400/70 dark:hover:border-rose-500/40 focus-visible:ring-rose-500',
        glow: 'from-rose-500/8 to-transparent',
        ctaArrow: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-rose-500 group-hover:text-white',
        topBar: 'bg-rose-500',
    },
    sky: {
        iconBox: 'bg-sky-500 text-white shadow-sm shadow-sky-500/25',
        badge: 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-500/20',
        cardHover: 'hover:border-sky-400/70 dark:hover:border-sky-500/40 focus-visible:ring-sky-500',
        glow: 'from-sky-500/8 to-transparent',
        ctaArrow: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-sky-500 group-hover:text-white',
        topBar: 'bg-sky-500',
    },
};

const ModeActionCard: React.FC<{
    card: ModeCardConfig;
    index: number;
    onSelect: (mode: InputMode) => void;
}> = ({ card, index, onSelect }) => {
    const style = ACCENT_STYLES[card.accent] || ACCENT_STYLES.emerald;

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={card.title}
            onClick={() => onSelect(card.mode)}
            onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(card.mode);
                }
            }}
            style={{ animationDelay: `${index * 50}ms` }}
            className={`group relative flex flex-col justify-between overflow-hidden bg-white dark:bg-slate-900 rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 cursor-pointer border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 ${style.cardHover}`}
        >
            {/* Top accent indicator line on hover */}
            <div className={`absolute inset-x-0 top-0 h-1 ${style.topBar} opacity-0 group-hover:opacity-100 transition-opacity duration-200`} />

            {/* Subtle corner gradient wash */}
            <div className={`absolute inset-0 bg-gradient-to-br ${style.glow} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />

            <div className="relative z-10 flex flex-col gap-3">
                {/* Header row: Square Icon Badge + Square Tag & Action Arrow */}
                <div className="flex items-start justify-between gap-2">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${style.iconBox}`}>
                        <card.icon className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wide border ${style.badge}`}>
                            {card.badge}
                        </span>
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 ${style.ctaArrow}`}>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                    </div>
                </div>

                {/* Title & Concise Description */}
                <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight leading-snug">
                        {card.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2">
                        {card.description}
                    </p>
                </div>
            </div>
        </div>
    );
};

export const Step1_ModeSelection: React.FC<{ handleModeSelect: (mode: InputMode) => void }> = ({ handleModeSelect }) => (
    <div className="w-full max-w-7xl mx-auto space-y-5 animate-fade-in-up pb-6">
        {/* Compact Hero Header */}
        <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-brand-700 dark:from-slate-900 dark:via-emerald-950/90 dark:to-brand-950/85 border border-emerald-500/30 dark:border-emerald-500/25 p-4 sm:p-5 shadow-md shadow-emerald-900/5">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-white/15 dark:bg-emerald-500/20 border border-white/25 dark:border-emerald-400/30 flex items-center justify-center flex-shrink-0 shadow-inner">
                        <ClipboardPenIcon className="w-6 h-6 text-white dark:text-emerald-300" />
                    </div>
                    <div>
                        <h1 className="text-lg sm:text-xl md:text-2xl font-extrabold text-white tracking-tight leading-tight">
                            Input & Manajemen Penilaian
                        </h1>
                        <p className="text-xs text-emerald-50/90 dark:text-slate-300 mt-0.5">
                            Pilih modul aksi untuk mencatat nilai, poin BINTANG, atau mencetak rekap kelas.
                        </p>
                    </div>
                </div>

                {/* Compact Square Summary Badges */}
                <div className="flex items-center gap-2 sm:flex-shrink-0">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/15 dark:bg-slate-800/80 border border-white/20 dark:border-slate-700 text-white text-xs font-bold">
                        <Layers className="w-3.5 h-3.5 text-emerald-200 dark:text-emerald-400" />
                        <span>{inputCards.length} Input</span>
                    </div>
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/15 dark:bg-slate-800/80 border border-white/20 dark:border-slate-700 text-white text-xs font-bold">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-sky-200 dark:text-brand-400" />
                        <span>{exportCards.length} Laporan</span>
                    </div>
                </div>
            </div>
        </header>

        {/* Input Section: 4 compact square cards */}
        <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-sm bg-emerald-500" />
                    <h2 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                        Input & Kelola Data
                    </h2>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-500/20">
                    {inputCards.length} Modul
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-stretch">
                {inputCards.map((card, index) => (
                    <ModeActionCard
                        key={card.mode}
                        card={card}
                        index={index}
                        onSelect={handleModeSelect}
                    />
                ))}
            </div>
        </section>

        {/* Export Section: 3 compact square cards */}
        <section className="space-y-3">
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-sm bg-brand-500" />
                    <h2 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-white uppercase tracking-wider">
                        Laporan & Ekspor
                    </h2>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 border border-brand-200/70 dark:border-brand-500/20">
                    {exportCards.length} Modul
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-stretch">
                {exportCards.map((card, index) => (
                    <ModeActionCard
                        key={card.mode}
                        card={card}
                        index={index + inputCards.length}
                        onSelect={handleModeSelect}
                    />
                ))}
            </div>
        </section>
    </div>
);
