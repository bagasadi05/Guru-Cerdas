import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NetworkConnectivityService } from '../../src/services/networkConnectivity';

describe('NetworkConnectivityService (Lie-Fi Prevention)', () => {
    let service: NetworkConnectivityService;

    beforeEach(() => {
        vi.useFakeTimers();
        // Default navigator.onLine mock to true
        Object.defineProperty(navigator, 'onLine', {
            configurable: true,
            value: true,
        });
    });

    afterEach(() => {
        service?.destroy();
        vi.clearAllTimers();
        vi.restoreAllMocks();
    });

    it('initializes with current navigator.onLine status', () => {
        service = new NetworkConnectivityService({ debounceMs: 100 });
        expect(service.isOnline()).toBe(true);
    });

    it('immediately sets online to false upon offline event', () => {
        service = new NetworkConnectivityService({ debounceMs: 1500 });
        const listener = vi.fn();
        service.subscribe(listener);

        // Clear initial call from subscribe
        listener.mockClear();

        // Simulate browser offline event
        window.dispatchEvent(new Event('offline'));

        expect(service.isOnline()).toBe(false);
        expect(listener).toHaveBeenCalledWith(false);
        expect(service.getConnectionType()).toBe('none');
    });

    it('debounces online event and confirms connection with successful probe', async () => {
        // Start offline
        Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
        service = new NetworkConnectivityService({ debounceMs: 1500, pingTimeoutMs: 1000 });
        expect(service.isOnline()).toBe(false);

        const listener = vi.fn();
        service.subscribe(listener);
        listener.mockClear();

        // Mock global fetch to succeed
        const mockFetch = vi.fn().mockResolvedValue({
            status: 200,
            ok: true,
        });
        global.fetch = mockFetch;

        // Browser triggers online
        Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
        window.dispatchEvent(new Event('online'));

        // During debounce (e.g. 500ms), status should still be false
        vi.advanceTimersByTime(500);
        expect(service.isOnline()).toBe(false);

        // Complete 1500ms debounce
        vi.advanceTimersByTime(1000);

        // Allow async probe to resolve
        await vi.runAllTimersAsync();

        expect(mockFetch).toHaveBeenCalled();
        expect(service.isOnline()).toBe(true);
        expect(listener).toHaveBeenCalledWith(true);
    });

    it('detects Lie-Fi when online event fires but fetch fails', async () => {
        // Start offline
        Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
        service = new NetworkConnectivityService({ debounceMs: 1500, pingTimeoutMs: 1000 });
        expect(service.isOnline()).toBe(false);

        const listener = vi.fn();
        service.subscribe(listener);
        listener.mockClear();

        // Mock fetch failing (e.g. captive portal or dead gateway error)
        global.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

        // Browser triggers online
        Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
        window.dispatchEvent(new Event('online'));

        // Complete debounce
        vi.advanceTimersByTime(1500);
        await vi.runAllTimersAsync();

        // Lie-Fi detected: should NOT transition to online
        expect(service.isOnline()).toBe(false);
        expect(listener).not.toHaveBeenCalledWith(true);
    });

    it('allows unsubscribing from connectivity events', () => {
        service = new NetworkConnectivityService({ debounceMs: 100 });
        const listener = vi.fn();
        const unsubscribe = service.subscribe(listener);

        listener.mockClear();
        unsubscribe();

        window.dispatchEvent(new Event('offline'));
        expect(listener).not.toHaveBeenCalled();
    });

    it('forcePing checks connectivity on demand', async () => {
        service = new NetworkConnectivityService({ debounceMs: 1500 });
        const mockFetch = vi.fn().mockResolvedValue({ status: 200 });
        global.fetch = mockFetch;

        const result = await service.checkConnectivity(true);
        expect(result).toBe(true);
        expect(mockFetch).toHaveBeenCalled();
    });
});
