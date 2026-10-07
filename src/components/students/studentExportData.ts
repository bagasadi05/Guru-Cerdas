import type { ClassRow, StudentRow } from './types';

export const studentExportColumns = [
  { key: 'name', label: 'Nama Lengkap' },
  { key: 'gender', label: 'Jenis Kelamin' },
  { key: 'nis', label: 'NIS' },
  { key: 'nisn', label: 'NISN' },
  { key: 'birth_date', label: 'Tanggal Lahir' },
  { key: 'class_id', label: 'Kelas' },
  { key: 'parent_name', label: 'Nama Orang Tua' },
  { key: 'parent_phone', label: 'No. WhatsApp Orang Tua' },
  { key: 'access_code', label: 'Kode Akses' },
] satisfies { key: keyof StudentRow; label: string }[];

export function buildStudentExportRows(students: StudentRow[], classes: ClassRow[]) {
  const classNames = new Map(classes.map((classItem) => [classItem.id, classItem.name]));
  return students.map((student) => ({
    name: student.name,
    gender: student.gender,
    nis: student.nis || '-',
    nisn: student.nisn || '-',
    birth_date: student.birth_date || '-',
    class_id: classNames.get(student.class_id) || '-',
    parent_name: student.parent_name || '-',
    parent_phone: student.parent_phone || '-',
    access_code: student.access_code || 'Belum Ada',
  }));
}
