import React from 'react';
import { ShieldAlert, Plus, Pencil, Trash2, Sparkles, Eye, MessageCircle } from 'lucide-react';
import { Modal } from '../../../ui/Modal';
import { Button } from '../../../ui/Button';
import { ViolationRow, QuizPointRow } from '../../student/types';
import { useToast } from '../../../../hooks/useToast';
import { createWhatsAppLink, generateViolationMessage } from '../../../../utils/whatsappUtils';

interface BintangStudentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string | null;
  student?: {
    id: string;
    name: string;
    parent_phone?: string | null;
    parent_name?: string | null;
  };
  violations: any[];
  quizPoints: any[];
  dailyObservations: any[];
  isWalas: boolean;
  aspectMeta: Record<string, { label: string; [key: string]: any }>;
  onOpenAddViolation: () => void;
  onOpenEditViolation: (v: ViolationRow) => void;
  onDeleteViolation: (v: ViolationRow) => void;
  onOpenAddQuiz: () => void;
  onOpenEditQuiz: (q: QuizPointRow) => void;
  onDeleteQuiz: (q: QuizPointRow) => void;
}

export const BintangStudentHistoryModal: React.FC<BintangStudentHistoryModalProps> = ({
  isOpen,
  onClose,
  studentId,
  student,
  violations,
  quizPoints,
  dailyObservations,
  isWalas,
  aspectMeta,
  onOpenAddViolation,
  onOpenEditViolation,
  onDeleteViolation,
  onOpenAddQuiz,
  onOpenEditQuiz,
  onDeleteQuiz,
}) => {
  const toast = useToast();
  if (!isOpen || !studentId) return null;

  const studentName = student?.name || 'Siswa';
  const parentPhone = student?.parent_phone;
  const parentName = student?.parent_name;

  const handleSendWhatsAppViolation = (v: any) => {
    if (!parentPhone || parentPhone.trim() === '') {
      toast.error('Nomor WhatsApp orang tua belum terdaftar di profil siswa.');
      return;
    }
    const message = generateViolationMessage(
      studentName,
      {
        description: v.description,
        points: v.points,
        date: v.date,
        severity: v.severity,
        context_notes: v.context_notes,
        recorded_by_name: v.users?.name || v.recorded_by_name,
      },
      parentName
    );
    const link = createWhatsAppLink(parentPhone, message);
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  const studentViolations = violations.filter(v => v.student_id === studentId);
  const studentQuizzes = quizPoints.filter(q => q.student_id === studentId);
  const studentObservations = dailyObservations.filter(o => o.student_id === studentId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Detail Riwayat: ${studentName}`}
      maxWidth="max-w-4xl"
    >
      <div className="pt-4 space-y-6">
        {/* ─── Pelanggaran Section ─── */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <ShieldAlert size={18} className="text-rose-500" />
              Riwayat Pelanggaran
            </h3>
            {isWalas && (
              <Button
                size="sm"
                onClick={onOpenAddViolation}
                className="bg-rose-100 hover:bg-rose-200 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/50"
              >
                <Plus size={14} className="mr-1" /> Catat
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {studentViolations.length === 0 ? (
              <div className="p-6 text-center text-slate-500 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/30">
                Tidak ada pelanggaran bulan ini
              </div>
            ) : (
              studentViolations.map(v => (
                <div key={v.id} className="border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 p-4 shadow-sm relative">
                  <div className="absolute top-4 right-4 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleSendWhatsAppViolation(v)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                      title={parentPhone ? `Kirim WhatsApp ke Orang Tua (${parentPhone})` : 'Nomor WA orang tua belum diisi'}
                    >
                      <MessageCircle size={14} />
                    </button>
                    {isWalas && (
                      <>
                        <button
                          type="button"
                          onClick={() => { onClose(); onOpenEditViolation(v as unknown as ViolationRow); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => { onClose(); onDeleteViolation(v as unknown as ViolationRow); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                  <div className="flex justify-between items-start mb-2 pr-20">
                    <div>
                      <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{v.description}</h4>
                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                        <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded font-medium">{new Date(v.date).toLocaleDateString('id-ID')}</span>
                        {v.severity && (
                          <span className={`px-2 py-0.5 rounded uppercase text-[10px] font-bold ${
                            v.severity === 'berat' ? 'bg-rose-100 text-rose-700' :
                            v.severity === 'sedang' ? 'bg-amber-100 text-amber-700' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            {v.severity}
                          </span>
                        )}
                        {v.users?.name && <span className="text-slate-400">Pencatat: {v.users.name}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 px-2 py-1 rounded-lg">+{v.points} Poin</span>
                    </div>
                  </div>
                  
                  {(v.context_notes || v.follow_up_notes) && (
                    <div className="mt-3 text-sm space-y-2 border-t border-slate-100 dark:border-slate-700/50 pt-3">
                      {v.context_notes && (
                        <div className="text-slate-600 dark:text-slate-400">
                          <span className="font-medium text-slate-700 dark:text-slate-300 mr-1">Kronologi:</span>
                          {v.context_notes}
                        </div>
                      )}
                      {v.follow_up_notes && (
                        <div className="text-slate-600 dark:text-slate-400">
                          <span className="font-medium text-slate-700 dark:text-slate-300 mr-1">Tindak Lanjut:</span>
                          {v.follow_up_notes}
                          {v.follow_up_status && (
                            <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${
                              v.follow_up_status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {v.follow_up_status}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ─── Keaktifan Section ─── */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2">
              <Sparkles size={18} className="text-emerald-500" />
              Poin Keaktifan
            </h3>
            {isWalas && (
              <Button
                size="sm"
                onClick={onOpenAddQuiz}
                className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
              >
                <Plus size={14} className="mr-1" /> Tambah
              </Button>
            )}
          </div>
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="py-2 px-3 font-medium text-slate-600 dark:text-slate-300">Tanggal</th>
                  <th className="py-2 px-3 font-medium text-slate-600 dark:text-slate-300">Aktivitas</th>
                  <th className="py-2 px-3 font-medium text-slate-600 dark:text-slate-300 text-center">Poin</th>
                  {isWalas && <th className="py-2 px-3 text-right font-medium text-slate-600 dark:text-slate-300">Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {studentQuizzes.length === 0 ? (
                  <tr><td colSpan={4} className="py-4 text-center text-slate-500">Belum ada poin keaktifan bulan ini</td></tr>
                ) : (
                  studentQuizzes.map(q => (
                    <tr key={q.id} className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-2 px-3 whitespace-nowrap">{new Date(q.quiz_date).toLocaleDateString('id-ID')}</td>
                      <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{q.quiz_name} {q.subject && <span className="ml-1 text-[10px] bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">{q.subject}</span>}</td>
                      <td className="py-2 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">+{q.points}</td>
                      {isWalas && (
                        <td className="py-2 px-3 text-right whitespace-nowrap">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => { onClose(); onOpenEditQuiz(q as unknown as QuizPointRow); }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => { onClose(); onDeleteQuiz(q as unknown as QuizPointRow); }}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                              title="Hapus"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ─── Observasi Harian Section ─── */}
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-white flex items-center gap-2 mb-3">
            <Eye size={18} className="text-brand-500" />
            Observasi Harian
          </h3>
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="py-2 px-3 font-medium text-slate-600 dark:text-slate-300">Tanggal</th>
                  <th className="py-2 px-3 font-medium text-slate-600 dark:text-slate-300">Aspek</th>
                  <th className="py-2 px-3 font-medium text-slate-600 dark:text-slate-300">Tipe</th>
                  <th className="py-2 px-3 font-medium text-slate-600 dark:text-slate-300">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {studentObservations.length === 0 ? (
                  <tr><td colSpan={4} className="py-4 text-center text-slate-500">Belum ada observasi harian bulan ini</td></tr>
                ) : (
                  studentObservations.map((o: any) => (
                    <tr key={o.id} className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-2 px-3 whitespace-nowrap">{new Date(o.date).toLocaleDateString('id-ID')}</td>
                      <td className="py-2 px-3">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{aspectMeta[o.aspect as keyof typeof aspectMeta]?.label || o.aspect}</span>
                      </td>
                      <td className="py-2 px-3">
                        {o.is_positive ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Positif</span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">Netral</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-600 dark:text-slate-400 max-w-[200px] truncate" title={o.observation}>{o.observation}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
};
