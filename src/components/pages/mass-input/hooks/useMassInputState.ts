import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSemester } from '../../../../contexts/SemesterContext';
import { useAuth } from '../../../../hooks/useAuth';
import { InputMode, Step, StudentFilter } from '../types';
import { schoolDate } from '../../../../utils/reminderDates';
import {
    SubjectGradeDraft,
    getSubjectGradeContextKey,
    readLatestSubjectGradeDraft,
    readSubjectGradeDraft,
    removeSubjectGradeDraft,
    writeSubjectGradeDraft,
} from '../../../../utils/subjectGradeDraftStorage';

export type { SubjectGradeDraft };

/** A draft put back into the form, shown so the teacher can keep or discard it. */
export interface RestoredDraftInfo {
    savedAt: string | null;
    count: number;
}

const countFilledScores = (scores: Record<string, string>) =>
    Object.values(scores).filter(score => score && score.trim() !== '').length;

export function useMassInputState() {
    const { activeSemester } = useSemester();
    const { user } = useAuth();
    const userId = user?.id ?? null;
    const location = useLocation();
    const navigate = useNavigate();
    const [initialDraft] = useState<SubjectGradeDraft | null>(() => {
        const draft = readLatestSubjectGradeDraft(userId);
        return draft && countFilledScores(draft.scores) > 0 ? draft : null;
    });
    const [isScoresDirty, setIsScoresDirtyState] = useState<boolean>(() => Boolean(initialDraft));
    const isScoresDirtyRef = useRef(isScoresDirty);
    // Render-phase context resets only update state; keep the ref in step so
    // the server sync never treats a restored draft as clean.
    useEffect(() => {
        isScoresDirtyRef.current = isScoresDirty;
    }, [isScoresDirty]);

    /** Server scores the form started from; null until they are known. */
    const [scoreBaseline, setScoreBaseline] = useState<Record<string, string> | null>(() => initialDraft?.baseline ?? null);
    const scoreBaselineRef = useRef(scoreBaseline);
    useEffect(() => {
        scoreBaselineRef.current = scoreBaseline;
    }, [scoreBaseline]);
    const [restoredDraft, setRestoredDraft] = useState<RestoredDraftInfo | null>(() => initialDraft
        ? { savedAt: initialDraft.savedAt ?? null, count: countFilledScores(initialDraft.scores) }
        : null);

    const [step, setStep] = useState<Step>(() => initialDraft ? 2 : 1);
    const [mode, setMode] = useState<InputMode | null>(() => initialDraft ? 'subject_grade' : null);
    const [selectedClass, setSelectedClass] = useState(() => initialDraft?.selectedClass || '');
    const [prevClass, setPrevClass] = useState(selectedClass);
    const [prevMode, setPrevMode] = useState(mode);
    const [quizInfo, setQuizInfo] = useState<{ name: string; category?: string; subject: string; date: string; points: number; max_points: number }>({
        name: 'Aktif bertanya di kelas',
        category: 'bertanya',
        subject: '',
        date: schoolDate(),
        points: 1,
        max_points: 1,
    });
    const [subjectGradeInfo, setSubjectGradeInfo] = useState(() => initialDraft?.subjectGradeInfo || { subject: '', assessment_name: '', notes: '', semester: '' });
    const [prevAssessmentKey, setPrevAssessmentKey] = useState(() =>
        getSubjectGradeContextKey(initialDraft?.selectedClass || '', initialDraft?.subjectGradeInfo || { subject: '', assessment_name: '', notes: '', semester: '' })
    );
    const [kkm, setKkm] = useState(75);
    const [attitudeDate, setAttitudeDate] = useState(schoolDate());
    const [attitudeCategory, setAttitudeCategory] = useState('Adab & Akhlak');
    const [attitudeName, setAttitudeName] = useState('Adab & Kesantunan');
    const [attitudePoints, setAttitudePoints] = useState(1);
    const [attitudeNotes, setAttitudeNotes] = useState('');
    const [attitudePredicates, setAttitudePredicates] = useState<Record<string, { spiritual: string; social: string }>>(() => ({}));
    const [scores, setScores] = useState<Record<string, string>>(() => initialDraft?.scores || {});
    const [pasteData, setPasteData] = useState('');
    const [selectedViolationCode, setSelectedViolationCode] = useState('');
    const [violationDate, setViolationDate] = useState(schoolDate());
    const [violationNotes, setViolationNotes] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState(() => new Set<string>(initialDraft?.selectedStudentIds || []));
    const [searchTerm, setSearchTerm] = useState('');
    const [studentFilter, setStudentFilter] = useState<StudentFilter>('all');
    const [noteMethod, setNoteMethod] = useState<'ai' | 'template'>('ai');
    const [templateNote, setTemplateNote] = useState('Ananda [Nama Siswa] menunjukkan perkembangan yang baik semester ini. Terus tingkatkan semangat belajar dan jangan ragu bertanya jika ada kesulitan.');
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>(() => initialDraft?.validationErrors || {});
    const [isConfigOpen, setIsConfigOpen] = useState(true);
    const [isCustomSubject, setIsCustomSubject] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showChartModal, setShowChartModal] = useState(false);
    const [bypassDuplicateGuard, setBypassDuplicateGuard] = useState(false);
    const [pendingImportData, setPendingImportData] = useState<any[] | null>(null);

    // Warn before unload if there are unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isScoresDirtyRef.current) {
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

    // Reset student selection / scores when class changes.
    // Adjusted during render rather than in an effect: React re-renders with
    // the corrected state before painting, so the stale selection is never
    // shown and no extra commit is wasted.
    if (prevClass !== selectedClass) {
        setPrevClass(selectedClass);
        setSelectedStudentIds(new Set());
        setScores({});
        setAttitudePredicates({});
        setSearchTerm('');
        setStudentFilter('all');
        setBypassDuplicateGuard(false);
        setIsScoresDirtyState(false);
    }

    // When the assessment context changes in subject_grade mode, bring back the
    // draft saved for that context, or start empty so the server sync fills it.
    const currentAssessmentKey = getSubjectGradeContextKey(selectedClass, subjectGradeInfo);
    if (prevAssessmentKey !== currentAssessmentKey) {
        setPrevAssessmentKey(currentAssessmentKey);
        if (mode === 'subject_grade') {
            const draft = readSubjectGradeDraft(userId, currentAssessmentKey);
            const filled = draft ? countFilledScores(draft.scores) : 0;
            if (draft && filled > 0) {
                setScores(draft.scores);
                setValidationErrors(draft.validationErrors || {});
                setScoreBaseline(draft.baseline ?? null);
                setIsScoresDirtyState(true);
                setRestoredDraft({ savedAt: draft.savedAt ?? null, count: filled });
            } else {
                setScores({});
                setValidationErrors({});
                setScoreBaseline(null);
                setIsScoresDirtyState(false);
                setRestoredDraft(null);
            }
        }
    }

    // Reset filter when mode changes
    if (prevMode !== mode) {
        setPrevMode(mode);
        setAttitudePredicates({});
        setStudentFilter('all');
        setBypassDuplicateGuard(false);
    }

    /** Removes the draft of the current (or given) context, e.g. after it was saved. */
    const clearSubjectGradeDraft = useCallback((contextKey?: string) => {
        removeSubjectGradeDraft(userId, contextKey ?? currentAssessmentKey);
        setRestoredDraft(null);
    }, [userId, currentAssessmentKey]);

    const saveSubjectGradeDraft = useCallback((draft: Omit<SubjectGradeDraft, 'baseline' | 'savedAt'>) => {
        writeSubjectGradeDraft(userId, { ...draft, baseline: scoreBaselineRef.current });
    }, [userId]);

    /**
     * Offline Simpan: stores the current scores as a pending save on this
     * context's draft. useQueuedGradeSync sends it once the device is online.
     */
    const queueSubjectGradeDraft = useCallback((label: string) => {
        writeSubjectGradeDraft(userId, {
            selectedClass,
            subjectGradeInfo,
            kkm,
            scores,
            baseline: scoreBaseline,
            selectedStudentIds: Array.from(selectedStudentIds),
            validationErrors,
            queued: { at: new Date().toISOString(), scores: { ...scores }, label },
            needsReview: undefined,
        });
    }, [userId, selectedClass, subjectGradeInfo, kkm, scores, scoreBaseline, selectedStudentIds, validationErrors]);

    // Auto-save draft when values change
    useEffect(() => {
        if (mode !== 'subject_grade' || !isScoresDirty) return;
        // Every typed score was cleared: an old draft must not bring them back.
        if (countFilledScores(scores) === 0) {
            removeSubjectGradeDraft(userId, getSubjectGradeContextKey(selectedClass, subjectGradeInfo));
            return;
        }

        writeSubjectGradeDraft(userId, {
            selectedClass,
            subjectGradeInfo,
            kkm,
            scores,
            baseline: scoreBaseline,
            selectedStudentIds: Array.from(selectedStudentIds),
            validationErrors,
        });
    }, [userId, mode, isScoresDirty, selectedClass, subjectGradeInfo, kkm, scores, scoreBaseline, selectedStudentIds, validationErrors]);

    const handleModeSelect = useCallback((selectedMode: InputMode) => {
        if (selectedMode === 'subject_grade') {
            const draft = readLatestSubjectGradeDraft(userId);
            const filled = draft ? countFilledScores(draft.scores) : 0;
            if (draft && filled > 0) {
                setSelectedClass(draft.selectedClass);
                setPrevClass(draft.selectedClass);
                setSubjectGradeInfo(draft.subjectGradeInfo);
                setPrevAssessmentKey(getSubjectGradeContextKey(draft.selectedClass, draft.subjectGradeInfo));
                setKkm(draft.kkm || 75);
                setScores(draft.scores);
                setScoreBaseline(draft.baseline ?? null);
                setValidationErrors(draft.validationErrors || {});
                setRestoredDraft({ savedAt: draft.savedAt ?? null, count: filled });
                setMode('subject_grade');
                setStep(2);
                isScoresDirtyRef.current = true;
                setIsScoresDirtyState(true);
                return;
            }
        }
        setMode(selectedMode);
        setStep(2);
        setIsCustomSubject(false);
    }, [userId]);

    const handleBack = useCallback(() => {
        // Leaving was confirmed, so the typed scores of this context are discarded.
        // Drafts of other assessments stay available.
        if (mode === 'subject_grade') clearSubjectGradeDraft();
        setScoreBaseline(null);
        setRestoredDraft(null);
        setStep(1);
        setMode(null);
        setSelectedClass('');
        setScores({});
        setQuizInfo({ name: 'Aktif bertanya di kelas', category: 'bertanya', subject: '', date: schoolDate(), points: 1, max_points: 1 });
        setSubjectGradeInfo({ subject: '', assessment_name: '', notes: '', semester: '' });
        setKkm(75);
        setAttitudeDate(schoolDate());
        setAttitudeCategory('Adab & Akhlak');
        setAttitudeName('Adab & Kesantunan');
        setAttitudePoints(1);
        setAttitudeNotes('');
        setAttitudePredicates({});
        setPasteData('');
        setSelectedViolationCode('');
        setViolationDate(schoolDate());
        setViolationNotes('');
        setSelectedStudentIds(new Set()); setSearchTerm(''); setStudentFilter('all');
        setValidationErrors({}); setNoteMethod('ai');
        setTemplateNote('Ananda [Nama Siswa] menunjukkan perkembangan yang baik semester ini. Terus tingkatkan semangat belajar dan jangan ragu bertanya jika ada kesulitan.');
        setShowImportModal(false); setShowChartModal(false);
        setBypassDuplicateGuard(false);
        isScoresDirtyRef.current = false;
        setIsScoresDirtyState(false);
    }, [mode, clearSubjectGradeDraft]);

    const handleScoreChange = useCallback((studentId: string, value: string) => {
        isScoresDirtyRef.current = true;
        setIsScoresDirtyState(true);
        const normalized = value.trim().replace(',', '.');
        const numValue = Number(normalized);
        setValidationErrors(prev => {
            const next = { ...prev };
            if (value.trim() !== '' && (isNaN(numValue) || numValue < 0 || numValue > 100)) {
                next[studentId] = 'Nilai harus antara 0-100';
            } else {
                delete next[studentId];
            }
            return next;
        });
        setScores(prev => ({ ...prev, [studentId]: value }));
    }, []);

    const handleBatchScoreChange = useCallback((newScores: Record<string, string>) => {
        isScoresDirtyRef.current = true;
        setIsScoresDirtyState(true);
        setValidationErrors(prev => {
            const next = { ...prev };
            Object.entries(newScores).forEach(([studentId, value]) => {
                const normalized = value.trim().replace(',', '.');
                const numValue = Number(normalized);
                if (value.trim() !== '' && (isNaN(numValue) || numValue < 0 || numValue > 100)) {
                    next[studentId] = 'Nilai harus antara 0-100';
                } else {
                    delete next[studentId];
                }
            });
            return next;
        });
        setScores(prev => ({ ...prev, ...newScores }));
    }, []);

    const handleAttitudePredicateChange = useCallback((
        studentId: string,
        field: 'spiritual' | 'social',
        value: string
    ) => {
        isScoresDirtyRef.current = true;
        setIsScoresDirtyState(true);
        setAttitudePredicates(prev => {
            const current = prev[studentId] || { spiritual: '', social: '' };
            const nextVal = current[field] === value ? '' : value;
            return {
                ...prev,
                [studentId]: {
                    ...current,
                    [field]: nextVal,
                },
            };
        });
    }, []);

    const handleQuickFillAttitude = useCallback((
        studentIds: string[],
        predicate: string,
        target: 'both' | 'spiritual' | 'social' = 'both'
    ) => {
        if (!studentIds.length || !predicate) return;
        isScoresDirtyRef.current = true;
        setIsScoresDirtyState(true);
        setAttitudePredicates(prev => {
            const next = { ...prev };
            studentIds.forEach(id => {
                const current = next[id] || { spiritual: '', social: '' };
                next[id] = {
                    spiritual: target === 'social' ? current.spiritual : predicate,
                    social: target === 'spiritual' ? current.social : predicate,
                };
            });
            return next;
        });
    }, []);

    const handleStudentSelect = useCallback((studentId: string) => {
        setSelectedStudentIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(studentId)) { newSet.delete(studentId); } else { newSet.add(studentId); }
            return newSet;
        });
    }, []);

    const setIsScoresDirty = useCallback((val: boolean) => {
        isScoresDirtyRef.current = val;
        setIsScoresDirtyState(val);
    }, []);

    return {
        step, setStep,
        mode, setMode,
        selectedClass, setSelectedClass,
        scoreBaseline, setScoreBaseline,
        restoredDraft,
        userId,
        currentAssessmentKey,
        queueSubjectGradeDraft,
        quizInfo, setQuizInfo,
        subjectGradeInfo, setSubjectGradeInfo,
        kkm, setKkm,
        attitudeDate, setAttitudeDate,
        attitudeCategory, setAttitudeCategory,
        attitudeName, setAttitudeName,
        attitudePoints, setAttitudePoints,
        attitudeNotes, setAttitudeNotes,
        attitudePredicates, setAttitudePredicates,
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
        isScoresDirtyRef,
        setIsScoresDirty,
        clearSubjectGradeDraft,
        saveSubjectGradeDraft,
        bypassDuplicateGuard, setBypassDuplicateGuard,
        pendingImportData, setPendingImportData,
        handleModeSelect, handleBack, handleScoreChange, handleBatchScoreChange,
        handleAttitudePredicateChange, handleQuickFillAttitude,
        handleStudentSelect,
    };
}
