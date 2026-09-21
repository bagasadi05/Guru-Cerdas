import {
    SpeechRecognitionPort,
    AudioFeedbackPort,
    BrowserSpeechRecognitionAdapter,
    WebAudioFeedbackAdapter,
} from './voicePorts';
import {
    parseNameAndGradeSpeech,
    parseSpokenInput,
    NameAndGradeParsed,
} from '../../../../utils/indonesianSpeechParser';

export interface StudentItem {
    id: string;
    name: string;
    gender?: string | null;
    nisn?: string | null;
    [key: string]: unknown;
}

export type VoiceMode = 'sequential' | 'name_match';
export type SafetyMode = 'accurate' | 'fast';

export interface OverwriteSnapshot {
    studentId: string;
    studentName: string;
    oldScore: string;
    newScore: string;
    index: number;
}

export interface BatchAppliedSnapshot {
    studentId: string;
    studentName: string;
    previousScore: string;
    appliedScore: string;
}

export interface FeedbackMessage {
    text: string;
    variant: 'success' | 'command' | 'error';
    id: number;
}

export interface RecentHistoryItem {
    id: string;
    name: string;
    score: number;
    index: number;
}

export interface VoiceGradeState {
    readonly isListening: boolean;
    readonly isSupported: boolean;
    readonly isBrave: boolean;
    readonly activeTab: VoiceMode;
    readonly safetyMode: SafetyMode;
    readonly soundEnabled: boolean;
    readonly currentIndex: number;
    readonly activeStudent: StudentItem | null;
    readonly transcript: string;
    readonly interimText: string;
    readonly errorMessage: string | null;
    readonly feedbackMessage: FeedbackMessage | null;
    readonly lastOverwrittenRecord: OverwriteSnapshot | null;
    readonly lastBatchAppliedRecords: readonly BatchAppliedSnapshot[] | null;
    readonly recentHistory: readonly RecentHistoryItem[];
    readonly recentlySavedId: string | null;
    // Freeform Mode
    readonly recognizedPairs: readonly NameAndGradeParsed[];
    readonly canUndoBatch: boolean;
}

export interface VoiceGradeControllerOptions {
    students: StudentItem[];
    scores: Record<string, string>;
    onScoreChange: (studentId: string, value: string) => void;
    kkm?: number;
    speechPort?: SpeechRecognitionPort;
    audioPort?: AudioFeedbackPort;
    initialSafetyMode?: SafetyMode;
    initialSoundEnabled?: boolean;
}

export class VoiceGradeController {
    private students: StudentItem[] = [];
    private scores: Record<string, string> = {};
    private onScoreChange: (studentId: string, value: string) => void;
    private kkm: number;
    private speechPort: SpeechRecognitionPort;
    private audioPort: AudioFeedbackPort;

    private activeTab: VoiceMode = 'sequential';
    private safetyMode: SafetyMode = 'accurate';
    private soundEnabled = true;
    private currentIndex = 0;
    private isListening = false;
    private isSupported = true;
    private isBrave = false;
    private transcript = '';
    private interimText = '';
    private errorMessage: string | null = null;
    private feedbackMessage: FeedbackMessage | null = null;
    private feedbackTimer: ReturnType<typeof setTimeout> | null = null;

    private lastOverwrittenRecord: OverwriteSnapshot | null = null;
    private lastBatchAppliedRecords: BatchAppliedSnapshot[] | null = null;
    private recentHistory: RecentHistoryItem[] = [];
    private recentlySavedId: string | null = null;

    // Freeform mode pairs
    private recognizedPairs: NameAndGradeParsed[] = [];

    // Internal timers & deduplication
    private advanceTimer: ReturnType<typeof setTimeout> | null = null;
    private interimDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    private lastCommittedAction = { key: '', timestamp: 0 };
    private feedbackCounter = 0;

    private listeners: Set<(state: VoiceGradeState) => void> = new Set();
    private state: VoiceGradeState;

    constructor(options: VoiceGradeControllerOptions) {
        this.students = [...options.students];
        this.scores = { ...options.scores };
        this.onScoreChange = options.onScoreChange;
        this.kkm = options.kkm && options.kkm > 0 ? options.kkm : 75;
        this.speechPort = options.speechPort || new BrowserSpeechRecognitionAdapter();
        this.audioPort = options.audioPort || new WebAudioFeedbackAdapter();
        this.safetyMode = options.initialSafetyMode || 'accurate';
        this.soundEnabled = options.initialSoundEnabled !== undefined ? options.initialSoundEnabled : true;

        this.isSupported = this.speechPort.isSupported();
        this.state = this.buildState();
    }

