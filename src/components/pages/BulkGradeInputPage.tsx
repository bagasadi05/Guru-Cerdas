import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { ExcelImporter } from '../ui/ExcelImporter';
import { ArrowLeftIcon, SaveIcon, CheckCircleIcon, AlertTriangleIcon, KeyboardIcon, SparklesIcon } from '../Icons';
import { UnifiedGradeAdjustmentModal } from '../ui/UnifiedGradeAdjustmentModal';
import { useNavigate } from 'react-router-dom';
import { exportGradesToExcel } from '../../utils/gradeExporter';
import { Database } from '../../services/database.types';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useGridNavigation } from '../../hooks/useGridNavigation';
import { useAutosave } from '../../hooks/useAutosave';
import { validateGrades, getGradeColorClass, calculateGradeStats, GradeEntry } from '../../utils/gradeValidator';
import { useWarnUnsavedChanges } from '../../hooks/useWarnUnsavedChanges';
import { KeyboardShortcutsHelp } from '../ui/KeyboardShortcutsHelp';
import { EmptyGradesConfirmation, SaveSuccessModal, ClearAllConfirmation } from '../ui/GradeConfirmationModals';
import { useSemester } from '../../contexts/SemesterContext';
import { SemesterLockedBanner } from '../ui/SemesterSelector';
import { getAssignedSubjects, hasHomeroomAssignment, TeacherClassAssignmentRow } from '../../services/teacherAssignments';
import { AIPasteModal } from './bulk-grade-input/components/AIPasteModal';
import { SettingsCard } from './bulk-grade-input/components/SettingsCard';
import { StatsPanel } from './bulk-grade-input/components/StatsPanel';
import { QuickActionsToolbar } from './bulk-grade-input/components/QuickActionsToolbar';
import { GradeInputGrid } from './bulk-grade-input/components/GradeInputGrid';
import { ImportPreviewModal } from './bulk-grade-input/components/ImportPreviewModal';

type StudentRow = Database['public']['Tables']['students']['Row'];
type ClassRow = Database['public']['Tables']['classes']['Row'];

const SUBJECTS = [
    'TQA',
    'Bahasa Indonesia',
    'Matematika',
    'IPAS',
    'Pancasila',
    'Akidah',
    'Fikih',
    'Bahasa Arab',
    'Bahasa Jawa',
    'Bahasa Inggris',
    "Qur'an Hadits",
    'SKI',
    'PJOK',
    'TIK',
    'Seni Budaya',
    'Pramuka',
    'Ekstra'
];

const DEFAULT_KKM = 75;

