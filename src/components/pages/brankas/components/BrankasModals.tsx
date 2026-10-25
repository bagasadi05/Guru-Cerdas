import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../../../ui/Modal';
import { Button } from '../../../ui/Button';
import { ClassItem } from '../types';

interface BrankasModalsProps {
  confirmArchiveClass: ClassItem | null;
  onCloseArchiveModal: () => void;
  confirmText: string;
  onConfirmTextChange: (text: string) => void;
  onArchive: () => void;
  isArchivePending: boolean;
  confirmRestoreClass: ClassItem | null;
  onCloseRestoreModal: () => void;
  onRestore: () => void;
  isRestorePending: boolean;
}

export const BrankasModals: React.FC<BrankasModalsProps> = ({
  confirmArchiveClass,
  onCloseArchiveModal,
  confirmText,
  onConfirmTextChange,
  onArchive,
  isArchivePending,
  confirmRestoreClass,
  onCloseRestoreModal,
  onRestore,
  isRestorePending,
}) => {
  return (
    <>
      {/* Modal: Confirm Archive Class */}
      <Modal
        isOpen={!!confirmArchiveClass}
        onClose={onCloseArchiveModal}
        title="Simpan Kelas di Brankas?"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5 animate-pulse" />
            <div>
              <p className="font-semibold text-sm">Tindakan Penting!</p>
              <p className="text-xs leading-relaxed mt-1 opacity-90">
                Menyimpan kelas <strong>{confirmArchiveClass?.name}</strong> di Brankas akan menguncinya menjadi data historis. Kelas dan siswanya tidak akan lagi muncul di dashboard aktif, absensi, atau input nilai cepat Anda, memastikan dashboard Anda kembali bersih dan siap digunakan untuk tahun ajaran berikutnya.
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Data ini <strong>TIDAK AKAN DIHAPUS</strong>. Anda tetap dapat meninjau rekam jejak nilai akademik, pelanggaran, riwayat absensi, serta mencetak kembali rapot siswa tersebut kapan saja langsung dari Brankas Kelas.
          </p>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
              Ketik &quot;ARSIP&quot; untuk mengonfirmasi:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => onConfirmTextChange(e.target.value)}
              placeholder="Ketik ARSIP di sini"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-center tracking-widest text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={onCloseArchiveModal}
              className="text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
            >
              Batal
            </Button>
            <Button
              onClick={onArchive}
              disabled={isArchivePending || confirmText !== 'ARSIP'}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-md"
            >
              {isArchivePending ? 'Mengarsipkan...' : 'Ya, Masukkan Brankas'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Confirm Restore Class */}
      <Modal
        isOpen={!!confirmRestoreClass}
        onClose={onCloseRestoreModal}
        title="Pulihkan Kelas dari Brankas?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            Apakah Anda yakin ingin memulihkan kelas <strong>{confirmRestoreClass?.name}</strong> dari Brankas? Kelas ini beserta semua data siswanya akan dikembalikan ke Dashboard Aktif Anda dan dapat diedit kembali seperti biasa.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={onCloseRestoreModal}
              className="text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
            >
              Batal
            </Button>
            <Button
              onClick={onRestore}
              disabled={isRestorePending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
            >
              {isRestorePending ? 'Memulihkan...' : 'Ya, Pulihkan Kelas'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
