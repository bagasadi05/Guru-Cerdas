import { useEffect, useState, useMemo, useCallback, useSyncExternalStore } from 'react';
import {
    VoiceGradeController,
    VoiceGradeState,
    StudentItem,
    SafetyMode,
    VoiceMode,
} from './VoiceGradeController';
import { SpeechRecognitionPort, AudioFeedbackPort } from './voicePorts';

export interface UseVoiceGradeEngineOptions {
    isOpen: boolean;
    students: StudentItem[];
    scores: Record<string, string>;
    onScoreChange: (studentId: string, value: string) => void;
    kkm: number;
    speechPort?: SpeechRecognitionPort;
    audioPort?: AudioFeedbackPort;
}

export function useVoiceGradeEngine({
    isOpen,
    students,
    scores,
    onScoreChange,
    kkm,
    speechPort,
    audioPort,
}: UseVoiceGradeEngineOptions) {
    const [controller] = useState(
        () =>
            new VoiceGradeController({
                students,
                scores,
                onScoreChange,
                kkm,
                speechPort,
                audioPort,
            })
    );

    const subscribe = useCallback(
        (onStoreChange: () => void) => controller.subscribe(onStoreChange),
        [controller]
    );
    const getSnapshot = useCallback(() => controller.getState(), [controller]);

    const state = useSyncExternalStore<VoiceGradeState>(subscribe, getSnapshot);

    // Keep controller synced with latest props
    useEffect(() => {
        controller.updateRosterAndScores(students, scores);
    }, [controller, students, scores]);

    useEffect(() => {
        controller.setOnScoreChange(onScoreChange);
    }, [controller, onScoreChange]);

    // Cleanup listening when modal closes
    useEffect(() => {
        if (!isOpen) {
            controller.stopListening();
        }
    }, [controller, isOpen]);

    // Clean up on component unmount
    useEffect(() => {
        return () => {
            controller.dispose();
        };
    }, [controller]);

    // Progress metrics
    const filledCount = useMemo(() => {
        return students.filter((s) => scores[s.id] !== undefined && scores[s.id] !== '').length;
    }, [students, scores]);

    const progressPercentage = useMemo(() => {
        if (students.length === 0) return 0;
        return Math.round((filledCount / students.length) * 100);
    }, [filledCount, students.length]);

    // Facade action callbacks
    const startListening = useCallback(() => controller.startListening(), [controller]);
    const stopListening = useCallback(() => controller.stopListening(), [controller]);
    const toggleListening = useCallback(() => controller.toggleListening(), [controller]);
    const setActiveTab = useCallback((tab: VoiceMode) => controller.setActiveTab(tab), [controller]);
    const setSafetyMode = useCallback((mode: SafetyMode) => controller.setSafetyMode(mode), [controller]);
    const setSoundEnabled = useCallback((enabled: boolean) => controller.setSoundEnabled(enabled), [controller]);
    const setCurrentIndex = useCallback((idx: number) => controller.setCurrentIndex(idx), [controller]);
    const navigateNext = useCallback(() => controller.navigateNext(), [controller]);
    const navigatePrev = useCallback(() => controller.navigatePrev(), [controller]);
    const clearCurrentScore = useCallback(() => controller.clearCurrentScore(), [controller]);
    const undoLastOverwrite = useCallback(() => controller.undoLastOverwrite(), [controller]);
    const undoBatchApply = useCallback(() => controller.undoBatchApply(), [controller]);
    const showFeedback = useCallback(
        (text: string, variant: 'success' | 'command' | 'error') => controller.showFeedback(text, variant),
        [controller]
    );

    // Freeform mode controls
    const setFreeformTranscript = useCallback(
        (text: string) => controller.setFreeformTranscript(text),
        [controller]
    );
    const updatePairScore = useCallback(
        (idx: number, score: number) => controller.updatePairScore(idx, score),
        [controller]
    );
    const updatePairStudent = useCallback(
        (idx: number, studentId: string) => controller.updatePairStudent(idx, studentId),
        [controller]
    );
    const deletePair = useCallback((idx: number) => controller.deletePair(idx), [controller]);
    const clearPairs = useCallback(() => controller.clearPairs(), [controller]);
    const applyFreeformPairs = useCallback(() => controller.applyFreeformPairs(), [controller]);

    return {
        ...state,
        filledCount,
        progressPercentage,
        startListening,
        stopListening,
        toggleListening,
        setActiveTab,
        setSafetyMode,
        setSoundEnabled,
        setCurrentIndex,
        navigateNext,
        navigatePrev,
        clearCurrentScore,
        undoLastOverwrite,
        undoBatchApply,
        showFeedback,
        setFreeformTranscript,
        updatePairScore,
        updatePairStudent,
        deletePair,
        clearPairs,
        applyFreeformPairs,
    };
}
