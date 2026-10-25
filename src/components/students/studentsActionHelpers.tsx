import React from 'react';
import { DownloadCloudIcon, KeyRoundIcon, PrinterIcon, ArrowRightIcon, TrashIcon, ClipboardIcon } from '../Icons';
import { StudentRow } from './types';
import { StudentsHeaderActionId } from './studentsMenuConfig';

type StudentActionType = 'view' | 'edit' | 'delete' | 'menu';

/**
 * Formats a class name cleanly without duplicating the word "Kelas"
 * E.g. "Kelas 3A" -> "Kelas 3A", "3A" -> "Kelas 3A", "7B" -> "Kelas 7B"
 */
export const formatClassName = (name?: string | null): string => {
  if (!name) return 'Terpilih';
  const trimmed = name.trim();
  if (/^kelas\s+/i.test(trimmed)) {
    return trimmed;
  }
  return `Kelas ${trimmed}`;
};

/**
 * Formats a student's name into clean Title Case if originally in ALL CAPS
 */
export const formatStudentDisplayName = (name?: string | null): string => {
  if (!name) return '';
  const trimmed = name.trim();
  if (trimmed.length > 2 && trimmed === trimmed.toUpperCase()) {
    return trimmed
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  return trimmed;
};

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
  onBulkCopyCodes,
}: {
  onBulkExport: (ids: string[]) => void;
  onBulkGenerateCodes: (ids: string[]) => void;
  onOpenIDCard: () => void;
  onOpenBulkMove: () => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkCopyCodes?: (ids: string[]) => void;
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
  ...(onBulkCopyCodes
    ? [
        {
          id: 'copy_codes',
          label: 'Salin Kode',
          icon: <ClipboardIcon className="w-4 h-4" />,
          variant: 'default' as const,
          onClick: onBulkCopyCodes,
        },
      ]
    : []),
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
