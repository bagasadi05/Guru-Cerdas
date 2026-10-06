/**
 * Device-local drafts for the subject-grade mass input.
 *
 * Drafts are stored per account and per assessment context (class, subject,
 * assessment, semester), so switching to another assessment keeps the typed
 * scores of the previous one, and a different teacher on the same device never
 * sees them. Logout removes every draft.
 */

export interface SubjectGradeDraftInfo {
    subject: string;
    assessment_name: string;
    notes: string;
    semester: string;
}

export interface SubjectGradeDraft {
    selectedClass: string;
    subjectGradeInfo: SubjectGradeDraftInfo;
    scores: Record<string, string>;
    /** Server scores the teacher started from; used to detect edits made elsewhere. */
    baseline?: Record<string, string> | null;
    selectedStudentIds?: string[];
    kkm?: number;
    validationErrors?: Record<string, string>;
    /** ISO timestamp of the last change. */
    savedAt?: string;
    /**
     * Set when the teacher pressed Simpan without a connection: the scores at
     * that moment are sent automatically once the device is online again.
     */
    queued?: QueuedGradeSave;
    /**
     * Set when an automatic send stopped (scores changed elsewhere, or the
     * server refused). The teacher has to open the assessment and save it.
     */
    needsReview?: { reason: 'conflict' | 'error'; message?: string };
}

export interface QueuedGradeSave {
    /** ISO timestamp of the Simpan press. */
    at: string;
    scores: Record<string, string>;
    /** Human label for notifications, e.g. "PH 1 Matematika — 7A". */
    label: string;
}

interface DraftStore {
    last?: string;
    drafts: Record<string, SubjectGradeDraft>;
}

const DRAFT_PREFIX = 'guru_cerdas_subject_grade_draft';
/** Pre-account drafts lived under this single sessionStorage key. */
const LEGACY_DRAFT_KEY = DRAFT_PREFIX;
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const getSubjectGradeContextKey = (
    classId: string,
    info: { subject: string; assessment_name: string; semester: string },
) => `${classId}::${info.subject}::${info.assessment_name}::${info.semester}`;

const storeKey = (userId: string) => `${DRAFT_PREFIX}:${userId}`;

const isFresh = (draft: SubjectGradeDraft, now: number) => {
    if (!draft.savedAt) return true;
    const age = now - Date.parse(draft.savedAt);
    return Number.isNaN(age) || age < DRAFT_MAX_AGE_MS;
};

function readStore(userId: string): DraftStore {
    try {
        const raw = localStorage.getItem(storeKey(userId));
        const parsed = raw ? JSON.parse(raw) as DraftStore : null;
        const store: DraftStore = parsed && typeof parsed === 'object' && parsed.drafts
            ? parsed
            : { drafts: {} };

        // Adopt a draft written by the previous single-key version in this tab.
        const legacyRaw = sessionStorage.getItem(LEGACY_DRAFT_KEY);
        if (legacyRaw) {
            sessionStorage.removeItem(LEGACY_DRAFT_KEY);
            const legacy = JSON.parse(legacyRaw) as SubjectGradeDraft & { mode?: string };
            if (legacy?.mode === 'subject_grade' && legacy.subjectGradeInfo && legacy.scores) {
                const key = getSubjectGradeContextKey(legacy.selectedClass, legacy.subjectGradeInfo);
                store.drafts[key] = {
                    selectedClass: legacy.selectedClass,
                    subjectGradeInfo: legacy.subjectGradeInfo,
                    scores: legacy.scores,
                    selectedStudentIds: legacy.selectedStudentIds,
                    kkm: legacy.kkm,
                    validationErrors: legacy.validationErrors,
                    savedAt: new Date().toISOString(),
                };
                store.last = key;
                writeStore(userId, store);
            }
        }

        const now = Date.now();
        for (const [key, draft] of Object.entries(store.drafts)) {
            if (!isFresh(draft, now)) delete store.drafts[key];
        }
        if (store.last && !store.drafts[store.last]) delete store.last;
        return store;
    } catch {
        return { drafts: {} };
    }
}

function writeStore(userId: string, store: DraftStore) {
    try {
        if (Object.keys(store.drafts).length === 0) {
            localStorage.removeItem(storeKey(userId));
        } else {
            localStorage.setItem(storeKey(userId), JSON.stringify(store));
        }
    } catch (e) {
        console.error('Failed to save subject grade draft:', e);
    }
}

/** The draft the teacher worked on most recently, if any. */
export function readLatestSubjectGradeDraft(userId: string | null | undefined): SubjectGradeDraft | null {
    if (!userId) return null;
    const store = readStore(userId);
    return store.last ? store.drafts[store.last] ?? null : null;
}

export function readSubjectGradeDraft(userId: string | null | undefined, contextKey: string): SubjectGradeDraft | null {
    if (!userId) return null;
    return readStore(userId).drafts[contextKey] ?? null;
}

export function writeSubjectGradeDraft(userId: string | null | undefined, draft: SubjectGradeDraft) {
    if (!userId) return;
    const store = readStore(userId);
    const key = getSubjectGradeContextKey(draft.selectedClass, draft.subjectGradeInfo);
    const existing = store.drafts[key];
    store.drafts[key] = {
        // Autosave writes the form state on every change; it must not drop a
        // pending offline save or a review flag it knows nothing about.
        queued: existing?.queued,
        needsReview: existing?.needsReview,
        ...draft,
        savedAt: draft.savedAt ?? new Date().toISOString(),
    };
    store.last = key;
    writeStore(userId, store);
}

/** Every stored draft of this account, keyed by context. */
export function listSubjectGradeDrafts(userId: string | null | undefined): [string, SubjectGradeDraft][] {
    if (!userId) return [];
    return Object.entries(readStore(userId).drafts);
}

/**
 * Rewrites one draft in place without touching `last`. Returning null from
 * the updater removes the draft.
 */
export function updateSubjectGradeDraft(
    userId: string | null | undefined,
    contextKey: string,
    updater: (draft: SubjectGradeDraft) => SubjectGradeDraft | null,
) {
    if (!userId) return;
    const store = readStore(userId);
    const current = store.drafts[contextKey];
    if (!current) return;
    const next = updater(current);
    if (next) {
        store.drafts[contextKey] = next;
    } else {
        delete store.drafts[contextKey];
        if (store.last === contextKey) delete store.last;
    }
    writeStore(userId, store);
}

export function removeSubjectGradeDraft(userId: string | null | undefined, contextKey: string) {
    if (!userId) return;
    const store = readStore(userId);
    if (!store.drafts[contextKey]) return;
    delete store.drafts[contextKey];
    if (store.last === contextKey) delete store.last;
    writeStore(userId, store);
}

/** Removes every account's drafts from this device. Called on logout. */
export function clearAllSubjectGradeDrafts() {
    try {
        sessionStorage.removeItem(LEGACY_DRAFT_KEY);
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(`${DRAFT_PREFIX}:`)) keys.push(key);
        }
        keys.forEach(key => localStorage.removeItem(key));
    } catch {
        // Storage unavailable (private mode); nothing was persisted either.
    }
}
