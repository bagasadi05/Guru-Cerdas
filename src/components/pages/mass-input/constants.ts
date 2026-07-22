import { GraduationCapIcon, XCircleIcon, CheckSquareIcon, ShieldAlertIcon, PrinterIcon, FileTextIcon, DownloadIcon, SparklesIcon } from '../../Icons';
import { InputMode } from './types';

export const inputCards: { mode: InputMode; title: string; description: string; icon: React.FC<{ className?: string }> }[] = [
    { mode: 'subject_grade', title: 'Input Nilai Mapel', description: 'Masukkan nilai sumatif/akhir kelas (dilengkapi fitur Katrol Nilai & Hapus Nilai Massal).', icon: GraduationCapIcon },
    { mode: 'quiz', title: 'Input Poin Keaktifan', description: 'Beri poin untuk siswa yang aktif di kelas.', icon: CheckSquareIcon },
    { mode: 'violation', title: 'Input Pelanggaran', description: 'Catat poin pelanggaran untuk beberapa siswa.', icon: ShieldAlertIcon },
];

export const exportCards: { mode: InputMode; title: string; description: string; icon: React.FC<{ className?: string }> }[] = [
    { mode: 'violation_export', title: 'Cetak Rapor Pelanggaran', description: 'Unduh rekap pelanggaran kelas dalam format PDF atau Excel.', icon: DownloadIcon },
    { mode: 'bulk_report', title: 'Cetak Rapor Massal', description: 'Cetak beberapa rapor dari satu kelas dalam satu file.', icon: PrinterIcon },
    { mode: 'academic_print', title: 'Cetak Nilai Akademik', description: 'Cetak rekap nilai per mata pelajaran untuk satu kelas.', icon: FileTextIcon },
];

export const actionCards = [...inputCards, ...exportCards];
