import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { ExcelImporter } from '../ui/ExcelImporter';
import { ArrowLeftIcon, SaveIcon, CheckCircleIcon, UploadIcon, DownloadIcon, TrashIcon, AlertTriangleIcon, KeyboardIcon, ChevronDownIcon, ChevronUpIcon } from '../Icons';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '../ui/Skeleton';
import { Database } from '../../services/database.types';
import { useKeyboardShortcuts, useGridNavigation } from '../../hooks/useKeyboardShortcuts';
import { useAutosave } from '../../hooks/useAutosave';
import { validateGrades, getGradeColorClass, calculateGradeStats, GradeEntry } from '../../utils/gradeValidator';
import { VirtualList, WindowedList } from '../ui/VirtualList';
import { KeyboardShortcutsHelp } from '../ui/KeyboardShortcutsHelp';
import { EmptyGradesConfirmation, SaveSuccessModal, ClearAllConfirmation } from '../ui/GradeConfirmationModals';
import { BulkGradeInputPageSkeleton } from '../ui/GradeInputSkeletons';

type StudentRow = Database['public']['Tables']['students']['Row'];
type ClassRow = Database['public']['Tables']['classes']['Row'];

const SUBJECTS = [
    'Matematika', 'Bahasa Indonesia', 'Bahasa Inggris', 'IPA', 'IPS',
    'PKN', 'Seni Budaya', 'PJOK', 'Informatika', 'Agama'
];

const DEFAULT_KKM = 75;
const VIRTUALIZATION_THRESHOLD = 30;

