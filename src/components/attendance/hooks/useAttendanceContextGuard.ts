import { useEffect, useRef, useState } from 'react';
import type { AttendanceSaveResult } from './useAttendanceActions';

export interface AttendanceContext {
    classId: string;
    date: string;
    semesterId: string | null;
}
interface GuardOptions {
    ownerId?: string;
    context: AttendanceContext;
    isDirty: boolean;
    isBusy: boolean;
    commit: (context: AttendanceContext) => void;
    save: () => Promise<AttendanceSaveResult | null>;
}

/** Holds the current attendance context until the teacher resolves unsaved work. */
export function useAttendanceContextGuard({ ownerId, context, isDirty, isBusy, commit, save }: GuardOptions) {
    const [pendingContext, setPendingContext] = useState<AttendanceContext | null>(null);
    const [isResolvingContext, setIsResolvingContext] = useState(false);
    const pendingTarget = useRef<AttendanceContext | null>(null);
    const resolving = useRef(false);
    const version = useRef(0);
    useEffect(() => {
        version.current++;
        pendingTarget.current = null;
        setPendingContext(null);
        setIsResolvingContext(false);
        resolving.current = false;
        return () => { version.current++; };
    }, [ownerId]);

    const requestContext = (target: AttendanceContext) => {
        if (isBusy || resolving.current || pendingTarget.current) return;
        if (target.classId === context.classId && target.date === context.date && target.semesterId === context.semesterId) return;
        if (isDirty) { pendingTarget.current = target; setPendingContext(target); }
        else commit(target);
    };
    const keepEditing = () => {
        if (!resolving.current) { pendingTarget.current = null; setPendingContext(null); }
    };
    const discardAndContinue = () => {
        if (!pendingTarget.current || isBusy || resolving.current) return;
        commit(pendingTarget.current);
        pendingTarget.current = null;
        setPendingContext(null);
    };
    const saveAndContinue = async () => {
        if (!pendingTarget.current || isBusy || resolving.current) return;
        const target = pendingTarget.current;
        const started = version.current;
        resolving.current = true;
        setIsResolvingContext(true);
        try {
            const result = await save();
            if (started === version.current && (result === 'saved' || result === 'queued')) commit(target);
        } catch {
            // Keep the current context if a save cannot complete.
        } finally {
            if (started === version.current) {
                pendingTarget.current = null;
                setPendingContext(null);
                resolving.current = false;
                setIsResolvingContext(false);
            }
        }
    };
    return { pendingContext, isResolvingContext, requestContext, keepEditing, discardAndContinue, saveAndContinue };
}
