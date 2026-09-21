import { useRef, useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import {
    MassInputStore,
    MassInputStoreState,
    DraftStoragePort,
    UserSettingsPort,
} from './MassInputStore';
import { useMassInputData } from '../hooks/useMassInputData';
import { useUserSettings } from '../../../../hooks/useUserSettings';
import { useWarnUnsavedChanges } from '../../../../hooks/useWarnUnsavedChanges';

export interface UseMassInputEngineOptions {
    storagePort?: DraftStoragePort;
    settingsPort?: UserSettingsPort;
}

export function useMassInputEngine(options?: UseMassInputEngineOptions) {
    const {
        settings: userSettings,
        isLoading: isLoadingUserSettings,
        updateSettings,
    } = useUserSettings();

    const [store] = useState(
        () =>
            new MassInputStore({
                initialKkm: userSettings?.kkm || 75,
                storagePort: options?.storagePort,
                settingsPort: options?.settingsPort || {
                    updateKkm: async (kkm: number) => {
                        await updateSettings({ kkm });
                    },
                },
            })
    );

    const subscribe = useCallback(
        (onStoreChange: () => void) => store.subscribe(onStoreChange),
        [store]
    );
    const getSnapshot = useCallback(() => store.getState(), [store]);

    const storeState = useSyncExternalStore<MassInputStoreState>(subscribe, getSnapshot);

    // Update KKM once user settings resolve
    const hasSeededKkm = useRef(false);
    useEffect(() => {
        if (hasSeededKkm.current || isLoadingUserSettings || !userSettings) return;
        hasSeededKkm.current = true;
        if (typeof userSettings.kkm === 'number' && userSettings.kkm !== storeState.kkm) {
            store.setKkm(userSettings.kkm);
        }
    }, [isLoadingUserSettings, userSettings, store, storeState.kkm]);

    // Data fetching
    const data = useMassInputData(
        storeState.selectedClass,
        storeState.subjectGradeInfo.subject,
        storeState.subjectGradeInfo.assessment_name,
        storeState.mode || undefined,
        storeState.subjectGradeInfo.semester || undefined
    );

    // Auto-select first class
    useEffect(() => {
        if (data.classes && data.classes.length > 0 && !storeState.selectedClass) {
            store.setClass(data.classes[0].id);
        }
    }, [data.classes, storeState.selectedClass, store]);

    // Warn on dirty scores unload
    useWarnUnsavedChanges(
        storeState.mode === 'subject_grade' && storeState.isScoresDirty,
        'Ada nilai yang belum disimpan. Yakin ingin keluar?'
    );

    // Sync scores from existing grades if not dirty
    useEffect(() => {
        if (storeState.mode === 'subject_grade' && data.existingGrades) {
            if (!storeState.isScoresDirty) {
                const initialScores: Record<string, string> = {};
                data.existingGrades.forEach((r) => {
                    initialScores[r.student_id] = String(r.score);
                });
                store.setBatchScores(initialScores);
            }
        }
    }, [data.existingGrades, storeState.mode, storeState.isScoresDirty, store]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            store.dispose();
        };
    }, [store]);

    return {
        store,
        state: storeState,
        data,
    };
}
