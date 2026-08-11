import React from 'react';
import { Modal } from '../../../ui/Modal';
import { Button } from '../../../ui/Button';
import { AlertTriangleIcon, UserIcon, CalendarIcon, ShieldAlertIcon } from 'lucide-react';

export interface DuplicateViolationData {
  recorded_by_name: string | null;
  date: string;
  description: string;
  points: number;
}

interface DuplicateViolationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  existingViolation: DuplicateViolationData;
}

export const DuplicateViolationDialog: React.FC<DuplicateViolationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  existingViolation,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pelanggaran Sudah Tercatat" maxWidth="max-w-md">
      <div className="space-y-4 pt-2">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <AlertTriangleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-2 text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Pelanggaran ini sudah dicatat sebelumnya
            </p>
            <div className="space-y-1.5 text-amber-700 dark:text-amber-300">
              <div className="flex items-center gap-2">
                <UserIcon className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  Dicatat oleh:{' '}
                  <strong>{existingViolation.recorded_by_name || 'Guru lain'}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  Tanggal:{' '}
                  <strong>
                    {new Date(existingViolation.date).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldAlertIcon className="w-3.5 h-3.5 text-amber-500" />
                <span>
                  <strong>{existingViolation.description}</strong> ({existingViolation.points} poin)
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          Apakah ini kejadian yang berbeda? Jika ya, Anda tetap bisa menambahkan catatan baru.
        </p>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Tetap Tambahkan
          </Button>
        </div>
      </div>
    </Modal>
  );
};
