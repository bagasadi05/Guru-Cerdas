import React from 'react';
import {
  Users, CheckCircle, Eye, FileText, RotateCcw, Printer,
  Download, Loader2, X, FileSpreadsheet, MessageCircle
} from 'lucide-react';
import { MotionDiv, AnimatePresence } from '../../../ui/MotionComponents';
import { Card } from '../../../ui/Card';
import { Button } from '../../../ui/Button';
import { BINTANG_THRESHOLDS, AspectPointsSummary, BintangGrade } from '../../../../services/bintangService';
import { gradeColors } from '../bintangConstants';
import { useToast } from '../../../../hooks/useToast';
import { createWhatsAppLink, generateBintangMonthlyMessage } from '../../../../utils/whatsappUtils';

import { BulkSelectionState } from '../../../advanced-features/useBulkSelection';

interface StudentData {
  id: string;
  name: string;
  parent_phone?: string | null;
  parent_name?: string | null;
}

interface BintangEvaluationTableProps {
  students: StudentData[];
  isWalas: boolean;
  bulkSelection: BulkSelectionState;
  evalHook: any;
  getAspectSummary: (studentId: string) => AspectPointsSummary;
  studentQuizMap: Map<string, any>;
  studentAttitudeMap: Record<string, { spiritual?: string; social?: string }>;
  selectedMonth: string;
  onOpenDetail: (studentId: string) => void;
  onOpenBulkExport: () => void;
}