const BulkGradeInputPage: React.FC = () => {
    const { user } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { activeSemester, semesters, isLocked: isSemesterLocked } = useSemester();

    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedSubject, setSelectedSubject] = useState<string>(SUBJECTS[0]);
    const [assessmentName, setAssessmentName] = useState<string>('Ulangan Harian');
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [grades, setGrades] = useState<GradeEntry[]>([]);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
    const [showDraftPrompt, setShowDraftPrompt] = useState(false);
    const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showAIPasteModal, setShowAIPasteModal] = useState(false);
    const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
    const [pendingImportData, setPendingImportData] = useState<{ name: string; score: string | number }[]>([]);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [lastSaveCount, setLastSaveCount] = useState(0);
    const [kkm, setKkm] = useState(DEFAULT_KKM);
    const [searchTerm, setSearchTerm] = useState<string>('');

    // Default to active semester when it loads
    useEffect(() => {
        if (activeSemester && !selectedSemester) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSelectedSemester(activeSemester.id);
        }
    }, [activeSemester, selectedSemester]);

    const { data: teacherAssignments = [] } = useQuery({
        queryKey: ['teacherClassAssignments', user?.id],
        queryFn: async () => {
            if (!user) return [] as TeacherClassAssignmentRow[];
            const { data, error } = await supabase
                .from('teacher_class_assignments')
                .select('id, teacher_user_id, class_id, semester_id, assignment_role, subject_name, notes, created_by, created_at, updated_at, deleted_at')
                .eq('teacher_user_id', user.id)
                .is('deleted_at', null);
            if (error) throw error;
            return (data || []) as TeacherClassAssignmentRow[];
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 10,
    });

    // Check if selected semester is locked
    const semesterLocked = selectedSemester ? isSemesterLocked(selectedSemester) : false;

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
                if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                }
            },
        }
    );

    // Autosave
    const autosaveKey = `bulk-grade-${selectedClass}-${selectedSubject}-${assessmentName}-${selectedSemester}`;
    const { hasDraft, restoreDraft, clearDraft, lastSaved, getTimeSinceLastSave } = useAutosave({
        key: autosaveKey,
        data: { grades, selectedSubject, assessmentName, selectedSemester },
        interval: 30000,
        enabled: grades.some(g => g.score !== '') && !!selectedClass && !!selectedSemester,
    });

    useWarnUnsavedChanges(hasDraft, 'Ada nilai yang belum disimpan ke database. Yakin ingin keluar?');

    // Check for draft on mount
    useEffect(() => {
        if (hasDraft && selectedClass) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setShowDraftPrompt(true);
        }
    }, [hasDraft, selectedClass]);

    // Keyboard shortcuts
    useKeyboardShortcuts({
        shortcuts: [
            {
                key: 's',
                ctrlKey: true,
                action: () => {
                    if (filledCount > 0) {
                        handleSaveAll();
                    }
                },
                description: 'Simpan semua nilai',
            },
            {
                key: 'i',
                ctrlKey: true,
                action: () => setShowImportModal(true),
                description: 'Import Excel',
            },
            {
                key: 'c',
                ctrlKey: true,
                shiftKey: true,
                action: () => {
                    const filled = grades.filter(g => g.score !== '').length;
                    if (filled > 0) setShowClearConfirm(true);
                },
                description: 'Clear semua nilai',
            },
            {
                key: 'f1',
                action: () => setShowKeyboardHelp(true),
                description: 'Bantuan keyboard',
            },
        ],
        enabled: !semesterLocked && !!selectedClass,
    });

    // Fetch classes
    const { data: classes, isLoading: loadingClasses } = useQuery({
        queryKey: ['classes', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('classes')
                .select('id, name, user_id')
                .is('deleted_at', null)
                .eq('is_archived', false)
                .order('name');
            if (error) throw error;
            return data as Pick<ClassRow, 'id' | 'name' | 'user_id'>[];
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
                .is('deleted_at', null)
                .order('name');
            if (error) throw error;
            return data as Pick<StudentRow, 'id' | 'name'>[];
        },
        enabled: !!selectedClass,
    });

    // Check for existing grades (filtered by semester)
    const { data: existingGrades } = useQuery({
        queryKey: ['existingGrades', selectedClass, selectedSubject, assessmentName, selectedSemester],
        queryFn: async () => {
            let query = supabase
                .from('academic_records')
                .select('id, student_id, score')
                .eq('subject', selectedSubject)
                .eq('assessment_name', assessmentName)
                .in('student_id', students?.map(s => s.id) || [])
                .is('deleted_at', null);

            if (selectedSemester) {
                query = query.eq('semester_id', selectedSemester);
            }

            const { data } = await query;
            return data || [];
        },
        enabled: !!selectedClass && !!students && students.length > 0 && !!selectedSemester,
    });

    // Initialize grades when students change
    useEffect(() => {
        if (students) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setGrades(students.map(s => ({
                studentId: s.id,
                studentName: s.name,
                score: ''
            })));
        }
    }, [students]);

    // Warn before unload if there are unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            const hasUnsaved = grades.some(g => g.score !== '');
            if (hasUnsaved) {
                e.preventDefault();
                e.returnValue = 'Anda memiliki nilai yang belum disimpan. Apakah Anda yakin ingin keluar?';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [grades]);

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
    const stats = useMemo(() => calculateGradeStats(grades, kkm), [grades, kkm]);

    // Filter grades by student name
    const filteredGrades = useMemo(() => {
        if (!searchTerm.trim()) return grades;
        return grades.filter(g => g.studentName.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [grades, searchTerm]);

    const activeClassRecord = useMemo(
        () => classes?.find((classItem) => classItem.id === selectedClass) || null,
        [classes, selectedClass],
    );
    const assignedSubjects = useMemo(
        () => getAssignedSubjects(teacherAssignments, selectedClass || null, selectedSemester || null),
        [selectedClass, selectedSemester, teacherAssignments],
    );
    const canUseDefaultSubjects = useMemo(() => {
        if (!user) return false;
        if (activeClassRecord?.user_id === user.id) return true;
        return hasHomeroomAssignment(teacherAssignments, selectedClass || null, selectedSemester || null);
    }, [activeClassRecord?.user_id, selectedClass, selectedSemester, teacherAssignments, user]);
    const availableSubjects = useMemo(() => {
        const defaultSubjectsToUse = canUseDefaultSubjects ? SUBJECTS : [];
        return Array.from(new Set([...assignedSubjects, ...defaultSubjectsToUse]));
    }, [assignedSubjects, canUseDefaultSubjects]);

    useEffect(() => {
        if (availableSubjects.length === 0) return;
        if (!availableSubjects.includes(selectedSubject)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSelectedSubject(availableSubjects[0]);
        }
    }, [availableSubjects, selectedSubject]);

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
                semester_id: selectedSemester || null,
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
            setShowSuccessModal(true);
            // Reset grades
            if (students) {
                setGrades(students.map(s => ({ studentId: s.id, studentName: s.name, score: '' })));
            }
        },
        onError: (error: Error) => {
            toast.error(`Gagal menyimpan: ${error.message}`);
        },
    });

    const handleScoreChange = useCallback((studentId: string, value: string) => {
        if (value === '') {
            setGrades(prev => prev.map(g => g.studentId === studentId ? { ...g, score: '' } : g));
            return;
        }

        const num = parseFloat(value);
        if (!isNaN(num)) {
            // Round to maximum of 2 decimal places to comply with gradeValidator
            const rounded = Math.round(num * 100) / 100;
            const clamped = Math.min(100, Math.max(0, rounded));
            setGrades(prev => prev.map(g => g.studentId === studentId ? { ...g, score: clamped } : g));
        } else {
            setGrades(prev => prev.map(g => g.studentId === studentId ? { ...g, score: '' } : g));
        }
    }, []);

    const handleSaveAll = () => {
        if (availableSubjects.length === 0) {
            toast.error('Belum ada mapel yang ditugaskan untuk kelas dan semester ini.');
            return;
        }

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

    const handleClearAll = () => {
        setShowClearConfirm(false);
        setGrades(prev => prev.map(g => ({ ...g, score: '' })));
        toast.info('Semua nilai dihapus');
    };

    // Import handler
    const handleImport = (data: Record<string, unknown>[]) => {
        if (!students) return;

        const parsedRows = data.map(row => ({
            name: String(row.name || ''),
            score: row.score !== undefined ? String(row.score) : '',
        }));

        setPendingImportData(parsedRows);
        setShowImportModal(false);
        setShowPreviewModal(true);
    };

    const handlePreviewConfirm = (mappedScores: Record<string, string>) => {
        setGrades(prev => prev.map(g => {
            if (mappedScores[g.studentId] !== undefined) {
                const val = mappedScores[g.studentId];
                const parsedVal = parseFloat(val);
                return { ...g, score: !isNaN(parsedVal) ? parsedVal : '' };
            }
            return g;
        }));
        
        const matchedCount = Object.keys(mappedScores).length;
        toast.success(`${matchedCount} nilai berhasil diimpor setelah peninjauan.`);
        setPendingImportData([]);
    };

    const handleAIPasteSuccess = (parsedScores: Record<string, string>) => {
        setGrades(prev => prev.map(g => {
            if (parsedScores[g.studentId] !== undefined) {
                const val = parsedScores[g.studentId];
                const parsedVal = parseFloat(val);
                if (!isNaN(parsedVal)) {
                    const rounded = Math.round(parsedVal * 100) / 100;
                    return { ...g, score: Math.min(100, Math.max(0, rounded)) };
                }
            }
            return g;
        }));
    };

    // Restore draft
    const handleRestoreDraft = () => {
        const draft = restoreDraft();
        if (draft) {
            setGrades(draft.grades || []);
            setSelectedSubject(draft.selectedSubject || availableSubjects[0] || SUBJECTS[0]);
            setAssessmentName(draft.assessmentName || 'Ulangan Harian');
            toast.success('Draft berhasil dipulihkan');
        }
        setShowDraftPrompt(false);
    };

    const filledCount = grades.filter(g => g.score !== '').length;

    // Handle Paste from Excel
    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>, startIndex: number) => {
        const pasteData = e.clipboardData.getData('text');
        if (!pasteData) return;

        // Split by newline and filter out empty rows
        const rows = pasteData.split(/\r?\n/).filter(row => row.trim() !== '');
        
        // Only intercept if there's more than one row pasted
        if (rows.length > 1) {
            e.preventDefault();
            
            setGrades(prev => {
                const newGrades = [...prev];
                let pasteCount = 0;
                
                for (let i = 0; i < rows.length; i++) {
                    const targetIndex = startIndex + i;
                    if (targetIndex < newGrades.length) {
                        // Replace comma with dot for standard decimal parsing
                        const normalizedRow = rows[i].trim().replace(',', '.');
                        // Find first matching floating point or integer number
                        const match = normalizedRow.match(/[-+]?[0-9]*\.?[0-9]+/);
                        if (match) {
                            const parsedValue = parseFloat(match[0]);
                            if (!isNaN(parsedValue)) {
                                const rounded = Math.round(parsedValue * 100) / 100;
                                newGrades[targetIndex].score = Math.min(100, Math.max(0, rounded));
                                pasteCount++;
                            }
                        }
                    }
                }
                
                toast.success(`${pasteCount} nilai berhasil ditempel (paste) dari Excel!`);
                return newGrades;
            });
        }
    }, [toast]);

    const handleClearAllClick = () => {
        const filled = grades.filter(g => g.score !== '').length;
        if (filled > 0) {
            setShowClearConfirm(true);
        } else {
            toast.info('Tidak ada nilai untuk dihapus');
        }
    };

    const handleExport = async () => {
        try {
            const className = classes?.find(c => c.id === selectedClass)?.name || 'Kelas';
            const filename = `Nilai_${selectedSubject.replace(/\s/g, '_')}_${className.replace(/\s/g, '_')}_${assessmentName.replace(/\s/g, '_')}.xlsx`;
            
            await exportGradesToExcel(
                grades.map(g => ({
                    studentName: g.studentName,
                    studentId: g.studentId,
                    score: g.score,
                })),
                {
                    filename,
                    sheetName: 'Nilai Siswa',
                    subject: selectedSubject,
                    assessmentName,
                    className,
                    kkm,
                }
            );
            toast.success('Nilai berhasil diekspor ke Excel!');
        } catch (error: any) {
            toast.error(`Gagal mengekspor: ${error.message || 'Error tidak dikenal'}`);
        }
    };

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
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={g.score}
                        onChange={(e) => handleScoreChange(g.studentId, e.target.value)}
                        onKeyDown={(e) => handleGridKeyDown(e, index)}
                        onPaste={(e) => handlePaste(e, index)}
                        placeholder="0-100"
                        aria-label={`Nilai untuk ${g.studentName}`}
                        className={`w-24 text-center ${g.score !== '' ? colorClass.border : ''}`}
                    />
                    {isBelowKkm && (
                        <span className="absolute -bottom-4 left-0 right-0 text-xxs text-amber-500 text-center">
                            &lt; KKM
                        </span>
                    )}
                </div>
            </div>
        );
    }, [existingGrades, kkm, handleGridKeyDown, registerRef, handlePaste, handleScoreChange]);

    return (
        <div className="min-h-full bg-gray-50 dark:bg-gray-950 p-4 md:p-6 pb-24 lg:pb-8">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => navigate(-1)} aria-label="Kembali ke halaman sebelumnya">
                            <ArrowLeftIcon className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Input Nilai Cepat</h1>
                            <p className="text-gray-500 dark:text-gray-400">Masukkan nilai untuk semua siswa dalam satu kelas</p>
                            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium border border-emerald-200 dark:border-emerald-800/50">
                                <span className="text-xxs">💡</span>
                                <span>Bisa langsung Copy dari Excel, lalu Paste (Ctrl+V) di kotak nilai</span>
                            </div>
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
                <SettingsCard
                    selectedClass={selectedClass}
                    setSelectedClass={setSelectedClass}
                    selectedSemester={selectedSemester}
                    setSelectedSemester={setSelectedSemester}
                    selectedSubject={selectedSubject}
                    setSelectedSubject={setSelectedSubject}
                    assessmentName={assessmentName}
                    setAssessmentName={setAssessmentName}
                    kkm={kkm}
                    setKkm={setKkm}
                    classes={classes}
                    loadingClasses={loadingClasses}
                    availableSubjects={availableSubjects}
                    onShowImportModal={() => setShowImportModal(true)}
                    onShowAIPasteModal={() => setShowAIPasteModal(true)}
                    onExport={handleExport}
                    gradesEmpty={grades.length === 0}
                />

                {/* Semester Locked Banner */}
                {semesterLocked && selectedSemester && (
                    <SemesterLockedBanner isLocked={true} />
                )}

                {/* Quick Actions Toolbar */}
                {selectedClass && grades.length > 0 && !semesterLocked && (
                    <QuickActionsToolbar
                        kkm={kkm}
                        onBulkFill={handleBulkFill}
                        onFillAllWith={handleFillAllWith}
                        onClearAllClick={handleClearAllClick}
                    />
                )}

                {/* Stats Summary */}
                {filledCount > 0 && (
                    <StatsPanel stats={stats} kkm={kkm} />
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
                    <GradeInputGrid
                        grades={grades}
                        filteredGrades={filteredGrades}
                        searchTerm={searchTerm}
                        setSearchTerm={setSearchTerm}
                        loadingStudents={loadingStudents}
                        filledCount={filledCount}
                        renderStudentRow={renderStudentRow}
                    />
                )}

                {/* Save and Adjustment Buttons */}
                {selectedClass && grades.length > 0 && (
                    <div className="sticky bottom-4 lg:bottom-8 flex flex-col sm:flex-row gap-3">
                        <Button
                            onClick={() => setShowAdjustmentModal(true)}
                            variant="outline"
                            className="flex-1 h-14 text-lg font-bold border-indigo-200 dark:border-indigo-900 bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 shadow-lg shadow-indigo-500/5 flex items-center justify-center gap-2"
                        >
                            <SparklesIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                            Katrol & Pratinjau Cetak
                        </Button>
                        <Button
                            onClick={handleSaveAll}
                            disabled={saveMutation.isPending || filledCount === 0 || semesterLocked || !selectedSemester || availableSubjects.length === 0}
                            className="flex-1 h-14 text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-xl shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {saveMutation.isPending ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <SaveIcon className="w-5 h-5" />
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

            {/* Import Preview Matcher Modal */}
            <ImportPreviewModal
                isOpen={showPreviewModal}
                onClose={() => setShowPreviewModal(false)}
                parsedData={pendingImportData}
                students={students?.map(s => ({ id: s.id, name: s.name })) || []}
                onConfirm={handlePreviewConfirm}
            />

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

            {/* AI Paste Modal */}
            <AIPasteModal
                isOpen={showAIPasteModal}
                onClose={() => setShowAIPasteModal(false)}
                students={students || []}
                onParseSuccess={handleAIPasteSuccess}
            />

            {/* Integrated Grade Adjustment & Print Preview Modal */}
            <UnifiedGradeAdjustmentModal
                isOpen={showAdjustmentModal}
                onClose={() => setShowAdjustmentModal(false)}
                students={students || []}
                scores={grades.reduce((acc, g) => ({ ...acc, [g.studentId]: String(g.score) }), {})}
                onApply={(finalScores) => {
                    setGrades(prev => prev.map(g => ({
                        ...g,
                        score: finalScores[g.studentId] !== undefined && finalScores[g.studentId] !== '' 
                            ? Number(finalScores[g.studentId]) 
                            : ''
                    })));
                }}
                kkm={kkm}
                subject={selectedSubject}
                assessmentName={assessmentName}
                className={classes?.find(c => c.id === selectedClass)?.name || ''}
                semesterLabel={selectedSemester ? semesters.find(s => s.id === selectedSemester)?.name : undefined}
            />
        </div>
    );
};

export default BulkGradeInputPage;
