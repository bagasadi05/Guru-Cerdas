import React from 'react';
import { ExportFormat, ExportPreviewModal } from '../advanced-features/ExportPreviewModal';
import { ImportModal } from '../ui/ImportModal';
import { ParsedRow } from '../../services/ImportService';
import { IDCardPrintModal } from './IDCardPrintModal';
import { BulkMoveModal } from './BulkMoveModal';
import { ImportFromTeacherModal } from './ImportFromTeacherModal';
import { StudentRow, ClassRow, ConfirmModalState } from './types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { AlertCircleIcon } from '../Icons';

interface StudentsModalStackProps {
  confirmModalState: ConfirmModalState;
  onCloseConfirm: () => void;
  isConfirmLoading: boolean;
  isExportModalOpen: boolean;
  onCloseExportModal: () => void;
  studentsForExport: StudentRow[];
  onExportConfirm: (format: ExportFormat, selectedColumns: string[]) => void;
  isImportModalOpen: boolean;
  onCloseImportModal: () => void;
  onImportStudents: (validRows: ParsedRow[]) => Promise<void>;
  isIDCardModalOpen: boolean;
  onCloseIDCardModal: () => void;
  selectedStudentsForIDCard: StudentRow[];
  classes: ClassRow[];
  isBulkMoveModalOpen: boolean;
  onCloseBulkMoveModal: () => void;
  onBulkMoveConfirm: (targetClassId: string) => void;
  selectedCount: number;
  activeClassId: string;
  isMovingStudents: boolean;
  isImportFromTeacherModalOpen: boolean;
  onCloseImportFromTeacherModal: () => void;
}

const ConfirmActionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmVariant?: 'default' | 'destructive';
  isLoading?: boolean;
}> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  confirmVariant = 'destructive',
  isLoading = false,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={title} icon={<AlertCircleIcon className="w-5 h-5" />}>
    <div className="space-y-4">
      <div className="text-sm text-gray-600 dark:text-gray-400">
        <p>{message}</p>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
          Batal
        </Button>
        <Button type="button" variant={confirmVariant} onClick={onConfirm} disabled={isLoading}>
          {isLoading ? 'Memproses...' : confirmText}
        </Button>
      </div>
    </div>
  </Modal>
);

export const StudentsModalStack: React.FC<StudentsModalStackProps> = ({
  confirmModalState,
  onCloseConfirm,
  isConfirmLoading,
  isExportModalOpen,
  onCloseExportModal,
  studentsForExport,
  onExportConfirm,
  isImportModalOpen,
  onCloseImportModal,
  onImportStudents,
  isIDCardModalOpen,
  onCloseIDCardModal,
  selectedStudentsForIDCard,
  classes,
  isBulkMoveModalOpen,
  onCloseBulkMoveModal,
  onBulkMoveConfirm,
  selectedCount,
  activeClassId,
  isMovingStudents,
  isImportFromTeacherModalOpen,
  onCloseImportFromTeacherModal,
}) => {
  return (
    <>
      <ConfirmActionModal
        isOpen={confirmModalState.isOpen}
        onClose={onCloseConfirm}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmText={confirmModalState.confirmText}
        confirmVariant={confirmModalState.confirmVariant}
        isLoading={isConfirmLoading}
      />

      <ExportPreviewModal
        isOpen={isExportModalOpen}
        onClose={onCloseExportModal}
        data={studentsForExport}
        columns={[
          { key: 'name', label: 'Nama Lengkap' },
          { key: 'gender', label: 'Jenis Kelamin' },
          { key: 'class_id', label: 'Kelas' },
          { key: 'access_code', label: 'Kode Akses' },
        ]}
        onExport={onExportConfirm}
        title="Ekspor Data Siswa"
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={onCloseImportModal}
        onImport={onImportStudents}
        title="Import Data Siswa"
      />

      <IDCardPrintModal
        isOpen={isIDCardModalOpen}
        onClose={onCloseIDCardModal}
        students={selectedStudentsForIDCard}
        classes={classes}
      />

      <BulkMoveModal
        isOpen={isBulkMoveModalOpen}
        onClose={onCloseBulkMoveModal}
        onAttributesConfirm={onBulkMoveConfirm}
        classes={classes}
        studentCount={selectedCount}
        currentClassId={activeClassId}
        isMoving={isMovingStudents}
      />

      <ImportFromTeacherModal
        isOpen={isImportFromTeacherModalOpen}
        onClose={onCloseImportFromTeacherModal}
      />
    </>
  );
};
