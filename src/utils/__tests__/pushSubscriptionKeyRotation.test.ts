import { describe, it, expect, vi, afterEach } from 'vitest';
import { subscribeToPush, subscriptionMatchesKey, urlBase64ToUint8Array } from '../pushSubscription';

const OLD_KEY = 'BPndPJHAxo0UkITb46BC1xWLieon76It5CvvSaPjnjeaQwES4A3edM4-F5ie3jCjeIFSQrN3R_MwYqpg36IJLfg';
const NEW_KEY = 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8';

function fakeSubscription(key: string | null, endpoint = 'https://fcm.googleapis.com/fcm/send/old') {
    return {
        endpoint,
        options: { applicationServerKey: key ? urlBase64ToUint8Array(key).buffer : null },
        unsubscribe: vi.fn().mockResolvedValue(true),
    } as unknown as PushSubscription & { unsubscribe: ReturnType<typeof vi.fn> };
}

function stubBrowser(existing: PushSubscription | null) {
    const created = fakeSubscription(NEW_KEY, 'https://fcm.googleapis.com/fcm/send/new');
    const pushManager = {
        getSubscription: vi.fn().mockResolvedValue(existing),
        subscribe: vi.fn().mockResolvedValue(created),
    };
    vi.stubGlobal('navigator', { serviceWorker: { ready: Promise.resolve({ pushManager }) } });
    vi.stubGlobal('PushManager', function PushManager() {});
    vi.stubGlobal('Notification', { requestPermission: vi.fn().mockResolvedValue('granted'), permission: 'granted' });
    return { pushManager, created };
}

describe('subscriptionMatchesKey', () => {
    it('matches only the key the subscription was created with', () => {
        expect(subscriptionMatchesKey(fakeSubscription(NEW_KEY), NEW_KEY)).toBe(true);
        expect(subscriptionMatchesKey(fakeSubscription(OLD_KEY), NEW_KEY)).toBe(false);
    });

    it('assumes a match when the browser does not expose the key', () => {
        expect(subscriptionMatchesKey(fakeSubscription(null), NEW_KEY)).toBe(true);
    });
});

describe('subscribeToPush after a VAPID key rotation', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('reuses a subscription that already uses the current key', async () => {
        const current = fakeSubscription(NEW_KEY);
        const { pushManager } = stubBrowser(current);

        await expect(subscribeToPush(NEW_KEY)).resolves.toBe(current);
        expect(pushManager.subscribe).not.toHaveBeenCalled();
    });

    it('replaces a subscription made with an old key', async () => {
        const stale = fakeSubscription(OLD_KEY);
        const { pushManager, created } = stubBrowser(stale);

        await expect(subscribeToPush(NEW_KEY)).resolves.toBe(created);
        expect(stale.unsubscribe).toHaveBeenCalledTimes(1);
        expect(pushManager.subscribe).toHaveBeenCalledTimes(1);
    });
});
