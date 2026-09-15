import { GraduationCapIcon, CheckSquareIcon, ShieldAlertIcon, PrinterIcon, FileTextIcon, DownloadIcon, HeartIcon } from '../../Icons';
import { InputMode } from './types';

export const inputCards: { mode: InputMode; title: string; description: string; icon: React.FC<{ className?: string }> }[] = [
    { mode: 'subject_grade', title: 'Input Nilai Mapel', description: 'Masukkan nilai sumatif/akhir kelas (dilengkapi fitur Katrol Nilai & Hapus Nilai Massal).', icon: GraduationCapIcon },
    { mode: 'quiz', title: 'Input Poin Keaktifan', description: 'Beri poin untuk siswa yang aktif di kelas.', icon: CheckSquareIcon },
    { mode: 'attitude', title: 'Input Nilai Sikap', description: 'Catat pembiasaan & sikap positif (Adab, Sikap, Kerapian) untuk menunjang Rapot BINTANG.', icon: HeartIcon },
    { mode: 'violation', title: 'Input Pelanggaran', description: 'Catat poin pelanggaran untuk beberapa siswa.', icon: ShieldAlertIcon },
];

export const exportCards: { mode: InputMode; title: string; description: string; icon: React.FC<{ className?: string }> }[] = [
    { mode: 'violation_export', title: 'Cetak Rapor Pelanggaran', description: 'Unduh rekap pelanggaran kelas dalam format PDF atau Excel.', icon: DownloadIcon },
    { mode: 'bulk_report', title: 'Cetak Rapor Massal', description: 'Cetak beberapa rapor dari satu kelas dalam satu file.', icon: PrinterIcon },
    { mode: 'academic_print', title: 'Cetak Nilai Akademik', description: 'Cetak rekap nilai per mata pelajaran untuk satu kelas.', icon: FileTextIcon },
];

export const actionCards = [...inputCards, ...exportCards];

export interface QuizActivityCategory {
    value: string;
    label: string;
    icon: string;
}

export const QUIZ_ACTIVITY_CATEGORIES: QuizActivityCategory[] = [
    { value: 'bertanya', label: 'Bertanya', icon: '❓' },
    { value: 'menjawab', label: 'Menjawab', icon: '💡' },
    { value: 'presentasi', label: 'Presentasi', icon: '🎤' },
    { value: 'diskusi', label: 'Diskusi', icon: '💬' },
    { value: 'tugas_tambahan', label: 'Tugas Tambahan', icon: '📝' },
    { value: 'lainnya', label: 'Lainnya', icon: '⭐' },
];

export const QUIZ_CATEGORY_DEFAULT_NAMES: Record<string, string> = {
    bertanya: 'Aktif bertanya di kelas',
    menjawab: 'Menjawab pertanyaan guru',
    presentasi: 'Presentasi tugas',
    diskusi: 'Aktif dalam diskusi',
    tugas_tambahan: 'Mengerjakan tugas tambahan',
    tugas: 'Mengerjakan tugas tambahan',
    lainnya: 'Partisipasi aktif',
};

export const QUIZ_ACTIVITY_SUGGESTIONS: Record<string, string[]> = {
    bertanya: ['Aktif bertanya di kelas', 'Bertanya saat diskusi', 'Mengajukan pertanyaan kritis'],
    menjawab: ['Menjawab pertanyaan guru', 'Berani menjawab di depan kelas', 'Membantu teman menjawab'],
    presentasi: ['Presentasi tugas kelompok', 'Presentasi individu', 'Mempresentasikan hasil diskusi'],
    diskusi: ['Aktif dalam diskusi kelompok', 'Memimpin diskusi', 'Memberikan pendapat'],
    tugas_tambahan: ['Mengerjakan soal tambahan', 'Membantu teman belajar', 'Proyek tambahan'],
    tugas: ['Mengerjakan soal tambahan', 'Membantu teman belajar', 'Proyek tambahan'],
    lainnya: ['Partisipasi aktif', 'Membantu guru', 'Inisiatif baik'],
};
