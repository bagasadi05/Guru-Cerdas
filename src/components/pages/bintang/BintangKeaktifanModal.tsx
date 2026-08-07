import React, { useState, useMemo } from 'react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Modal } from '../../ui/Modal';
import { CustomDropdown } from '../../ui/CustomDropdown';
import { supabase } from '../../../services/supabase';
import { useToast } from '../../../hooks/useToast';
import { Star, Sparkles } from 'lucide-react';

// ─── Kategori Aktivitas ────────────────────────────────────────────────────

const ACTIVITY_CATEGORIES = [
    { value: 'bertanya', label: 'Bertanya', icon: '❓' },
    { value: 'menjawab', label: 'Menjawab', icon: '💡' },
    { value: 'presentasi', label: 'Presentasi', icon: '🎤' },
    { value: 'diskusi', label: 'Diskusi', icon: '💬' },
    { value: 'tugas_tambahan', label: 'Tugas Tambahan', icon: '📝' },
    { value: 'lainnya', label: 'Lainnya', icon: '⭐' },
] as const;

const QUICK_SUGGESTIONS: Record<string, string[]> = {
    bertanya: ['Aktif bertanya di kelas', 'Bertanya saat diskusi', 'Mengajukan pertanyaan kritis'],
    menjawab: ['Menjawab pertanyaan guru', 'Berani menjawab di depan kelas', 'Membantu teman menjawab'],
    presentasi: ['Presentasi tugas kelompok', 'Presentasi individu', 'Mempresentasikan hasil diskusi'],
    diskusi: ['Aktif dalam diskusi kelompok', 'Memimpin diskusi', 'Memberikan pendapat'],
    tugas_tambahan: ['Mengerjakan soal tambahan', 'Membantu teman belajar', 'Proyek tambahan'],
    lainnya: ['Partisipasi aktif', 'Membantu guru', 'Inisiatif baik'],
};

// ─── Props ─────────────────────────────────────────────────────────────────

interface BintangKeaktifanModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: Array<{ id: string; name: string }>;
    userId: string;
    onSuccess: () => void;
    /** Semester yang sedang aktif — diikat ke poin keaktifan baru agar semester lock tetap berlaku. */
    semesterId?: string | null;
}

// ─── Component ─────────────────────────────────────────────────────────────

