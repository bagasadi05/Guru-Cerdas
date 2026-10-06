import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  AlertCircle,
  BookOpen,
  Sparkles,
  ChevronUp,
  ChevronDown,
  ArrowLeftRight,
  Bot,
  Loader2,
  FileText,
} from 'lucide-react';
import type {
  ProtaItem,
  ProtaValidationResult,
  CurriculumType,
  RmeSummary,
} from '../../../types/perangkatAjar';
import { getProtaBalanceBadgeProps } from '../../../utils/protaEngine';

interface ProtaTabProps {
  items: ProtaItem[];
  onAddItem: (item: Omit<ProtaItem, 'id' | 'orderIndex'>) => void;
  onUpdateItem: (id: string, updates: Partial<ProtaItem>) => void;
  onDeleteItem: (id: string) => void;
  onMoveItem?: (id: string, direction: 'up' | 'down') => void;
  onSwapSemester?: (id: string) => void;
  /** Present only when a bundled chapter list exists for the current subject and grade. */
  onLoadSampleData?: () => void;
  onOpenWizard?: () => void;
  onAutoBalance?: () => void;
  /** Opens the Modul Ajar creator prefilled with this materi. */
  onCreateModulAjar?: (item: ProtaItem) => void;
  /** Drafts every materi with AI (replaces the current list, undoable). */
  onFillWithAi?: () => void;
  isAiBusy?: boolean;
  curriculum: CurriculumType;
  onChangeCurriculum: (curriculum: CurriculumType) => void;
  validation: ProtaValidationResult;
  rmeSem1: RmeSummary;
  rmeSem2: RmeSummary;
}

