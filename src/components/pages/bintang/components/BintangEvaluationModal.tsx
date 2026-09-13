import React from 'react';
import { Info, FileText, Sparkles } from 'lucide-react';
import { Modal } from '../../../ui/Modal';
import { Button } from '../../../ui/Button';
import { AspectSectionEditor } from '../AspectSectionEditor';
import { AspectPointsSummary } from '../../../../services/bintangService';

interface BintangEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  evalHook: any;
  getAspectSummary: (studentId: string) => AspectPointsSummary;
  studentViolationsMap: Map<string, any[]>;
  studentQuizMap: Map<string, any>;
  studentAttitudeMap: Record<string, { spiritual?: string; social?: string }>;
}

export const BintangEvaluationModal: React.FC<BintangEvaluationModalProps> = ({
  isOpen,
  onClose,
  evalHook,
  getAspectSummary,
  studentViolationsMap,
  studentQuizMap,
  studentAttitudeMap,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Rapor BINTANG: ${evalHook.editingStudent?.name || 'Siswa'}`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={(e) => evalHook.handleSaveEvaluation(e, getAspectSummary)} className="space-y-4 pt-4">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800">
          <Info size={18} className="text-brand-500 mt-0.5 shrink-0" />
          <p className="text-xs text-brand-700 dark:text-brand-300">
            Nilai otomatis dihitung dari poin pelanggaran siswa bulan ini. Anda dapat mengubah nilai secara manual jika diperlukan.
          </p>
        </div>

        <AspectSectionEditor
          aspectKey="ADAB"
          scoreField="adab_score"
          formValue={evalHook.formData.adab_score}
          notesValue={evalHook.formData.adab_notes}
          onScoreChange={(val) => evalHook.handleAspectScoreChange('ADAB', val)}
          onNotesChange={(val) => evalHook.setFormData((prev: any) => ({
            ...prev,
            adab_notes: val,
            manual_aspects: Array.from(new Set([...(prev.manual_aspects || []), 'CUSTOM_ADAB_NOTES'])),
          }))}
          onResetNotes={() => evalHook.handleResetAspectNote('ADAB')}
          editingStudent={evalHook.editingStudent}
          getAspectSummary={getAspectSummary}
          studentViolations={evalHook.editingStudent ? studentViolationsMap.get(evalHook.editingStudent.id) || [] : []}
        />
        <AspectSectionEditor
          aspectKey="KEDISIPLINAN"
          scoreField="kedisiplinan_score"
          formValue={evalHook.formData.kedisiplinan_score}
          notesValue={evalHook.formData.kedisiplinan_notes}
          onScoreChange={(val) => evalHook.handleAspectScoreChange('KEDISIPLINAN', val)}
          onNotesChange={(val) => evalHook.setFormData((prev: any) => ({
            ...prev,
            kedisiplinan_notes: val,
            manual_aspects: Array.from(new Set([...(prev.manual_aspects || []), 'CUSTOM_KEDIS_NOTES'])),
          }))}
          onResetNotes={() => evalHook.handleResetAspectNote('KEDISIPLINAN')}
          editingStudent={evalHook.editingStudent}
          getAspectSummary={getAspectSummary}
          studentViolations={evalHook.editingStudent ? studentViolationsMap.get(evalHook.editingStudent.id) || [] : []}
        />
        <AspectSectionEditor
          aspectKey="KERAPIAN"
          scoreField="kerapian_score"
          formValue={evalHook.formData.kerapian_score}
          notesValue={evalHook.formData.kerapian_notes}
          onScoreChange={(val) => evalHook.handleAspectScoreChange('KERAPIAN', val)}
          onNotesChange={(val) => evalHook.setFormData((prev: any) => ({
            ...prev,
            kerapian_notes: val,
            manual_aspects: Array.from(new Set([...(prev.manual_aspects || []), 'CUSTOM_KERAPIAN_NOTES'])),
          }))}
          onResetNotes={() => evalHook.handleResetAspectNote('KERAPIAN')}
          editingStudent={evalHook.editingStudent}
          getAspectSummary={getAspectSummary}
          studentViolations={evalHook.editingStudent ? studentViolationsMap.get(evalHook.editingStudent.id) || [] : []}
        />

        <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-emerald-600 dark:text-emerald-400" />
              <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Catatan Wali Kelas</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {evalHook.editingStudent && (() => {
                const vios = studentViolationsMap.get(evalHook.editingStudent.id) || [];
                const activePts = studentQuizMap.get(evalHook.editingStudent.id)?.totalPoints || 0;
                return (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {vios.length === 0 ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                        ✓ 0 Pelanggaran (Teladan)
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                        {vios.length} Pelanggaran
                      </span>
                    )}
                    {activePts > 0 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        +{activePts} Keaktifan
                      </span>
                    )}
                    {(() => {
                      const att = studentAttitudeMap[evalHook.editingStudent.id];
                      if (att && (att.spiritual || att.social)) {
                        return (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                            Sikap: KI-1 {att.spiritual || '-'} • KI-2 {att.social || '-'}
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                );
              })()}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => evalHook.handleRegenerateHomeroomNote(evalHook.editingStudent, getAspectSummary)}
                className="h-7 px-2.5 text-xs text-brand-600 dark:text-brand-400 border-brand-200 dark:border-brand-800 bg-brand-50/50 dark:bg-brand-900/20 hover:bg-brand-100 rounded-lg flex items-center gap-1 shadow-sm"
                title="Buat ulang catatan secara otomatis berdasarkan data & nilai terbaru siswa"
              >
                <Sparkles size={12} />
                <span>Buat Ulang Otomatis</span>
              </Button>
            </div>
          </div>
          <div className="w-full">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Tuliskan pesan atau catatan perkembangan umum siswa untuk Orang Tua / Wali (dihasilkan otomatis &amp; dapat disesuaikan)
            </label>
            <textarea
              className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 leading-relaxed"
              rows={4}
              value={evalHook.formData.catatan_wali}
              onChange={(e) => evalHook.setFormData((prev: any) => ({
                ...prev,
                catatan_wali: e.target.value,
                manual_aspects: Array.from(new Set([...(prev.manual_aspects || []), 'CUSTOM_CATATAN_WALI'])),
              }))}
              placeholder="Tuliskan catatan umum wali kelas di sini..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
          <Button type="submit" disabled={evalHook.isSubmitting}>
            {evalHook.isSubmitting ? 'Menyimpan...' : 'Simpan Rapor'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
