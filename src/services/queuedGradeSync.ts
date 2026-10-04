/**
 * Sends subject-grade saves that were made without a connection.
 *
 * An offline Simpan stores a snapshot of the scores on the draft
 * (`draft.queued`, see subjectGradeDraftStorage). This module sends those
 * snapshots through the normal save path, so changes made elsewhere in the
 * meantime are detected exactly like an online save. A conflict or a refused
 * save is never retried silently: the draft is flagged for the teacher to
 * review in Input Massal.
 */
import type { AppUser } from '../hooks/useAuth';
import {
    executeSubjectGradeMutation,
    GradeConflictError,
} from '../components/pages/mass-input/hooks/mutations/useSubjectGradeMutation';
import {
    listSubjectGradeDrafts,
    updateSubjectGradeDraft,
} from '../utils/subjectGradeDraftStorage';

export const QUEUED_GRADES_EVENT = 'guru-cerdas:queued-grades';

export interface QueuedGradesEventDetail {
    contextKey: string;
    status: 'saved' | 'needs_review';
    /** Scores now stored on the server (status 'saved'). */
    savedScores?: Record<string, string>;
}

export interface QueuedGradeSyncResult {
    saved: string[];
    needsReview: string[];
    /** True when sending stopped because the connection dropped again. */
    interrupted: boolean;
}

const filledOnly = (scores: Record<string, string>) =>
    Object.fromEntries(Object.entries(scores).filter(([, value]) => value && value.trim() !== ''));

const sameScores = (a: Record<string, string>, b: Record<string, string>) => {
    const left = filledOnly(a);
    const right = filledOnly(b);
    const keys = Object.keys(left);
    return keys.length === Object.keys(right).length && keys.every(key => left[key] === right[key]);
};

/** Fetch failures look different per browser; treat all of them as "offline". */
export const isNetworkError = (error: unknown): boolean => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
    const message = error && typeof error === 'object' && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error ?? '');
    return /failed to fetch|networkerror|network request failed|load failed|fetch failed|err_internet_disconnected/i.test(message);
};

const notify = (detail: QueuedGradesEventDetail) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<QueuedGradesEventDetail>(QUEUED_GRADES_EVENT, { detail }));
};

let running: Promise<QueuedGradeSyncResult> | null = null;

async function sendQueued(user: AppUser): Promise<QueuedGradeSyncResult> {
    const result: QueuedGradeSyncResult = { saved: [], needsReview: [], interrupted: false };
    const pending = listSubjectGradeDrafts(user.id).filter(([, draft]) => draft.queued && !draft.needsReview);

    for (const [contextKey, draft] of pending) {
        const queued = draft.queued!;
        const scores = filledOnly(queued.scores);
        try {
            await executeSubjectGradeMutation({
                user,
                subjectGradeInfo: draft.subjectGradeInfo,
                scores,
                validationErrors: {},
                gradedCount: Object.keys(scores).length,
                existingGrades: undefined,
                baselineScores: draft.baseline ?? null,
            });
        } catch (error) {
            if (isNetworkError(error)) {
                result.interrupted = true;
                break;
            }
            const reason = error instanceof GradeConflictError ? 'conflict' : 'error';
            updateSubjectGradeDraft(user.id, contextKey, current => ({
                ...current,
                queued: undefined,
                needsReview: { reason, message: error instanceof Error ? error.message : undefined },
            }));
            result.needsReview.push(queued.label);
            notify({ contextKey, status: 'needs_review' });
            continue;
        }

        // Saved. The sent values become the new baseline; the draft only stays
        // if the teacher kept editing after pressing Simpan.
        updateSubjectGradeDraft(user.id, contextKey, current => {
            if (sameScores(current.scores, queued.scores)) return null;
            return {
                ...current,
                queued: undefined,
                baseline: { ...(current.baseline || {}), ...scores },
            };
        });
        result.saved.push(queued.label);
        notify({ contextKey, status: 'saved', savedScores: scores });
    }

    return result;
}

/** Sends every queued grade save of this account. Concurrent calls share one run. */
export function syncQueuedGrades(user: AppUser): Promise<QueuedGradeSyncResult> {
    if (!running) {
        running = sendQueued(user).finally(() => { running = null; });
    }
    return running;
}

export function hasQueuedGrades(userId: string | null | undefined): boolean {
    return listSubjectGradeDrafts(userId).some(([, draft]) => Boolean(draft.queued && !draft.needsReview));
}
