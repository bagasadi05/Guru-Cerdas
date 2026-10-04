import { describe, it, expect, vi } from 'vitest';
import {
    processTeacherReminders, jakartaTime, addCalendarDays,
    type ReminderRepository, type ReminderKey, type ReminderDelivery, type ReminderTask, type ReminderSubscription,
} from '../../supabase/functions/_shared/teacher-reminders';
import { handleDispatchRequest, parseDispatchBody } from '../../supabase/functions/_shared/dispatch-request';
import { reminderPages, reminderBatches } from '../../supabase/functions/_shared/reminder-query';
import { classifyError, type PushPayload, type SendResult } from '../../supabase/functions/_shared/web-push';

function fixture() {
    const saved = new Map<string, ReminderDelivery & { key: ReminderKey }>();
    const now = new Date('2026-10-04T23:50:00Z');
    const tasks: ReminderTask[] = [];
    const schedules = [{ id: 's1', user_id: 'u1', day: 'Senin', start_time: '07:00:00', end_time: '08:00:00', subject: 'Matematika', class_id: null, room: null }];
    const subs = ['device1', 'device2'].map(id => ({ id, user_id: 'u1', student_id: null, endpoint: `https://push/${id}`, p256dh: '', auth: '', is_active: true }));
    const keyString = (key: ReminderKey) => JSON.stringify(key);
    const repo: ReminderRepository = {
        tasks: vi.fn(async () => tasks), schedules: vi.fn(async () => schedules),
        subscriptions: vi.fn(async () => subs.filter(s => s.is_active)),
        preferences: vi.fn(async () => []), classNames: vi.fn(async () => new Map()),
        deliveries: vi.fn(async (kind, date) => [...saved.values()].filter(r => r.key.kind === kind && r.key.date === date)),
        claim: vi.fn(async key => {
            const id = keyString(key);
            const previous = saved.get(id);
            if (previous?.delivered_at || previous?.terminal || previous?.lease_until) return null;
            saved.set(id, { key, entity_id: key.entityId, subscription_id: key.subscriptionId, delivered_at: null, lease_until: 'reserved', terminal: false });
            return id;
        }),
        finish: vi.fn(async (key, _token, result) => {
            const value = saved.get(keyString(key))!;
            value.delivered_at = result.ok ? now.toISOString() : null;
            value.lease_until = null;
            value.terminal = result.reason === 'subscription_gone';
        }),
        deactivate: vi.fn(async id => { subs.find(s => s.id === id)!.is_active = false; }),
    };
    const send = vi.fn(async (_sub: ReminderSubscription, _payload: PushPayload): Promise<SendResult> => ({ ok: true }));
    const run = (time = now, dryRun = false) => processTeacherReminders(repo, send, { now: time, dryRun, schedules: true, tasks: true });
    return { repo, send, run, tasks, schedules, subs, saved };
}