    public updateRosterAndScores(students: StudentItem[], scores: Record<string, string>): void {
        this.students = [...students];
        this.scores = { ...scores };
        if (this.currentIndex >= this.students.length && this.students.length > 0) {
            this.currentIndex = this.students.length - 1;
        }
        this.emitChange();
    }

    public setOnScoreChange(cb: (studentId: string, value: string) => void): void {
        this.onScoreChange = cb;
    }

    private buildState(): VoiceGradeState {
        return {
            isListening: this.isListening,
            isSupported: this.isSupported,
            isBrave: this.isBrave,
            activeTab: this.activeTab,
            safetyMode: this.safetyMode,
            soundEnabled: this.soundEnabled,
            currentIndex: this.currentIndex,
            activeStudent: this.students[this.currentIndex] || null,
            transcript: this.transcript,
            interimText: this.interimText,
            errorMessage: this.errorMessage,
            feedbackMessage: this.feedbackMessage,
            lastOverwrittenRecord: this.lastOverwrittenRecord,
            lastBatchAppliedRecords: this.lastBatchAppliedRecords,
            recentHistory: this.recentHistory,
            recentlySavedId: this.recentlySavedId,
            recognizedPairs: this.recognizedPairs,
            canUndoBatch: !!(this.lastBatchAppliedRecords && this.lastBatchAppliedRecords.length > 0),
        };
    }

    public getState(): VoiceGradeState {
        return this.state;
    }

