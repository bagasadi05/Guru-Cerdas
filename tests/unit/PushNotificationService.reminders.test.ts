import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PushNotificationService } from '../../src/services/PushNotificationService';

const f = vi.hoisted(() => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'test-public-key');
    return {
    state: vi.fn(), existing: vi.fn(), matches: vi.fn(), subscribe: vi.fn(), unsubscribe: vi.fn(),
    update: vi.fn(), eq: vi.fn(), upsert: vi.fn(), operations: [] as string[],
    };
});
afterAll(() => vi.unstubAllEnvs());
vi.mock('../../src/services/supabase', () => ({ supabase: { from: vi.fn(() => ({ update: f.update, upsert: f.upsert })) } }));
vi.mock('../../src/utils/pushSubscription', () => ({
    getPushSubscriptionState: f.state, getExistingSubscription: f.existing,
    subscriptionMatchesKey: f.matches, subscribeToPush: f.subscribe, unsubscribeFromPush: f.unsubscribe,
    serializeSubscription: (subscription: { endpoint: string }) => ({ endpoint: subscription.endpoint, keys: { p256dh: 'key', auth: 'auth' } }),
}));
const local = { supported: true, permission: 'granted' as const, subscribed: false, subscription: null, iOSPWA: false };

beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    f.operations.length = 0;
    f.state.mockReset().mockResolvedValue(local);
    f.existing.mockReset().mockResolvedValue(null);
    f.matches.mockReset().mockReturnValue(true);
    f.subscribe.mockReset().mockResolvedValue({ endpoint: 'https://push/new-device' });
    f.unsubscribe.mockReset().mockResolvedValue(true);
    f.upsert.mockReset().mockImplementation(async () => { f.operations.push('save'); return { error: null }; });
    const chain = { eq: f.eq, then: (resolve: (value: { error: null }) => unknown) => Promise.resolve({ error: null }).then(resolve) };
    f.eq.mockReset().mockReturnValue(chain);
    f.update.mockReset().mockImplementation(() => { f.operations.push('deactivate'); return chain; });
});

describe('teacher push device lifecycle', () => {
    it('disables only the current endpoint rather than all devices on the account', async () => {
        f.state.mockResolvedValueOnce({ ...local, subscribed: true, subscription: { endpoint: 'https://push/this-device' } });
        await new PushNotificationService().disable('teacher');
        expect(f.update).toHaveBeenCalledWith({ is_active: false });
        expect(f.eq.mock.calls).toEqual([['user_id', 'teacher'], ['endpoint', 'https://push/this-device']]);
        expect(f.unsubscribe).toHaveBeenCalledOnce();
    });
    it('does not deactivate another device when this browser has no subscription', async () => {
        await new PushNotificationService().disable('teacher');
        expect(f.update).not.toHaveBeenCalled();
    });
    it('recreates a missing subscription for a previously opted-in browser', async () => {
        const service = new PushNotificationService();
        service.setOptedInLocally(true);
        const enable = vi.spyOn(service, 'enable').mockResolvedValue({ ...local, enabled: true, serverRegistered: true });
        await service.sync('teacher');
        expect(enable).toHaveBeenCalledWith('teacher');
    });
    it.each(['default', 'denied'])('does not request subscription automatically with %s permission', async permission => {
        f.state.mockResolvedValue({ ...local, permission });
        const service = new PushNotificationService();
        service.setOptedInLocally(true);
        const enable = vi.spyOn(service, 'enable');
        await service.sync('teacher');
        expect(enable).not.toHaveBeenCalled();
    });
    it('respects an opted-out browser', async () => {
        const service = new PushNotificationService();
        const enable = vi.spyOn(service, 'enable');
        await service.sync('teacher');
        expect(enable).not.toHaveBeenCalled();
    });
    it('persists a replacement before deactivating a stale subscription', async () => {
        const old = { endpoint: 'https://push/old-device' };
        f.state.mockResolvedValue({ ...local, subscribed: true, subscription: old });
        f.existing.mockResolvedValue(old);
        f.matches.mockReturnValue(false);
        await new PushNotificationService().sync('teacher');
        expect(f.operations).toEqual(['save', 'deactivate']);
    });
    it('preserves the old registration when replacement persistence fails', async () => {
        const old = { endpoint: 'https://push/old-device' };
        f.state.mockResolvedValue({ ...local, subscribed: true, subscription: old });
        f.existing.mockResolvedValue(old);
        f.matches.mockReturnValue(false);
        f.upsert.mockResolvedValue({ error: { message: 'offline' } });
        await new PushNotificationService().sync('teacher');
        expect(f.update).not.toHaveBeenCalled();
    });
});
