import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    MassInputStore,
    InMemoryDraftAdapter,
    UserSettingsPort,
} from '../../src/components/pages/mass-input/engine/MassInputStore';

describe('MassInputStore (Headless Domain Engine)', () => {
    let store: MassInputStore;
    let draftStorage: InMemoryDraftAdapter;
    let settingsPort: UserSettingsPort;
    let updateKkmMock: (kkm: number) => Promise<void>;

    beforeEach(() => {
        vi.useFakeTimers();
        draftStorage = new InMemoryDraftAdapter();
        updateKkmMock = vi.fn().mockResolvedValue(undefined);
        settingsPort = {
            updateKkm: updateKkmMock,
        };

        store = new MassInputStore({
            initialKkm: 75,
            storagePort: draftStorage,
            settingsPort,
            undoWindowMs: 8000,
            kkmDebounceMs: 1000,
        });
    });

    it('initializes with Step 1 and default values', () => {
        const state = store.getState();
        expect(state.step).toBe(1);
        expect(state.mode).toBeNull();
        expect(state.kkm).toBe(75);
        expect(state.isScoresDirty).toBe(false);
    });

    it('advances to Step 2 when a mode is selected', () => {
        store.selectMode('subject_grade');
        const state = store.getState();
        expect(state.step).toBe(2);
        expect(state.mode).toBe('subject_grade');
    });

    it('validates scores strictly against 0-100 range', () => {
        // Valid scores
        expect(MassInputStore.validateScore('85').isValid).toBe(true);
        expect(MassInputStore.validateScore('0').isValid).toBe(true);
        expect(MassInputStore.validateScore('100').isValid).toBe(true);
        expect(MassInputStore.validateScore('').isValid).toBe(true);

        // Invalid scores
        expect(MassInputStore.validateScore('-5').isValid).toBe(false);
        expect(MassInputStore.validateScore('105').isValid).toBe(false);
        expect(MassInputStore.validateScore('abc').isValid).toBe(false);

        // Applying via store
        expect(store.setStudentScore('s1', '90')).toBe(true);
        expect(store.getState().scores['s1']).toBe('90');
        expect(store.getState().isScoresDirty).toBe(true);

        expect(store.setStudentScore('s1', '150')).toBe(false);
        expect(store.getState().scores['s1']).toBe('90'); // unchanged
    });

    it('handles batch fill across multiple students', () => {
        store.fillAllScores(['s1', 's2', 's3'], 85);
        const state = store.getState();
        expect(state.scores['s1']).toBe('85');
        expect(state.scores['s2']).toBe('85');
        expect(state.scores['s3']).toBe('85');
        expect(state.isScoresDirty).toBe(true);
    });

    it('supports destructive clear and restores via undo within 8 seconds', () => {
        store.fillAllScores(['s1', 's2'], 80);
        expect(Object.keys(store.getState().scores).length).toBe(2);

        // Request clear
        store.requestClear();
        expect(store.getState().pendingClearAction?.kind).toBe('scores');
        expect(store.getState().pendingClearAction?.count).toBe(2);

        // Confirm clear -> scores emptied, snapshot retained
        store.confirmPendingAction();
        expect(Object.keys(store.getState().scores).length).toBe(0);
        expect(store.getState().undoSnapshot).not.toBeNull();

        // Restore before timeout
        const restored = store.restoreUndo();
        expect(restored).toBe(true);
        expect(store.getState().scores['s1']).toBe('80');
        expect(store.getState().scores['s2']).toBe('80');
        expect(store.getState().undoSnapshot).toBeNull();
    });

    it('expires undo snapshot after 8 seconds', () => {
        store.fillAllScores(['s1'], 95);
        store.requestClear();
        store.confirmPendingAction();

        expect(store.getState().undoSnapshot).not.toBeNull();

        // Advance timers by 8000ms
        vi.advanceTimersByTime(8000);
        expect(store.getState().undoSnapshot).toBeNull();

        // Attempting to restore returns false
        expect(store.restoreUndo()).toBe(false);
    });

    it('debounces KKM updates to user settings by 1000ms', () => {
        store.setKkm(80);
        expect(updateKkmMock).not.toHaveBeenCalled();

        // Fast typing
        store.setKkm(82);
        store.setKkm(85);

        vi.advanceTimersByTime(500);
        expect(updateKkmMock).not.toHaveBeenCalled();

        vi.advanceTimersByTime(500);
        expect(updateKkmMock).toHaveBeenCalledTimes(1);
        expect(updateKkmMock).toHaveBeenCalledWith(85);
    });

    it('handles attitude predicate tracking and batch fill', () => {
        store.setAttitudePredicate('s1', 'spiritual', 'A');
        expect(store.getState().attitudePredicates['s1'].spiritual).toBe('A');

        store.quickFillAttitude(['s1', 's2'], 'B', 'both');
        expect(store.getState().attitudePredicates['s1']).toEqual({ spiritual: 'B', social: 'B' });
        expect(store.getState().attitudePredicates['s2']).toEqual({ spiritual: 'B', social: 'B' });
    });
});
