import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSemester } from '../../../../contexts/SemesterContext';
import { InputMode, Step, StudentFilter } from '../types';

export interface SubjectGradeDraft {
    step: Step;
    mode: InputMode | null;
    selectedClass: string;
    subjectGradeInfo: { subject: string; assessment_name: string; notes: string; semester: string };
    scores: Record<string, string>;
    selectedStudentIds: string[];
}

const SUBJECT_GRADE_DRAFT_KEY = 'guru_cerdas_subject_grade_draft';

function readSubjectGradeDraft(): SubjectGradeDraft | null {
    try {
        const data = sessionStorage.getItem(SUBJECT_GRADE_DRAFT_KEY);
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
}

function writeSubjectGradeDraft(draft: SubjectGradeDraft) {
    try {
        sessionStorage.setItem(SUBJECT_GRADE_DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
        console.error('Failed to save subject grade draft:', e);
    }
}

export function useMassInputState() {
    const { activeSemester } = useSemester();
    const location = useLocation();
    const navigate = useNavigate();
    const [initialDraft] = useState<SubjectGradeDraft | null>(() => readSubjectGradeDraft());
    const isScoresDirty = useRef(Boolean(initialDraft && Object.keys(initialDraft.scores).length > 0));

    const [step, setStep] = useState<Step>(() => initialDraft?.step || 1);
    const [mode, setMode] = useState<InputMode | null>(() => initialDraft?.mode || null);
    const [selectedClass, setSelectedClass] = useState(() => initialDraft?.selectedClass || '');
    const prevClassRef = useRef(selectedClass);
    const prevModeRef = useRef(mode);
    const [quizInfo, setQuizInfo] = useState({ name: '', subject: '', date: new Date().toISOString().slice(0, 10) });
    const [subjectGradeInfo, setSubjectGradeInfo] = useState(() => initialDraft?.subjectGradeInfo || { subject: '', assessment_name: '', notes: '', semester: '' });
    const [scores, setScores] = useState<Record<string, string>>(() => initialDraft?.scores || {});
    const [pasteData, setPasteData] = useState('');
    const [selectedViolationCode, setSelectedViolationCode] = useState('');
    const [violationDate, setViolationDate] = useState(new Date().toISOString().slice(0, 10));
    const [violationNotes, setViolationNotes] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState(() => new Set<string>(initialDraft?.selectedStudentIds || []));
    const [searchTerm, setSearchTerm] = useState('');
    const [studentFilter, setStudentFilter] = useState<StudentFilter>('all');
    const [noteMethod, setNoteMethod] = useState<'ai' | 'template'>('ai');
    const [templateNote, setTemplateNote] = useState('Ananda [Nama Siswa] menunjukkan perkembangan yang baik semester ini. Terus tingkatkan semangat belajar dan jangan ragu bertanya jika ada kesulitan.');
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [isConfigOpen, setIsConfigOpen] = useState(true);
    const [isCustomSubject, setIsCustomSubject] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showChartModal, setShowChartModal] = useState(false);
    const [bypassDuplicateGuard, setBypassDuplicateGuard] = useState(false);
    const [pendingImportData, setPendingImportData] = useState<any[] | null>(null);

    // Warn before unload if there are unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isScoresDirty.current) {
                e.preventDefault();
                e.returnValue = 'Anda memiliki nilai yang belum disimpan. Apakah Anda yakin ingin keluar?';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    // Set default semester when active semester loads
    useEffect(() => {
        if (activeSemester && !subjectGradeInfo.semester) {
            const timer = setTimeout(() => setSubjectGradeInfo(prev => ({ ...prev, semester: activeSemester.id })), 0);
            return () => clearTimeout(timer);
        }
    }, [activeSemester, subjectGradeInfo.semester]);

    // Prefill from router navigation state
    useEffect(() => {
        const prefill = location.state?.prefill;
        if (prefill) {
            const { mode: preMode, classId, subject, assessment_name } = prefill;
            const timer = setTimeout(() => {
                if (preMode) { setMode(preMode); setStep(2); }
                if (classId) setSelectedClass(classId);
                if (subject || assessment_name) {
                    setSubjectGradeInfo(prev => ({
                        ...prev,
                        subject: subject || prev.subject,
                        assessment_name: assessment_name || prev.assessment_name,
                    }));
                }
                navigate(location.pathname, { replace: true, state: {} });
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [location.state?.prefill, navigate, location.pathname]);

    // Reset student selection / scores when class changes
    useEffect(() => {
        if (prevClassRef.current !== selectedClass) {
            setSelectedStudentIds(new Set());
            setScores({});
            setSearchTerm('');
            setStudentFilter('all');
            setBypassDuplicateGuard(false);
            isScoresDirty.current = false;
            prevClassRef.current = selectedClass;
        }
    }, [selectedClass]);

    // Reset filter when mode changes
    useEffect(() => {
        if (prevModeRef.current !== mode) {
            setStudentFilter('all');
            setBypassDuplicateGuard(false);
            prevModeRef.current = mode;
        }
    }, [mode]);

    // Auto-save draft when values change
    useEffect(() => {
        if (mode !== 'subject_grade' || !isScoresDirty.current || Object.keys(scores).length === 0) return;

        const draft: SubjectGradeDraft = {
            step: 2,
            mode,
            selectedClass,
            subjectGradeInfo,
            scores,
            selectedStudentIds: Array.from(selectedStudentIds),
        };
        writeSubjectGradeDraft(draft);
    }, [mode, selectedClass, selectedStudentIds, scores, subjectGradeInfo]);

    const handleModeSelect = (selectedMode: InputMode) => {
        if (selectedMode === 'grade_adjustment') {
            setMode('subject_grade');
            setStep(2);
            setIsCustomSubject(false);
            return;
        }
        setMode(selectedMode);
        setStep(2);
        setIsCustomSubject(false);
    };

    const clearSubjectGradeDraft = () => {
        sessionStorage.removeItem(SUBJECT_GRADE_DRAFT_KEY);
    };

    const saveSubjectGradeDraft = (draft: Omit<SubjectGradeDraft, 'step' | 'mode'>) => {
        writeSubjectGradeDraft({ step: 2, mode: 'subject_grade', ...draft });
    };

    const handleBack = () => {
        clearSubjectGradeDraft();
        setStep(1); setMode(null); setSelectedClass('');
        setQuizInfo({ name: '', subject: '', date: new Date().toISOString().slice(0, 10) });
        setSubjectGradeInfo({ subject: '', assessment_name: '', notes: '', semester: activeSemester?.id || '' });
        setScores({}); setPasteData(''); setSelectedViolationCode('');
        setViolationDate(new Date().toISOString().slice(0, 10));
        setSelectedStudentIds(new Set()); setSearchTerm(''); setStudentFilter('all');
        setValidationErrors({}); setNoteMethod('ai');
        setTemplateNote('Ananda [Nama Siswa] menunjukkan perkembangan yang baik semester ini. Terus tingkatkan semangat belajar dan jangan ragu bertanya jika ada kesulitan.');
        setShowImportModal(false); setShowChartModal(false);
        setBypassDuplicateGuard(false);
        isScoresDirty.current = false;
    };

    const handleScoreChange = (studentId: string, value: string) => {
        isScoresDirty.current = true;
        const numValue = Number(value);
        const errors = { ...validationErrors };
        if (value && (isNaN(numValue) || numValue < 0 || numValue > 100)) {
            errors[studentId] = 'Nilai harus antara 0-100';
        } else {
            delete errors[studentId];
        }
        setValidationErrors(errors);
        setScores(prev => ({ ...prev, [studentId]: value }));
    };

    const handleStudentSelect = (studentId: string) => {
        setSelectedStudentIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(studentId)) { newSet.delete(studentId); } else { newSet.add(studentId); }
            return newSet;
        });
    };

    const setIsScoresDirty = (val: boolean) => {
        isScoresDirty.current = val;
    };

    return {
        step, setStep,
        mode, setMode,
        selectedClass, setSelectedClass,
        quizInfo, setQuizInfo,
        subjectGradeInfo, setSubjectGradeInfo,
        scores, setScores,
        pasteData, setPasteData,
        selectedViolationCode,
        setSelectedViolationCode,
        violationDate,
        setViolationDate,
        violationNotes,
        setViolationNotes,
        selectedStudentIds, setSelectedStudentIds,
        searchTerm, setSearchTerm,
        studentFilter, setStudentFilter,
        noteMethod, setNoteMethod,
        templateNote, setTemplateNote,
        validationErrors, setValidationErrors,
        isConfigOpen, setIsConfigOpen,
        isCustomSubject, setIsCustomSubject,
        showImportModal, setShowImportModal,
        showChartModal, setShowChartModal,
        isScoresDirty,
        setIsScoresDirty,
        clearSubjectGradeDraft,
        saveSubjectGradeDraft,
        bypassDuplicateGuard, setBypassDuplicateGuard,
        pendingImportData, setPendingImportData,
        handleModeSelect, handleBack, handleScoreChange, handleStudentSelect,
    };
}
