import type { ComponentType } from 'react';
import { UploadCloudIcon } from 'lucide-react';
import {
  UsersIcon,
  DownloadCloudIcon,
  PencilIcon,
  PlusIcon,
} from '../Icons';

export type StudentsHeaderActionId =
  | 'import_teacher'
  | 'import_excel'
  | 'export'
  | 'manage_class'
  | 'add_student';

export interface StudentsHeaderAction {
  id: StudentsHeaderActionId;
  label: string;
  title?: string;
  icon: ComponentType<{ className?: string }>;
  variant: 'outline' | 'primary';
}

const actionMap: Record<StudentsHeaderActionId, StudentsHeaderAction> = {
  import_teacher: {
    id: 'import_teacher',
    label: 'Import Guru',
    title: 'Import data kelas & siswa dari guru lain',
    icon: UsersIcon,
    variant: 'outline',
  },
  import_excel: {
    id: 'import_excel',
    label: 'Import Excel',
    title: 'Import data siswa dari file Excel',
    icon: UploadCloudIcon,
    variant: 'outline',
  },
  export: {
    id: 'export',
    label: 'Export',
    icon: DownloadCloudIcon,
    variant: 'outline',
  },
  manage_class: {
    id: 'manage_class',
    label: 'Kelola Kelas',
    icon: PencilIcon,
    variant: 'outline',
  },
  add_student: {
    id: 'add_student',
    label: 'Siswa Baru',
    icon: PlusIcon,
    variant: 'primary',
  },
};

const mapIdsToActions = (ids: StudentsHeaderActionId[]): StudentsHeaderAction[] =>
  ids.map((id) => actionMap[id]);

export const studentsHeaderActionSets = {
  desktop: mapIdsToActions([
    'import_teacher',
    'import_excel',
    'export',
    'manage_class',
    'add_student',
  ]),
  tabletPrimary: mapIdsToActions(['import_excel', 'export', 'add_student']),
  tabletOverflow: mapIdsToActions(['import_teacher', 'manage_class']),
  mobilePrimary: mapIdsToActions(['add_student']),
  mobileOverflow: mapIdsToActions([
    'import_teacher',
    'import_excel',
    'export',
    'manage_class',
  ]),
};
