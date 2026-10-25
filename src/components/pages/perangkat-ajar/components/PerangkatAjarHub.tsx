import React from 'react';
import { Sparkles, BookOpen, CalendarRange, ArrowRight } from 'lucide-react';
import type { PerangkatAjarMode } from '../types/perangkatAjarPageTypes';

interface PerangkatAjarHubProps {
  onSelectMode: (mode: NonNullable<PerangkatAjarMode>) => void;
}

export const PerangkatAjarHub: React.FC<PerangkatAjarHubProps> = ({ onSelectMode }) => {
  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 px-3.5 sm:px-6 pb-24 sm:pb-20 animate-fade-in">
      {/* Hub Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3 pt-3 sm:pt-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 dark:bg-brand-950/60 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-xs font-bold tracking-wide uppercase shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
          Pusat Perangkat Ajar Kurikulum Merdeka
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Perangkat Ajar Guru
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
          Pilih dokumen yang ingin Bapak/Ibu susun: modul ajar (RPP) lengkap dengan bantuan AI cerdas, atau perencanaan tahunan &amp; pembagian jam mengajar (Prota &amp; Promes). Seluruh dokumen siap cetak dan ekspor resmi.
        </p>
      </div>

      {/* 2 Big Choice Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-8 pt-1">
        {/* Card 1: Modul Ajar (RPP) */}
        <div
          onClick={() => onSelectMode('modul-ajar')}
          className="group relative bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
        >
          <div className="space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform shadow-sm">
                <BookOpen className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <span className="px-3 py-1 text-[11px] font-bold tracking-wide uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full border border-indigo-200 dark:border-indigo-800">
                Bantuan Cerdas AI
              </span>
            </div>

            <div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Modul Ajar &amp; RPP
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Penyusunan Modul Ajar dan RPP Kurikulum Merdeka secara otomatis dengan bantuan AI. Dilengkapi tujuan pembelajaran, lembar kerja siswa (LKPD), rubrik asesmen, dan ekspor Word.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span>Penyusunan otomatis Tujuan Pembelajaran, Pemantik, &amp; LKPD</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span>Dukungan pembelajaran aktif dan materi berdiferensiasi</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span>Bank draf tersimpan otomatis &amp; dapat diedit kapan saja</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span>Bisa langsung dicetak rapi atau diekspor ke Microsoft Word (.docx)</span>
              </div>
            </div>
          </div>

          <div className="mt-6 sm:mt-8 pt-3 sm:pt-4">
            <button
              type="button"
              className="w-full min-h-[48px] py-3 px-4 rounded-xl sm:rounded-2xl bg-indigo-600 group-hover:bg-indigo-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20 transition-all group-hover:shadow-lg group-hover:shadow-indigo-500/30 active:scale-[0.99]"
            >
              <span>Mulai Susun Modul Ajar</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Card 2: Prota & Promes */}
        <div
          onClick={() => onSelectMode('prota-promes')}
          className="group relative bg-white dark:bg-slate-900 border-2 border-slate-200/90 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer"
        >
          <div className="space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform shadow-sm">
                <CalendarRange className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <span className="px-3 py-1 text-[11px] font-bold tracking-wide uppercase bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
                Kalender &amp; Pembagian Jam
              </span>
            </div>

            <div>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Prota &amp; Promes
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Perencanaan alokasi waktu tahunan dan pembagian jam mengajar mingguan. Dilengkapi Kalender Pendidikan, Rincian Minggu Efektif (RME), dan matriks jam otomatis.
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Kalender Pendidikan otomatis sesuai kalender resmi sekolah</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Hitung otomatis Minggu Efektif dan jam tatap muka (JP)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Matriks pembagian jam mengajar per pekan (Semester 1 &amp; 2)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Cetak dokumen A4 Landscape atau ekspor ke Word &amp; Excel</span>
              </div>
            </div>
          </div>

          <div className="mt-6 sm:mt-8 pt-3 sm:pt-4">
            <button
              type="button"
              className="w-full min-h-[48px] py-3 px-4 rounded-xl sm:rounded-2xl bg-emerald-600 group-hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition-all group-hover:shadow-lg group-hover:shadow-emerald-500/30 active:scale-[0.99]"
            >
              <span>Buka Prota &amp; Promes</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