const BulkGradeInputPage: React.FC = () => {
    const { user } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedSubject, setSelectedSubject] = useState<string>(SUBJECTS[0]);
    const [assessmentName, setAssessmentName] = useState<string>('Ulangan Harian');
    const [grades, setGrades] = useState<GradeEntry[]>([]);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
    const [showDraftPrompt, setShowDraftPrompt] = useState(false);
    const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [lastSaveCount, setLastSaveCount] = useState(0);
    const [kkm] = useState(DEFAULT_KKM);

    // Refs for input navigation
    const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

    // Grid navigation
    const { registerRef, handleKeyDown: handleGridKeyDown } = useGridNavigation<HTMLInputElement>(
        grades.length,
        {
            onEnter: (index) => {
                const nextInput = inputRefs.current.get(grades[index + 1]?.studentId);
                nextInput?.focus();
            },
            onEscape: () => {
                document.activeElement instanceof HTMLElement && document.activeElement.blur();
            },
        }
    );

    // Autosave
    const autosaveKey = `bulk-grade-${selectedClass}-${selectedSubject}-${assessmentName}`;
    const { hasDraft, restoreDraft, clearDraft, lastSaved, getTimeSinceLastSave } = useAutosave({
        key: autosaveKey,
        data: { grades, selectedSubject, assessmentName },
        interval: 30000,
        enabled: grades.some(g => g.score !== '') && !!selectedClass,
    });

    // Check for draft on mount
    useEffect(() => {
        if (hasDraft && selectedClass) {
            setShowDraftPrompt(true);
        }
    }, [hasDraft, selectedClass]);

    // Keyboard shortcuts
    useKeyboardShortcuts({
        'ctrl+s': () => {
            if (filledCount > 0) {
                handleSaveAll();
            }
        },
        'ctrl+i': () => setShowImportModal(true),
        'ctrl+shift+c': () => {
            const filled = grades.filter(g => g.score !== '').length;
            if (filled > 0) setShowClearConfirm(true);
        },
        'f1': () => setShowKeyboardHelp(true),
    });

    // Fetch classes
    const { data: classes, isLoading: loadingClasses } = useQuery({
        queryKey: ['classes', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('classes')
                .select('id, name')
                .eq('user_id', user!.id)
                .order('name');
            if (error) throw error;
            return data as Pick<ClassRow, 'id' | 'name'>[];
        },
        enabled: !!user,
    });

    // Fetch students for selected class
    const { data: students, isLoading: loadingStudents } = useQuery({
        queryKey: ['students', selectedClass],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('students')
                .select('id, name')
                .eq('class_id', selectedClass)
                .order('name');
            if (error) throw error;
            return data as Pick<StudentRow, 'id' | 'name'>[];
        },
        enabled: !!selectedClass,
    });

    // Check for existing grades
    const { data: existingGrades } = useQuery({
        queryKey: ['existingGrades', selectedClass, selectedSubject, assessmentName],
        queryFn: async () => {
            const { data } = await supabase
                .from('academic_records')
                .select('id, student_id, score')
                .eq('subject', selectedSubject)
                .eq('assessment_name', assessmentName)
                .in('student_id', students?.map(s => s.id) || []);
            return data || [];
        },
        enabled: !!selectedClass && !!students && students.length > 0,
    });

    // Initialize grades when students change
    useMemo(() => {
        if (students) {
            setGrades(students.map(s => ({
                studentId: s.id,
                studentName: s.name,
                score: ''
            })));
        }
    }, [students]);

    // Validation
    const validation = useMemo(() => {
        return validateGrades(grades, {
            kkm,
            checkDuplicates: true,
            existingGrades: existingGrades?.map(g => ({
                id: g.id,
                studentId: g.student_id,
                score: g.score,
            })),
        });
    }, [grades, kkm, existingGrades]);

    // Stats
    const stats = useMemo(() => calculateGradeStats(grades), [grades]);

    // Mutation to save all grades
    const saveMutation = useMutation({
        mutationFn: async (entries: GradeEntry[]) => {
            const validEntries = entries.filter(e => e.score !== '' && Number(e.score) >= 0 && Number(e.score) <= 100);
            if (validEntries.length === 0) throw new Error('Tidak ada nilai valid untuk disimpan');

            const existingMap = new Map(existingGrades?.map(g => [g.student_id, g.id]) || []);

            const records = validEntries.map(e => ({
                id: existingMap.get(e.studentId) || crypto.randomUUID(),
                student_id: e.studentId,
                user_id: user!.id,
                subject: selectedSubject,
                assessment_name: assessmentName,
                score: Number(e.score),
                notes: '',
            }));

            const { error } = await supabase.from('academic_records').upsert(records);
            if (error) throw error;
            return validEntries.length;
        },
        onSuccess: (count) => {
            toast.success(`${count} nilai berhasil disimpan!`);
            queryClient.invalidateQueries({ queryKey: ['studentDetails'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
            queryClient.invalidateQueries({ queryKey: ['existingGrades'] });
            clearDraft();
            // Reset grades
            if (students) {
                setGrades(students.map(s => ({ studentId: s.id, studentName: s.name, score: '' })));
            }
        },
        onError: (error: Error) => {
            toast.error(`Gagal menyimpan: ${error.message}`);
        },
    });

    const handleScoreChange = (studentId: string, value: string) => {
        const numValue = value === '' ? '' : Math.min(100, Math.max(0, parseInt(value) || 0));
        setGrades(prev => prev.map(g => g.studentId === studentId ? { ...g, score: numValue } : g));
    };

    const handleSaveAll = () => {
        if (!validation.isValid) {
            toast.error('Perbaiki nilai yang tidak valid sebelum menyimpan.');
            return;
        }

        // Check if there are empty grades
        const filledGrades = grades.filter(g => g.score !== '');
        const emptyGrades = grades.filter(g => g.score === '');

        if (emptyGrades.length > 0 && filledGrades.length > 0) {
            // Show confirmation for partial save
            setShowEmptyConfirm(true);
            return;
        }

        doSave();
    };

    const doSave = () => {
        setShowEmptyConfirm(false);
        const gradesToSave = grades.filter(g => g.score !== '');
        setLastSaveCount(gradesToSave.length);
        saveMutation.mutate(gradesToSave);
    };

    // Bulk fill handlers
    const handleBulkFill = (value: number) => {
        setGrades(prev => prev.map(g => ({
            ...g,
            score: g.score === '' ? value : g.score
        })));
        toast.info(`Mengisi nilai kosong dengan ${value}`);
    };

    const handleFillAllWith = (value: number) => {
        setGrades(prev => prev.map(g => ({ ...g, score: value })));
        toast.info(`Semua nilai diisi dengan ${value}`);
    };

    const requestClearAll = () => {
        const filledCount = grades.filter(g => g.score !== '').length;
        if (filledCount > 0) {
            setShowClearConfirm(true);
        }
    };

    const handleClearAll = () => {
        setShowClearConfirm(false);
        setGrades(prev => prev.map(g => ({ ...g, score: '' })));
        toast.info('Semua nilai dihapus');
    };

    // Import handler
    const handleImport = (data: Record<string, any>[]) => {
        if (!students) return;

        const studentMap = new Map(students.map(s => [s.name.toLowerCase(), s.id]));
        let matchedCount = 0;

        const newGrades = [...grades];
        data.forEach(row => {
            const name = String(row.name || '').trim().toLowerCase();
            const score = row.score;

            const studentId = studentMap.get(name);
            if (studentId && score !== undefined && score !== '') {
                const gradeIndex = newGrades.findIndex(g => g.studentId === studentId);
                if (gradeIndex !== -1) {
                    newGrades[gradeIndex].score = Math.min(100, Math.max(0, Number(score) || 0));
                    matchedCount++;
                }
            }
        });

        setGrades(newGrades);
        setShowImportModal(false);
        toast.success(`${matchedCount} nilai berhasil diimport dari ${data.length} baris`);
    };

    // Restore draft
    const handleRestoreDraft = () => {
        const draft = restoreDraft();
        if (draft) {
            setGrades(draft.grades || []);
            setSelectedSubject(draft.selectedSubject || SUBJECTS[0]);
            setAssessmentName(draft.assessmentName || 'Ulangan Harian');
            toast.success('Draft berhasil dipulihkan');
        }
        setShowDraftPrompt(false);
    };

    const filledCount = grades.filter(g => g.score !== '').length;

    // Render student row
    const renderStudentRow = useCallback((g: GradeEntry, index: number) => {
        const existingScore = existingGrades?.find(eg => eg.student_id === g.studentId)?.score;
        const colorClass = getGradeColorClass(g.score, { kkm, existingScore });
        const numScore = typeof g.score === 'number' ? g.score : Number(g.score);
        const isBelowKkm = g.score !== '' && numScore < kkm;

        return (
            <div
                key={g.studentId}
                className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${g.score !== '' ? colorClass.bg : 'bg-gray-50 dark:bg-gray-900'
                    } hover:bg-gray-100 dark:hover:bg-gray-800`}
            >
                <span className="w-8 text-center font-medium text-gray-500">{index + 1}</span>
                <span className="flex-1 font-medium text-gray-900 dark:text-white">{g.studentName}</span>

                {/* Existing score indicator */}
                {existingScore !== undefined && (
                    <span className="text-xs text-blue-500 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                        Nilai sebelumnya: {existingScore}
                    </span>
                )}

                <div className="relative">
                    <Input
                        ref={(el) => {
                            if (el) inputRefs.current.set(g.studentId, el);
                            registerRef(index, el);
                        }}
                        type="number"
                        min={0}
                        max={100}
                        value={g.score}
                        onChange={(e) => handleScoreChange(g.studentId, e.target.value)}
                        onKeyDown={(e) => handleGridKeyDown(e, index)}
                        placeholder="0-100"
                        className={`w-24 text-center ${g.score !== '' ? colorClass.border : ''}`}
                    />
                    {isBelowKkm && (
                        <span className="absolute -bottom-4 left-0 right-0 text-[10px] text-amber-500 text-center">
                            &lt; KKM
                        </span>
                    )}
                </div>
            </div>
        );
    }, [existingGrades, kkm, handleGridKeyDown, registerRef]);

    return (
        <div className="min-h-full bg-gray-50 dark:bg-gray-950 p-4 md:p-6 pb-24 lg:pb-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
                            <ArrowLeftIcon className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Input Nilai Cepat</h1>
                            <p className="text-gray-500 dark:text-gray-400">Masukkan nilai untuk semua siswa dalam satu kelas</p>
                        </div>
                    </div>

                    {/* Keyboard shortcut hint */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowKeyboardHelp(true)}
                        className="hidden md:flex items-center gap-1 text-gray-400"
                    >
                        <KeyboardIcon className="w-4 h-4" />
                        <kbd className="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-700 rounded">F1</kbd>
                    </Button>
                </div>

                {/* Autosave indicator */}
                {lastSaved && (
                    <div className="text-xs text-gray-400 flex items-center gap-2">
                        <CheckCircleIcon className="w-3 h-3 text-green-500" />
                        Draft tersimpan {getTimeSinceLastSave()}
                    </div>
                )}

                {/* Settings Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Pengaturan</CardTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowImportModal(true)}
                            >
                                <UploadIcon className="w-4 h-4 mr-1" />
                                Import Excel
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Pilih Kelas</label>
                            {loadingClasses ? (
                                <Skeleton className="h-10 w-full" />
                            ) : (
                                <Select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                                    <option value="">-- Pilih Kelas --</option>
                                    {classes?.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </Select>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Mata Pelajaran</label>
                            <Select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                                {SUBJECTS.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </Select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Nama Penilaian</label>
                            <Input
                                value={assessmentName}
                                onChange={(e) => setAssessmentName(e.target.value)}
                                placeholder="Ulangan Harian 1"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions Toolbar */}
                {selectedClass && grades.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                        <span className="text-sm text-gray-500 mr-2">Quick Fill:</span>
                        <Button size="sm" variant="outline" onClick={() => handleBulkFill(100)}>
                            Kosong → 100
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleBulkFill(kkm)}>
                            Kosong → KKM ({kkm})
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleFillAllWith(100)}>
                            Semua 100
                        </Button>
                        <div className="flex-1" />
                        <Button size="sm" variant="ghost" onClick={handleClearAll} className="text-red-500">
                            <TrashIcon className="w-4 h-4 mr-1" />
                            Clear All
                        </Button>
                    </div>
                )}

                {/* Stats Summary */}
                {filledCount > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
                            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{stats.average}</p>
                            <p className="text-xs text-blue-500">Rata-rata</p>
                        </div>
                        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30">
                            <p className="text-xl font-bold text-green-600 dark:text-green-400">{stats.aboveKkmCount}</p>
                            <p className="text-xs text-green-500">Tuntas ≥{kkm}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30">
                            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.belowKkmCount}</p>
                            <p className="text-xs text-amber-500">Belum Tuntas</p>
                        </div>
                        <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/30">
                            <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{stats.perfectCount}</p>
                            <p className="text-xs text-purple-500">Nilai 100</p>
                        </div>
                    </div>
                )}

                {/* Validation Warnings */}
                {validation.warnings.length > 0 && filledCount > 0 && (
                    <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <div className="flex items-start gap-2">
                            <AlertTriangleIcon className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                                    Perhatian ({validation.warnings.length})
                                </p>
                                <ul className="text-xs text-amber-600 dark:text-amber-400 mt-1 space-y-1 max-h-20 overflow-y-auto">
                                    {validation.warnings.slice(0, 5).map((w, i) => (
                                        <li key={i}>• {w.message}</li>
                                    ))}
                                    {validation.warnings.length > 5 && (
                                        <li className="text-amber-500">...dan {validation.warnings.length - 5} lainnya</li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Grade Input Grid */}
                {selectedClass && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Daftar Siswa ({grades.length})</CardTitle>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <CheckCircleIcon className="w-4 h-4 text-green-500" />
                                {filledCount} / {grades.length} terisi
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loadingStudents ? (
                                <div className="space-y-3">
                                    {[1, 2, 3, 4, 5].map(i => (
                                        <Skeleton key={i} className="h-12 w-full" />
                                    ))}
                                </div>
                            ) : grades.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">Tidak ada siswa di kelas ini</p>
                            ) : grades.length > VIRTUALIZATION_THRESHOLD ? (
                                // Use virtualization for large lists
                                <VirtualList
                                    items={grades}
                                    itemHeight={64}
                                    containerHeight={500}
                                    renderItem={(g, index) => renderStudentRow(g, index)}
                                    keyExtractor={(g) => g.studentId}
                                />
                            ) : (
                                // Regular render for small lists
                                <div className="space-y-2">
                                    {grades.map((g, index) => renderStudentRow(g, index))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Save Button */}
                {selectedClass && grades.length > 0 && (
                    <div className="sticky bottom-4 lg:bottom-8">
                        <Button
                            onClick={handleSaveAll}
                            disabled={saveMutation.isPending || filledCount === 0}
                            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-xl shadow-indigo-500/30"
                        >
                            {saveMutation.isPending ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <SaveIcon className="w-5 h-5 mr-2" />
                                    Simpan Semua Nilai ({filledCount})
                                    <kbd className="hidden md:inline ml-2 px-1.5 py-0.5 text-xs bg-white/20 rounded">Ctrl+S</kbd>
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </div>

            {/* Import Modal */}
            <Modal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                title="Import dari Excel"
            >
                <ExcelImporter
                    columns={[
                        { key: 'name', label: 'Nama Siswa', required: true, type: 'string' },
                        { key: 'score', label: 'Nilai', required: true, type: 'number' },
                    ]}
                    onImport={handleImport}
                    onCancel={() => setShowImportModal(false)}
                    templateData={students?.map(s => ({ id: s.id, name: s.name }))}
                />
            </Modal>

            {/* Keyboard Help Modal */}
            <Modal
                isOpen={showKeyboardHelp}
                onClose={() => setShowKeyboardHelp(false)}
                title="Keyboard Shortcuts"
            >
                <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400">Simpan semua nilai</span>
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">Ctrl + S</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400">Import Excel</span>
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">Ctrl + I</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400">Clear semua nilai</span>
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">Ctrl + Shift + C</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400">Next field</span>
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">Tab / Enter / ↓</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-gray-600 dark:text-gray-400">Previous field</span>
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">Shift + Tab / ↑</kbd>
                    </div>
                    <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600 dark:text-gray-400">Bantuan shortcut</span>
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm">F1</kbd>
                    </div>
                </div>
            </Modal>

            {/* Draft Restore Prompt */}
            <Modal
                isOpen={showDraftPrompt}
                onClose={() => setShowDraftPrompt(false)}
                title="Draft Tersedia"
            >
                <div className="space-y-4">
                    <p className="text-gray-600 dark:text-gray-400">
                        Anda memiliki draft yang belum disimpan. Apakah ingin melanjutkan dari draft tersebut?
                    </p>
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                clearDraft();
                                setShowDraftPrompt(false);
                            }}
                            className="flex-1"
                        >
                            Buang Draft
                        </Button>
                        <Button onClick={handleRestoreDraft} className="flex-1">
                            Pulihkan Draft
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Empty Grades Confirmation */}
            <EmptyGradesConfirmation
                isOpen={showEmptyConfirm}
                onClose={() => setShowEmptyConfirm(false)}
                onConfirm={doSave}
                filledCount={grades.filter(g => g.score !== '').length}
                emptyCount={grades.filter(g => g.score === '').length}
                totalCount={grades.length}
            />

            {/* Clear All Confirmation */}
            <ClearAllConfirmation
                isOpen={showClearConfirm}
                onClose={() => setShowClearConfirm(false)}
                onConfirm={handleClearAll}
                count={grades.filter(g => g.score !== '').length}
            />

            {/* Save Success Modal */}
            <SaveSuccessModal
                isOpen={showSuccessModal}
                onClose={() => setShowSuccessModal(false)}
                savedCount={lastSaveCount}
            />

            {/* Keyboard Shortcuts Help (new component) */}
            <KeyboardShortcutsHelp
                isOpen={showKeyboardHelp}
                onClose={() => setShowKeyboardHelp(false)}
            />
        </div>
    );
};

export default BulkGradeInputPage;
