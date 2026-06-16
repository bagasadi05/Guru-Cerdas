import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { useSemester } from '../../contexts/SemesterContext';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Select } from '../ui/Select';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { 
    calculateFormulaScore, 
    analyzeAndAdjustGradesWithAI, 
    AIStudentAdjustment 
} from '../../services/gradeAdjustmentService';
import { exportGradesWithTemplate } from '../../utils/gradeExporter';
import { 
    SparklesIcon, 
    PrinterIcon, 
    FileSpreadsheetIcon, 
    SaveIcon, 
    RefreshCwIcon, 
    PlayCircleIcon,
    AlertTriangleIcon,
    ArrowLeftIcon
} from '../Icons';
import { TeacherClassAssignmentRow } from '../../services/teacherAssignments';
import { Database } from '../../services/database.types';

type StudentRow = Database['public']['Tables']['students']['Row'];
type ClassRow = Database['public']['Tables']['classes']['Row'];

const SUBJECTS = [
    'Matematika', 'Bahasa Indonesia', 'Bahasa Inggris', 'IPA', 'IPS',
    'Pancasila', 'PKN', 'Seni Budaya', 'PJOK', 'Informatika', 'Agama'
];

const DEFAULT_KKM = 75;
const EMPTY_ARRAY: any[] = [];

const isSasAssessment = (name: string): boolean => 
    name.toUpperCase().includes('SAS') || 
    name.toUpperCase().includes('SAT') || 
    name.toUpperCase().includes('AKHIR');

const canAccessClass = (
    classOwnerId: string | null,
    currentUserId?: string | null,
    assignments: TeacherClassAssignmentRow[] = [],
    classId?: string | null
): boolean => {
    if (!currentUserId) return false;
    if (classOwnerId === currentUserId) return true;
    return assignments.some(a => a.class_id === classId && !a.deleted_at);
};

