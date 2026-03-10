import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { KeyRoundIcon, PencilIcon, PlusIcon, TrashIcon } from '../Icons';
import { ClassRow } from './types';

interface StudentsClassManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassRow[];
  onGenerateCodes: (classItem: ClassRow) => void;
  onEditClass: (classItem: ClassRow) => void;
  onDeleteClass: (classItem: ClassRow) => void;
  onAddClass: () => void;
}

export const StudentsClassManageModal: React.FC<StudentsClassManageModalProps> = ({
  isOpen,
  onClose,
  classes,
  onGenerateCodes,
  onEditClass,
  onDeleteClass,
  onAddClass,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Kelola Kelas">
      <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
        {classes.map((classItem) => (
          <div
            key={classItem.id}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-100 dark:bg-black/20"
          >
            <span className="font-semibold">{classItem.name}</span>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10"
                onClick={() => onGenerateCodes(classItem)}
                title="Buat kode akses massal"
              >
                <KeyRoundIcon className="h-4 w-4 text-emerald-500" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10"
                onClick={() => onEditClass(classItem)}
              >
                <PencilIcon className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10 text-red-500"
                onClick={() => onDeleteClass(classItem)}
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
        <Button onClick={onAddClass} className="w-full">
          <PlusIcon className="w-4 h-4 mr-2" /> Tambah Kelas Baru
        </Button>
      </div>
    </Modal>
  );
};