describe('teacher reminder dispatch', () => {
    it('identifies expired VAPID keys without treating the device as deleted', () => {
        expect(classifyError(400, '{"reason":"VapidPkHashMismatch"}')).toBe('vapid_key_mismatch');
        expect(classifyError(403, 'credentials do not correspond to the credentials used to create the subscriptions')).toBe('vapid_key_mismatch');
        expect(classifyError(403)).toBe('forbidden');
        expect(classifyError(410)).toBe('subscription_gone');
    });
    it('skips queued sends when database reads consume the remaining window', async () => {
        const timer = vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValue(11 * 60000);
        try {
            const f = fixture();
            await f.run();
            expect(f.repo.claim).not.toHaveBeenCalled();
            expect(f.send).not.toHaveBeenCalled();
        } finally { timer.mockRestore(); }
    });
    it('releases a reservation without sending when the claim returns too late', async () => {
        const timer = vi.spyOn(performance, 'now').mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(11 * 60000);
        try {
            const f = fixture();
            await f.run();
            expect(f.send).not.toHaveBeenCalled();
            expect(f.repo.finish).toHaveBeenCalledWith(expect.anything(), expect.any(String), { ok: false, reason: 'window_expired' });
        } finally { timer.mockRestore(); }
    });
    it('uses Jakarta dates across midnight, Sundays, and year boundaries', () => {
        expect(jakartaTime(new Date('2026-10-04T17:00:00Z'))).toMatchObject({ date: '2026-10-05', day: 'Senin', hour: 0 });
        expect(jakartaTime(new Date('2026-10-03T23:00:00Z')).day).toBe('Minggu');
        expect(addCalendarDays('2026-12-31', 1)).toBe('2027-01-01');
    });

    it.each(['23:50:00', '23:55:00'])('includes the ten/five minute boundary at %s UTC', async time => {
        const f = fixture();
        const result = await f.run(new Date(`2026-10-04T${time}Z`));
        expect(result.schedules.notified).toBe(2);
        expect(f.send.mock.calls[0][1]).toMatchObject({ data: { url: '/jadwal' } });
    });

    it.each(['23:49:59', '23:55:01', '00:00:00'])('does not send a new reminder outside its window at %s', async time => {
        const f = fixture();
        const date = time === '00:00:00' ? '2026-10-05' : '2026-10-04';
        const result = await f.run(new Date(`${date}T${time}Z`));
        expect(result.schedules.notified).toBe(0);
    });

    it('deduplicates per device and permits the next weekly occurrence', async () => {
        const f = fixture();
        await f.run();
        await f.run();
        expect(f.send).toHaveBeenCalledTimes(2);
        await f.run(new Date('2026-10-11T23:50:00Z'));
        expect(f.send).toHaveBeenCalledTimes(4);
    });

    it('claims atomically when two dispatches overlap', async () => {
        const f = fixture();
        await Promise.all([f.run(), f.run()]);
        expect(f.send).toHaveBeenCalledTimes(2);
    });

    it('retries only the failed device before class starts', async () => {
        const f = fixture();
        f.send.mockResolvedValueOnce({ ok: true }).mockResolvedValueOnce({ ok: false });
        await f.run();
        await f.run(new Date('2026-10-04T23:56:00Z'));
        expect(f.send).toHaveBeenCalledTimes(3);
        expect(f.send.mock.calls[2][0].id).toBe('device2');
    });

    it('deactivates subscriptions reported gone', async () => {
        const f = fixture();
        f.send.mockResolvedValueOnce({ ok: false, reason: 'subscription_gone' });
        await f.run();
        expect(f.repo.deactivate).toHaveBeenCalledWith('device1');
    });

    it('makes dry runs read-only even when there are candidates', async () => {
        const f = fixture();
        const result = await f.run(undefined, true);
        expect(result.schedules.candidates).toBe(2);
        expect(f.send).not.toHaveBeenCalled();
        expect(f.repo.claim).not.toHaveBeenCalled();
        expect(f.repo.finish).not.toHaveBeenCalled();
        expect(f.repo.deactivate).not.toHaveBeenCalled();
    });

    it('sends a digest once per date and device within the morning retry window', async () => {
        const f = fixture();
        f.schedules.length = 0;
        f.tasks.push({ id: 't1', user_id: 'u1', due_date: '2026-10-05' }, { id: 't2', user_id: 'u1', due_date: '2026-10-06' }, { id: 't3', user_id: 'u1', due_date: '2026-10-04' });
        await f.run(new Date('2026-10-04T23:00:00Z'));
        await f.run(new Date('2026-10-04T23:55:00Z'));
        expect(f.send).toHaveBeenCalledTimes(2);
        expect(f.send.mock.calls[0][1]).toMatchObject({ body: '1 tugas hari ini • 1 tugas mendatang • 1 tugas terlambat', data: { url: '/tugas' } });
    });

    it.each([0, 1, 2, 3])('honors the %i day task horizon', async days => {
        const f = fixture();
        f.schedules.length = 0;
        f.tasks.splice(0, 1, ...[0, 1, 2, 3].map(n => ({ id: `t${n}`, user_id: 'u1', due_date: addCalendarDays('2026-10-05', n) })));
        vi.mocked(f.repo.preferences).mockResolvedValue([{ user_id: 'u1', task_reminders: true, task_reminder_days: days }]);
        const result = await f.run(new Date('2026-10-04T23:00:00Z'));
        expect(result.tasks.found).toBe(days + 1);
    });

    it('does not send disabled, empty, or out-of-window digests', async () => {
        const f = fixture();
        f.schedules.length = 0;
        f.tasks.push({ id: 't1', user_id: 'u1', due_date: '2026-10-05' });
        vi.mocked(f.repo.preferences).mockResolvedValue([{ user_id: 'u1', task_reminders: false, task_reminder_days: 1 }]);
        await f.run(new Date('2026-10-04T23:00:00Z'));
        vi.mocked(f.repo.preferences).mockResolvedValue([]);
        await f.run(new Date('2026-10-05T00:00:00Z'));
        f.tasks.length = 0;
        await f.run(new Date('2026-10-04T23:00:00Z'));
        expect(f.send).not.toHaveBeenCalled();
    });
});

describe('dispatcher boundary and pagination', () => {
    it('requires valid JSON, boolean dryRun, known modes, and a specific test device', () => {
        for (const value of [null, [], { mode: 'invalid' }, { mode: ['all'] }, { dryRun: 'true' }, { mode: 'test' }, { mode: 'instant' }]) {
            expect(() => parseDispatchBody(value)).toThrow();
        }
        expect(parseDispatchBody({ dryRun: true })).toEqual({ mode: 'all', dryRun: true });
    });
    it('authenticates dryRun, rejects malformed JSON, and surfaces database errors', async () => {
        const run = vi.fn(async () => ({ failedSends: 0 }));
        const request = (body: string) => new Request('https://example/dispatch', { method: 'POST', body });
        expect((await handleDispatchRequest(request('{}'), { authorize: async () => false, configured: true, run })).status).toBe(401);
        expect((await handleDispatchRequest(request('{'), { authorize: async () => true, configured: true, run })).status).toBe(400);
        expect(run).not.toHaveBeenCalled();
        run.mockRejectedValueOnce(new Error('database failed'));
        expect((await handleDispatchRequest(request('{"dryRun":true}'), { authorize: async () => true, configured: true, run })).status).toBe(500);
    });
    it('reads more than 500 rows, batches filters, and rejects failed pages', async () => {
        const rows = Array.from({ length: 1201 }, (_, id) => ({ id }));
        const result = await reminderPages((from, to) => Promise.resolve({ data: rows.slice(from, to + 1), error: null }));
        expect(result).toEqual(rows);
        const sizes: number[] = [];
        await reminderBatches(Array.from({ length: 501 }, (_, i) => String(i)), async ids => { sizes.push(ids.length); return ids; });
        expect(sizes).toEqual([200, 200, 101]);
        await expect(reminderPages(async () => ({ data: null, error: { message: 'query failed' } }))).rejects.toThrow('query failed');
    });
});
