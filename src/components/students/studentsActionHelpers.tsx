import React from 'react';
import { DownloadCloudIcon, KeyRoundIcon, PrinterIcon, ArrowRightIcon, TrashIcon } from '../Icons';
import { StudentRow } from './types';
import { StudentsHeaderActionId } from './studentsMenuConfig';

type StudentActionType = 'view' | 'edit' | 'delete' | 'menu';

export const handleStudentListAction = ({
  action,
  student,
  onEdit,
  onDelete,
  onOpenMenu,
}: {
  action: StudentActionType;
  student: StudentRow;
  onEdit: (student: StudentRow) => void;
  onDelete: (student: StudentRow) => void;
  onOpenMenu: (student: StudentRow) => void;
}) => {
  if (action === 'edit') {
    onEdit(student);
    return;
  }
  if (action === 'delete') {
    onDelete(student);
    return;
  }
  if (action === 'menu') {
    onOpenMenu(student);
  }
};

export const handleStudentsHeaderAction = ({
  actionId,
  onImportTeacher,
  onImportExcel,
  onExport,
  onManageClass,
  onAddStudent,
}: {
  actionId: StudentsHeaderActionId;
  onImportTeacher: () => void;
  onImportExcel: () => void;
  onExport: () => void;
  onManageClass: () => void;
  onAddStudent: () => void;
}) => {
  if (actionId === 'import_teacher') {
    onImportTeacher();
    return;
  }
  if (actionId === 'import_excel') {
    onImportExcel();
    return;
  }
  if (actionId === 'export') {
    onExport();
    return;
  }
  if (actionId === 'manage_class') {
    onManageClass();
    return;
  }
  if (actionId === 'add_student') {
    onAddStudent();
  }
};

export const createStudentsBulkActions = ({
  onBulkExport,
  onBulkGenerateCodes,
  onOpenIDCard,
  onOpenBulkMove,
  onBulkDelete,
}: {
  onBulkExport: (ids: string[]) => void;
  onBulkGenerateCodes: (ids: string[]) => void;
  onOpenIDCard: () => void;
  onOpenBulkMove: () => void;
  onBulkDelete: (ids: string[]) => void;
}) => [
  {
    id: 'export',
    label: 'Ekspor',
    icon: <DownloadCloudIcon className="w-4 h-4" />,
    variant: 'default' as const,
    onClick: onBulkExport,
  },
  {
    id: 'generate_codes',
    label: 'Buat Kode',
    icon: <KeyRoundIcon className="w-4 h-4" />,
    variant: 'default' as const,
    onClick: onBulkGenerateCodes,
  },
  {
    id: 'print_ids',
    label: 'Cetak Kartu',
    icon: <PrinterIcon className="w-4 h-4" />,
    variant: 'default' as const,
    onClick: onOpenIDCard,
  },
  {
    id: 'move_class',
    label: 'Pindah Kelas',
    icon: <ArrowRightIcon className="w-4 h-4" />,
    variant: 'default' as const,
    onClick: onOpenBulkMove,
  },
  {
    id: 'delete',
    label: 'Hapus',
    icon: <TrashIcon className="w-4 h-4" />,
    variant: 'danger' as const,
    onClick: onBulkDelete,
  },
];
