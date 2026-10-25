import React from 'react';
import { ConfirmationDialog } from '../../../ui/ConfirmationDialog';
import { UndoBar } from './UndoBar';
import type { LessonPlanListItem } from '../hooks/useModulAjarHistory';
import type { ModulAiUsage } from '../../../../services/modulAjarAiCache';
import type { ExportFormat } from '../../../../lib/modulAjarExport/types';

interface ModulAjarDialogsProps {
  deletedPlan: LessonPlanListItem | null;
  onUndoDeletePlan: () => void;
  onClearDeletedPlan: () => void;
  regenerateConfirmOpen: boolean;
  onConfirmRegenerate: () => void;
  onCloseRegenerateConfirm: () => void;
  resetConfirmOpen: boolean;
  onConfirmReset: () => void;
  onCloseResetConfirm: () => void;
  pendingExportFormat: ExportFormat | null;
  onConfirmSaveDraftAndExport: () => void;
  onClosePendingExport: () => void;
  isSavingDraft: boolean;
  aiCacheWarning: string | null;
  onCloseAiCacheWarning: () => void;
  aiUsage: ModulAiUsage | null;
}

export const ModulAjarDialogs: React.FC<ModulAjarDialogsProps> = ({
  deletedPlan,
  onUndoDeletePlan,
  onClearDeletedPlan,
  regenerateConfirmOpen,
  onConfirmRegenerate,
  onCloseRegenerateConfirm,
  resetConfirmOpen,
  onConfirmReset,
  onCloseResetConfirm,
  pendingExportFormat,
  onConfirmSaveDraftAndExport,
  onClosePendingExport,
  isSavingDraft,
  aiCacheWarning,
  onCloseAiCacheWarning,
  aiUsage,
}) => {
  return (
    <>
      {deletedPlan && (
        <UndoBar
          key={deletedPlan.id}
          message="Modul ajar dihapus dari Riwayat."
          onUndo={onUndoDeletePlan}
          onExpire={onClearDeletedPlan}
        />
      )}

      {/* Regenerating replaces preview edits with a document built from the form */}
      <ConfirmationDialog
        isOpen={regenerateConfirmOpen}
        title="Susun ulang dokumen?"
        message="Dokumen baru dibuat dari isian formulir, jadi perubahan yang Anda ketik langsung di dokumen tidak ikut. Dokumen yang sekarang tetap tersimpan sebagai versi sebelumnya di Riwayat."
        onConfirm={onConfirmRegenerate}
        onClose={onCloseRegenerateConfirm}
        variant="warning"
        confirmText="Susun Ulang"
      />

      {/* Reset Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={resetConfirmOpen}
        title="Reset Formulir Modul Ajar?"
        message="Seluruh isian formulir saat ini akan dikembalikan ke pengaturan awal. Pastikan draf penting sudah tersimpan."
        onConfirm={onConfirmReset}
        onClose={onCloseResetConfirm}
        variant="warning"
        confirmText="Ya, Reset Form"
      />

      {/* Unsaved preview edits: the server exports the stored document */}
      <ConfirmationDialog
        isOpen={!!pendingExportFormat}
        title="Simpan perubahan sebelum mengunduh?"
        message="Berkas dibuat dari dokumen yang tersimpan. Simpan dulu agar perubahan Anda ikut masuk ke berkas."
        onConfirm={onConfirmSaveDraftAndExport}
        onClose={onClosePendingExport}
        variant="info"
        confirmText="Simpan & Unduh"
        isPending={isSavingDraft}
      />

      {/* AI Cache Warning Toast */}
      {aiCacheWarning && (
        <div className="fixed top-16 right-4 z-50 max-w-sm bg-amber-50 dark:bg-amber-950/90 border border-amber-300 dark:border-amber-700 rounded-xl shadow-lg p-4 text-sm">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 dark:text-amber-400 font-bold">⚠️</span>
            <div className="flex-1">
              <p className="font-bold text-amber-800 dark:text-amber-200">Cache pribadi AI</p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{aiCacheWarning}</p>
            </div>
            <button
              onClick={onCloseAiCacheWarning}
              className="text-amber-600 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-100 font-bold px-1"
              aria-label="Tutup peringatan"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {aiUsage && (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {aiUsage.cacheHit
            ? 'Hasil tersimpan digunakan · 0 panggilan AI · 0 token baru'
            : aiUsage.shared
              ? 'Permintaan yang sama digunakan · 0 panggilan tambahan'
              : `${aiUsage.attempts.length} panggilan AI · ${
                  aiUsage.tokens.total === null
                    ? 'Jumlah token tidak dilaporkan provider'
                    : `${aiUsage.tokens.total.toLocaleString('id-ID')} token`
                }`}
          {aiUsage.attempts.length > 0 && (
            <p className="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">
              {[
                ...new Set(aiUsage.attempts.map((attempt) => `${attempt.provider} / ${attempt.model}`)),
              ].join(', ')}
            </p>
          )}
        </div>
      )}
    </>
  );
};
