/**
 * Headless In-Memory Mass Input Domain Engine
 * Following Codebase Design & Deep Modules discipline.
 * 100% pure TypeScript, framework-agnostic, and testable without React or DOM.
 */

import { InputMode, Step } from '../types';

export interface DraftStoragePort {
    loadDraft(key: string): unknown | null;
    saveDraft(key: string, data: unknown): void;
    clearDraft(key: string): void;
}

export interface UserSettingsPort {
    updateKkm(kkm: number): Promise<void>;
}

export interface SubjectGradeConfig {
    subject: string;
    assessment_name: string;
    notes: string;
    semester: string;
}

export interface QuizConfig {
    name: string;
    category?: string;
    subject: string;
    date: string;
    points: number;
    max_points: number;
}

export interface UndoSnapshot {
    kind: 'scores' | 'selection';
    count: number;
    scores: Record<string, string>;
    selectedStudentIds: string[];
}

export interface PendingClearAction {
    kind: 'scores' | 'selection' | 'back' | 'switch_config';
    count: number;
    nextInfo?: SubjectGradeConfig;
}

export interface MassInputStoreState {
    step: Step;
    mode: InputMode | null;
    selectedClass: string;
    kkm: number;
    subjectGradeInfo: SubjectGradeConfig;
    quizInfo: QuizConfig;
    attitudeCategory: string;
    attitudeName: string;
    attitudePoints: number;
    attitudeNotes: string;
    attitudeDate: string;
    violationCode: string;
    violationDate: string;
    violationNotes: string;
    scores: Record<string, string>;
    selectedStudentIds: Set<string>;
    attitudePredicates: Record<string, { spiritual: string; social: string }>;
    isScoresDirty: boolean;
    undoSnapshot: UndoSnapshot | null;
    pendingClearAction: PendingClearAction | null;
}

export interface MassInputStoreOptions {
    initialKkm?: number;
    storagePort?: DraftStoragePort;
    settingsPort?: UserSettingsPort;
    undoWindowMs?: number;
    kkmDebounceMs?: number;
}

/**
 * Production In-Memory/SessionStorage Draft Adapter
 */
