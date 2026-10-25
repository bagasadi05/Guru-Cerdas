import React from 'react';
import { CheckCircle, Sparkles, CalendarClock, Download, Save } from 'lucide-react';

interface PerangkatAjarHeaderProps {
  lastSaved: Date | null;
  isSaving: boolean;
  isPackaging: boolean;
  hasMultipleYearDocuments: boolean;
  academicYear: string;
  onOpenWizard: () => void;
  onOpenScheduleBatch: () => void;
  onDownloadPackage: (scope: 'current' | 'year') => void;
  onSaveAll: () => void;
}

export const PerangkatAjarHeader: React.FC<PerangkatAjarHeaderProps> = ({
  lastSaved,
  isSaving,
  isPackaging,
  hasMultipleYearDocuments,
  academicYear,
  onOpenWizard,
  onOpenScheduleBatch,
  onDownloadPackage,
  onSaveAll,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
      <div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 text-[11px] font-bold tracking-wider uppercase bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 rounded-full border border-brand-200 dark:border-brand-800">
            Perencanaan Pembelajaran
          </span>
          {lastSaved && (
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <CheckCircle className="w-3 h-3 text-emerald-500" />
              Tersimpan {lastSaved.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight mt-2">
          Program Tahunan (Prota) &amp; Program Semester (Promes)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Atur kalender pendidikan, hitung minggu efektif, dan susun pembagian jam mengajar tatap muka per minggu secara rapi dan seimbang sesuai panduan resmi.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
        <button
          type="button"
          onClick={onOpenWizard}
          className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-brand-700 dark:text-brand-300 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/60 border border-brand-200 dark:border-brand-800 rounded-2xl transition-all shadow-xs hover:shadow cursor-pointer active:scale-95"
          title="Buka panduan cepat pembuatan Prota & Promes"
        >
          <Sparkles className="w-4 h-4 text-brand-500" />
          <span>Panduan Cepat</span>
        </button>
        <button
          type="button"
          onClick={onOpenScheduleBatch}
          className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl transition-all"
          title="Buat Prota & Promes untuk semua mapel dan kelas di jadwal mengajar"
        >
          <CalendarClock className="w-4 h-4" />
          <span>Buat dari Jadwal</span>
        </button>
        <button
          type="button"
          onClick={() => onDownloadPackage(hasMultipleYearDocuments ? 'year' : 'current')}
          disabled={isPackaging}
          className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl transition-all disabled:opacity-50"
          title={
            hasMultipleYearDocuments
              ? `Unduh Prota & Promes untuk semua dokumen tahun ${academicYear} dalam satu ZIP`
              : 'Unduh Prota (Word) dan Promes Semester 1 & 2 (Excel) dalam satu ZIP'
          }
        >
          <Download className="w-4 h-4" />
          <span>{isPackaging ? 'Menyiapkan...' : 'Unduh Paket'}</span>
        </button>
        <button
          onClick={onSaveAll}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-2xl transition-all shadow-sm hover:shadow"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Menyimpan...' : 'Simpan Semua'}</span>
        </button>
      </div>
    </div>
  );
};