export const ProtaTab: React.FC<ProtaTabProps> = ({
  items,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onMoveItem,
  onSwapSemester,
  onLoadSampleData,
  onOpenWizard,
  onAutoBalance,
  onFillWithAi,
  onCreateModulAjar,
  isAiBusy = false,
  curriculum,
  onChangeCurriculum,
  validation,
  rmeSem1,
  rmeSem2,
}) => {
  const [activeSemFilter, setActiveSemFilter] = useState<'ALL' | 1 | 2>('ALL');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    semesterNumber: 1 as 1 | 2,
    elementOrDomain: '',
    learningObjectiveCode: '',
    learningObjectiveText: '',
    coreTopic: '',
    targetJp: 4,
  });

  const resetForm = () => {
    setFormData({
      semesterNumber: 1,
      elementOrDomain: '',
      learningObjectiveCode: '',
      learningObjectiveText: '',
      coreTopic: '',
      targetJp: 4,
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleStartEdit = (item: ProtaItem) => {
    setFormData({
      semesterNumber: item.semesterNumber,
      elementOrDomain: item.elementOrDomain,
      learningObjectiveCode: item.learningObjectiveCode,
      learningObjectiveText: item.learningObjectiveText,
      coreTopic: item.coreTopic,
      targetJp: item.targetJp,
    });
    setEditingId(item.id);
    setIsAdding(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.learningObjectiveText.trim()) return;

    if (editingId) {
      onUpdateItem(editingId, {
        semesterNumber: formData.semesterNumber,
        elementOrDomain: formData.elementOrDomain,
        learningObjectiveCode: formData.learningObjectiveCode,
        learningObjectiveText: formData.learningObjectiveText,
        coreTopic: formData.coreTopic,
        targetJp: Number(formData.targetJp) || 0,
      });
    } else {
      onAddItem({
        semesterNumber: formData.semesterNumber,
        elementOrDomain: formData.elementOrDomain,
        learningObjectiveCode: formData.learningObjectiveCode,
        learningObjectiveText: formData.learningObjectiveText,
        coreTopic: formData.coreTopic,
        targetJp: Number(formData.targetJp) || 0,
      });
    }

    resetForm();
  };

  const filteredItems = items
    .filter((it) => activeSemFilter === 'ALL' || it.semesterNumber === activeSemFilter)
    .sort((a, b) => {
      const semA = a.semesterNumber ?? 1;
      const semB = b.semesterNumber ?? 1;
      if (semA !== semB) return semA - semB;
      return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
    });

  const isFirstInSemester = (item: ProtaItem) => {
    const semItems = items
      .filter((i) => (i.semesterNumber ?? 1) === (item.semesterNumber ?? 1))
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    return semItems.length > 0 && semItems[0].id === item.id;
  };

  const isLastInSemester = (item: ProtaItem) => {
    const semItems = items
      .filter((i) => (i.semesterNumber ?? 1) === (item.semesterNumber ?? 1))
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    return semItems.length > 0 && semItems[semItems.length - 1].id === item.id;
  };

  const sem1Badge = getProtaBalanceBadgeProps(validation.statusSemester1, validation.diffSemester1);
  const sem2Badge = getProtaBalanceBadgeProps(validation.statusSemester2, validation.diffSemester2);
  const annualBadge = getProtaBalanceBadgeProps(validation.statusAnnual, validation.diffAnnual);

  return (
    <div className="space-y-6">
      {/* 1. Real-Time Balance Validation Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Semester 1 Card */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Semester 1 (Ganjil)</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${sem1Badge.badgeClass}`}>
              {sem1Badge.diffText}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <div>
              <span className="text-xs text-slate-500">Alokasi / Target RME</span>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {validation.allocatedSemester1Jp} <span className="text-xs font-normal text-slate-500">/ {rmeSem1.netTeachingJp} JP</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                {sem1Badge.label}
              </span>
            </div>
          </div>
        </div>

        {/* Semester 2 Card */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Semester 2 (Genap)</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${sem2Badge.badgeClass}`}>
              {sem2Badge.diffText}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <div>
              <span className="text-xs text-slate-500">Alokasi / Target RME</span>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {validation.allocatedSemester2Jp} <span className="text-xs font-normal text-slate-500">/ {rmeSem2.netTeachingJp} JP</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                {sem2Badge.label}
              </span>
            </div>
          </div>
        </div>

        {/* Total Annual Card */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Total Tahunan (Prota)</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${annualBadge.badgeClass}`}>
              {annualBadge.diffText}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <div>
              <span className="text-xs text-slate-500">Alokasi / Target RME</span>
              <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {validation.allocatedAnnualJp} <span className="text-xs font-normal text-slate-500">/ {validation.totalTargetJp} JP</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                {annualBadge.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Discrepancy Alert */}
      {(validation.statusAnnual !== 'PAS' || validation.statusSemester1 !== 'PAS' || validation.statusSemester2 !== 'PAS') && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all shadow-sm ${
            validation.statusAnnual === 'DEFISIT' || validation.statusSemester1 === 'DEFISIT' || validation.statusSemester2 === 'DEFISIT'
              ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              : 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          <div className="flex items-start gap-3">
            {validation.statusAnnual === 'DEFISIT' || validation.statusSemester1 === 'DEFISIT' || validation.statusSemester2 === 'DEFISIT' ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <p className="font-bold text-sm">
                {validation.diffAnnual < 0
                  ? `Alokasi jam mengajar masih kurang ${Math.abs(validation.diffAnnual)} JP dari target minggu efektif!`
                  : validation.diffAnnual > 0
                  ? `Alokasi jam mengajar berlebih ${validation.diffAnnual} JP dari target minggu efektif!`
                  : `Alokasi jam per semester belum seimbang (Ganjil: ${validation.diffSemester1 > 0 ? `+${validation.diffSemester1}` : validation.diffSemester1} JP, Genap: ${validation.diffSemester2 > 0 ? `+${validation.diffSemester2}` : validation.diffSemester2} JP)!`}
              </p>
              <p className="opacity-90 leading-relaxed">
                {validation.diffAnnual < 0
                  ? 'Total jam materi belum mencukupi jam efektif. Seimbangkan Jam menambah kekurangannya ke materi, mulai dari materi terbesar.'
                  : validation.diffAnnual > 0
                  ? 'Total jam materi melebihi jam tatap muka yang tersedia. Seimbangkan Jam mengurangi kelebihannya, mulai dari materi terbesar.'
                  : 'Total jam tahunan sudah pas, tetapi pembagian Semester 1 dan 2 belum sesuai Kaldik. Seimbangkan Jam menyesuaikan tiap semester.'}
              </p>
            </div>
          </div>
          {onAutoBalance && (
            <div className="shrink-0 flex items-center gap-2">
              <button
                type="button"
                onClick={onAutoBalance}
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-700 hover:to-indigo-700 dark:from-amber-500 dark:to-indigo-500 shadow-md hover:shadow-lg transition-all cursor-pointer whitespace-nowrap active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Seimbangkan Jam</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. Controls Toolbar & Curriculum Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-brand-600 dark:text-brand-400 shrink-0" />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pilihan Kurikulum:</span>
          </div>
          <div className="grid grid-cols-2 sm:flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onChangeCurriculum('MERDEKA')}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
                curriculum === 'MERDEKA'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <span className="sm:hidden">Merdeka</span>
              <span className="hidden sm:inline">Kurikulum Merdeka (CP/TP)</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeCurriculum('K13')}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg transition-all text-center cursor-pointer ${
                curriculum === 'K13'
                  ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <span className="sm:hidden">K13</span>
              <span className="hidden sm:inline">Kurikulum 2013 (KI/KD)</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
          {onOpenWizard && (
            <button
              type="button"
              onClick={onOpenWizard}
              className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-bold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/50 hover:bg-brand-100 dark:hover:bg-brand-900/60 rounded-xl transition-colors border border-brand-200 dark:border-brand-800 cursor-pointer active:scale-95"
              title="Buka panduan cepat pembuatan Prota & Promes"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-500" />
              <span>Panduan Cepat</span>
            </button>
          )}

          {onAutoBalance &&
            items.length > 0 &&
            (validation.statusAnnual !== 'PAS' ||
              validation.statusSemester1 !== 'PAS' ||
              validation.statusSemester2 !== 'PAS') && (
              <button
                type="button"
                onClick={onAutoBalance}
                className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-100/80 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/80 rounded-xl transition-colors border border-amber-300 dark:border-amber-700 cursor-pointer active:scale-95 shadow-sm"
                title="Seimbangkan Alokasi Jam Mengajar Otomatis"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Seimbangkan JP</span>
              </button>
            )}

          {onFillWithAi && (
            <button
              type="button"
              onClick={onFillWithAi}
              disabled={isAiBusy}
              className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer active:scale-95 disabled:opacity-60"
              title={
                items.length > 0
                  ? 'Ganti seluruh materi dengan draf dari AI (bisa dibatalkan)'
                  : 'Buat draf elemen, TP, dan bab dengan AI'
              }
            >
              {isAiBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
              <span>{isAiBusy ? 'AI menyusun...' : 'Susun dengan AI'}</span>
            </button>
          )}

          {items.length === 0 && onLoadSampleData && (
            <button
              type="button"
              onClick={onLoadSampleData}
              className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer active:scale-95"
              title="Isi dengan bab dan TP contoh dari buku Kurikulum Merdeka untuk mapel dan kelas ini"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Muat Bab Bawaan</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              resetForm();
              setIsAdding(!isAdding);
            }}
            className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 px-4 py-2 min-h-[40px] text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors shadow-sm cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Materi ({curriculum === 'K13' ? 'KD' : 'TP'})</span>
          </button>
        </div>
      </div>

      {/* 3. Add/Edit Form Drawer */}
      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="p-5 bg-white dark:bg-slate-900 border border-brand-200 dark:border-brand-800/80 rounded-2xl shadow-sm space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {editingId ? 'Edit Materi Pelajaran' : 'Tambah Materi Pelajaran Baru'}
            </h4>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Batal
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Pilihan Semester
              </label>
              <select
                value={formData.semesterNumber}
                onChange={(e) =>
                  setFormData({ ...formData, semesterNumber: Number(e.target.value) as 1 | 2 })
                }
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value={1}>Semester 1 (Ganjil)</option>
                <option value={2}>Semester 2 (Genap)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {curriculum === 'K13' ? 'Kompetensi Inti (KI)' : 'Elemen / Domain Pembelajaran'}
              </label>
              <input
                type="text"
                placeholder={curriculum === 'K13' ? 'Contoh: KI-3 & KI-4' : 'Contoh: Menyimak / Bilangan'}
                value={formData.elementOrDomain}
                onChange={(e) => setFormData({ ...formData, elementOrDomain: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {curriculum === 'K13' ? 'Kode KD' : 'Kode TP'}
              </label>
              <input
                type="text"
                placeholder={curriculum === 'K13' ? 'Contoh: KD 3.1 / 4.1' : 'Contoh: TP 1.1'}
                value={formData.learningObjectiveCode}
                onChange={(e) => setFormData({ ...formData, learningObjectiveCode: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alokasi Waktu (JP)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={formData.targetJp}
                onChange={(e) =>
                  setFormData({ ...formData, targetJp: Math.max(1, parseInt(e.target.value, 10) || 1) })
                }
                className="w-full px-3 py-2 text-xs font-bold text-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {curriculum === 'K13' ? 'Uraian Kompetensi Dasar (KD)' : 'Uraian Tujuan Pembelajaran (TP)'}
              </label>
              <textarea
                rows={2}
                placeholder="Contoh: Peserta didik mampu memahami..."
                value={formData.learningObjectiveText}
                onChange={(e) => setFormData({ ...formData, learningObjectiveText: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Lingkup Materi / Topik Bahasan
              </label>
              <textarea
                rows={2}
                placeholder="Contoh: Operasi Hitung Bilangan Bulat..."
                value={formData.coreTopic}
                onChange={(e) => setFormData({ ...formData, coreTopic: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition-colors shadow-sm"
            >
              {editingId ? 'Simpan Perubahan Materi' : 'Simpan ke Program Tahunan'}
            </button>
          </div>
        </form>
      )}

      {/* 4. Prota Items Table / Responsive Cards */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {/* Table Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="grid grid-cols-3 sm:flex gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveSemFilter('ALL')}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg transition-colors text-center cursor-pointer ${
                activeSemFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              Semua ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSemFilter(1)}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg transition-colors text-center cursor-pointer ${
                activeSemFilter === 1
                  ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <span className="sm:hidden">Sem 1 ({items.filter((i) => i.semesterNumber === 1).length})</span>
              <span className="hidden sm:inline">Semester 1 ({items.filter((i) => i.semesterNumber === 1).length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSemFilter(2)}
              className={`px-3 py-1.5 min-h-[36px] text-xs font-semibold rounded-lg transition-colors text-center cursor-pointer ${
                activeSemFilter === 2
                  ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <span className="sm:hidden">Sem 2 ({items.filter((i) => i.semesterNumber === 2).length})</span>
              <span className="hidden sm:inline">Semester 2 ({items.filter((i) => i.semesterNumber === 2).length})</span>
            </button>
          </div>

          <span className="text-xs text-slate-500 font-medium">
            Total Jam Alokasi: <strong className="text-slate-800 dark:text-slate-200">{filteredItems.reduce((acc, i) => acc + (i.targetJp || 0), 0)} JP</strong>
          </span>
        </div>

        {/* Mobile Card List View (< md) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredItems.length === 0 ? (
            <div className="py-10 px-4 text-center text-slate-500 text-xs space-y-3">
              <p>
                Belum ada data materi Program Tahunan. Ketuk <strong>Tambah Materi ({curriculum === 'K13' ? 'KD' : 'TP'})</strong> atau gunakan <strong>Panduan Cepat</strong>.
              </p>
              {onOpenWizard && (
                <div>
                  <button
                    type="button"
                    onClick={onOpenWizard}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-brand-700 dark:text-brand-300 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/60 border border-brand-200 dark:border-brand-800 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                    <span>Mulai dengan Panduan Cepat</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            filteredItems.map((item, index) => (
              <div key={item.id} className="p-4 space-y-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-400 font-bold">#{index + 1}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.semesterNumber === 1
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
                      }`}
                    >
                      Sem. {item.semesterNumber}
                    </span>
                    {item.elementOrDomain && (
                      <span className="text-[11px] text-slate-500 font-medium truncate max-w-[130px]">
                        {item.elementOrDomain}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                    {item.targetJp} JP
                  </span>
                </div>

                <div className="space-y-1">
                  {item.learningObjectiveCode && (
                    <span className="text-xs font-bold text-brand-600 dark:text-brand-400 font-mono">
                      {item.learningObjectiveCode}
                    </span>
                  )}
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                    {item.learningObjectiveText}
                  </p>
                  {item.coreTopic && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                      <strong className="text-slate-600 dark:text-slate-300">Materi:</strong> {item.coreTopic}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {onMoveItem && (
                      <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden">
                        <button
                          type="button"
                          disabled={isFirstInSemester(item)}
                          onClick={() => onMoveItem(item.id, 'up')}
                          className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 disabled:opacity-25 disabled:pointer-events-none active:scale-95 transition-all cursor-pointer"
                          title="Pindah urutan ke atas"
                          aria-label={`Pindah ${item.learningObjectiveCode || 'materi'} ke atas`}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-700" />
                        <button
                          type="button"
                          disabled={isLastInSemester(item)}
                          onClick={() => onMoveItem(item.id, 'down')}
                          className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 disabled:opacity-25 disabled:pointer-events-none active:scale-95 transition-all cursor-pointer"
                          title="Pindah urutan ke bawah"
                          aria-label={`Pindah ${item.learningObjectiveCode || 'materi'} ke bawah`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {onSwapSemester && (
                      <button
                        type="button"
                        onClick={() => onSwapSemester(item.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 min-h-[38px] text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 active:scale-95 transition-all cursor-pointer"
                        title={`Pindah ke Semester ${item.semesterNumber === 1 ? 2 : 1}`}
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5 text-brand-500" />
                        <span>Ke Sem {item.semesterNumber === 1 ? '2' : '1'}</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {onCreateModulAjar && (
                      <button
                        type="button"
                        onClick={() => onCreateModulAjar(item)}
                        className="flex items-center gap-1 px-3 py-1.5 min-h-[38px] text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200 dark:border-indigo-900/40 active:scale-95 transition-all cursor-pointer"
                        aria-label={`Buat Modul Ajar untuk ${item.learningObjectiveCode || 'materi ini'}`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Modul Ajar</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(item)}
                      className="flex items-center gap-1 px-3 py-1.5 min-h-[38px] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 active:scale-95 transition-all cursor-pointer"
                      aria-label={`Edit ${item.learningObjectiveCode || 'materi'}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      className="flex items-center gap-1 px-3 py-1.5 min-h-[38px] text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/40 active:scale-95 transition-all cursor-pointer"
                      aria-label={`Hapus ${item.learningObjectiveCode || 'materi'}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View (>= md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-3 w-24 text-center">Semester</th>
                <th className="py-3 px-3 w-36">
                  {curriculum === 'K13' ? 'Kompetensi Inti' : 'Elemen Pembelajaran'}
                </th>
                <th className="py-3 px-3 min-w-[240px]">
                  {curriculum === 'K13' ? 'Kompetensi Dasar (KD)' : 'Tujuan Pembelajaran (TP)'}
                </th>
                <th className="py-3 px-3 w-48">Lingkup Materi</th>
                <th className="py-3 px-3 w-24 text-center">Alokasi JP</th>
                <th className="py-3 px-3 w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="space-y-3 max-w-md mx-auto">
                      <p className="text-xs">
                        Belum ada materi. Tambahkan manual, atau pakai Panduan Cepat untuk membuat daftar materi beserta jamnya.
                      </p>
                      {onOpenWizard && (
                        <div>
                          <button
                            type="button"
                            onClick={onOpenWizard}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-brand-700 dark:text-brand-300 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 dark:hover:bg-brand-900/60 border border-brand-200 dark:border-brand-800 rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                            <span>Mulai dengan Panduan Cepat</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-3 text-center text-slate-400 font-mono">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="w-4 text-center">{index + 1}</span>
                        {onMoveItem && (
                          <div className="flex flex-col -space-y-1">
                            <button
                              type="button"
                              disabled={isFirstInSemester(item)}
                              onClick={() => onMoveItem(item.id, 'up')}
                              className="p-0.5 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                              title="Pindah ke atas"
                              aria-label={`Pindah ${item.learningObjectiveCode || 'materi'} ke atas`}
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={isLastInSemester(item)}
                              onClick={() => onMoveItem(item.id, 'down')}
                              className="p-0.5 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer"
                              title="Pindah ke bawah"
                              aria-label={`Pindah ${item.learningObjectiveCode || 'materi'} ke bawah`}
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.semesterNumber === 1
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-400'
                          }`}
                        >
                          Sem. {item.semesterNumber}
                        </span>
                        {onSwapSemester && (
                          <button
                            type="button"
                            onClick={() => onSwapSemester(item.id)}
                            className="p-1 text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                            title={`Pindahkan ke Semester ${item.semesterNumber === 1 ? 2 : 1}`}
                            aria-label={`Pindahkan ${item.learningObjectiveCode || 'materi'} ke Semester ${item.semesterNumber === 1 ? 2 : 1}`}
                          >
                            <ArrowLeftRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                      {item.elementOrDomain || '-'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="space-y-0.5">
                        {item.learningObjectiveCode && (
                          <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 block font-mono">
                            {item.learningObjectiveCode}
                          </span>
                        )}
                        <p className="text-xs leading-relaxed">{item.learningObjectiveText}</p>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {item.coreTopic || '-'}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-slate-100">
                      {item.targetJp} JP
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {onCreateModulAjar && (
                          <button
                            type="button"
                            onClick={() => onCreateModulAjar(item)}
                            className="min-w-[36px] min-h-[36px] flex items-center justify-center p-1.5 text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Buat Modul Ajar dari materi ini"
                            aria-label={`Buat Modul Ajar untuk ${item.learningObjectiveCode || 'materi ini'}`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="min-w-[36px] min-h-[36px] flex items-center justify-center p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                          title="Edit baris"
                          aria-label={`Edit ${item.learningObjectiveCode || 'materi'}`}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteItem(item.id)}
                          className="min-w-[36px] min-h-[36px] flex items-center justify-center p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Hapus baris"
                          aria-label={`Hapus ${item.learningObjectiveCode || 'materi'}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