    public subscribe(listener: (state: VoiceGradeState) => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    private emitChange(): void {
        this.state = this.buildState();
        this.listeners.forEach((l) => l(this.state));
    }

    public showFeedback(text: string, variant: 'success' | 'command' | 'error'): void {
        if (this.feedbackTimer) {
            clearTimeout(this.feedbackTimer);
            this.feedbackTimer = null;
        }
        this.feedbackCounter += 1;
        this.feedbackMessage = { text, variant, id: this.feedbackCounter };
        this.emitChange();

        this.feedbackTimer = setTimeout(() => {
            this.feedbackMessage = null;
            this.emitChange();
        }, 2200);
    }

    public setActiveTab(tab: VoiceMode): void {
        this.activeTab = tab;
        this.emitChange();
    }

    public setSafetyMode(mode: SafetyMode): void {
        this.safetyMode = mode;
        this.emitChange();
    }

    public setSoundEnabled(enabled: boolean): void {
        this.soundEnabled = enabled;
        this.emitChange();
    }

    public setCurrentIndex(index: number): void {
        if (index < 0 || index >= this.students.length) return;
        if (this.advanceTimer) {
            clearTimeout(this.advanceTimer);
            this.advanceTimer = null;
        }
        this.recentlySavedId = null;
        this.currentIndex = index;
        this.emitChange();
    }

    public navigateNext(): void {
        if (this.currentIndex < this.students.length - 1) {
            this.setCurrentIndex(this.currentIndex + 1);
            if (this.soundEnabled) this.audioPort.playCommand();
            this.showFeedback('Lanjut ke siswa berikutnya', 'command');
        }
    }

    public navigatePrev(): void {
        if (this.currentIndex > 0) {
            this.setCurrentIndex(this.currentIndex - 1);
            if (this.soundEnabled) this.audioPort.playCommand();
            this.showFeedback('Kembali ke siswa sebelumnya', 'command');
        }
    }

    public clearCurrentScore(): void {
        const student = this.students[this.currentIndex];
        if (student) {
            this.onScoreChange(student.id, '');
            this.scores[student.id] = '';
            this.recentHistory = this.recentHistory.filter((h) => h.id !== student.id);
            if (this.soundEnabled) this.audioPort.playCommand();
            this.showFeedback(`Nilai ${student.name} dikosongkan`, 'command');
            this.emitChange();
        }
    }

    public undoLastOverwrite(): void {
        if (!this.lastOverwrittenRecord) return;
        const { studentId, studentName, oldScore, index } = this.lastOverwrittenRecord;
        this.onScoreChange(studentId, oldScore);
        this.scores[studentId] = oldScore;
        this.currentIndex = index;
        this.lastOverwrittenRecord = null;
        if (this.soundEnabled) this.audioPort.playCommand();
        this.showFeedback(`✓ Nilai ${studentName} dikembalikan ke ${oldScore}`, 'command');
        this.emitChange();
    }

    public undoBatchApply(): void {
        if (!this.lastBatchAppliedRecords || this.lastBatchAppliedRecords.length === 0) return;
        const count = this.lastBatchAppliedRecords.length;
        this.lastBatchAppliedRecords.forEach((record) => {
            this.onScoreChange(record.studentId, record.previousScore);
            this.scores[record.studentId] = record.previousScore;
        });
        this.lastBatchAppliedRecords = null;
        if (this.soundEnabled) this.audioPort.playCommand();
        this.showFeedback(`✓ Penerapan ${count} nilai telah diurungkan`, 'command');
        this.emitChange();
    }

    public async startListening(): Promise<void> {
        if (!this.isSupported) {
            this.errorMessage = 'Browser Anda tidak mendukung Web Speech API. Disarankan menggunakan Google Chrome atau Microsoft Edge.';
            this.emitChange();
            return;
        }

        if (this.isBrave) {
            this.errorMessage = 'Browser Brave memblokir layanan Speech Recognition bawaan Google demi privasi. Silakan buka di Google Chrome atau Microsoft Edge.';
            this.emitChange();
            return;
        }

        this.errorMessage = null;

        await this.speechPort.start({
            onStart: () => {
                this.isListening = true;
                this.emitChange();
            },
            onResult: (transcriptText: string, isFinal: boolean) => {
                this.handleSpeechResult(transcriptText, isFinal);
            },
            onError: (errType: string, rawMsg?: string) => {
                if (errType === 'not-allowed') {
                    this.errorMessage = 'Akses mikrofon ditolak. Izinkan izin mikrofon di pengaturan browser Anda.';
                } else if (errType === 'audio-capture') {
                    this.errorMessage = 'Mikrofon tidak terdeteksi pada perangkat ini.';
                } else if (errType === 'network') {
                    this.errorMessage = 'Gagal terhubung ke layanan pengenalan suara. Periksa koneksi internet Anda.';
                } else if (errType === 'crash_loop') {
                    this.errorMessage = 'Layanan suara sering terputus. Silakan coba buka ulang dialog ini.';
                } else {
                    this.errorMessage = rawMsg || 'Terjadi kesalahan pada mikrofon.';
                }
                this.emitChange();
            },
            onEnd: () => {
                this.isListening = false;
                this.emitChange();
            },
        });
    }

    public stopListening(): void {
        if (this.interimDebounceTimer) {
            clearTimeout(this.interimDebounceTimer);
            this.interimDebounceTimer = null;
        }
        if (this.advanceTimer) {
            clearTimeout(this.advanceTimer);
            this.advanceTimer = null;
        }
        this.speechPort.stop();
        this.isListening = false;
        this.interimText = '';
        this.emitChange();
    }

    public toggleListening(): void {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    private handleSpeechResult(transcriptText: string, isFinal: boolean): void {
        const text = transcriptText.trim();
        if (!text) return;

        if (isFinal) {
            if (this.interimDebounceTimer) {
                clearTimeout(this.interimDebounceTimer);
                this.interimDebounceTimer = null;
            }
            this.interimText = '';
            this.transcript = text;

            if (this.activeTab === 'sequential') {
                this.processSequentialSpeech(text);
            } else {
                this.processNameMatchSpeech(text);
            }
            this.emitChange();
        } else {
            this.interimText = text;
            if (this.activeTab === 'sequential' && this.safetyMode === 'fast') {
                if (this.interimDebounceTimer) {
                    clearTimeout(this.interimDebounceTimer);
                    this.interimDebounceTimer = null;
                }

                const minimStudents = this.students.map((s) => ({ id: s.id, name: s.name }));
                const detected = parseSpokenInput(text, minimStudents, this.currentIndex);

                if (
                    detected.type === 'command' ||
                    (detected.type === 'active_grade' && detected.score >= 10) ||
                    detected.type === 'roll_grade'
                ) {
                    const delay = detected.type === 'command' ? 250 : 700;
                    this.interimDebounceTimer = setTimeout(() => {
                        this.processSequentialSpeech(text);
                        this.interimText = '';
                        this.interimDebounceTimer = null;
                        this.emitChange();
                    }, delay);
                }
            }
            this.emitChange();
        }
    }

    private processSequentialSpeech(spokenText: string): void {
        const text = spokenText.trim();
        if (!text) return;
        if (this.students.length === 0) return;

        let currIdx = this.currentIndex;
        const minimStudents = this.students.map((s) => ({ id: s.id, name: s.name }));
        const parseResult = parseSpokenInput(text, minimStudents, currIdx);

        if (parseResult.type === 'none') {
            const digitMatch = text.match(/\b\d+\b/);
            if (digitMatch && Number(digitMatch[0]) > 100) {
                if (this.soundEnabled) this.audioPort.playError();
                this.showFeedback(`Nilai ${digitMatch[0]} melebihi 100 (maksimal 100)`, 'error');
            }
            return;
        }

        // Fast-speaker handler
        if (this.advanceTimer && this.recentlySavedId && parseResult.type !== 'correction') {
            clearTimeout(this.advanceTimer);
            this.advanceTimer = null;
            this.recentlySavedId = null;
            if (parseResult.type === 'active_grade') {
                currIdx = Math.min(this.students.length - 1, currIdx + 1);
                this.currentIndex = currIdx;
            }
        }

        // Action Deduplication Key
        let actionKey = '';
        if (parseResult.type === 'command') {
            actionKey = `cmd_${parseResult.command}`;
        } else if (parseResult.type === 'correction') {
            let targetStudentId = 'active';
            if (parseResult.studentIndex !== undefined && this.students[parseResult.studentIndex]) {
                targetStudentId = this.students[parseResult.studentIndex].id;
            } else if (this.recentlySavedId) {
                targetStudentId = this.recentlySavedId;
            } else if (this.students[currIdx]) {
                targetStudentId = this.students[currIdx].id;
            }
            actionKey = `correction_${targetStudentId}_${parseResult.score}`;
        } else if (parseResult.type === 'roll_grade') {
            actionKey = `roll_${parseResult.studentIndex}_${parseResult.score}`;
        } else if (parseResult.type === 'jump_to_student') {
            actionKey = `jump_${parseResult.studentIndex}`;
        } else if (parseResult.type === 'name_grade') {
            actionKey = `name_${parseResult.studentId}_${parseResult.score}`;
        } else if (parseResult.type === 'active_grade') {
            const activeId = this.students[currIdx]?.id || 'unknown';
            actionKey = `active_${activeId}_${parseResult.score}`;
        }

        const now = Date.now();
        if (this.lastCommittedAction.key === actionKey && now - this.lastCommittedAction.timestamp < 2000) {
            return;
        }
        this.lastCommittedAction = { key: actionKey, timestamp: now };

        // 1. Navigation / Control Command
        if (parseResult.type === 'command') {
            if (this.advanceTimer) clearTimeout(this.advanceTimer);
            this.recentlySavedId = null;
            if (this.soundEnabled) this.audioPort.playCommand();

            if (parseResult.command === 'next') {
                this.currentIndex = Math.min(this.students.length - 1, currIdx + 1);
                this.showFeedback('Lanjut ke siswa berikutnya', 'command');
            } else if (parseResult.command === 'prev') {
                this.currentIndex = Math.max(0, currIdx - 1);
                this.showFeedback('Kembali ke siswa sebelumnya', 'command');
            } else if (parseResult.command === 'clear') {
                const active = this.students[currIdx];
                if (active) {
                    this.onScoreChange(active.id, '');
                    this.scores[active.id] = '';
                    this.recentHistory = this.recentHistory.filter((h) => h.id !== active.id);
                    this.showFeedback(`Nilai ${active.name} dikosongkan`, 'command');
                }
            } else if (parseResult.command === 'first') {
                this.currentIndex = 0;
                this.showFeedback('Lompat ke siswa pertama (#1)', 'command');
            } else if (parseResult.command === 'last') {
                this.currentIndex = Math.max(0, this.students.length - 1);
                this.showFeedback(`Lompat ke siswa terakhir (#${this.currentIndex + 1})`, 'command');
            } else if (parseResult.command === 'undo') {
                if (this.lastOverwrittenRecord) {
                    this.undoLastOverwrite();
                } else if (this.lastBatchAppliedRecords && this.lastBatchAppliedRecords.length > 0) {
                    this.undoBatchApply();
                } else {
                    this.showFeedback('Tidak ada nilai yang baru saja ditimpa untuk diurungkan', 'command');
                }
            } else if (parseResult.command === 'stop') {
                this.stopListening();
                this.showFeedback('Dikte dihentikan', 'command');
            }
            this.emitChange();
            return;
        }

        // 2. Correction Command
        if (parseResult.type === 'correction') {
            if (this.advanceTimer) clearTimeout(this.advanceTimer);
            const scoreToApply = parseResult.score;
            let correctStudent: StudentItem | null = null;
            let studentIdx = -1;

            if (parseResult.studentIndex !== undefined && this.students[parseResult.studentIndex]) {
                correctStudent = this.students[parseResult.studentIndex];
                studentIdx = parseResult.studentIndex;
            } else if (this.recentlySavedId) {
                const found = this.students.find((s) => s.id === this.recentlySavedId);
                if (found) {
                    correctStudent = found;
                    studentIdx = this.students.findIndex((s) => s.id === found.id);
                }
            }

            if (!correctStudent) {
                correctStudent = this.students[currIdx] || null;
                studentIdx = currIdx;
            }

            if (!correctStudent) return;

            const prevScore = this.scores[correctStudent.id] || '';
            if (prevScore && prevScore !== String(scoreToApply)) {
                this.lastOverwrittenRecord = {
                    studentId: correctStudent.id,
                    studentName: correctStudent.name,
                    oldScore: prevScore,
                    newScore: String(scoreToApply),
                    index: studentIdx !== -1 ? studentIdx : currIdx,
                };
            }

            this.onScoreChange(correctStudent.id, String(scoreToApply));
            this.scores[correctStudent.id] = String(scoreToApply);
            if (this.soundEnabled) this.audioPort.playSuccess();

            if (studentIdx !== -1) {
                this.currentIndex = studentIdx;
            }
            this.recentlySavedId = correctStudent.id;
            this.recentHistory = [
                {
                    id: correctStudent.id,
                    name: correctStudent.name,
                    score: scoreToApply,
                    index: (studentIdx !== -1 ? studentIdx : currIdx) + 1,
                },
                ...this.recentHistory.filter((h) => h.id !== correctStudent!.id).slice(0, 4),
            ];
            this.showFeedback(
                `✓ Ralat: [${(studentIdx !== -1 ? studentIdx : currIdx) + 1}] ${correctStudent.name} diubah ke ${scoreToApply}`,
                'success'
            );
            this.emitChange();
            return;
        }

        // 3. Jump to student
        if (parseResult.type === 'jump_to_student') {
            if (this.advanceTimer) clearTimeout(this.advanceTimer);
            this.recentlySavedId = null;
            const targetIdx = parseResult.studentIndex;
            const target = this.students[targetIdx];
            if (target) {
                if (this.soundEnabled) this.audioPort.playCommand();
                this.currentIndex = targetIdx;
                this.showFeedback(`Lompat ke #${targetIdx + 1}: ${target.name}`, 'command');
                this.emitChange();
            }
            return;
        }

        // 4. Grade application
        let targetIndex = currIdx;
        let scoreToApply = 0;

        if (parseResult.type === 'roll_grade' || parseResult.type === 'name_grade') {
            targetIndex = parseResult.studentIndex;
            scoreToApply = parseResult.score;
        } else if (parseResult.type === 'active_grade') {
            targetIndex = currIdx;
            scoreToApply = parseResult.score;
        }

        const targetStudent = this.students[targetIndex];
        if (!targetStudent) return;

        if (this.advanceTimer) clearTimeout(this.advanceTimer);

        const existingScore = this.scores[targetStudent.id] || '';
        if (existingScore && existingScore !== String(scoreToApply)) {
            this.lastOverwrittenRecord = {
                studentId: targetStudent.id,
                studentName: targetStudent.name,
                oldScore: existingScore,
                newScore: String(scoreToApply),
                index: targetIndex,
            };
        }

        this.onScoreChange(targetStudent.id, String(scoreToApply));
        this.scores[targetStudent.id] = String(scoreToApply);
        if (this.soundEnabled) this.audioPort.playSuccess();

        this.currentIndex = targetIndex;
        this.recentlySavedId = targetStudent.id;
        this.recentHistory = [
            { id: targetStudent.id, name: targetStudent.name, score: scoreToApply, index: targetIndex + 1 },
            ...this.recentHistory.filter((h) => h.id !== targetStudent.id).slice(0, 4),
        ];

        this.showFeedback(`✓ [${targetIndex + 1}] ${targetStudent.name}: ${scoreToApply}`, 'success');

        // Auto-advance
        const nextIdx = targetIndex + 1;
        if (nextIdx < this.students.length) {
            this.advanceTimer = setTimeout(() => {
                this.currentIndex = nextIdx;
                this.recentlySavedId = null;
                this.emitChange();
            }, 450);
        } else {
            this.advanceTimer = setTimeout(() => {
                this.recentlySavedId = null;
                this.showFeedback('Semua siswa telah selesai dinilai! 🎉', 'success');
                this.emitChange();
            }, 450);
        }

        this.emitChange();
    }

    // Mode Bebas: Name Match Speech
    private processNameMatchSpeech(spokenText: string): void {
        const studentNames = this.students.map((s) => ({ id: s.id, name: s.name }));
        const parsedResults = parseNameAndGradeSpeech(spokenText, studentNames);

        if (parsedResults.length === 0) return;

        const updatedPairs = [...this.recognizedPairs];
        let hasNew = false;

        parsedResults.forEach((newPair) => {
            const existingIdx = updatedPairs.findIndex(
                (p) => p.studentId && p.studentId === newPair.studentId
            );
            if (existingIdx !== -1) {
                updatedPairs[existingIdx] = newPair;
            } else {
                updatedPairs.push(newPair);
                hasNew = true;
            }
        });

        this.recognizedPairs = updatedPairs;
        if (hasNew) {
            if (this.soundEnabled) this.audioPort.playSuccess();
            this.showFeedback(`Terdeteksi ${parsedResults.length} nilai baru`, 'success');
        }
        this.emitChange();
    }

    // Mode Bebas Pair Manipulations
    public setFreeformTranscript(text: string): void {
        this.transcript = text;
        this.processNameMatchSpeech(text);
    }

    public updatePairScore(index: number, newScore: number): void {
        if (this.recognizedPairs[index]) {
            const updated = [...this.recognizedPairs];
            updated[index] = { ...updated[index], score: newScore };
            this.recognizedPairs = updated;
            this.emitChange();
        }
    }

    public updatePairStudent(index: number, studentId: string): void {
        if (this.recognizedPairs[index]) {
            const found = this.students.find((s) => s.id === studentId);
            if (found) {
                const updated = [...this.recognizedPairs];
                updated[index] = {
                    ...updated[index],
                    studentId: found.id,
                    studentName: found.name,
                    confidence: 1.0,
                };
                this.recognizedPairs = updated;
                this.emitChange();
            }
        }
    }

    public deletePair(index: number): void {
        this.recognizedPairs = this.recognizedPairs.filter((_, i) => i !== index);
        this.emitChange();
    }

    public clearPairs(): void {
        this.recognizedPairs = [];
        this.emitChange();
    }

    public applyFreeformPairs(): { appliedCount: number; overwrittenCount: number } {
        const validPairs = this.recognizedPairs.filter(
            (p) => !!p.studentId
        );

        if (validPairs.length === 0) {
            this.showFeedback('Tidak ada siswa yang cocok untuk diterapkan', 'error');
            return { appliedCount: 0, overwrittenCount: 0 };
        }

        const batchUndoSnapshot: BatchAppliedSnapshot[] = [];
        let overwritten = 0;

        validPairs.forEach((pair) => {
            const prev = this.scores[pair.studentId] || '';
            batchUndoSnapshot.push({
                studentId: pair.studentId,
                studentName: pair.studentName || 'Siswa',
                previousScore: prev,
                appliedScore: String(pair.score),
            });
            if (prev) overwritten += 1;
            this.onScoreChange(pair.studentId, String(pair.score));
            this.scores[pair.studentId] = String(pair.score);
        });

        this.lastBatchAppliedRecords = batchUndoSnapshot;
        if (this.soundEnabled) this.audioPort.playSuccess();
        this.showFeedback(`✓ Berhasil menerapkan ${validPairs.length} nilai`, 'success');
        this.recognizedPairs = [];
        this.emitChange();

        return { appliedCount: validPairs.length, overwrittenCount: overwritten };
    }

    public dispose(): void {
        this.stopListening();
        if (this.feedbackTimer) clearTimeout(this.feedbackTimer);
        this.listeners.clear();
    }
}
