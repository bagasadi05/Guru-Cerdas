import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Modal } from '../../../ui/Modal';
import { Button } from '../../../ui/Button';
import { StudentRow } from '../types';
import {
    parseNameAndGradeSpeech,
    parseSpokenInput,
    NameAndGradeParsed,
} from '../../../../utils/indonesianSpeechParser';
import { playSuccessChime, playCommandTone, playErrorTone } from '../../../../utils/soundFeedback';
import {
    Mic,
    MicOff,
    Volume2,
    VolumeX,
    SkipForward,
    SkipBack,
    Trash2,
    CheckCircle2,
    Sparkles,
    Check,
    AlertCircle,
    Users,
    RotateCcw,
} from 'lucide-react';

export interface VoiceGradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    students: StudentRow[];
    scores: Record<string, string>;
    onScoreChange: (studentId: string, value: string) => void;
    kkm: number;
    subjectName?: string;
    assessmentName?: string;
}

// Browser SpeechRecognition interface compatibility
interface SpeechRecognitionResultItem {
    transcript: string;
}

interface SpeechRecognitionResult {
    isFinal: boolean;
    length: number;
    [index: number]: SpeechRecognitionResultItem;
}

interface SpeechRecognitionResultList {
    length: number;
    [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent {
    resultIndex: number;
    results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
    error: string;
    message?: string;
}

interface ISpeechRecognition {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    onstart: (() => void) | null;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
    abort: () => void;
}

type SpeechRecognitionConstructor = new () => ISpeechRecognition;

interface NavigatorWithBrave extends Navigator {
    brave?: {
        isBrave?: () => Promise<boolean>;
    };
}

interface WindowWithSpeech extends Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export const VoiceGradeModal: React.FC<VoiceGradeModalProps> = ({
    isOpen,
    onClose,
    students,
    scores,
    onScoreChange,
    kkm,
    subjectName,
    assessmentName,
}) => {
    const effectiveKkm = kkm && kkm > 0 ? kkm : 75;
    const [activeTab, setActiveTab] = useState<'sequential' | 'name_match'>('sequential');
    const [isListening, setIsListening] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [inputSafetyMode, setInputSafetyMode] = useState<'accurate' | 'fast'>('accurate');
    const [transcript, setTranscript] = useState('');
    const [interimText, setInterimText] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [lastOverwrittenRecord, setLastOverwrittenRecord] = useState<{
        studentId: string;
        studentName: string;
        oldScore: string;
        newScore: string;
        index: number;
    } | null>(null);
    const [lastBatchAppliedRecords, setLastBatchAppliedRecords] = useState<{
        studentId: string;
        studentName: string;
        previousScore: string;
        appliedScore: string;
    }[] | null>(null);
    const [isSupported] = useState(() => {
        if (typeof window === 'undefined') return false;
        const win = window as unknown as WindowWithSpeech;
        const SpeechRecognitionAPI = win.SpeechRecognition || win.webkitSpeechRecognition;
        return Boolean(SpeechRecognitionAPI);
    });
    const [isBrave, setIsBrave] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const nav = navigator as unknown as NavigatorWithBrave;
            if (nav.brave?.isBrave) {
                nav.brave.isBrave().then((result: boolean) => {
                    if (result) setIsBrave(true);
                }).catch(() => {});
            }
        }
    }, []);

    // Sequential mode states
    const [currentIndex, setCurrentIndex] = useState(0);
    const [lastActionFeedback, setLastActionFeedback] = useState<{ text: string; type: 'success' | 'command' | 'error' } | null>(null);
    const [recentlySavedId, setRecentlySavedId] = useState<string | null>(null);
    const [recentHistory, setRecentHistory] = useState<{ id: string; name: string; score: number; index: number }[]>([]);

    // Name match mode states
    const [recognizedPairs, setRecognizedPairs] = useState<NameAndGradeParsed[]>([]);

    const recognitionRef = useRef<ISpeechRecognition | null>(null);
    const isListeningRef = useRef(false);
    const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const interimDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const restartCountRef = useRef(0);
    const lastRestartTimeRef = useRef(Date.now());

    // Precise utterance prefix tracker to completely eliminate double commits
    const processedPrefixByResultIndex = useRef<Map<number, string>>(new Map());
    const lastCommittedActionRef = useRef<{ key: string; timestamp: number }>({ key: '', timestamp: 0 });

    // Refs to eliminate stale closures in persistent SpeechRecognition callbacks
    const currentIndexRef = useRef(currentIndex);
    const studentsRef = useRef(students);
    const scoresRef = useRef(scores);
    const activeTabRef = useRef(activeTab);
    const inputSafetyModeRef = useRef(inputSafetyMode);
    const handleSequentialSpeechRef = useRef<(text: string, isFinalTurn: boolean) => void>(() => {});
    const handleNameMatchSpeechRef = useRef<(text: string) => void>(() => {});

    // Active student in sequential mode
    const activeStudent = students[currentIndex] || null;

    // Computed stats
    const filledCount = useMemo(() => {
        return Object.values(scores).filter(s => s && s.trim() !== '').length;
    }, [scores]);

    const progressPercentage = useMemo(() => {
        if (!students || students.length === 0) return 0;
        return Math.min(100, Math.round((filledCount / students.length) * 100));
    }, [filledCount, students]);

    const showFeedback = useCallback((text: string, type: 'success' | 'command' | 'error') => {
        setLastActionFeedback({ text, type });
        if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = setTimeout(() => {
            setLastActionFeedback(null);
        }, 2200);
    }, []);

    // Stop recognition helper
    const stopListening = useCallback(() => {
        isListeningRef.current = false;
        setIsListening(false);
        setInterimText('');
        if (interimDebounceRef.current) {
            clearTimeout(interimDebounceRef.current);
            interimDebounceRef.current = null;
        }
        processedPrefixByResultIndex.current.clear();
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch {
                // Ignore stop errors
            }
        }
    }, []);

    // Undo last overwrite helper
    const handleUndoLastOverwrite = useCallback(() => {
        if (!lastOverwrittenRecord) return;
        onScoreChange(lastOverwrittenRecord.studentId, lastOverwrittenRecord.oldScore);
        if (soundEnabled) playCommandTone();
        showFeedback(`✓ Nilai ${lastOverwrittenRecord.studentName} dikembalikan ke ${lastOverwrittenRecord.oldScore}`, 'command');
        currentIndexRef.current = lastOverwrittenRecord.index;
        setCurrentIndex(lastOverwrittenRecord.index);
        setLastOverwrittenRecord(null);
    }, [lastOverwrittenRecord, onScoreChange, showFeedback, soundEnabled]);

    // Undo last batch apply helper (Mode Bebas)
    const handleUndoBatchApply = useCallback(() => {
        if (!lastBatchAppliedRecords || lastBatchAppliedRecords.length === 0) return;
        lastBatchAppliedRecords.forEach(record => {
            onScoreChange(record.studentId, record.previousScore);
        });
        if (soundEnabled) playCommandTone();
        showFeedback(`✓ Penerapan ${lastBatchAppliedRecords.length} nilai telah diurungkan`, 'command');
        setLastBatchAppliedRecords(null);
    }, [lastBatchAppliedRecords, onScoreChange, showFeedback, soundEnabled]);

    // Process recognized speech in sequential mode with smart deduplication and rapid dictation support
    const handleSequentialSpeech = useCallback((spokenText: string, _isFinalTurn: boolean) => {
        const text = spokenText.trim();
        if (!text) return;

        let currIdx = currentIndexRef.current;
        const currentStudents = studentsRef.current;
        if (currentStudents.length === 0) return;

        const minimStudents = currentStudents.map(s => ({ id: s.id, name: s.name }));
        const parseResult = parseSpokenInput(text, minimStudents, currIdx);

        if (parseResult.type === 'none') {
            const digitMatch = text.match(/\b\d+\b/);
            if (digitMatch && Number(digitMatch[0]) > 100) {
                if (soundEnabled) playErrorTone();
                showFeedback(`Nilai ${digitMatch[0]} melebihi 100 (maksimal 100)`, 'error');
            }
            return;
        }

        // Fast-speaker handler: If a score was just applied, and advanceTimer is still pending (green flash),
        // and the teacher now speaks another grade or command, immediately advance so it applies to the NEXT student!
        if (advanceTimerRef.current && recentlySavedId && parseResult.type !== 'correction') {
            clearTimeout(advanceTimerRef.current);
            advanceTimerRef.current = null;
            setRecentlySavedId(null);
            if (parseResult.type === 'active_grade') {
                const advancedIdx = Math.min(currentStudents.length - 1, currIdx + 1);
                currentIndexRef.current = advancedIdx;
                setCurrentIndex(advancedIdx);
                currIdx = advancedIdx;
            }
        }

        // Deduplication key
        let actionKey = '';
        if (parseResult.type === 'command') {
            actionKey = `cmd_${parseResult.command}`;
        } else if (parseResult.type === 'correction') {
            let targetStudentId = 'active';
            if (parseResult.studentIndex !== undefined && currentStudents[parseResult.studentIndex]) {
                targetStudentId = currentStudents[parseResult.studentIndex].id;
            } else if (recentlySavedId) {
                targetStudentId = recentlySavedId;
            } else if (currentStudents[currIdx]) {
                targetStudentId = currentStudents[currIdx].id;
            }
            actionKey = `correction_${targetStudentId}_${parseResult.score}`;
        } else if (parseResult.type === 'roll_grade') {
            actionKey = `roll_${parseResult.studentIndex}_${parseResult.score}`;
        } else if (parseResult.type === 'jump_to_student') {
            actionKey = `jump_${parseResult.studentIndex}`;
        } else if (parseResult.type === 'name_grade') {
            actionKey = `name_${parseResult.studentId}_${parseResult.score}`;
        } else if (parseResult.type === 'active_grade') {
            const activeId = currentStudents[currIdx]?.id || 'unknown';
            actionKey = `active_${activeId}_${parseResult.score}`;
        }

        const now = Date.now();
        // Skip duplicate execution if same action key within 2.0s
        if (
            lastCommittedActionRef.current.key === actionKey &&
            now - lastCommittedActionRef.current.timestamp < 2000
        ) {
            return;
        }

        // Commit action and store deduplication token
        lastCommittedActionRef.current = { key: actionKey, timestamp: now };

        // 1. Navigation / Control Command
        if (parseResult.type === 'command') {
            if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
            setRecentlySavedId(null);
            if (soundEnabled) playCommandTone();

            if (parseResult.command === 'next') {
                const next = Math.min(currentStudents.length - 1, currIdx + 1);
                currentIndexRef.current = next;
                setCurrentIndex(next);
                showFeedback('Lanjut ke siswa berikutnya', 'command');
            } else if (parseResult.command === 'prev') {
                const prevIdx = Math.max(0, currIdx - 1);
                currentIndexRef.current = prevIdx;
                setCurrentIndex(prevIdx);
                showFeedback('Kembali ke siswa sebelumnya', 'command');
            } else if (parseResult.command === 'clear') {
                const active = currentStudents[currIdx];
                if (active) {
                    onScoreChange(active.id, '');
                    setRecentHistory(prev => prev.filter(h => h.id !== active.id));
                    showFeedback(`Nilai ${active.name} dikosongkan`, 'command');
                }
            } else if (parseResult.command === 'first') {
                currentIndexRef.current = 0;
                setCurrentIndex(0);
                showFeedback('Lompat ke siswa pertama (#1)', 'command');
            } else if (parseResult.command === 'last') {
                const lastIdx = Math.max(0, currentStudents.length - 1);
                currentIndexRef.current = lastIdx;
                setCurrentIndex(lastIdx);
                showFeedback(`Lompat ke siswa terakhir (#${lastIdx + 1})`, 'command');
            } else if (parseResult.command === 'undo') {
                if (lastOverwrittenRecord) {
                    handleUndoLastOverwrite();
                } else if (lastBatchAppliedRecords && lastBatchAppliedRecords.length > 0) {
                    handleUndoBatchApply();
                } else {
                    showFeedback('Tidak ada nilai yang baru saja ditimpa untuk diurungkan', 'command');
                }
            } else if (parseResult.command === 'stop') {
                stopListening();
                showFeedback('Dikte dihentikan', 'command');
            }
            return;
        }

        // 2. Correction Command (e.g. "ralat 85", "ganti 90", "salah 80", "ralat nomor 2 85")
        if (parseResult.type === 'correction') {
            if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
            const scoreToApply = parseResult.score;

            // Target the specified studentIndex if given, or recently saved student, or active student
            let correctStudent = null;
            let studentIdx = -1;

            if (parseResult.studentIndex !== undefined && currentStudents[parseResult.studentIndex]) {
                correctStudent = currentStudents[parseResult.studentIndex];
                studentIdx = parseResult.studentIndex;
            } else if (recentlySavedId) {
                const foundRecent = currentStudents.find(s => s.id === recentlySavedId);
                if (foundRecent) {
                    correctStudent = foundRecent;
                    studentIdx = currentStudents.findIndex(s => s.id === foundRecent.id);
                }
            }

            if (!correctStudent) {
                correctStudent = currentStudents[currIdx] || null;
                studentIdx = currIdx;
            }

            if (!correctStudent) return;

            // Track overwrite if previous score existed and is different
            const prevScore = scoresRef.current[correctStudent.id] || '';
            if (prevScore && prevScore !== String(scoreToApply)) {
                setLastOverwrittenRecord({
                    studentId: correctStudent.id,
                    studentName: correctStudent.name,
                    oldScore: prevScore,
                    newScore: String(scoreToApply),
                    index: studentIdx !== -1 ? studentIdx : currIdx,
                });
            }

            onScoreChange(correctStudent.id, String(scoreToApply));
            if (soundEnabled) playSuccessChime();

            if (studentIdx !== -1) {
                currentIndexRef.current = studentIdx;
                setCurrentIndex(studentIdx);
            }
            setRecentlySavedId(correctStudent.id);
            setRecentHistory(prev => [
                { id: correctStudent.id, name: correctStudent.name, score: scoreToApply, index: (studentIdx !== -1 ? studentIdx : currIdx) + 1 },
                ...prev.filter(h => h.id !== correctStudent.id).slice(0, 4),
            ]);
            showFeedback(`✓ Ralat: [${(studentIdx !== -1 ? studentIdx : currIdx) + 1}] ${correctStudent.name} diubah ke ${scoreToApply}`, 'success');
            return;
        }

        // 3. Attendance Jump / Name Jump (e.g. "nomor 5", "absen 12", "Ahmad Fauzi")
        if (parseResult.type === 'jump_to_student') {
            if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
            setRecentlySavedId(null);
            const targetIdx = parseResult.studentIndex;
            const targetStudent = currentStudents[targetIdx];
            if (targetStudent) {
                if (soundEnabled) playCommandTone();
                currentIndexRef.current = targetIdx;
                setCurrentIndex(targetIdx);
                showFeedback(`Lompat ke #${targetIdx + 1}: ${targetStudent.name}`, 'command');
            }
            return;
        }

        // 4. Grade Application (roll_grade, name_grade, or active_grade)
        let targetIndex = currIdx;
        let scoreToApply = 0;

        if (parseResult.type === 'roll_grade') {
            targetIndex = parseResult.studentIndex;
            scoreToApply = parseResult.score;
        } else if (parseResult.type === 'name_grade') {
            targetIndex = parseResult.studentIndex;
            scoreToApply = parseResult.score;
        } else if (parseResult.type === 'active_grade') {
            targetIndex = currIdx;
            scoreToApply = parseResult.score;
        }

        const targetStudent = currentStudents[targetIndex];
        if (!targetStudent) return;

        if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);

        // Track overwrite if old score existed and is different
        const existingScore = scoresRef.current[targetStudent.id] || '';
        if (existingScore && existingScore !== String(scoreToApply)) {
            setLastOverwrittenRecord({
                studentId: targetStudent.id,
                studentName: targetStudent.name,
                oldScore: existingScore,
                newScore: String(scoreToApply),
                index: targetIndex,
            });
        }

        // Apply score immediately to state
        onScoreChange(targetStudent.id, String(scoreToApply));
        if (soundEnabled) playSuccessChime();

        // Highlight the target student with the score
        currentIndexRef.current = targetIndex;
        setCurrentIndex(targetIndex);
        setRecentlySavedId(targetStudent.id);
        setRecentHistory(prev => [
            { id: targetStudent.id, name: targetStudent.name, score: scoreToApply, index: targetIndex + 1 },
            ...prev.filter(h => h.id !== targetStudent.id).slice(0, 4),
        ]);

        showFeedback(`✓ [${targetIndex + 1}] ${targetStudent.name}: ${scoreToApply}`, 'success');

        // Hold on this student for 450ms so user clearly sees the score card turn green, then advance
        const nextIdx = targetIndex + 1;
        if (nextIdx < currentStudents.length) {
            advanceTimerRef.current = setTimeout(() => {
                currentIndexRef.current = nextIdx;
                setCurrentIndex(nextIdx);
                setRecentlySavedId(null);
            }, 450);
        } else {
            advanceTimerRef.current = setTimeout(() => {
                setRecentlySavedId(null);
                showFeedback('Semua siswa telah selesai dinilai!', 'success');
            }, 450);
        }
    }, [handleUndoBatchApply, handleUndoLastOverwrite, lastBatchAppliedRecords, lastOverwrittenRecord, onScoreChange, recentlySavedId, showFeedback, soundEnabled, stopListening]);

    // Process recognized speech in name+grade mode
    const handleNameMatchSpeech = useCallback((spokenText: string) => {
        const currentStudents = studentsRef.current;
        setTranscript(prev => {
            const nextTranscript = prev ? `${prev}, ${spokenText}` : spokenText;
            const minimStudents = currentStudents.map(s => ({ id: s.id, name: s.name }));
            const parsed = parseNameAndGradeSpeech(nextTranscript, minimStudents);
            setRecognizedPairs(parsed);
            return nextTranscript;
        });
    }, []);

    useEffect(() => {
        currentIndexRef.current = currentIndex;
        studentsRef.current = students;
        scoresRef.current = scores;
        activeTabRef.current = activeTab;
        inputSafetyModeRef.current = inputSafetyMode;
        handleSequentialSpeechRef.current = handleSequentialSpeech;
        handleNameMatchSpeechRef.current = handleNameMatchSpeech;
    }, [activeTab, currentIndex, handleNameMatchSpeech, handleSequentialSpeech, inputSafetyMode, scores, students]);

    // Start recognition helper with auto-restart resilience
    const startListening = useCallback(() => {
        if (!isSupported) {
            setErrorMessage('Browser Anda tidak mendukung Web Speech API. Disarankan menggunakan Google Chrome atau Microsoft Edge.');
            return;
        }

        if (isBrave) {
            setErrorMessage('Browser Brave memblokir layanan Speech Recognition bawaan Google demi privasi. Silakan buka aplikasi ini di Google Chrome atau Microsoft Edge untuk menggunakan Dikte Suara.');
            return;
        }

        const win = typeof window !== 'undefined' ? (window as unknown as WindowWithSpeech) : null;
        const SpeechRecognitionAPI =
            win?.SpeechRecognition ||
            win?.webkitSpeechRecognition;

        if (!SpeechRecognitionAPI) return;

        setErrorMessage(null);

        try {
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch { /* ignore stop error */ }
            }

            const recognition = new SpeechRecognitionAPI();
            recognition.lang = 'id-ID';
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.maxAlternatives = 1;

            recognition.onstart = () => {
                isListeningRef.current = true;
                setIsListening(true);
            };

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const res = event.results[i];
                    const fullTranscript = res[0]?.transcript || '';
                    if (!fullTranscript) continue;

                    const alreadyProcessed = processedPrefixByResultIndex.current.get(i) || '';
                    const newTranscript = fullTranscript.startsWith(alreadyProcessed)
                        ? fullTranscript.slice(alreadyProcessed.length).trim()
                        : fullTranscript.trim();

                    if (res.isFinal) {
                        if (interimDebounceRef.current) {
                            clearTimeout(interimDebounceRef.current);
                            interimDebounceRef.current = null;
                        }
                        setInterimText('');
                        if (activeTabRef.current === 'sequential') {
                            if (newTranscript) {
                                handleSequentialSpeechRef.current(newTranscript, true);
                            }
                        } else {
                            handleNameMatchSpeechRef.current(fullTranscript);
                        }
                        processedPrefixByResultIndex.current.delete(i);
                    } else {
                        if (newTranscript) {
                            setInterimText(newTranscript);
                            // In fast mode only: allow interim debounce on complete scores or commands
                            if (activeTabRef.current === 'sequential' && inputSafetyModeRef.current === 'fast') {
                                if (interimDebounceRef.current) {
                                    clearTimeout(interimDebounceRef.current);
                                    interimDebounceRef.current = null;
                                }

                                const currStudents = studentsRef.current;
                                const minimStudents = currStudents.map(s => ({ id: s.id, name: s.name }));
                                const detected = parseSpokenInput(newTranscript, minimStudents, currentIndexRef.current);

                                if (detected.type === 'command' || (detected.type === 'active_grade' && detected.score >= 10) || detected.type === 'roll_grade') {
                                    const delay = detected.type === 'command' ? 250 : 700;
                                    interimDebounceRef.current = setTimeout(() => {
                                        processedPrefixByResultIndex.current.set(i, fullTranscript);
                                        handleSequentialSpeechRef.current(newTranscript, false);
                                        setInterimText('');
                                        interimDebounceRef.current = null;
                                    }, delay);
                                }
                            }
                        }
                    }
                }
            };

            recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
                if (event.error === 'not-allowed') {
                    setErrorMessage('Akses mikrofon ditolak. Izinkan izin mikrofon di pengaturan browser Anda.');
                    stopListening();
                } else if (event.error === 'network') {
                    setErrorMessage('Gagal terhubung ke layanan speech recognition (Network Error). Browser Brave memblokir layanan speech Google secara bawaan. Harap gunakan Google Chrome atau Microsoft Edge.');
                    stopListening();
                } else if (event.error === 'audio-capture') {
                    setErrorMessage('Mikrofon tidak terdeteksi atau sedang digunakan oleh aplikasi lain.');
                    stopListening();
                } else if (event.error === 'no-speech') {
                    // Normal timeout on silence, will restart cleanly
                } else {
                    console.warn('Speech recognition warning:', event.error);
                }
            };

            recognition.onend = () => {
                if (isListeningRef.current) {
                    const now = Date.now();
                    if (now - lastRestartTimeRef.current < 5000) {
                        restartCountRef.current += 1;
                    } else {
                        restartCountRef.current = 1;
                    }
                    lastRestartTimeRef.current = now;

                    if (restartCountRef.current > 4) {
                        isListeningRef.current = false;
                        setIsListening(false);
                        setErrorMessage('Pengenal suara terhenti berulang kali. Silakan periksa koneksi mikrofon Anda atau klik tombol mikrofon untuk menyambung ulang.');
                        return;
                    }

                    setTimeout(() => {
                        if (isListeningRef.current) {
                            try {
                                if (recognitionRef.current) {
                                    recognitionRef.current.start();
                                }
                            } catch {
                                startListening();
                            }
                        }
                    }, 200);
                } else {
                    setIsListening(false);
                }
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (err) {
            console.error('Failed to start speech recognition:', err);
            setErrorMessage('Gagal memulai pengenal suara. Pastikan mikrofon aktif.');
            setIsListening(false);
            isListeningRef.current = false;
        }
    }, [isBrave, isSupported, stopListening]);

    // Handle close and reset
    const handleClose = useCallback(() => {
        if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
        if (interimDebounceRef.current) clearTimeout(interimDebounceRef.current);
        stopListening();
        setTranscript('');
        setRecognizedPairs([]);
        setInterimText('');
        setRecentlySavedId(null);
        setLastActionFeedback(null);
        setLastOverwrittenRecord(null);
        setLastBatchAppliedRecords(null);
        onClose();
    }, [onClose, stopListening]);

    // Cleanup speech recognition on unmount
    useEffect(() => {
        return () => {
            if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
            if (interimDebounceRef.current) clearTimeout(interimDebounceRef.current);
            if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch {
                    // Ignore stop error
                }
            }
        };
    }, []);

    // Apply all parsed pairs in name_match mode with full validation, undo tracking, and overwrite reporting
    const handleApplyNameMatch = () => {
        // 1. Filter out invalid scores
        const validPairs = recognizedPairs.filter(p => p.studentId && p.score >= 0 && p.score <= 100);
        if (validPairs.length === 0) {
            showFeedback('Tidak ada nilai yang valid (0-100) untuk diterapkan', 'error');
            return;
        }

        // 2. Deduplicate by studentId (keep the latest occurrence)
        const pairByStudentId = new Map<string, NameAndGradeParsed>();
        validPairs.forEach(p => {
            pairByStudentId.set(p.studentId, p);
        });

        let overwritingCount = 0;
        const appliedRecords: {
            studentId: string;
            studentName: string;
            previousScore: string;
            appliedScore: string;
        }[] = [];

        pairByStudentId.forEach(pair => {
            const old = scores[pair.studentId] || '';
            if (old && old.trim() !== '' && old !== String(pair.score)) {
                overwritingCount++;
            }
            appliedRecords.push({
                studentId: pair.studentId,
                studentName: pair.studentName,
                previousScore: old,
                appliedScore: String(pair.score),
            });
            onScoreChange(pair.studentId, String(pair.score));
        });

        setLastBatchAppliedRecords(appliedRecords);

        if (soundEnabled) playSuccessChime();
        const msg = overwritingCount > 0
            ? `${pairByStudentId.size} nilai diterapkan (${overwritingCount} menimpa nilai lama)`
            : `${pairByStudentId.size} nilai berhasil diterapkan!`;
        showFeedback(msg, 'success');
    };

    const handleUpdatePairScore = (idx: number, newScore: number) => {
        setRecognizedPairs(prev => prev.map((p, i) => i === idx ? { ...p, score: Math.max(0, Math.min(100, newScore)) } : p));
    };

    const handleUpdatePairStudent = (idx: number, newStudentId: string) => {
        const student = students.find(s => s.id === newStudentId);
        if (!student) return;
        const studentIndex = students.findIndex(s => s.id === newStudentId);
        setRecognizedPairs(prev => prev.map((p, i) => i === idx ? {
            ...p,
            studentId: student.id,
            studentName: student.name,
            studentIndex,
            rollNumber: studentIndex + 1,
            isAmbiguous: false,
        } : p));
    };

    const handleDeletePair = (idx: number) => {
        setRecognizedPairs(prev => prev.filter((_, i) => i !== idx));
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={`🎙️ Dikte Suara Nilai ${subjectName ? `— ${subjectName}` : ''} ${assessmentName ? `(${assessmentName})` : ''}`}
            maxWidth="max-w-4xl"
        >
            <div className="space-y-4 pt-1">
                {/* Warning if Brave Browser detected */}
                {isBrave && (
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-3 text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div>
                            <p className="font-bold">Browser Brave Terdeteksi</p>
                            <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                                Browser Brave secara sengaja memblokir layanan Speech Recognition bawaan Google demi privasi. Oleh karena itu, suara tidak dapat ditranskripsi ke teks di browser ini.
                            </p>
                            <p className="mt-1.5 text-xs font-semibold text-amber-950 dark:text-amber-100">
                                💡 Solusi: Silakan buka Portal Guru di <strong>Google Chrome</strong> atau <strong>Microsoft Edge</strong> (sudah ada di taskbar laptop Anda) untuk menggunakan Dikte Suara.
                            </p>
                        </div>
                    </div>
                )}

                {/* Warning if browser does not support Web Speech API */}
                {!isSupported && (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-200 flex items-start gap-3 text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
                        <div>
                            <p className="font-bold">Browser tidak mendukung Web Speech API</p>
                            <p className="mt-1 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                                Fitur dikte suara memerlukan browser berbasis Chromium atau WebKit. Disarankan menggunakan <strong>Google Chrome</strong> atau <strong>Microsoft Edge</strong> di laptop maupun smartphone Anda.
                            </p>
                        </div>
                    </div>
                )}

                {/* Error Banner if mic denied */}
                {errorMessage && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-200 text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Mode Tabs & Sound Toggle */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
                        <button
                            type="button"
                            onClick={() => {
                                stopListening();
                                setActiveTab('sequential');
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                                activeTab === 'sequential'
                                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            ⚡ Mode Berurutan (Hands-Free)
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                stopListening();
                                setActiveTab('name_match');
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                                activeTab === 'name_match'
                                    ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            🧠 Mode Bebas (Absen / Nama + Nilai)
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Safety Mode Toggle */}
                        {activeTab === 'sequential' && (
                            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl text-xs border border-slate-200/80 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setInputSafetyMode('accurate')}
                                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                                        inputSafetyMode === 'accurate'
                                            ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-xs font-bold'
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                    title="Hanya simpan setelah selesai bicara (Mencegah salah dengar angka parsial)"
                                >
                                    🛡️ Akurat
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setInputSafetyMode('fast')}
                                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                                        inputSafetyMode === 'fast'
                                            ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-xs font-bold'
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                    title="Langsung simpan saat jeda hening singkat"
                                >
                                    ⚡ Cepat
                                </button>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => setSoundEnabled(prev => !prev)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                soundEnabled
                                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
                            }`}
                            title={soundEnabled ? 'Suara umpan balik aktif' : 'Suara dimatikan'}
                        >
                            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                            <span>{soundEnabled ? 'Suara Aktif' : 'Mute'}</span>
                        </button>
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* TAB 1: MODE BERURUTAN (HANDS-FREE) */}
                {/* ========================================================================= */}
                {activeTab === 'sequential' && (
                    <div className="space-y-4">
                        {/* Overwrite Undo Notification Banner */}
                        {lastOverwrittenRecord && (
                            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300/80 dark:border-amber-700/80 text-amber-900 dark:text-amber-100 flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1">
                                <div className="flex items-center gap-2">
                                    <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <span>
                                        Nilai <strong>{lastOverwrittenRecord.studentName}</strong> (Absen #{lastOverwrittenRecord.index + 1}) ditimpa dari <span className="line-through font-semibold text-amber-700 dark:text-amber-300">{lastOverwrittenRecord.oldScore}</span> menjadi <strong>{lastOverwrittenRecord.newScore}</strong>.
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={handleUndoLastOverwrite}
                                        className="px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1"
                                    >
                                        <RotateCcw className="w-3 h-3" /> Urungkan
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLastOverwrittenRecord(null)}
                                        className="text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-200 px-1 text-xs"
                                        title="Tutup pemberitahuan"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Active Student Card */}
                        {activeStudent ? (
                            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-brand-50/70 via-white to-brand-50/30 dark:from-slate-800 dark:via-slate-900 dark:to-brand-950/30 border border-brand-200/80 dark:border-brand-900/40 shadow-lg shadow-brand-600/5 relative overflow-hidden">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 text-center sm:text-left">
                                        <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-brand-600/20 shrink-0">
                                            {currentIndex + 1}
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-center sm:justify-start gap-2">
                                                <span className="text-xs font-bold text-brand-600 dark:text-brand-300 uppercase tracking-wider">
                                                    Siswa {currentIndex + 1} dari {students.length}
                                                </span>
                                                {recentlySavedId === activeStudent.id ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 px-2 py-0.5 rounded-full animate-bounce">
                                                        <Check className="w-3 h-3" /> Baru Saja Disimpan
                                                    </span>
                                                ) : scores[activeStudent.id] ? (
                                                    <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                                                        <Check className="w-3 h-3" /> Terisi
                                                    </span>
                                                ) : null}
                                            </div>
                                            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5 tracking-tight">
                                                {activeStudent.name}
                                            </h3>
                                        </div>
                                    </div>

                                    {/* Score Display Box */}
                                    <div className="flex items-center gap-3">
                                        <div className="text-right hidden sm:block">
                                            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block">Nilai Saat Ini</span>
                                            <span className="text-xs text-slate-400">KKM: {effectiveKkm}</span>
                                        </div>
                                        <div className={`w-20 h-16 rounded-2xl flex items-center justify-center font-black text-2xl border transition-all duration-300 ${
                                            recentlySavedId === activeStudent.id
                                                ? 'bg-emerald-500 text-white border-emerald-300 ring-4 ring-emerald-400/80 scale-105 shadow-lg shadow-emerald-500/40'
                                                : scores[activeStudent.id]
                                                ? Number(scores[activeStudent.id]) >= effectiveKkm
                                                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/20'
                                                    : 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/20'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700'
                                        }`}>
                                            {scores[activeStudent.id] || '—'}
                                        </div>
                                    </div>
                                </div>

                                {/* Microphone & Live Listener Status */}
                                <div className="mt-5 pt-4 border-t border-brand-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={isListening ? stopListening : startListening}
                                            disabled={!isSupported}
                                            className={`relative flex items-center justify-center w-12 h-12 rounded-2xl shadow-md transition-all active:scale-95 ${
                                                isListening
                                                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse ring-4 ring-rose-500/30'
                                                    : 'bg-brand-600 hover:bg-brand-700 text-white ring-2 ring-brand-500/20'
                                            }`}
                                            title={isListening ? 'Hentikan Mendengar' : 'Mulai Mendengar'}
                                        >
                                            {isListening ? (
                                                <>
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-2xl bg-rose-400 opacity-75"></span>
                                                    <MicOff className="w-5 h-5 relative z-10" />
                                                </>
                                            ) : (
                                                <Mic className="w-5 h-5" />
                                            )}
                                        </button>

                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`}></span>
                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                    {isListening ? 'Mikrofon Aktif — Silakan sebutkan nilainya' : 'Mikrofon Nonaktif — Klik tombol untuk mulai'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-sm">
                                                {interimText ? (
                                                    <span className="font-semibold text-brand-600 dark:text-brand-400">
                                                        Mendengar: "{interimText}..."
                                                    </span>
                                                ) : lastActionFeedback ? (
                                                    lastActionFeedback.text
                                                ) : (
                                                    'Contoh: Sebut "85", "nomor 2 85", "ralat 90", "lanjut"'
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Action Feedback Badge */}
                                    {lastActionFeedback && (
                                        <div className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 ${
                                            lastActionFeedback.type === 'success'
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                : lastActionFeedback.type === 'command'
                                                ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                                                : 'bg-rose-100 text-rose-800'
                                        }`}>
                                            <Sparkles className="w-3.5 h-3.5" />
                                            <span>{lastActionFeedback.text}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-500">Tidak ada data siswa.</div>
                        )}

                        {/* Interactive Student Class Roster with Progress */}
                        {students.length > 0 && (
                            <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                        <Users className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                        Daftar Siswa ({students.length} Siswa)
                                    </span>
                                    <span className="text-slate-500 font-semibold">
                                        <strong className="text-emerald-600 dark:text-emerald-400">{filledCount}</strong> dari {students.length} terisi ({progressPercentage}%)
                                    </span>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 rounded-full transition-all duration-300"
                                        style={{ width: `${progressPercentage}%` }}
                                    />
                                </div>

                                {/* Horizontal Scrollable Students List */}
                                <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-thin">
                                    {students.map((st, idx) => {
                                        const hasScore = Boolean(scores[st.id] && scores[st.id].trim() !== '');
                                        const isActive = idx === currentIndex;
                                        const isJustSaved = recentlySavedId === st.id;

                                        return (
                                            <button
                                                key={st.id}
                                                type="button"
                                                onClick={() => {
                                                    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
                                                    setRecentlySavedId(null);
                                                    currentIndexRef.current = idx;
                                                    setCurrentIndex(idx);
                                                }}
                                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all border ${
                                                    isActive
                                                        ? 'bg-brand-600 text-white border-brand-500 ring-2 ring-brand-400/80 shadow-md shadow-brand-600/20 scale-105'
                                                        : isJustSaved
                                                        ? 'bg-emerald-500 text-white border-emerald-400 ring-2 ring-emerald-300 shadow-sm animate-pulse'
                                                        : hasScore
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                                                }`}
                                                title={`Klik untuk melompat ke #${idx + 1} ${st.name}`}
                                            >
                                                <span className={`text-[10px] font-bold ${isActive || isJustSaved ? 'text-white/80' : 'text-slate-400'}`}>
                                                    #{idx + 1}
                                                </span>
                                                <span className="max-w-[110px] truncate">{st.name}</span>
                                                {hasScore && (
                                                    <span className={`px-1.5 py-0.5 rounded-md font-black text-[10px] ${
                                                        isActive || isJustSaved
                                                            ? 'bg-white/20 text-white'
                                                            : Number(scores[st.id]) >= effectiveKkm
                                                            ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100'
                                                            : 'bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100'
                                                    }`}>
                                                        {scores[st.id]}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Riwayat Nilai Terekam */}
                        {recentHistory.length > 0 && (
                            <div className="flex items-center gap-2 overflow-x-auto py-2 px-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 text-xs">
                                <span className="font-bold text-slate-500 dark:text-slate-400 shrink-0 flex items-center gap-1">
                                    <Check className="w-3.5 h-3.5 text-emerald-500" /> Baru Disimpan:
                                </span>
                                <div className="flex items-center gap-1.5 overflow-x-auto">
                                    {recentHistory.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => {
                                                if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
                                                setRecentlySavedId(null);
                                                const targetIdx = item.index - 1;
                                                currentIndexRef.current = targetIdx;
                                                setCurrentIndex(targetIdx);
                                            }}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/70 text-emerald-800 dark:text-emerald-200 font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors shrink-0 cursor-pointer shadow-sm"
                                            title="Klik untuk melihat atau mengoreksi nilai siswa ini"
                                        >
                                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">#{item.index}</span>
                                            <span className="max-w-[130px] truncate">{item.name}</span>
                                            <span className="font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded-lg text-[11px]">{item.score}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Navigation and Action Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-1.5">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
                                        setRecentlySavedId(null);
                                        const prev = Math.max(0, currentIndexRef.current - 1);
                                        currentIndexRef.current = prev;
                                        setCurrentIndex(prev);
                                    }}
                                    disabled={currentIndex === 0}
                                    className="rounded-xl h-9 text-xs"
                                >
                                    <SkipBack className="w-3.5 h-3.5 mr-1" /> Sebelumnya
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
                                        setRecentlySavedId(null);
                                        const next = Math.min(students.length - 1, currentIndexRef.current + 1);
                                        currentIndexRef.current = next;
                                        setCurrentIndex(next);
                                    }}
                                    disabled={currentIndex >= students.length - 1}
                                    className="rounded-xl h-9 text-xs"
                                >
                                    Berikutnya <SkipForward className="w-3.5 h-3.5 ml-1" />
                                </Button>
                                {activeStudent && scores[activeStudent.id] && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
                                            setRecentlySavedId(null);
                                            onScoreChange(activeStudent.id, '');
                                            setRecentHistory(prev => prev.filter(h => h.id !== activeStudent.id));
                                            showFeedback(`Nilai ${activeStudent.name} dikosongkan`, 'command');
                                        }}
                                        className="rounded-xl h-9 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus
                                    </Button>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 font-medium">
                                    {filledCount} dari {students.length} terisi
                                </span>
                                <Button
                                    type="button"
                                    variant="primary"
                                    size="sm"
                                    onClick={() => {
                                        stopListening();
                                        onClose();
                                    }}
                                    className="rounded-xl h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                >
                                    <CheckCircle2 className="w-4 h-4 mr-1" /> Selesai
                                </Button>
                            </div>
                        </div>

                        {/* Cheatsheet Voice Commands */}
                        <div className="p-3.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1.5">
                            <span className="font-bold text-slate-900 dark:text-slate-200">💡 Contoh Perintah Suara Pintar (Respons Cepat ~0.2 detik):</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-0.5">
                                <div><code className="text-brand-600 dark:text-brand-300 font-mono font-bold">"85" / "delapan lima"</code>: Nilai siswa aktif</div>
                                <div><code className="text-brand-600 dark:text-brand-300 font-mono font-bold">"absen 5" / "nomor 5"</code>: Lompat nomor absen</div>
                                <div><code className="text-brand-600 dark:text-brand-300 font-mono font-bold">"absen 2 85" / "nomor 2 85"</code>: Nilai via no absen</div>
                                <div><code className="text-brand-600 dark:text-brand-300 font-mono font-bold">"ralat 90" / "urungkan"</code>: Koreksi & batal</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ========================================================================= */}
                {/* TAB 2: MODE BEBAS (ABSEN / NAMA + NILAI) */}
                {/* ========================================================================= */}
                {activeTab === 'name_match' && (
                    <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-brand-50/60 dark:bg-slate-800/60 border border-brand-200/60 dark:border-slate-700">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={isListening ? stopListening : startListening}
                                        disabled={!isSupported}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                            isListening
                                                ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                                                : 'bg-brand-600 hover:bg-brand-700 text-white'
                                        }`}
                                    >
                                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                        <span>{isListening ? 'Hentikan Rekam' : 'Mulai Rekam Suara'}</span>
                                    </button>
                                    <span className="text-xs text-slate-500">
                                        {isListening ? 'Sedang mendengarkan ucapan Anda...' : 'Klik untuk mulai berbicara'}
                                    </span>
                                </div>
                                {transcript && (
                                    <button
                                        type="button"
                                        onClick={() => { setTranscript(''); setRecognizedPairs([]); }}
                                        className="text-xs text-slate-500 hover:text-rose-600 font-semibold"
                                    >
                                        Bersihkan
                                    </button>
                                )}
                            </div>

                            <textarea
                                value={transcript + (interimText ? ` [mendengar: ${interimText}]` : '')}
                                onChange={(e) => {
                                    setTranscript(e.target.value);
                                    const parsed = parseNameAndGradeSpeech(
                                        e.target.value,
                                        students.map(s => ({ id: s.id, name: s.name }))
                                    );
                                    setRecognizedPairs(parsed);
                                }}
                                rows={3}
                                placeholder="Katakan: 'absen 1 85, absen 2 sembilan puluh, absen 3 75' ATAU 'Ahmad Fauzi 85, Siti Rahma 90'..."
                                className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                            />
                        </div>

                        {/* Batch Applied Undo Notification Banner */}
                        {lastBatchAppliedRecords && lastBatchAppliedRecords.length > 0 && (
                            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-1">
                                <div className="flex items-center gap-2">
                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>
                                        <strong>{lastBatchAppliedRecords.length} nilai</strong> telah diterapkan ke tabel.
                                        {lastBatchAppliedRecords.filter(r => r.previousScore && r.previousScore !== r.appliedScore).length > 0 && (
                                            <span className="font-semibold text-amber-800 dark:text-amber-300 ml-1">
                                                ({lastBatchAppliedRecords.filter(r => r.previousScore && r.previousScore !== r.appliedScore).length} nilai menimpa data sebelumnya)
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                    <button
                                        type="button"
                                        onClick={handleUndoBatchApply}
                                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" /> Urungkan Penerapan
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLastBatchAppliedRecords(null)}
                                        className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 px-1 text-xs"
                                        title="Tutup pemberitahuan"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Matched Results Preview Table */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-brand-500" />
                                    Hasil Deteksi Nilai Siswa ({recognizedPairs.length})
                                </h4>
                                {recognizedPairs.length > 0 && (
                                    <Button
                                        type="button"
                                        variant="primary"
                                        size="sm"
                                        onClick={handleApplyNameMatch}
                                        className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Terapkan ke Tabel ({recognizedPairs.length})
                                    </Button>
                                )}
                            </div>

                            {recognizedPairs.length > 0 ? (
                                <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
                                    {recognizedPairs.map((pair, idx) => {
                                        const currentVal = pair.studentId ? scores[pair.studentId] : undefined;
                                        const willOverwrite = Boolean(currentVal && currentVal.trim() !== '' && currentVal !== String(pair.score));

                                        return (
                                            <div key={`${pair.studentId || 'unknown'}-${idx}`} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 text-sm hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                                <div className="flex items-start sm:items-center gap-3">
                                                    <span className="w-7 text-center text-xs font-bold text-slate-400 mt-1 sm:mt-0">
                                                        #{pair.rollNumber ?? (pair.studentIndex !== undefined ? pair.studentIndex + 1 : idx + 1)}
                                                    </span>
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="font-bold text-slate-900 dark:text-white">{pair.studentName}</p>
                                                            {pair.matchType === 'roll_number' ? (
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
                                                                    Absen #{pair.rollNumber}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                                                    Nama Cocok ({pair.confidence}%)
                                                                </span>
                                                            )}
                                                            {pair.isAmbiguous && (
                                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                                                    ⚠️ Ambigu
                                                                </span>
                                                            )}
                                                            {willOverwrite && (
                                                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                                                    Menimpa nilai: {currentVal}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-slate-400">Dari ucapan: "{pair.rawText}"</p>

                                                        {/* Candidate Selector if Ambiguous */}
                                                        {pair.isAmbiguous && pair.possibleCandidates && pair.possibleCandidates.length > 1 && (
                                                            <div className="mt-1.5 flex items-center gap-1.5">
                                                                <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">Pilih siswa yang tepat:</span>
                                                                <select
                                                                    value={pair.studentId}
                                                                    onChange={(e) => handleUpdatePairStudent(idx, e.target.value)}
                                                                    aria-label={`Pilih nama siswa untuk ucapan ${pair.rawText}`}
                                                                    className="text-xs bg-amber-50/50 dark:bg-slate-800 border border-amber-300 dark:border-slate-700 rounded-lg px-2 py-0.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                                >
                                                                    {pair.possibleCandidates.map(cand => (
                                                                        <option key={cand.id} value={cand.id}>
                                                                            {cand.name}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Editable Score Box & Delete Button */}
                                                <div className="flex items-center self-end sm:self-auto gap-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs text-slate-400 font-semibold hidden sm:inline">Nilai:</span>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            max={100}
                                                            value={pair.score}
                                                            onChange={(e) => {
                                                                const val = parseInt(e.target.value, 10);
                                                                handleUpdatePairScore(idx, isNaN(val) ? 0 : val);
                                                            }}
                                                            aria-label={`Nilai untuk ${pair.studentName}`}
                                                            className={`w-16 text-center font-black py-1 px-1.5 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 ${
                                                                pair.score >= effectiveKkm
                                                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 focus:ring-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700'
                                                                    : 'bg-rose-50 text-rose-800 border-rose-300 focus:ring-rose-400 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700'
                                                            }`}
                                                        />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeletePair(idx)}
                                                        aria-label={`Hapus ${pair.studentName}`}
                                                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                        title="Hapus baris ini"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                                    Belum ada nomor absen atau nama siswa yang terdeteksi. Silakan mulai bicara dengan menyebut nomor absen (misal: "absen 1 85, absen 2 90") atau nama siswa dan nilainya.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Modal>
    );
};
