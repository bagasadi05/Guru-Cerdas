import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSemester } from '../../../../contexts/SemesterContext';
import { InputMode, Step, StudentFilter } from '../types';

export function useMassInputState() {
    const { activeSemester } = useSemester();
    const location = useLocation();
    const navigate = useNavigate();
    const isScoresDirty = useRef(false);

    const [step, setStep] = useState<Step>(1);
    const [mode, setMode] = useState<InputMode | null>(null);
    const [selectedClass, setSelectedClass] = useState('');
    const [quizInfo, setQuizInfo] = useState({ name: '', subject: '', date: new Date().toISOString().slice(0, 10) });
    const [subjectGradeInfo, setSubjectGradeInfo] = useState({ subject: '', assessment_name: '', notes: '', semester: '' });
    const [scores, setScores] = useState<Record<string, string>>({});
    const [pasteData, setPasteData] = useState('');
    const [selectedViolationCode, setSelectedViolationCode] = useState('');
    const [violationDate, setViolationDate] = useState(new Date().toISOString().slice(0, 10));
    const [selectedStudentIds, setSelectedStudentIds] = useState(new Set<string>());
    const [searchTerm, setSearchTerm] = useState('');
    const [studentFilter, setStudentFilter] = useState<StudentFilter>('all');
    const [noteMethod, setNoteMethod] = useState<'ai' | 'template'>('ai');
    const [templateNote, setTemplateNote] = useState('Ananda [Nama Siswa] menunjukkan perkembangan yang baik semester ini. Terus tingkatkan semangat belajar dan jangan ragu bertanya jika ada kesulitan.');
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [isConfigOpen, setIsConfigOpen] = useState(true);
    const [isCustomSubject, setIsCustomSubject] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showChartModal, setShowChartModal] = useState(false);

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
        const timer = setTimeout(() => {
            setSelectedStudentIds(new Set());
            setScores({});
            setSearchTerm('');
            setStudentFilter('all');
            isScoresDirty.current = false;
        }, 0);
        return () => clearTimeout(timer);
    }, [selectedClass]);

    // Reset filter when mode changes
    useEffect(() => {
        const timer = setTimeout(() => setStudentFilter('all'), 0);
        return () => clearTimeout(timer);
    }, [mode]);

    const handleModeSelect = (selectedMode: InputMode) => {
        setMode(selectedMode);
        setStep(2);
        setIsCustomSubject(false);
    };

    const handleBack = () => {
        setStep(1); setMode(null); setSelectedClass('');
        setQuizInfo({ name: '', subject: '', date: new Date().toISOString().slice(0, 10) });
        setSubjectGradeInfo({ subject: '', assessment_name: '', notes: '', semester: activeSemester?.id || '' });
        setScores({}); setPasteData(''); setSelectedViolationCode('');
        setViolationDate(new Date().toISOString().slice(0, 10));
        setSelectedStudentIds(new Set()); setSearchTerm(''); setStudentFilter('all');
        setValidationErrors({}); setNoteMethod('ai');
        setTemplateNote('Ananda [Nama Siswa] menunjukkan perkembangan yang baik semester ini. Terus tingkatkan semangat belajar dan jangan ragu bertanya jika ada kesulitan.');
        setShowImportModal(false); setShowChartModal(false);
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

    return {
        step, setStep,
        mode, setMode,
        selectedClass, setSelectedClass,
        quizInfo, setQuizInfo,
        subjectGradeInfo, setSubjectGradeInfo,
        scores, setScores,
        pasteData, setPasteData,
        selectedViolationCode, setSelectedViolationCode,
        violationDate, setViolationDate,
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
        handleModeSelect, handleBack, handleScoreChange, handleStudentSelect,
    };
}