export class SessionStorageDraftAdapter implements DraftStoragePort {
    public loadDraft(key: string): unknown | null {
        if (typeof window === 'undefined' || !window.sessionStorage) return null;
        try {
            const raw = window.sessionStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    public saveDraft(key: string, data: unknown): void {
        if (typeof window === 'undefined' || !window.sessionStorage) return;
        try {
            window.sessionStorage.setItem(key, JSON.stringify(data));
        } catch {
            // Ignore quota exceeded errors
        }
    }

    public clearDraft(key: string): void {
        if (typeof window === 'undefined' || !window.sessionStorage) return;
        try {
            window.sessionStorage.removeItem(key);
        } catch {
            // Ignore clear errors
        }
    }
}

/**
 * In-Memory Draft Adapter for Tests
 */
export class InMemoryDraftAdapter implements DraftStoragePort {
    private storage = new Map<string, string>();

    public loadDraft(key: string): unknown | null {
        const raw = this.storage.get(key);
        return raw ? JSON.parse(raw) : null;
    }

    public saveDraft(key: string, data: unknown): void {
        this.storage.set(key, JSON.stringify(data));
    }

    public clearDraft(key: string): void {
        this.storage.delete(key);
    }
}

export class MassInputStore {
    private state: MassInputStoreState;
    private storagePort: DraftStoragePort;
    private settingsPort?: UserSettingsPort;
    private undoWindowMs: number;
    private kkmDebounceMs: number;

    private undoTimer: ReturnType<typeof setTimeout> | null = null;
    private kkmDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    private pendingKkm: number | null = null;

    private listeners: Set<(state: MassInputStoreState) => void> = new Set();

    constructor(options?: MassInputStoreOptions) {
        this.storagePort = options?.storagePort || new SessionStorageDraftAdapter();
        this.settingsPort = options?.settingsPort;
        this.undoWindowMs = options?.undoWindowMs ?? 8000;
        this.kkmDebounceMs = options?.kkmDebounceMs ?? 1000;

        const initialKkm = options?.initialKkm && options.initialKkm > 0 ? options.initialKkm : 75;

        this.state = {
            step: 1,
            mode: null,
            selectedClass: '',
            kkm: initialKkm,
            subjectGradeInfo: {
                subject: '',
                assessment_name: '',
                notes: '',
                semester: '',
            },
            quizInfo: {
                name: '',
                category: 'Ulangan Harian',
                subject: '',
                date: new Date().toISOString().split('T')[0],
                points: 1,
                max_points: 100,
            },
            attitudeCategory: 'Kedisiplinan',
            attitudeName: '',
            attitudePoints: 1,
            attitudeNotes: '',
            attitudeDate: new Date().toISOString().split('T')[0],
            violationCode: '',
            violationDate: new Date().toISOString().split('T')[0],
            violationNotes: '',
            scores: {},
            selectedStudentIds: new Set(),
            attitudePredicates: {},
            isScoresDirty: false,
            undoSnapshot: null,
            pendingClearAction: null,
        };
    }

    public getState(): MassInputStoreState {
        return this.state;
    }

    public subscribe(listener: (state: MassInputStoreState) => void): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    private emitChange(): void {
        this.listeners.forEach((l) => l(this.state));
    }

    // --- Navigation ---
    public selectMode(mode: InputMode): void {
        this.state = {
            ...this.state,
            mode,
            step: 2,
        };
        this.emitChange();
    }

    public requestBack(): boolean {
        // If dirty work exists, require confirmation
        const dirtyCount = Object.keys(this.state.scores).length;
        if (this.state.isScoresDirty && dirtyCount > 0) {
            this.state = {
                ...this.state,
                pendingClearAction: { kind: 'back', count: dirtyCount },
            };
            this.emitChange();
            return false;
        }
        this.forceBack();
        return true;
    }

    public forceBack(): void {
        this.state = {
            ...this.state,
            step: 1,
            mode: null,
            scores: {},
            selectedStudentIds: new Set(),
            attitudePredicates: {},
            isScoresDirty: false,
            undoSnapshot: null,
            pendingClearAction: null,
        };
        this.emitChange();
    }

    public setClass(classId: string): void {
        this.state = {
            ...this.state,
            selectedClass: classId,
        };
        this.emitChange();
    }

    // --- KKM Management with Debounce ---
    public setKkm(kkm: number): void {
        if (kkm < 0 || kkm > 100) return;
        this.state = { ...this.state, kkm };
        this.emitChange();

        if (this.settingsPort) {
            this.pendingKkm = kkm;
            if (this.kkmDebounceTimer) clearTimeout(this.kkmDebounceTimer);
            this.kkmDebounceTimer = setTimeout(() => {
                if (this.pendingKkm !== null) {
                    this.settingsPort?.updateKkm(this.pendingKkm).catch(() => {});
                    this.pendingKkm = null;
                }
            }, this.kkmDebounceMs);
        }
    }

    // --- Score Business Logic & Invariants ---
    public static validateScore(scoreStr: string | number): { isValid: boolean; normalizedValue: string; error?: string } {
        if (scoreStr === '' || scoreStr === null || scoreStr === undefined) {
            return { isValid: true, normalizedValue: '' };
        }
        const num = typeof scoreStr === 'number' ? scoreStr : Number(scoreStr);
        if (isNaN(num)) {
            return { isValid: false, normalizedValue: '', error: 'Nilai harus berupa angka' };
        }
        if (num < 0 || num > 100) {
            return { isValid: false, normalizedValue: '', error: 'Nilai harus antara 0 hingga 100' };
        }
        return { isValid: true, normalizedValue: String(num) };
    }

    public setStudentScore(studentId: string, value: string): boolean {
        const validation = MassInputStore.validateScore(value);
        if (!validation.isValid) {
            return false;
        }
        const newScores = { ...this.state.scores, [studentId]: validation.normalizedValue };
        this.state = {
            ...this.state,
            scores: newScores,
            isScoresDirty: true,
        };
        this.emitChange();
        return true;
    }

    public setBatchScores(newScores: Record<string, string>): void {
        const validScores: Record<string, string> = {};
        for (const [id, val] of Object.entries(newScores)) {
            const v = MassInputStore.validateScore(val);
            if (v.isValid) {
                validScores[id] = v.normalizedValue;
            }
        }
        this.state = {
            ...this.state,
            scores: { ...this.state.scores, ...validScores },
            isScoresDirty: true,
        };
        this.emitChange();
    }

    public fillAllScores(studentIds: string[], score: number): void {
        const v = MassInputStore.validateScore(score);
        if (!v.isValid) return;
        const newScores = { ...this.state.scores };
        studentIds.forEach((id) => {
            newScores[id] = v.normalizedValue;
        });
        this.state = {
            ...this.state,
            scores: newScores,
            isScoresDirty: true,
        };
        this.emitChange();
    }

    // --- Selection Management ---
    public toggleStudentSelection(studentId: string): void {
        const next = new Set(this.state.selectedStudentIds);
        if (next.has(studentId)) {
            next.delete(studentId);
        } else {
            next.add(studentId);
        }
        this.state = { ...this.state, selectedStudentIds: next };
        this.emitChange();
    }

    public selectAllStudents(studentIds: string[], select: boolean): void {
        const next = select ? new Set(studentIds) : new Set<string>();
        this.state = { ...this.state, selectedStudentIds: next };
        this.emitChange();
    }

    // --- Attitude & BINTANG Tracking Invariants ---
    public setAttitudePredicate(studentId: string, field: 'spiritual' | 'social', value: string): void {
        const existing = this.state.attitudePredicates[studentId] || { spiritual: '', social: '' };
        this.state = {
            ...this.state,
            attitudePredicates: {
                ...this.state.attitudePredicates,
                [studentId]: { ...existing, [field]: value },
            },
            isScoresDirty: true,
        };
        this.emitChange();
    }

    public quickFillAttitude(studentIds: string[], predicate: string, target: 'both' | 'spiritual' | 'social' = 'both'): void {
        const next = { ...this.state.attitudePredicates };
        studentIds.forEach((id) => {
            const cur = next[id] || { spiritual: '', social: '' };
            next[id] = {
                spiritual: target === 'both' || target === 'spiritual' ? predicate : cur.spiritual,
                social: target === 'both' || target === 'social' ? predicate : cur.social,
            };
        });
        this.state = { ...this.state, attitudePredicates: next, isScoresDirty: true };
        this.emitChange();
    }

    // --- Destructive Actions & 8-Second Undo Window ---
    public requestClear(): void {
        const scoreCount = Object.keys(this.state.scores).length;
        const selCount = this.state.selectedStudentIds.size;
        if (scoreCount === 0 && selCount === 0) return;

        this.state = {
            ...this.state,
            pendingClearAction: {
                kind: scoreCount > 0 ? 'scores' : 'selection',
                count: scoreCount > 0 ? scoreCount : selCount,
            },
        };
        this.emitChange();
    }

    public confirmPendingAction(): void {
        const action = this.state.pendingClearAction;
        if (!action) return;

        if (action.kind === 'back') {
            this.forceBack();
            return;
        }

        if (action.kind === 'scores' || action.kind === 'selection') {
            // Save undo snapshot
            const snapshot: UndoSnapshot = {
                kind: action.kind,
                count: action.count,
                scores: { ...this.state.scores },
                selectedStudentIds: Array.from(this.state.selectedStudentIds),
            };

            if (this.undoTimer) clearTimeout(this.undoTimer);
            this.undoTimer = setTimeout(() => {
                this.state = { ...this.state, undoSnapshot: null };
                this.emitChange();
            }, this.undoWindowMs);

            this.state = {
                ...this.state,
                scores: action.kind === 'scores' ? {} : this.state.scores,
                selectedStudentIds: action.kind === 'selection' ? new Set() : this.state.selectedStudentIds,
                isScoresDirty: action.kind === 'scores' ? false : this.state.isScoresDirty,
                undoSnapshot: snapshot,
                pendingClearAction: null,
            };
            this.emitChange();
        }
    }

    public dismissPendingAction(): void {
        this.state = { ...this.state, pendingClearAction: null };
        this.emitChange();
    }

    public restoreUndo(): boolean {
        const snapshot = this.state.undoSnapshot;
        if (!snapshot) return false;

        if (this.undoTimer) {
            clearTimeout(this.undoTimer);
            this.undoTimer = null;
        }

        this.state = {
            ...this.state,
            scores: snapshot.scores,
            selectedStudentIds: new Set(snapshot.selectedStudentIds),
            isScoresDirty: true,
            undoSnapshot: null,
        };
        this.emitChange();
        return true;
    }

    public markSaved(): void {
        this.state = {
            ...this.state,
            isScoresDirty: false,
            undoSnapshot: null,
        };
        this.emitChange();
    }

    public dispose(): void {
        if (this.undoTimer) clearTimeout(this.undoTimer);
        if (this.kkmDebounceTimer) clearTimeout(this.kkmDebounceTimer);
        if (this.pendingKkm !== null && this.settingsPort) {
            this.settingsPort.updateKkm(this.pendingKkm).catch(() => {});
        }
        this.listeners.clear();
    }
}
