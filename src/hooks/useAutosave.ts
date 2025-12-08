import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAutosaveOptions<T> {
    key: string;
    data: T;
    interval?: number; // ms, default 30000
    enabled?: boolean;
    debounceMs?: number;
}

interface DraftData<T> {
    data: T;
    timestamp: number;
    version: number;
}

const DRAFT_VERSION = 1;

/**
 * Hook for autosaving form data to localStorage with restore capability
 * 
 * @example
 * const { hasDraft, restoreDraft, clearDraft, lastSaved } = useAutosave({
 *     key: 'my-form-draft',
 *     data: formData,
 *     interval: 30000,
 *     enabled: isDirty,
 * });
 */
export function useAutosave<T>({
    key,
    data,
    interval = 30000,
    enabled = true,
    debounceMs = 1000,
}: UseAutosaveOptions<T>) {
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [hasDraft, setHasDraft] = useState(false);
    const [draftTimestamp, setDraftTimestamp] = useState<Date | null>(null);
    const dataRef = useRef(data);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    const storageKey = `autosave_${key}`;

    // Update ref when data changes
    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    // Check for existing draft on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const draft: DraftData<T> = JSON.parse(saved);
                if (draft.version === DRAFT_VERSION) {
                    setHasDraft(true);
                    setDraftTimestamp(new Date(draft.timestamp));
                }
            }
        } catch {
            // Invalid draft, ignore
        }
    }, [storageKey]);

    // Save to localStorage
    const saveDraft = useCallback(() => {
        if (!enabled) return;

        try {
            const draft: DraftData<T> = {
                data: dataRef.current,
                timestamp: Date.now(),
                version: DRAFT_VERSION,
            };
            localStorage.setItem(storageKey, JSON.stringify(draft));
            setLastSaved(new Date());
            setHasDraft(true);
            setDraftTimestamp(new Date());
        } catch (error) {
            console.warn('Autosave failed:', error);
        }
    }, [enabled, storageKey]);

    // Debounced save on data change
    useEffect(() => {
        if (!enabled) return;

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(() => {
            saveDraft();
        }, debounceMs);

        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [data, enabled, debounceMs, saveDraft]);

    // Interval-based autosave
    useEffect(() => {
        if (!enabled || interval <= 0) return;

        const timer = setInterval(() => {
            saveDraft();
        }, interval);

        return () => clearInterval(timer);
    }, [enabled, interval, saveDraft]);

    // Restore draft data
    const restoreDraft = useCallback((): T | null => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const draft: DraftData<T> = JSON.parse(saved);
                if (draft.version === DRAFT_VERSION) {
                    return draft.data;
                }
            }
        } catch {
            // Invalid draft
        }
        return null;
    }, [storageKey]);

    // Clear draft
    const clearDraft = useCallback(() => {
        try {
            localStorage.removeItem(storageKey);
            setHasDraft(false);
            setDraftTimestamp(null);
            setLastSaved(null);
        } catch {
            // Ignore errors
        }
    }, [storageKey]);

    // Get time since last save
    const getTimeSinceLastSave = useCallback((): string => {
        if (!lastSaved) return '';

        const seconds = Math.floor((Date.now() - lastSaved.getTime()) / 1000);

        if (seconds < 5) return 'baru saja';
        if (seconds < 60) return `${seconds} detik lalu`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)} menit lalu`;
        return `${Math.floor(seconds / 3600)} jam lalu`;
    }, [lastSaved]);

    // Format draft timestamp
    const formatDraftTimestamp = useCallback((): string => {
        if (!draftTimestamp) return '';

        const now = new Date();
        const diff = now.getTime() - draftTimestamp.getTime();

        // Less than 24 hours ago
        if (diff < 24 * 60 * 60 * 1000) {
            return draftTimestamp.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
            });
        }

        // Otherwise show date
        return draftTimestamp.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    }, [draftTimestamp]);

    return {
        hasDraft,
        draftTimestamp,
        lastSaved,
        restoreDraft,
        clearDraft,
        saveDraft,
        getTimeSinceLastSave,
        formatDraftTimestamp,
    };
}

export default useAutosave;
