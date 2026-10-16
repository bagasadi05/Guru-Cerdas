import { useState } from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAttendanceContextGuard, type AttendanceContext } from '../useAttendanceContextGuard';
import type { AttendanceSaveResult } from '../useAttendanceActions';

const initial: AttendanceContext = { classId: 'class-1', date: '2026-10-05', semesterId: 'sem-1' };
const targets: AttendanceContext[] = [
    { ...initial, classId: 'class-2' },
    { ...initial, date: '2026-10-06' },
    { ...initial, semesterId: 'sem-2', date: '2027-01-01' },
];
function setup(dirty = true, save = vi.fn<() => Promise<AttendanceSaveResult | null>>().mockResolvedValue('saved')) {
    const commit = vi.fn();
    const hook = renderHook(({ ownerId, busy }) => {
        const [context, setContext] = useState(initial);
        const guard = useAttendanceContextGuard({ ownerId, context, isDirty: dirty, isBusy: busy, save,
            commit: next => { commit(next); setContext(next); } });
        return { ...guard, context };
    }, { initialProps: { ownerId: 'teacher-1', busy: false } });
    return { ...hook, commit, save };
}

describe('attendance context guard', () => {
    it('keeps the first switch target when requests arrive before a render', () => {
        const { result } = setup();
        act(() => { result.current.requestContext(targets[0]); result.current.requestContext(targets[1]); });
        expect(result.current.pendingContext).toEqual(targets[0]);
    });
    it.each(targets)('holds old context and supports keep/discard for %j', target => {
        const { result, commit, save } = setup();
        act(() => { result.current.requestContext(target); });
        expect(result.current.context).toEqual(initial);
        expect(result.current.pendingContext).toEqual(target);
        act(() => { result.current.keepEditing(); });
        expect(result.current.pendingContext).toBeNull();
        expect(commit).not.toHaveBeenCalled();
        act(() => { result.current.requestContext(target); });
        act(() => { result.current.discardAndContinue(); });
        expect(result.current.context).toEqual(target);
        expect(save).not.toHaveBeenCalled();
    });

    it.each(['saved', 'queued', 'failed', null] as const)('only switches after successful save result %s', async outcome => {
        let finish!: (result: AttendanceSaveResult | null) => void;
        const save = vi.fn(() => new Promise<AttendanceSaveResult | null>(resolve => { finish = resolve; }));
        const { result, commit } = setup(true, save);
        act(() => { result.current.requestContext(targets[0]); });
        let pending!: Promise<void>;
        act(() => { pending = result.current.saveAndContinue(); });
        expect(result.current.isResolvingContext).toBe(true);
        expect(result.current.context).toEqual(initial);
        act(() => { void result.current.saveAndContinue(); result.current.discardAndContinue(); result.current.requestContext(targets[1]); });
        expect(save).toHaveBeenCalledTimes(1);
        await act(async () => { finish(outcome); await pending; });
        expect(commit).toHaveBeenCalledTimes(outcome === 'saved' || outcome === 'queued' ? 1 : 0);
        expect(result.current.context).toEqual(outcome === 'saved' || outcome === 'queued' ? targets[0] : initial);
        expect(result.current.isResolvingContext).toBe(false);
        expect(result.current.pendingContext).toBeNull();
    });

    it('commits immediately when clean and blocks switches while busy', () => {
        const { result, rerender } = setup(false);
        act(() => { result.current.requestContext(targets[0]); });
        expect(result.current.context).toEqual(targets[0]);
        rerender({ ownerId: 'teacher-1', busy: true });
        act(() => { result.current.requestContext(targets[1]); });
        expect(result.current.context).toEqual(targets[0]);
    });

    it('releases the guard if save rejects', async () => {
        const { result, commit } = setup(true, vi.fn().mockRejectedValue(new Error('failed')));
        act(() => { result.current.requestContext(targets[0]); });
        await act(async () => { await result.current.saveAndContinue(); });
        expect(commit).not.toHaveBeenCalled();
        expect(result.current.isResolvingContext).toBe(false);
        act(() => { result.current.requestContext(targets[1]); });
        expect(result.current.pendingContext).toEqual(targets[1]);
    });

    it('ignores a completed save after the signed-in teacher changes', async () => {
        let finish!: (result: AttendanceSaveResult | null) => void;
        const { result, rerender, commit } = setup(true, vi.fn(() => new Promise(resolve => { finish = resolve; })));
        act(() => { result.current.requestContext(targets[0]); });
        let pending!: Promise<void>;
        act(() => { pending = result.current.saveAndContinue(); });
        rerender({ ownerId: 'teacher-2', busy: false });
        await act(async () => { finish('saved'); await pending; });
        expect(commit).not.toHaveBeenCalled();
    });
});