export const BintangEvaluationTable: React.FC<BintangEvaluationTableProps> = ({
  students,
  isWalas,
  bulkSelection,
  evalHook,
  getAspectSummary,
  studentQuizMap,
  studentAttitudeMap,
  selectedMonth,
  onOpenDetail,
  onOpenBulkExport,
}) => {
  const toast = useToast();

  const handleSendWhatsAppEvaluation = (student: StudentData, ev: any, aspect: AspectPointsSummary) => {
    if (!student.parent_phone || student.parent_phone.trim() === '') {
      toast.error(`Nomor WhatsApp orang tua untuk ${student.name} belum terdaftar.`);
      return;
    }

    const message = generateBintangMonthlyMessage(
      student.name,
      selectedMonth,
      {
        adab: ev?.adab_score || aspect.ADAB.grade,
        kedisiplinan: ev?.kedisiplinan_score || aspect.KEDISIPLINAN.grade,
        kerapian: ev?.kerapian_score || aspect.KERAPIAN.grade,
        catatan: ev?.catatan_wali || null,
      },
      student.parent_name
    );

    const link = createWhatsAppLink(student.parent_phone, message);
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-4">
      {/* ─── 1. Bulk Action Bar ────────────────────────────────────────── */}
      <AnimatePresence>
        {isWalas && bulkSelection.selectedCount > 0 && (
          <MotionDiv
            initial={{ opacity: 0, height: 0, y: -8 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -6 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 dark:bg-slate-850 text-white p-3 sm:px-4 sm:py-3 rounded-2xl shadow-md border border-slate-700/80">
              {/* Kiri: Status pilihan */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-brand-500/20 border border-brand-500/30 text-brand-300">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-600 text-white text-xs font-bold shadow-sm">
                    {bulkSelection.selectedCount}
                  </span>
                  <span className="text-sm font-semibold">siswa dipilih</span>
                </div>

                <button
                  type="button"
                  onClick={bulkSelection.isAllSelected ? bulkSelection.clearSelection : bulkSelection.selectAll}
                  className="text-xs sm:text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  {bulkSelection.isAllSelected ? 'Batal Pilih Semua' : `Pilih Semua (${students.length})`}
                </button>
              </div>

              {/* Kanan: Tombol aksi */}
              <div className="flex items-center gap-2">
                <Button
                  onClick={async () => {
                    await evalHook.handleDownloadBulkPdf(Array.from(bulkSelection.selectedItems));
                  }}
                  disabled={evalHook.isDownloadingBulk}
                  className="flex items-center gap-1.5 text-xs sm:text-sm h-10 px-4 font-medium bg-brand-600 hover:bg-brand-500 text-white rounded-xl shadow-sm active:scale-95"
                >
                  {evalHook.isDownloadingBulk ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Printer size={16} />
                  )}
                  <span>Cetak PDF</span>
                </Button>

                <Button
                  onClick={async () => {
                    await evalHook.handleExportExcel(Array.from(bulkSelection.selectedItems));
                  }}
                  disabled={evalHook.isExportingExcel}
                  className="flex items-center gap-1.5 text-xs sm:text-sm h-10 px-4 font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-sm active:scale-95"
                >
                  {evalHook.isExportingExcel ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet size={16} />
                  )}
                  <span>Export Excel</span>
                </Button>

                <Button
                  variant="outline"
                  onClick={onOpenBulkExport}
                  className="flex items-center gap-1.5 text-xs sm:text-sm h-10 px-3.5 font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 rounded-xl active:scale-95"
                >
                  <Download size={15} />
                  <span className="hidden sm:inline">Opsi Export...</span>
                  <span className="sm:hidden">Opsi</span>
                </Button>

                <button
                  type="button"
                  onClick={bulkSelection.clearSelection}
                  className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors ml-1"
                  aria-label="Batalkan pilihan (Esc)"
                  title="Batalkan pilihan (Esc)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
          </MotionDiv>
        )}
      </AnimatePresence>

      {/* ─── 2. Progress Bar (Evaluation fill status) ─────────────────── */}
      {isWalas && students.length > 0 && (
        <div className="flex items-center gap-4 text-sm">
          <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-brand-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${(evalHook.evalStats.filled / evalHook.evalStats.total) * 100}%` }}
            />
          </div>
          <span className="text-slate-600 dark:text-slate-400 whitespace-nowrap font-medium">
            {evalHook.evalStats.filled}/{evalHook.evalStats.total} terisi
            {evalHook.evalStats.published > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400 ml-2">
                ({evalHook.evalStats.published} published)
              </span>
            )}
          </span>
        </div>
      )}

      {/* ─── 3. Main Student Table ────────────────────────────────────── */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[480px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                {isWalas && (
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={bulkSelection.isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = bulkSelection.isPartiallySelected;
                      }}
                      onChange={bulkSelection.toggleAll}
                      className="rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500 h-4 w-4 cursor-pointer"
                      aria-label="Pilih semua siswa"
                    />
                  </th>
                )}
                <th className="py-2.5 px-3 font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Users size={14} /> Nama Siswa
                  </div>
                </th>
                <th className="py-2.5 px-2 font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300 text-center whitespace-nowrap">Poin</th>
                <th className="py-2.5 px-2 font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300 text-center whitespace-nowrap">Adab</th>
                <th className="py-2.5 px-2 font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300 text-center whitespace-nowrap">Disiplin</th>
                <th className="py-2.5 px-2 font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300 text-center whitespace-nowrap">Rapi</th>
                <th className="hidden md:table-cell py-2.5 px-3 font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300 text-center whitespace-nowrap">Status</th>
                <th className="py-2.5 px-3 font-semibold text-xs sm:text-sm text-slate-600 dark:text-slate-300 text-right whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={isWalas ? 8 : 7} className="text-center py-10 text-slate-500">
                    Tidak ada data siswa ditemukan di kelas ini.
                  </td>
                </tr>
              ) : (
                students.map((student) => {
                  const ev = evalHook.getEvaluationForStudent(student.id);
                  const aspect = getAspectSummary(student.id);
                  const isCompleted = !!ev;
                  const isPublished = ev?.is_published;
                  const totalPoints = (aspect.ADAB.points + aspect.KEDISIPLINAN.points + aspect.KERAPIAN.points);
                  const activePts = studentQuizMap.get(student.id);
                  const hasKeaktifan = activePts && activePts.totalPoints > 0;

                  return (
                    <tr
                      key={student.id}
                      className={`border-b border-slate-100 dark:border-slate-800 transition-colors ${
                        bulkSelection.isSelected(student.id)
                          ? 'bg-brand-50/60 dark:bg-brand-900/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      {isWalas && (
                        <td className="py-2 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={bulkSelection.isSelected(student.id)}
                            onChange={() => bulkSelection.toggleItem(student.id)}
                            className="rounded border-slate-300 dark:border-slate-600 text-brand-600 focus:ring-brand-500 h-4 w-4 cursor-pointer"
                            aria-label={`Pilih ${student.name}`}
                          />
                        </td>
                      )}
                      <td className="py-2 px-2 sm:py-3 sm:px-4 text-[11px] sm:text-sm font-medium text-slate-900 dark:text-white max-w-[90px] sm:max-w-none truncate" title={student.name}>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="truncate">{student.name}</span>
                          {hasKeaktifan && (
                            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-semibold" title={`+${activePts.totalPoints} poin keaktifan`}>
                              +{activePts.totalPoints}
                            </span>
                          )}
                          {studentAttitudeMap[student.id] && (studentAttitudeMap[student.id].spiritual || studentAttitudeMap[student.id].social) && (
                            <span
                              className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium border border-purple-200 dark:border-purple-800"
                              title={`Sikap: KI-1 (Spiritual) ${studentAttitudeMap[student.id]?.spiritual || '-'} | KI-2 (Sosial) ${studentAttitudeMap[student.id]?.social || '-'}`}
                            >
                              Sikap: {studentAttitudeMap[student.id]?.spiritual || '-'}/{studentAttitudeMap[student.id]?.social || '-'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-1 sm:py-3 sm:px-4 text-[10px] sm:text-sm text-center">
                        <span className={`font-bold ${totalPoints > 20 ? 'text-rose-600' : totalPoints > 10 ? 'text-amber-600' : totalPoints > 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                          {totalPoints}
                        </span>
                      </td>
                      {(['adab_score', 'kedisiplinan_score', 'kerapian_score'] as const).map((field, idx) => {
                        const aspectKey = (['ADAB', 'KEDISIPLINAN', 'KERAPIAN'] as const)[idx];
                        const score = (ev?.[field] || aspect[aspectKey].grade) as BintangGrade;
                        const isManual = (Array.isArray(ev?.manual_aspects) && ev.manual_aspects.includes(aspectKey)) || (!!ev?.[field] && ev[field] !== aspect[aspectKey].grade);
                        return (
                          <td key={field} className="py-2 px-1 sm:py-3 sm:px-4 text-center">
                            <span
                              className={`inline-flex items-center justify-center gap-1 px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold ring-1 ${gradeColors[score]}`}
                              title={isManual ? 'Nilai telah disesuaikan manual oleh guru (aman dari reset generate)' : `Nilai rekomendasi sistem: ${score}`}
                            >
                              {score}
                              {isManual && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Penyesuaian manual" />
                              )}
                            </span>
                          </td>
                        );
                      })}
                      <td className="hidden md:table-cell py-2 px-2 sm:py-3 sm:px-4 text-xs sm:text-sm text-center">
                        {isPublished ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                            <CheckCircle size={12} /> Published
                          </span>
                        ) : isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                            Draft
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Auto
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4 text-right">
                        <div className="flex justify-end gap-1 sm:gap-1.5 items-center">
                          {/* ─── Tombol WhatsApp Rapor ─── */}
                          {isWalas && isPublished && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="px-1.5 py-1 sm:px-2 sm:py-1.5 h-auto min-h-[38px] min-w-[38px] sm:min-h-0 sm:min-w-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                              onClick={() => handleSendWhatsAppEvaluation(student, ev, aspect)}
                              title={student.parent_phone ? `Kirim Rapor WA (${student.parent_phone})` : 'Nomor WA orang tua belum diisi'}
                            >
                              <MessageCircle size={14} className="sm:mr-1 text-emerald-600 dark:text-emerald-400" />
                              <span className="hidden xl:inline">WA</span>
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            className="px-1.5 py-1 sm:px-3 sm:py-1.5 h-auto min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                            onClick={() => onOpenDetail(student.id)}
                            title="Detail & Riwayat"
                          >
                            <Eye size={14} className="sm:mr-1 text-slate-500 dark:text-slate-400" />
                            <span className="hidden lg:inline text-slate-600 dark:text-slate-300">Detail</span>
                          </Button>
                          {isWalas && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="px-1.5 py-1 sm:px-3 sm:py-1.5 h-auto min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                              onClick={() => evalHook.handleOpenEditModal(student, getAspectSummary)}
                              disabled={isPublished}
                              title={isPublished ? 'Rapor sudah terbit. Tarik ke Draft untuk mengedit kembali.' : isCompleted ? 'Edit' : 'Isi Rapor'}
                            >
                              <FileText size={14} className="sm:mr-1" />
                              <span className="hidden lg:inline">{isCompleted ? 'Edit' : 'Isi'}</span>
                            </Button>
                          )}
                          {isWalas && isPublished && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="px-1.5 py-1 sm:px-2.5 sm:py-1.5 h-auto min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 text-amber-600 hover:text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-100"
                              onClick={() => evalHook.handleUnpublishSingle(student.id, student.name)}
                              disabled={evalHook.unpublishingStudentId === student.id}
                              title="Tarik rapor siswa ini kembali ke Draft agar bisa diedit kembali"
                            >
                              <RotateCcw size={14} className="sm:mr-1" />
                              <span className="hidden lg:inline">{evalHook.unpublishingStudentId === student.id ? '...' : 'Tarik'}</span>
                            </Button>
                          )}
                          {isWalas && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="px-1.5 py-1 sm:px-3 sm:py-1.5 h-auto min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                              onClick={() => evalHook.handleDownloadSinglePdf(student.id)}
                              disabled={evalHook.downloadingStudentId === student.id}
                              title="Cetak Rapor"
                            >
                              {evalHook.downloadingStudentId === student.id ? (
                                <span className="animate-spin inline-block w-3 h-3 sm:w-4 sm:h-4 border-[2px] border-current border-t-transparent rounded-full sm:mr-1" />
                              ) : (
                                <Printer size={14} className="sm:mr-1" />
                              )}
                              <span className="hidden lg:inline">Cetak</span>
                            </Button>
                          )}
                          {!isWalas && (
                            <span className="text-[10px] text-slate-400 italic">(lihat saja)</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ─── Grade Legend ───────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span className="font-medium text-slate-700 dark:text-slate-300">Keterangan:</span>
        {BINTANG_THRESHOLDS.map(t => (
          <span key={t.grade} className="flex items-center gap-1">
            <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-bold ${gradeColors[t.grade]}`}>{t.grade}</span>
            {t.grade === 'A' ? '0 poin' : t.grade === 'B' ? '1-10 poin' : t.grade === 'C' ? '11-20 poin' : '>20 poin'}
            ({t.label})
          </span>
        ))}
      </div>
    </div>
  );
};