export const GradeAdjustmentPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const toast = useToast();
    const queryClient = useQueryClient();
    const { activeSemester, semesters, isLocked: isSemesterLocked } = useSemester();

    // Configuration States
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedSubject, setSelectedSubject] = useState<string>(SUBJECTS[0]);
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [assessmentName, setAssessmentName] = useState<string>('');
    const [customAssessmentName, setCustomAssessmentName] = useState<string>('');
    const [isCustomAssessment, setIsCustomAssessment] = useState<boolean>(false);
    const [kkm] = useState<number>(DEFAULT_KKM);
    const [kkmInput, setKkmInput] = useState<number>(70);
    const [materiInputs, setMateriInputs] = useState<Record<string, string>>({});

    // Excel formula configuration: Score * weight + constant
    const [weight, setWeight] = useState<number>(0.6);
    const [constant, setConstant] = useState<number>(40);

    // AI Adjustment state
    const [aiAdjustments, setAiAdjustments] = useState<AIStudentAdjustment[]>([]);
    const [classAnalysis, setClassAnalysis] = useState<string>('');
    const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

    // Selected scenario: 'original' | 'formula' | 'ai'
    const [activeScenario, setActiveScenario] = useState<'original' | 'formula' | 'ai'>('original');

    // Final scores to save (manually editable)
    const [finalScores, setFinalScores] = useState<Record<string, string>>({});
    const [manualOverrides, setManualOverrides] = useState<Set<string>>(new Set());

    // Sync selectedSemester on load
    useEffect(() => {
        if (activeSemester && !selectedSemester) {
            setSelectedSemester(activeSemester.id);
        }
    }, [activeSemester, selectedSemester]);

    // Fetch teacher assignments
    const { data: teacherAssignments = EMPTY_ARRAY } = useQuery({
        queryKey: ['teacherClassAssignments', user?.id],
        queryFn: async () => {
            if (!user) return [] as TeacherClassAssignmentRow[];
            const { data, error } = await supabase
                .from('teacher_class_assignments')
                .select('*')
                .eq('teacher_user_id', user.id)
                .is('deleted_at', null);
            if (error) throw error;
            return (data || []) as TeacherClassAssignmentRow[];
        },
        enabled: !!user,
    });

    // Fetch classes
    const { data: classes } = useQuery({
        queryKey: ['classes', user?.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('classes')
                .select('id, name, user_id, grade_level')
                .is('deleted_at', null)
                .order('name');
            if (error) throw error;
            return data as Pick<ClassRow, 'id' | 'name' | 'user_id' | 'grade_level'>[];
        },
        enabled: !!user,
    });

    const accessibleClasses = useMemo(
        () => (classes || []).filter((classItem) => canAccessClass(classItem.user_id, user?.id, teacherAssignments, classItem.id)),
        [classes, teacherAssignments, user?.id],
    );

    const activeClass = useMemo(() => {
        return classes?.find(c => c.id === selectedClass);
    }, [classes, selectedClass]);

    const targetAverageRange = useMemo(() => {
        if (!activeClass) return { min: 81, max: 98 }; // default fallback
        
        let level = activeClass.grade_level;
        if (level === null || level === undefined) {
            // Match standard numbers 1-6
            const matchNum = activeClass.name.match(/^([1-6])/);
            if (matchNum) {
                level = parseInt(matchNum[1]);
            } else {
                // Match Roman Numerals (I to VI)
                const upperName = activeClass.name.toUpperCase();
                if (upperName.startsWith('VI')) level = 6;
                else if (upperName.startsWith('V')) level = 5;
                else if (upperName.startsWith('IV')) level = 4;
                else if (upperName.startsWith('III')) level = 3;
                else if (upperName.startsWith('II')) level = 2;
                else if (upperName.startsWith('I')) level = 1;
            }
        }

        if (level && level >= 4 && level <= 6) {
            return { min: 84, max: 98 };
        }
        // Fallback or classes 1-3
        return { min: 81, max: 98 };
    }, [activeClass]);

    // Fetch students
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

    // Fetch list of assessment names already saved in the database
    const { data: savedAssessmentNames = EMPTY_ARRAY, isLoading: loadingAssessments } = useQuery({
        queryKey: ['savedAssessments', selectedClass, selectedSubject, selectedSemester],
        queryFn: async () => {
            if (!selectedClass || !selectedSubject || !selectedSemester || !students || students.length === 0) return [];
            const studentIds = students.map(s => s.id);
            
            const { data, error } = await supabase
                .from('academic_records')
                .select('assessment_name')
                .eq('subject', selectedSubject)
                .eq('semester_id', selectedSemester)
                .in('student_id', studentIds)
                .is('deleted_at', null);

            if (error) throw error;
            const names = Array.from(new Set((data || []).map(r => r.assessment_name).filter(Boolean))) as string[];
            return names;
        },
        enabled: !!selectedClass && !!selectedSubject && !!selectedSemester && !!students && students.length > 0,
    });

    const activeAssessmentName = isCustomAssessment ? customAssessmentName : assessmentName;

    const activeAssessmentsList = useMemo(() => {
        if (activeAssessmentName === '-- Semua PH --') {
            return savedAssessmentNames.filter(name => 
                name.toLowerCase().includes('ph') || 
                name.toLowerCase().includes('harian')
            );
        }
        if (activeAssessmentName === '-- Semua Penilaian --') {
            return savedAssessmentNames;
        }
        return activeAssessmentName ? [activeAssessmentName] : EMPTY_ARRAY;
    }, [activeAssessmentName, savedAssessmentNames]);

    const nonSasAssessments = useMemo(() => {
        return activeAssessmentsList.filter(name => !isSasAssessment(name));
    }, [activeAssessmentsList]);

    const getStudentFinalStats = useCallback((item: any) => {
        let sum = 0;
        let count = 0;
        activeAssessmentsList.forEach(assessName => {
            const key = activeAssessmentsList.length > 1 ? `${item.id}_${assessName}` : item.id;
            const val = finalScores[key];
            const num = val !== undefined && val !== '' ? Number(val) : (item.assessments[assessName]?.original ?? 0);
            sum += num;
            count++;
        });
        const finalAvg = count > 0 ? Math.round(sum / count) : 0;
        return Math.min(98, finalAvg); // Cap the student's final average at 98
    }, [activeAssessmentsList, finalScores]);

    // Fetch existing grades from database
    const { data: existingRecords = EMPTY_ARRAY, isLoading: loadingGrades } = useQuery({
        queryKey: ['existingGradesForKatrol', selectedClass, selectedSubject, activeAssessmentName, selectedSemester],
        queryFn: async () => {
            if (!selectedClass || !selectedSubject || !activeAssessmentName || !selectedSemester || !students || students.length === 0) return [];
            const studentIds = students.map(s => s.id);

            let query = supabase
                .from('academic_records')
                .select('id, student_id, score, assessment_name')
                .eq('subject', selectedSubject)
                .eq('semester_id', selectedSemester)
                .in('student_id', studentIds)
                .is('deleted_at', null);

            if (activeAssessmentName !== '-- Semua PH --' && activeAssessmentName !== '-- Semua Penilaian --') {
                query = query.eq('assessment_name', activeAssessmentName);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        enabled: !!selectedClass && !!selectedSubject && !!activeAssessmentName && !!selectedSemester && !!students && students.length > 0,
    });

    // Generate comparative data for list
    const listData = useMemo(() => {
        if (!students) return [];
        return students.map((s, index) => {
            const assessmentsMap: Record<string, { original: number | null; formula: number | null; ai: number | null; recordId?: string }> = {};
            
            let originalSum = 0;
            let originalCount = 0;
            let formulaSum = 0;
            let formulaCount = 0;
            let aiSum = 0;
            let aiCount = 0;

            activeAssessmentsList.forEach(assessName => {
                const record = existingRecords.find(r => r.student_id === s.id && r.assessment_name === assessName);
                const original = record ? record.score : null;
                const formula = original !== null ? calculateFormulaScore(original, weight, constant, targetAverageRange.min, targetAverageRange.max) : null;
                
                const aiData = aiAdjustments.find(a => a.student_id === s.id && (a as any).assessment_name === assessName);
                const aiVal = (aiData && original !== null) ? aiData.ai_score : formula;

                assessmentsMap[assessName] = {
                    original,
                    formula,
                    ai: aiVal,
                    recordId: record?.id
                };

                if (original !== null) {
                    originalSum += original;
                    originalCount++;
                }
                if (formula !== null) {
                    formulaSum += formula;
                    formulaCount++;
                }
                if (aiVal !== null) {
                    aiSum += aiVal;
                    aiCount++;
                }
            });

            const originalAvg = originalCount > 0 ? Math.round(originalSum / originalCount) : null;
            const formulaAvg = formulaCount > 0 ? Math.round(formulaSum / formulaCount) : null;
            const aiAvg = aiCount > 0 ? Math.round(aiSum / aiCount) : null;

            const singleRecord = existingRecords.find(r => r.student_id === s.id && r.assessment_name === activeAssessmentName);
            const singleOriginal = singleRecord ? singleRecord.score : null;
            const singleFormula = singleOriginal !== null ? calculateFormulaScore(singleOriginal, weight, constant, targetAverageRange.min, targetAverageRange.max) : null;
            const singleAiData = aiAdjustments.find(a => a.student_id === s.id);
            const singleAiVal = (singleAiData && singleOriginal !== null) ? singleAiData.ai_score : singleFormula;
            const singleAiRationale = singleAiData ? singleAiData.rationale : '';

            return {
                id: s.id,
                name: s.name,
                nis: (s as any).nis,
                nisn: (s as any).nisn,
                original: singleOriginal,
                formula: singleFormula,
                ai: singleAiVal,
                aiRationale: singleAiRationale,
                index: index + 1,
                assessments: assessmentsMap,
                originalAvg,
                formulaAvg,
                aiAvg
            };
        });
    }, [students, existingRecords, weight, constant, aiAdjustments, activeAssessmentsList, activeAssessmentName]);

    // Reset local state when configuration changes
    useEffect(() => {
        setAiAdjustments([]);
        setClassAnalysis('');
        setActiveScenario('original');
        setManualOverrides(new Set());
        setFinalScores({});
    }, [selectedClass, selectedSubject, activeAssessmentName, selectedSemester]);

    // Synchronize finalScores on state/scenario change
    useEffect(() => {
        const newScores: Record<string, string> = {};
        listData.forEach(item => {
            activeAssessmentsList.forEach(assessName => {
                const key = activeAssessmentsList.length > 1 ? `${item.id}_${assessName}` : item.id;
                
                const assessData = item.assessments[assessName];
                if (!assessData) return;

                if (manualOverrides.has(key)) {
                    newScores[key] = finalScores[key] || (assessData.original !== null ? String(assessData.original) : '');
                    return;
                }

                if (assessData.original === null) {
                    newScores[key] = '';
                    return;
                }

                if (activeScenario === 'original') {
                    newScores[key] = String(assessData.original);
                } else if (activeScenario === 'formula') {
                    newScores[key] = String(assessData.formula);
                } else if (activeScenario === 'ai') {
                    newScores[key] = String(assessData.ai);
                }
            });
        });
        setFinalScores(newScores);
    }, [activeScenario, listData, activeAssessmentsList]);

    const stats = useMemo(() => {
        if (activeAssessmentsList.length > 1) {
            const studentAverages = listData.map(item => getStudentFinalStats(item));
            if (studentAverages.length === 0) return { avg: 0, passingCount: 0, passingPct: 0 };
            const sum = studentAverages.reduce((a, b) => a + b, 0);
            const avg = Math.round(sum / studentAverages.length);
            const passingCount = studentAverages.filter(v => v >= kkm).length;
            const passingPct = Math.round((passingCount / studentAverages.length) * 100);
            return {
                avg,
                passingCount,
                passingPct
            };
        }

        const values = Object.values(finalScores)
            .filter(v => v !== undefined && v !== '')
            .map(Number)
            .filter(n => !isNaN(n));
        
        if (values.length === 0) return { avg: 0, passingCount: 0, passingPct: 0 };
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = Math.round(sum / values.length);
        const passingCount = values.filter(v => v >= kkm).length;
        const passingPct = Math.round((passingCount / values.length) * 100);

        return {
            avg,
            passingCount,
            passingPct
        };
    }, [finalScores, kkm, listData, activeAssessmentsList, getStudentFinalStats]);

    // AI Audit Action
    const handleRunAiAudit = async () => {
        setIsAiLoading(true);
        toast.info('Menghubungi AI untuk menganalisis sebaran nilai...');
        
        try {
            const allAdjustments: any[] = [];
            let combinedAnalysis = '';

            for (const assessName of activeAssessmentsList) {
                const studentPayload = listData
                    .filter(d => d.assessments[assessName]?.original !== null)
                    .map(d => {
                        const original = d.assessments[assessName]?.original ?? 0;
                        return {
                            id: d.id,
                            name: d.name,
                            score: original
                        };
                    });

                if (studentPayload.length === 0) continue;

                const result = await analyzeAndAdjustGradesWithAI(
                    studentPayload,
                    selectedSubject,
                    assessName,
                    kkm,
                    weight,
                    constant,
                    targetAverageRange
                );

                const adjustmentsWithAssess = result.adjustments.map(adj => ({
                    ...adj,
                    assessment_name: assessName
                }));
                allAdjustments.push(...adjustmentsWithAssess);
                
                if (combinedAnalysis) combinedAnalysis += '\n\n';
                combinedAnalysis += `[${assessName}] ${result.class_analysis}`;
            }

            setAiAdjustments(allAdjustments);
            setClassAnalysis(combinedAnalysis);
            setActiveScenario('ai'); // Auto switch to AI scenario
            toast.success('Analisis AI berhasil diterapkan untuk semua penilaian!');
        } catch (error: any) {
            toast.error(`Gagal melakukan audit AI: ${error.message}`);
        } finally {
            setIsAiLoading(false);
        }
    };

    // Manual grade revision
    const handleManualScoreChange = (studentId: string, value: string) => {
        const val = value === '' ? '' : String(Math.min(targetAverageRange.max, Math.max(targetAverageRange.min, parseInt(value) || 0)));
        setFinalScores(prev => ({ ...prev, [studentId]: val }));
        
        const nextOverrides = new Set(manualOverrides);
        nextOverrides.add(studentId);
        setManualOverrides(nextOverrides);
    };

    // Apply & Save final adjusted grades back to database
    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!user) throw new Error('Anda harus login untuk menyimpan nilai.');
            if (listData.length === 0) throw new Error('Tidak ada nilai untuk disimpan.');

            const recordsToUpsert: any[] = [];

            listData.forEach(item => {
                activeAssessmentsList.forEach(assessName => {
                    const key = activeAssessmentsList.length > 1 ? `${item.id}_${assessName}` : item.id;
                    const scoreValue = finalScores[key];

                    // If empty/null and no record exists, do not upsert.
                    // If a record exists but score was deleted, skip to avoid saving null.
                    if (scoreValue === undefined || scoreValue === '') {
                        return;
                    }

                    const record = existingRecords.find(r => r.student_id === item.id && r.assessment_name === assessName);

                    recordsToUpsert.push({
                        id: record?.id || crypto.randomUUID(),
                        student_id: item.id,
                        user_id: user.id,
                        subject: selectedSubject,
                        assessment_name: assessName,
                        score: Number(scoreValue),
                        notes: '',
                        semester_id: selectedSemester
                    });
                });
            });

            const { error } = await supabase.from('academic_records').upsert(recordsToUpsert);
            if (error) throw error;
            return recordsToUpsert.length;
        },
        onSuccess: (count) => {
            toast.success(`Berhasil memperbarui ${count} nilai terkatrol di database!`);
            queryClient.invalidateQueries({ queryKey: ['existingGradesForKatrol'] });
            queryClient.invalidateQueries({ queryKey: ['studentDetails'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
        },
        onError: (error: any) => {
            toast.error(`Gagal menyimpan nilai: ${error.message}`);
        }
    });

    const handlePrint = () => {
        window.print();
    };

    const handleExportExcel = async () => {
        try {
            const className = classes?.find(c => c.id === selectedClass)?.name || '';
            
            await exportGradesWithTemplate(
                listData,
                finalScores,
                selectedSubject,
                activeAssessmentName,
                activeAssessmentsList,
                className,
                activeScenario,
                kkmInput,
                materiInputs
            );
            
            toast.success('Daftar nilai berhasil diexport ke Excel menggunakan template sekolah!');
        } catch (error: any) {
            console.error(error);
            toast.error(`Gagal mengekspor data: ${error.message || error}`);
        }
    };

    const semesterLocked = selectedSemester ? isSemesterLocked(selectedSemester) : false;

    return (
        <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 md:p-8 flex flex-col overflow-y-auto">
            <div className="max-w-7xl mx-auto w-full space-y-6">
                
                {/* Header */}
                <div className="no-print flex items-center gap-4">
                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => navigate('/input-massal')} 
                        className="bg-white dark:bg-white/10 border-slate-200 dark:border-white/20 hover:bg-slate-100 dark:hover:bg-white/20 flex-shrink-0"
                    >
                        <ArrowLeftIcon className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <SparklesIcon className="w-8 h-8 text-emerald-500 animate-pulse" />
                            Katrol Nilai & Evaluasi Cerdas
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">
                            Sesuaikan dan perbaiki sebaran nilai tersimpan menggunakan rumus excel & audit AI.
                        </p>
                    </div>
                </div>

                {/* Configuration Card */}
                <Card className="no-print">
                    <CardHeader>
                        <CardTitle>Filter Nilai Tersimpan</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Pilih Kelas</label>
                            <Select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                                <option value="">-- Pilih Kelas --</option>
                                {accessibleClasses.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </Select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Mata Pelajaran</label>
                            <Select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                                {SUBJECTS.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </Select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Semester</label>
                            <Select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)}>
                                {semesters.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </Select>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Nama Penilaian</label>
                                <button 
                                    onClick={() => {
                                        setIsCustomAssessment(!isCustomAssessment);
                                        setAssessmentName('');
                                        setCustomAssessmentName('');
                                    }} 
                                    className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                                >
                                    {isCustomAssessment ? 'Pilih Tersimpan' : 'Ketik Manual'}
                                </button>
                            </div>
                            {isCustomAssessment ? (
                                <Input 
                                    value={customAssessmentName}
                                    onChange={(e) => setCustomAssessmentName(e.target.value)}
                                    placeholder="Ketik nama penilaian..."
                                />
                            ) : (
                                <Select 
                                    value={assessmentName} 
                                    onChange={(e) => setAssessmentName(e.target.value)}
                                    disabled={loadingAssessments || savedAssessmentNames.length === 0}
                                >
                                    <option value="">
                                        {loadingAssessments 
                                            ? 'Memuat data...' 
                                            : savedAssessmentNames.length === 0 
                                                ? '-- Tidak Ada Nilai Tersimpan --' 
                                                : '-- Pilih Penilaian --'}
                                    </option>
                                    {savedAssessmentNames.length > 0 && (
                                        <>
                                            <option value="-- Semua PH --">-- Semua PH (Penilaian Harian) --</option>
                                            <option value="-- Semua Penilaian --">-- Semua Penilaian --</option>
                                            <option disabled>──────────</option>
                                        </>
                                    )}
                                    {savedAssessmentNames.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </Select>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Main Dashboard / Workspace */}
                {!selectedClass || !activeAssessmentName ? (
                    <div className="no-print py-16 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
                        <AlertTriangleIcon className="w-12 h-12 text-slate-400 mb-4 animate-bounce" />
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Konfigurasi Belum Lengkap</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mt-1">
                            Silakan pilih Kelas, Mata Pelajaran, Semester, dan Nama Penilaian untuk memuat data dari database.
                        </p>
                    </div>
                ) : loadingStudents || loadingGrades ? (
                    <div className="no-print py-16 flex flex-col items-center justify-center text-center">
                        <RefreshCwIcon className="w-10 h-10 animate-spin text-emerald-500 mb-4" />
                        <p className="text-slate-500">Memuat berkas nilai dari database...</p>
                    </div>
                ) : listData.length === 0 || existingRecords.length === 0 ? (
                    <div className="no-print py-16 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
                        <AlertTriangleIcon className="w-12 h-12 text-amber-500 mb-4" />
                        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Nilai Tidak Ditemukan</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mt-1">
                            Belum ada nilai yang disimpan untuk penilaian <strong>"{activeAssessmentName}"</strong>. Silakan isi nilai terlebih dahulu di menu <strong>Manajemen Nilai</strong>.
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4 w-full">
                        {/* Out of bounds alert */}
                        {(stats.avg < targetAverageRange.min || stats.avg > targetAverageRange.max) && (
                            <div className="no-print p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs font-semibold flex items-center gap-2">
                                <AlertTriangleIcon className="w-4 h-4 text-amber-500 animate-pulse flex-shrink-0" />
                                <span>
                                    Rerata Kelas saat ini ({stats.avg}) berada di luar batas target kelulusan MI ({targetAverageRange.min} - {targetAverageRange.max}) untuk kelas ini. Gunakan <strong>Audit AI Cerdas</strong> atau sesuaikan bobot/konstanta untuk memenuhi target.
                                </span>
                            </div>
                        )}
                        <div className="flex flex-col lg:flex-row gap-6 items-start">
                        
                        {/* Control Column */}
                        <div className="no-print w-full lg:w-1/4 flex flex-col gap-4">
                            
                            {/* Linear Formula Settings */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                                        <span className="w-2 h-4 rounded-sm bg-emerald-500"></span>
                                        Bobot Rumus Katrol
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        Formula: <code>(NilaiAsli * Bobot) + Konstanta</code>
                                    </p>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Persentase Bobot (Decimal)</label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                step="0.05"
                                                min="0"
                                                max="1"
                                                value={weight}
                                                onChange={(e) => setWeight(Math.max(0, Math.min(1, parseFloat(e.target.value) || 0.6)))}
                                                className="h-9 text-center font-bold"
                                            />
                                            <span className="text-xs text-slate-500 font-medium">({Math.round(weight * 100)}%)</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Konstanta Tambahan</label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={constant}
                                            onChange={(e) => setConstant(Math.max(0, Math.min(100, parseInt(e.target.value) || 40)))}
                                            className="h-9 text-center font-bold"
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Excel Export Settings */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                                        <span className="w-2 h-4 rounded-sm bg-emerald-500"></span>
                                        Pengaturan File Excel
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-500 mb-1">Nilai KKM / KKTP</label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={kkmInput}
                                            onChange={(e) => setKkmInput(Math.max(0, Math.min(100, parseInt(e.target.value) || 70)))}
                                            className="h-9 font-bold text-center"
                                            placeholder="Contoh: 70"
                                        />
                                    </div>
                                    {nonSasAssessments.length > 0 && (
                                        <div>
                                            {nonSasAssessments.length === 1 ? (
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Materi Pembelajaran</label>
                                                    <Input
                                                        type="text"
                                                        value={materiInputs[nonSasAssessments[0]] || ''}
                                                        onChange={(e) => setMateriInputs(prev => ({ ...prev, [nonSasAssessments[0]]: e.target.value }))}
                                                        className="h-9"
                                                        placeholder="Contoh: Perkalian Pecahan..."
                                                    />
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <label className="block text-[11px] font-bold text-slate-500">Materi Pembelajaran per Penilaian</label>
                                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                                        {nonSasAssessments.map(assessName => (
                                                            <div key={assessName} className="flex flex-col gap-0.5">
                                                                <span className="text-[10px] font-semibold text-slate-400">{assessName}</span>
                                                                <Input
                                                                    type="text"
                                                                    value={materiInputs[assessName] || ''}
                                                                    onChange={(e) => setMateriInputs(prev => ({ ...prev, [assessName]: e.target.value }))}
                                                                    className="h-8 text-xs"
                                                                    placeholder={`Materi ${assessName}...`}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* AI Cerdas Audit Panel */}
                            <div className="p-4 bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-200/50 dark:border-emerald-900/30 rounded-2xl">
                                <h3 className="text-sm font-bold text-emerald-950 dark:text-emerald-300 mb-2 flex items-center gap-1.5">
                                    <SparklesIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    Audit AI Cerdas (81-98)
                                </h3>
                                <p className="text-xs text-emerald-900/70 dark:text-emerald-400/70 mb-4 leading-relaxed">
                                    Evaluasi sebaran nilai berbasis AI OpenRouter untuk mengantisipasi kompresi dan melindungi peringkat nilai tinggi.
                                </p>
                                <Button
                                    onClick={handleRunAiAudit}
                                    disabled={isAiLoading}
                                    className="w-full h-10 bg-emerald-500 hover:bg-emerald-600 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                                >
                                    {isAiLoading ? (
                                        <>
                                            <RefreshCwIcon className="w-4 h-4 animate-spin" />
                                            Menganalisis...
                                        </>
                                    ) : (
                                        <>
                                            <PlayCircleIcon className="w-4 h-4" />
                                            Audit AI Cerdas
                                        </>
                                    )}
                                </Button>
                                {classAnalysis && (
                                    <div className="mt-4 p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-emerald-950 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 max-h-36 overflow-y-auto">
                                        <strong className="text-emerald-600 dark:text-emerald-400">Analisis Kelas AI:</strong>
                                        <p className="mt-1">{classAnalysis}</p>
                                    </div>
                                )}
                            </div>

                            {/* Scenario Switcher */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                                        <span className="w-2 h-4 rounded-sm bg-emerald-500"></span>
                                        Skenario Terpilih
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-2">
                                    <button
                                        onClick={() => setActiveScenario('original')}
                                        className={`text-left px-3 py-2.5 text-xs font-semibold rounded-lg border transition-all ${
                                            activeScenario === 'original'
                                                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow'
                                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                                        }`}
                                    >
                                        Skenario A: Nilai Asli
                                    </button>
                                    <button
                                        onClick={() => setActiveScenario('formula')}
                                        className={`text-left px-3 py-2.5 text-xs font-semibold rounded-lg border transition-all ${
                                            activeScenario === 'formula'
                                                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow'
                                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                                        }`}
                                    >
                                        Skenario B: Rumus Excel
                                    </button>
                                    <button
                                        onClick={() => setActiveScenario('ai')}
                                        disabled={aiAdjustments.length === 0}
                                        className={`text-left px-3 py-2.5 text-xs font-semibold rounded-lg border transition-all flex items-center justify-between ${
                                            activeScenario === 'ai'
                                                ? 'bg-emerald-500 text-white border-emerald-500 dark:bg-emerald-400 dark:text-slate-950 dark:border-emerald-400 shadow'
                                                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 disabled:opacity-40'
                                        }`}
                                    >
                                        <span>Skenario C: Saran AI</span>
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                    </button>
                                    {manualOverrides.size > 0 && (
                                        <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[10px]">
                                            <span className="font-bold text-amber-600 dark:text-amber-400">{manualOverrides.size} Revisi Manual</span>
                                            <button 
                                                onClick={() => setManualOverrides(new Set())}
                                                className="text-slate-400 hover:text-red-500 font-bold"
                                            >
                                                Reset
                                            </button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Primary Action Buttons */}
                            <div className="flex flex-col gap-2 pt-2">
                                <Button
                                    onClick={handlePrint}
                                    variant="outline"
                                    className="w-full h-11 flex items-center justify-center gap-1.5 font-bold border-slate-200 dark:border-slate-800"
                                >
                                    <PrinterIcon className="w-4 h-4" />
                                    Cetak Lembar Nilai
                                </Button>
                                <Button
                                    onClick={handleExportExcel}
                                    variant="outline"
                                    className="w-full h-11 flex items-center justify-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-950 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                >
                                    <FileSpreadsheetIcon className="w-4 h-4" />
                                    Export ke Excel
                                </Button>
                                <Button
                                    onClick={() => saveMutation.mutate()}
                                    disabled={saveMutation.isPending || semesterLocked}
                                    variant="primary"
                                    className="w-full h-12 flex items-center justify-center gap-1.5 font-bold"
                                >
                                    {saveMutation.isPending ? (
                                        <>
                                            <RefreshCwIcon className="w-4 h-4 animate-spin" />
                                            Menyimpan...
                                        </>
                                    ) : (
                                        <>
                                            <SaveIcon className="w-4 h-4" />
                                            Simpan Nilai Terkatrol
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* Printable Area Paper Document */}
                        <div className="w-full lg:w-3/4 bg-slate-200/40 dark:bg-slate-900/40 p-4 sm:p-6 rounded-3xl flex justify-center border border-slate-200 dark:border-slate-800">
                            <div className="print-area w-full max-w-3xl bg-white text-slate-900 p-8 sm:p-12 rounded-lg shadow-md border border-slate-300/30 flex flex-col justify-between font-sans min-h-[75vh]">
                                
                                <style>{`
                                    @media print {
                                        body * {
                                            visibility: hidden;
                                        }
                                        .print-area, .print-area * {
                                            visibility: visible;
                                        }
                                        .print-area {
                                            position: absolute;
                                            left: 0;
                                            top: 0;
                                            width: 100% !important;
                                            padding: 0 !important;
                                            margin: 0 !important;
                                            border: none !important;
                                            box-shadow: none !important;
                                            background: white !important;
                                        }
                                        .no-print {
                                            display: none !important;
                                        }
                                    }
                                `}</style>

                                <div>
                                    {/* School Header */}
                                    <div className="flex flex-col items-center justify-center text-center pb-4 border-b-2 border-slate-900 mb-6">
                                        <h1 className="text-xl font-bold uppercase tracking-wider leading-snug">
                                            {user?.school_name || 'MI AL IRSYAD KOTA MADIUN'}
                                        </h1>
                                        <p className="text-[10px] text-slate-500 font-semibold tracking-wide">
                                            Kementerian Agama Republik Indonesia – Kantor Kota Madiun
                                        </p>
                                        <h2 className="text-xs font-extrabold uppercase mt-4 tracking-widest text-slate-800 bg-slate-100 px-3 py-1 rounded">
                                            LEMBAR NILAI HASIL KATROL & EVALUASI CERDAS
                                        </h2>
                                    </div>

                                    {/* Metadata Box */}
                                    <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-xs text-slate-700 mb-6 pb-4 border-b border-slate-100">
                                        <div className="flex justify-between py-1 border-b border-slate-50">
                                            <span className="font-semibold text-slate-500">Mata Pelajaran:</span>
                                            <span className="font-bold text-slate-800">{selectedSubject}</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-slate-50">
                                            <span className="font-semibold text-slate-500">Kelas:</span>
                                            <span className="font-bold text-slate-800">
                                                {classes?.find(c => c.id === selectedClass)?.name || ''}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-slate-50">
                                            <span className="font-semibold text-slate-500">Jenis Evaluasi:</span>
                                            <span className="font-bold text-slate-800">{activeAssessmentName}</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-slate-50">
                                            <span className="font-semibold text-slate-500">Semester:</span>
                                            <span className="font-bold text-slate-800">
                                                {semesters.find(s => s.id === selectedSemester)?.name || ''}
                                            </span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-slate-50">
                                            <span className="font-semibold text-slate-500">KKM:</span>
                                            <span className="font-bold text-slate-800">{kkm}</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-slate-50">
                                            <span className="font-semibold text-slate-500">Rerata Kelas (Akhir):</span>
                                            <div className="flex items-center gap-1.5 font-bold">
                                                <span className={
                                                    stats.avg < targetAverageRange.min || stats.avg > targetAverageRange.max
                                                        ? 'text-amber-600'
                                                        : 'text-slate-800'
                                                }>
                                                    {stats.avg}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    (Target: {targetAverageRange.min}-{targetAverageRange.max})
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-slate-50">
                                            <span className="font-semibold text-slate-500">Kelulusan Kelas:</span>
                                            <span className="font-bold text-slate-850">{stats.passingPct}% ({stats.passingCount} Siswa Tuntas)</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-slate-50">
                                            <span className="font-semibold text-slate-500">Skenario Terpilih:</span>
                                            <span className="font-bold text-emerald-600 capitalize">{activeScenario}</span>
                                        </div>
                                    </div>

                                    {/* Data Table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs text-left border-collapse border border-slate-350">
                                            <thead>
                                                {activeAssessmentsList.length > 1 ? (
                                                    <tr className="bg-slate-100 text-slate-800 uppercase text-[9px] tracking-wider border-b border-slate-350">
                                                        <th className="border border-slate-350 p-2 text-center w-8">No</th>
                                                        <th className="border border-slate-350 p-2 min-w-36">Nama Siswa</th>
                                                        {activeAssessmentsList.map(assessName => (
                                                            <th key={assessName} className="border border-slate-350 p-2 text-center min-w-28">{assessName}</th>
                                                        ))}
                                                        <th className="border border-slate-350 p-2 text-center w-20">Rerata Asli</th>
                                                        <th className="border border-slate-350 p-2 text-center w-20">Rerata Akhir</th>
                                                    </tr>
                                                ) : (
                                                    <tr className="bg-slate-100 text-slate-800 uppercase text-[9px] tracking-wider border-b border-slate-350">
                                                        <th className="border border-slate-350 p-2 text-center w-8">No</th>
                                                        <th className="border border-slate-350 p-2">Nama Siswa</th>
                                                        <th className="border border-slate-350 p-2 text-center w-20">Nilai Asli</th>
                                                        <th className="border border-slate-350 p-2 text-center w-20">Rumus ({Math.round(weight * 100)}%+{constant})</th>
                                                        <th className="border border-slate-350 p-2 text-center w-20">Rekomendasi AI</th>
                                                        <th className="border border-slate-350 p-2 text-center w-24">Nilai Akhir</th>
                                                    </tr>
                                                )}
                                            </thead>
                                            <tbody>
                                                {activeAssessmentsList.length > 1 ? (
                                                    listData.map((item) => {
                                                        const origAvg = item.originalAvg;
                                                        const finalAvg = getStudentFinalStats(item);
                                                        const isAvgFailed = finalAvg < kkm;

                                                        return (
                                                            <tr key={item.id} className="hover:bg-slate-50/50 border-b border-slate-200">
                                                                <td className="border border-slate-350 p-2 text-center font-medium text-slate-500">{item.index}</td>
                                                                <td className="border border-slate-350 p-2 font-bold text-slate-800">{item.name}</td>
                                                                {activeAssessmentsList.map(assessName => {
                                                                    const key = `${item.id}_${assessName}`;
                                                                    const scoreValue = finalScores[key] !== undefined ? finalScores[key] : '';
                                                                    const originalScore = item.assessments[assessName]?.original ?? 0;
                                                                    const numericScore = scoreValue !== '' ? Number(scoreValue) : originalScore;
                                                                    const isFailed = numericScore < kkm;

                                                                    return (
                                                                        <td key={assessName} className="border border-slate-350 p-1 text-center font-bold">
                                                                            <div className="flex flex-col items-center justify-center gap-1 py-1">
                                                                                <span className="text-[10px] text-slate-400 font-semibold leading-none">
                                                                                    Asli: {originalScore}
                                                                                </span>
                                                                                <div className="relative flex items-center justify-center">
                                                                                    <input
                                                                                        type="number"
                                                                                        min="0"
                                                                                        max={targetAverageRange.max}
                                                                                        value={scoreValue}
                                                                                        onChange={(e) => handleManualScoreChange(key, e.target.value)}
                                                                                        className={`no-print w-14 text-center text-xs font-bold border rounded p-0.5 ${
                                                                                            isFailed 
                                                                                                ? 'border-red-300 bg-red-50 text-red-700' 
                                                                                                : manualOverrides.has(key)
                                                                                                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                                                                                                    : 'border-slate-200 text-slate-900 bg-white'
                                                                                        }`}
                                                                                    />
                                                                                    <span className="hidden print:inline-block font-bold text-xs text-slate-800">
                                                                                        {scoreValue || '-'}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                    );
                                                                })}
                                                                <td className="border border-slate-350 p-2 text-center text-slate-500 font-semibold">{origAvg}</td>
                                                                <td className={`border border-slate-350 p-2 text-center font-extrabold ${isAvgFailed ? 'text-red-600' : 'text-emerald-600'}`}>
                                                                    {finalAvg}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                ) : (
                                                    listData.map((item) => {
                                                        const scoreValue = finalScores[item.id] !== undefined ? finalScores[item.id] : '';
                                                        const numericScore = scoreValue !== '' ? Number(scoreValue) : 0;
                                                        const isFailed = scoreValue !== '' && numericScore < kkm;
                                                        const isAiAdjusted = aiAdjustments.length > 0 && item.ai !== item.formula;

                                                        return (
                                                            <tr key={item.id} className="hover:bg-slate-50/50 border-b border-slate-200">
                                                                <td className="border border-slate-350 p-2 text-center font-medium text-slate-500">{item.index}</td>
                                                                <td className="border border-slate-350 p-2 font-bold text-slate-800">
                                                                    <div className="flex flex-col">
                                                                        <span>{item.name}</span>
                                                                        {isAiAdjusted && activeScenario === 'ai' && item.aiRationale && (
                                                                            <span className="no-print text-[9px] text-emerald-600 dark:text-emerald-400 font-medium italic mt-0.5">
                                                                                ✨ {item.aiRationale}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="border border-slate-350 p-2 text-center text-slate-500 font-semibold">{item.original}</td>
                                                                <td className="border border-slate-350 p-2 text-center text-slate-500 font-semibold">{item.formula}</td>
                                                                <td className="border border-slate-350 p-2 text-center text-slate-500 font-semibold">
                                                                    <div className="flex items-center justify-center gap-1">
                                                                        <span>{item.ai}</span>
                                                                        {isAiAdjusted && <span className="no-print text-emerald-500 text-[10px]">✨</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="border border-slate-350 p-1 text-center font-bold">
                                                                    <div className="relative flex items-center justify-center">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            max={targetAverageRange.max}
                                                                            value={scoreValue}
                                                                            onChange={(e) => handleManualScoreChange(item.id, e.target.value)}
                                                                            className={`no-print w-16 text-center text-xs font-bold border rounded p-1 ${
                                                                                isFailed 
                                                                                    ? 'border-red-300 bg-red-50 text-red-700' 
                                                                                    : manualOverrides.has(item.id)
                                                                                        ? 'border-amber-300 bg-amber-50 text-amber-800'
                                                                                        : 'border-slate-200 text-slate-900 bg-white'
                                                                            }`}
                                                                        />
                                                                        <span className="hidden print:inline-block font-extrabold text-sm">
                                                                            {scoreValue || '-'}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Signatures Area */}
                                <div className="mt-12 flex justify-between items-end text-xs text-slate-700">
                                    <div>
                                        <p className="mb-12">Mengetahui,<br />Kepala Madrasah</p>
                                        <p className="font-bold border-t border-slate-500 pt-1 w-44">( ______________________ )</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="mb-12">Madiun, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />Guru Kelas / Mapel</p>
                                        <p className="font-bold border-t border-slate-500 pt-1 w-44 ml-auto">( {user?.name || 'Nama Guru'} )</p>
                                    </div>
                                </div>

                            </div>
                        </div>

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GradeAdjustmentPage;
