import React from 'react';
import { Sparkles } from 'lucide-react';

export interface AiButtonProps {
  field: string;
  label?: string;
  onAiFillField?: (field: string, refresh?: boolean) => void;
  fieldLoading?: Record<string, boolean>;
  fieldValues?: Record<string, string>;
}

export const AiButton: React.FC<AiButtonProps> = ({
  field,
  label,
  onAiFillField,
  fieldLoading,
  fieldValues,
}) => {
  if (!onAiFillField) return null;
  const loading = fieldLoading?.[field] ?? false;
  const reference = field === 'capaianPembelajaran' || field === 'manualDaftarPustaka';
  const titles: Record<string, string> = {
    manualTujuanPembelajaran: 'tujuan pembelajaran',
    manualPemahamanBermakna: 'pemahaman bermakna',
    manualPertanyaanPemantik: 'pertanyaan pemantik',
    manualMateriAjar: 'materi ajar',
    manualLkpdTugas: 'LKPD',
    manualSoalEvaluasi: 'soal evaluasi',
    manualPengayaan: 'pengayaan',
    manualRemedial: 'remedial',
    manualGlosarium: 'glosarium',
    kompetensiAwal: 'kompetensi awal',
  };
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <button
        type="button"
        onClick={() => onAiFillField(field)}
        disabled={loading}
        aria-label={reference ? undefined : `Isi ${titles[field] ?? 'bagian ini'} dengan AI`}
        className="min-h-11 text-xs text-brand-600 dark:text-brand-400 font-medium flex items-center gap-1 hover:text-brand-700 bg-brand-50 dark:bg-brand-900/30 px-2.5 py-1.5 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50"
      >
        {loading ? (
          <span className="inline-block w-3.5 h-3.5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5" />
        )}
        {loading
          ? 'Memproses...'
          : reference
            ? field === 'capaianPembelajaran'
              ? 'Ambil CP terverifikasi'
              : 'Ambil referensi'
            : label || 'Isi dengan AI'}
      </button>
      {!reference && fieldValues?.[field]?.trim() && (
        <button
          type="button"
          onClick={() => onAiFillField(field, true)}
          disabled={loading}
          aria-label={`Buat versi AI baru untuk ${titles[field] ?? 'bagian ini'}`}
          className="min-h-11 rounded-lg px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Versi baru
        </button>
      )}
    </span>
  );
};
