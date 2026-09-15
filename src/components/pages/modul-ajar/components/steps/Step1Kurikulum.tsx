import React from 'react';
import { Zap, Heart, CheckCircle2, Check } from 'lucide-react';
import { FormState } from '../../types';
import { PRESET_STARTERS } from '../../constants/presetStarters';

interface Step1KurikulumProps {
  formState: FormState;
  onChange: (field: keyof FormState, value: any) => void;
  onApplyPreset?: (presetData: Partial<FormState>) => void;
  isAiEnabled: boolean;
  currentActiveYearName: string;
  currentActiveSemName: string;
  t: any;
  topicsToDisplay: any[];
  materiToDisplay: string[];
}

export const Step1Kurikulum: React.FC<Step1KurikulumProps> = ({
  formState,
  onChange,
  onApplyPreset,
  isAiEnabled,
  currentActiveYearName,
  currentActiveSemName,
  t,
  topicsToDisplay,
  materiToDisplay,
}) => {
  return (
    <div className="space-y-6">
      {/* Quick Presets Starter Bar */}
      {onApplyPreset && (
        <div className="p-3.5 bg-gradient-to-br from-brand-50/80 to-emerald-50/80 dark:from-brand-950/40 dark:to-emerald-950/40 rounded-2xl border border-brand-200/80 dark:border-brand-800/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand-900 dark:text-brand-200 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-400" />
              Preset Cepat (Muat Contoh Lengkap 1-Klik)
            </span>
            <span className="text-[10px] bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 px-2 py-0.5 rounded-full font-bold">
              Praktis
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {PRESET_STARTERS.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onApplyPreset(preset.data)}
                className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-brand-200 dark:border-brand-800/80 hover:border-brand-500 dark:hover:border-brand-500 rounded-xl text-[11px] font-semibold text-slate-700 dark:text-slate-200 text-center transition-all hover:shadow-xs"
              >
                {preset.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
          Langkah 1: Jenis & Pendekatan Kurikulum
        </h3>
        <span className="text-[10px] bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 font-bold px-2 py-0.5 rounded-full">
          Wajib
        </span>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Metode Penyusunan</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { id: 'Manual', label: '⚡ Database (Non-AI)', desc: 'Penyusunan instan dari Bank Data & Template (Sangat Cepat & Ringan)' },
              ...(isAiEnabled ? [{ id: 'AI', label: '✨ Generatif AI', desc: 'Disusun otomatis oleh AI (Perlu Koneksi)' }] : [])
            ].map(method => (
              <button
                key={method.id}
                type="button"
                onClick={() => onChange('generationMethod', method.id)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  formState.generationMethod === method.id
                    ? 'bg-brand-50 border-brand-500 text-brand-700 dark:bg-brand-900/40 dark:border-brand-500 font-semibold shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-sm">{method.label}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">{method.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">{t.lessonPlan.documentType}</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {['Modul Ajar', 'RPP'].map(type => (
              <button
                key={type}
                type="button"
                onClick={() => onChange('documentType', type)}
                className={`p-3 min-h-[44px] rounded-xl border text-sm font-bold transition-all ${
                  formState.documentType === type
                    ? 'bg-brand-50 border-brand-500 text-brand-700 dark:bg-brand-900/40 dark:border-brand-500'
                    : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                {type === 'Modul Ajar' ? t.lessonPlan.documentTypeModulAjar : t.lessonPlan.documentTypeRpp}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">{t.lessonPlan.curriculumApproach}</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {['Merdeka', 'Berbasis Cinta', 'Hybrid'].map(approach => (
              <button
                key={approach}
                type="button"
                onClick={() => {
                  onChange('curriculumApproach', approach);
                  if (approach === 'Berbasis Cinta') {
                    onChange('isKbcIntegrated', true);
                  } else {
                    onChange('isKbcIntegrated', false);
                  }
                }}
                className={`p-3 rounded-xl border text-xs sm:text-sm font-bold transition-all ${
                  formState.curriculumApproach === approach
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-500 dark:text-emerald-200'
                    : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                {approach === 'Berbasis Cinta' ? '❤️ KBC (Kemenag)' : approach}
              </button>
            ))}
          </div>
        </div>

        {/* KBC Integrated Options */}
        {formState.curriculumApproach === 'Berbasis Cinta' && (
          <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-emerald-600 dark:text-emerald-400 fill-emerald-500/20" />
                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wide">
                  Integrasi Kurikulum Berbasis Cinta (KBC 2025)
                </h4>
              </div>
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                Panduan Kemenag
              </span>
            </div>

            {/* Topik Panca Cinta Selection */}
            <div>
              <label className="block text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1.5">
                Topik Panca Cinta (Pilih 1-2 Topik Wajib)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {topicsToDisplay.map(topic => {
                  const isSelected = formState.temaKbc.includes(topic.id);
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => {
                        let newTopics = [...formState.temaKbc];
                        if (isSelected) {
                          newTopics = newTopics.filter(id => id !== topic.id);
                        } else {
                          if (newTopics.length >= 2) newTopics.shift();
                          newTopics.push(topic.id);
                        }
                        onChange('temaKbc', newTopics);
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all text-xs flex items-start gap-2 ${
                        isSelected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-emerald-100 dark:border-emerald-900/50 hover:border-emerald-400'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isSelected ? (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        ) : (
                          <Heart className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-xs">{topic.nama_tema}</div>
                        <div className={`text-[11px] mt-0.5 line-clamp-2 ${isSelected ? 'text-emerald-100' : 'text-slate-400 dark:text-slate-500'}`}>
                          {topic.deskripsi}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Materi Insersi Preset & Custom */}
            <div>
              <label className="block text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1">
                Materi Insersi Nilai Cinta (Butir Spesifik)
              </label>
              
              {formState.temaKbc.length > 0 && (
                <div className="mb-2 space-y-1">
                  <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold block">
                    Preset Insersi dari Kemenag (Klik + untuk memilih otomatis):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {materiToDisplay.map((kontenText, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onChange('materiInsersi', kontenText)}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-800 hover:border-emerald-500 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 font-medium text-left transition-colors shadow-2xs"
                      >
                        + {kontenText}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <textarea
                rows={2}
                value={formState.materiInsersi}
                onChange={(e) => onChange('materiInsersi', e.target.value)}
                placeholder="Contoh: Meneladani Asmaul Husna Ar-Rahman dalam berinteraksi dengan sesama teman..."
                className="w-full p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-xs bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Satuan Pendidikan</label>
          <input 
            type="text" 
            value={formState.satuanPendidikan}
            onChange={(e) => onChange('satuanPendidikan', e.target.value)}
            className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs text-slate-500 dark:text-slate-400 font-medium">Tahun Ajaran</label>
              {formState.tahunAjaran === currentActiveYearName ? (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                  <Check className="w-3 h-3" /> TA Aktif
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onChange('tahunAjaran', currentActiveYearName)}
                  className="text-[10px] text-brand-600 dark:text-brand-400 hover:underline font-semibold"
                  title={`Set ke Tahun Ajaran Aktif (${currentActiveYearName})`}
                >
                  Set TA Aktif
                </button>
              )}
            </div>
            <input 
              type="text" 
              value={formState.tahunAjaran}
              onChange={(e) => onChange('tahunAjaran', e.target.value)}
              placeholder={`Contoh: ${currentActiveYearName}`}
              className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs text-slate-500 dark:text-slate-400 font-medium">Semester</label>
              {formState.semester === currentActiveSemName && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
                  <Check className="w-3 h-3" /> Aktif
                </span>
              )}
            </div>
            <select 
              value={formState.semester}
              onChange={(e) => onChange('semester', e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-200 text-sm bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-brand-500 outline-none"
            >
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