export const BintangKeaktifanModal: React.FC<BintangKeaktifanModalProps> = ({
    isOpen,
    onClose,
    students,
    userId,
    onSuccess,
    semesterId,
}) => {
    const toast = useToast();

    // ── Form state ─────────────────────────────────────────────────────────
    const [inputMode, setInputMode] = useState<'single' | 'bulk'>('single');
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [category, setCategory] = useState('bertanya');
    const [quizName, setQuizName] = useState('');
    const [quizDate, setQuizDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');

    // ── Filtered students for bulk selection ────────────────────────────────
    const filteredStudents = useMemo(() => {
        if (!studentSearch.trim()) return students;
        const q = studentSearch.toLowerCase();
        return students.filter(s => s.name.toLowerCase().includes(q));
    }, [students, studentSearch]);

    // ── Toggle student in bulk selection ────────────────────────────────────
    const toggleStudent = (id: string) => {
        setSelectedStudentIds(prev =>
            prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        setSelectedStudentIds(filteredStudents.map(s => s.id));
    };

    const deselectAll = () => {
        setSelectedStudentIds([]);
    };

    // ── Submit ──────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const targetIds = inputMode === 'single'
            ? (selectedStudentId ? [selectedStudentId] : [])
            : selectedStudentIds;

        if (targetIds.length === 0) {
            toast.error(inputMode === 'single'
                ? 'Pilih siswa terlebih dahulu'
                : 'Pilih minimal satu siswa'
            );
            return;
        }

        if (!quizName.trim()) {
            toast.error('Deskripsi aktivitas harus diisi');
            return;
        }

        setIsSubmitting(true);
        try {
            const inserts = targetIds.map(studentId => ({
                student_id: studentId,
                user_id: userId,
                subject: null, // Poin keaktifan BINTANG tidak terikat mapel
                quiz_name: quizName.trim(),
                quiz_date: quizDate,
                points: 1,
                max_points: 1,
                category,
                is_used: false,
                semester_id: semesterId || null,
            }));

            const { error } = await supabase
                .from('quiz_points')
                .insert(inserts);

            if (error) throw error;

            toast.success(
                inputMode === 'single'
                    ? `Poin keaktifan berhasil ditambahkan (+1 ${quizName.trim()})`
                    : `${targetIds.length} siswa berhasil mendapat poin keaktifan (+1 ${quizName.trim()})`
            );

            // Reset form
            setSelectedStudentId('');
            setSelectedStudentIds([]);
            setQuizName('');

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Gagal menyimpan poin keaktifan:', error);
            toast.error('Gagal menyimpan poin keaktifan');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Input Poin Keaktifan"
            maxWidth="max-w-lg"
        >
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                {/* ─── Info Banner ─────────────────────────────────── */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <Sparkles size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                    <div className="text-xs text-emerald-700 dark:text-emerald-300">
                        <p className="font-medium mb-1">⚡ Bagaimana poin keaktifan bekerja?</p>
                        <p>Setiap <strong>+1 poin</strong> akan <strong>meng-offset poin pelanggaran</strong> siswa (Adab → Disiplin → Kerapian). Semakin banyak poin keaktifan, semakin baik grade BINTANG siswa.</p>
                    </div>
                </div>

                {/* ─── Input Mode Toggle ────────────────────────────── */}
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setInputMode('single')}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                            inputMode === 'single'
                                ? 'bg-brand-600 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        Per Siswa
                    </button>
                    <button
                        type="button"
                        onClick={() => setInputMode('bulk')}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                            inputMode === 'bulk'
                                ? 'bg-brand-600 text-white shadow-sm'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        Massal ({students.length} siswa)
                    </button>
                </div>

                {/* ─── Student Selection ───────────────────────────── */}
                {inputMode === 'single' ? (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Siswa <span className="text-rose-500">*</span>
                        </label>
                        <CustomDropdown
                            value={selectedStudentId}
                            onChange={setSelectedStudentId}
                            placeholder="Pilih siswa..."
                            options={students.map(s => ({ value: s.id, label: s.name }))}
                        />
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Pilih Siswa ({selectedStudentIds.length} dipilih)
                        </label>
                        <div className="flex gap-2 mb-2">
                            <button type="button" onClick={selectAll} className="text-xs px-2 py-1 rounded bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400 hover:bg-brand-200 dark:hover:bg-brand-800/50 transition-colors">
                                Pilih Semua
                            </button>
                            <button type="button" onClick={deselectAll} className="text-xs px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                Hapus Semua
                            </button>
                        </div>
                        <Input
                            placeholder="Cari siswa..."
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            className="mb-2 text-sm"
                        />
                        <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-1.5 bg-slate-50 dark:bg-slate-800/50 space-y-0.5">
                            {filteredStudents.length === 0 ? (
                                <p className="text-sm text-slate-500 p-2">Tidak ada siswa ditemukan</p>
                            ) : (
                                filteredStudents.map(student => (
                                    <label
                                        key={student.id}
                                        className={`flex items-center gap-3 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors ${
                                            selectedStudentIds.includes(student.id)
                                                ? 'bg-brand-100 dark:bg-brand-900/30'
                                                : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedStudentIds.includes(student.id)}
                                            onChange={() => toggleStudent(student.id)}
                                            className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                                        />
                                        <span className="text-sm text-slate-700 dark:text-slate-300">{student.name}</span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* ─── Category ────────────────────────────────────── */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Kategori Aktivitas
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {ACTIVITY_CATEGORIES.map(cat => (
                            <button
                                key={cat.value}
                                type="button"
                                onClick={() => setCategory(cat.value)}
                                className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-xl border transition-all text-left min-w-0 overflow-hidden ${
                                    category === cat.value
                                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300'
                                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                                }`}
                            >
                                <span className="flex-shrink-0 text-base">{cat.icon}</span>
                                <span className="truncate min-w-0 leading-tight">{cat.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ─── Quick Suggestions ───────────────────────────── */}
                {QUICK_SUGGESTIONS[category] && (
                    <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Pilih Cepat:
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {QUICK_SUGGESTIONS[category].map(suggestion => (
                                <button
                                    key={suggestion}
                                    type="button"
                                    onClick={() => setQuizName(suggestion)}
                                    className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                                        quizName === suggestion
                                            ? 'bg-brand-100 dark:bg-brand-900/30 border-brand-300 dark:border-brand-700 text-brand-700 dark:text-brand-300'
                                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ─── Form Fields ──────────────────────────────────── */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Tanggal <span className="text-rose-500">*</span>
                    </label>
                    <Input
                        type="date"
                        value={quizDate}
                        onChange={(e) => setQuizDate(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Deskripsi Aktivitas <span className="text-rose-500">*</span>
                    </label>
                    <Input
                        value={quizName}
                        onChange={(e) => setQuizName(e.target.value)}
                        placeholder="cth. Aktif bertanya di kelas"
                        required
                    />
                    <p className="text-xs text-slate-400 mt-1">Deskripsi singkat aktivitas siswa yang dinilai</p>
                </div>

                {/* ─── Poin Display ────────────────────────────────── */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <Star size={16} className="text-amber-500 fill-amber-400" />
                    <span className="text-sm text-amber-700 dark:text-amber-300">
                        <strong>+1 poin</strong> akan diberikan{' '}
                        {inputMode === 'single'
                            ? 'kepada siswa yang dipilih'
                            : `kepada ${selectedStudentIds.length || '...'} siswa`}
                    </span>
                </div>

                {/* ─── Actions ──────────────────────────────────────── */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Batal
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {isSubmitting ? 'Menyimpan...' : 'Simpan Poin Keaktifan'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default BintangKeaktifanModal;
