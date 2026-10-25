import { logger } from './logger';

export type ConnectionType = 'wifi' | 'cellular' | 'ethernet' | 'none' | 'unknown';

export interface NetworkConnectivityConfig {
    /** Ping endpoint to probe real WAN connectivity (default: '/favicon.png') */
    pingEndpoint?: string;
    /** Timeout in ms for the probe request before considering it timed out (default: 3500ms) */
    pingTimeoutMs?: number;
    /** Debounce delay in ms after an 'online' event before verifying connectivity (default: 1500ms) */
    debounceMs?: number;
}

interface NavigatorWithConnection extends Navigator {
    connection?: {
        type?: string;
        effectiveType?: string;
    };
}

/**
 * Service that detects real internet connectivity and protects against "Lie-Fi"
 * (where the device is connected to a local router or captive portal with no WAN route).
 */
export class NetworkConnectivityService {
    private _isOnline: boolean;
    private listeners = new Set<(isOnline: boolean) => void>();
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;
    private probeAbortController: AbortController | null = null;
    private config: Required<NetworkConnectivityConfig>;

    // Bound listeners for clean event unbinding
    private readonly handleWindowOnline = () => this.onWindowOnline();
    private readonly handleWindowOffline = () => this.onWindowOffline();

    constructor(config?: NetworkConnectivityConfig) {
        this.config = {
            pingEndpoint: config?.pingEndpoint ?? '/favicon.png',
            pingTimeoutMs: config?.pingTimeoutMs ?? 3500,
            debounceMs: config?.debounceMs ?? 1500,
        };

        const initialNavigatorOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        this._isOnline = initialNavigatorOnline;

        this.initEventListeners();
    }

    private initEventListeners(): void {
        if (typeof window === 'undefined') return;

        window.addEventListener('online', this.handleWindowOnline);
        window.addEventListener('offline', this.handleWindowOffline);

        // If initially online, verify in the background without blocking initial render
        if (this._isOnline && typeof fetch !== 'undefined') {
            this.scheduleVerification(this.config.debounceMs);
        }
    }

    /**
     * Handler when browser reports 'offline'.
     * Immediately transitions to offline to prevent stalled requests.
     */
    private onWindowOffline(): void {
        this.clearDebounce();
        this.abortProbe();
        this.setOnline(false);
        logger.warn('Browser triggered offline event', 'NetworkConnectivity');
    }

    /**
     * Handler when browser reports 'online'.
     * Debounces and verifies with a lightweight probe to guard against Lie-Fi.
     */
    private onWindowOnline(): void {
        logger.info('Browser triggered online event, scheduling WAN verification', 'NetworkConnectivity', {
            debounceMs: this.config.debounceMs,
        });
        this.scheduleVerification(this.config.debounceMs);
    }

    private scheduleVerification(delayMs: number): void {
        this.clearDebounce();
        this.debounceTimer = setTimeout(() => {
            void this.checkConnectivity(true);
        }, delayMs);
    }

    private clearDebounce(): void {
        if (this.debounceTimer !== null) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
    }

    private abortProbe(): void {
        if (this.probeAbortController) {
            this.probeAbortController.abort();
            this.probeAbortController = null;
        }
    }

    private setOnline(nextState: boolean): void {
        if (this._isOnline === nextState) return;

        this._isOnline = nextState;
        this.notifyListeners();
    }

    private notifyListeners(): void {
        for (const listener of this.listeners) {
            try {
                listener(this._isOnline);
            } catch (err) {
                logger.error('Error in network connectivity listener', 'NetworkConnectivity', { err });
            }
        }
    }

    /**
     * Probe the ping endpoint to verify true WAN connectivity.
     */
    private async probeWan(): Promise<boolean> {
        if (typeof fetch === 'undefined') {
            return typeof navigator !== 'undefined' ? navigator.onLine : true;
        }

        this.abortProbe();
        const controller = new AbortController();
        this.probeAbortController = controller;

        const timeout = setTimeout(() => {
            controller.abort();
        }, this.config.pingTimeoutMs);

        try {
            const cacheBuster = `_ts=${Date.now()}`;
            const separator = this.config.pingEndpoint.includes('?') ? '&' : '?';
            const url = `${this.config.pingEndpoint}${separator}${cacheBuster}`;

            // Try HEAD first for lightweight traffic; fall back to GET if server rejects HEAD
            let response: Response;
            try {
                response = await fetch(url, {
                    method: 'HEAD',
                    cache: 'no-store',
                    signal: controller.signal,
                });
            } catch (headErr: unknown) {
                if (headErr instanceof Error && headErr.name === 'AbortError') throw headErr;
                // If HEAD method was not allowed or failed, attempt GET
                response = await fetch(url, {
                    method: 'GET',
                    cache: 'no-store',
                    signal: controller.signal,
                });
            }

            clearTimeout(timeout);
            // Any response from origin or valid status indicates actual connectivity
            return response.status >= 200 && response.status < 400;
        } catch {
            clearTimeout(timeout);
            return false;
        } finally {
            if (this.probeAbortController === controller) {
                this.probeAbortController = null;
            }
        }
    }

    /**
     * Synchronously returns the currently known connectivity state.
     */
    public isOnline(): boolean {
        return this._isOnline;
    }

    /**
     * Inspects or actively verifies connectivity.
     * @param forcePing If true, actively probes the ping endpoint even if navigator.onLine is true.
     */
    public async checkConnectivity(forcePing = false): Promise<boolean> {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            this.setOnline(false);
            return false;
        }

        if (forcePing) {
            const hasWan = await this.probeWan();
            this.setOnline(hasWan);
            if (!hasWan) {
                logger.warn('Lie-Fi detected: connected to router without WAN internet', 'NetworkConnectivity');
            }
            return hasWan;
        }

        return this._isOnline;
    }

    /**
     * Returns the detected connection type.
     */
    public getConnectionType(): ConnectionType {
        if (!this._isOnline) return 'none';

        if (typeof navigator !== 'undefined' && 'connection' in navigator) {
            const conn = (navigator as NavigatorWithConnection).connection;
            if (conn?.type) {
                if (conn.type === 'cellular') return 'cellular';
                if (conn.type === 'ethernet') return 'ethernet';
                if (conn.type === 'wifi') return 'wifi';
                if (conn.type === 'none') return 'none';
            }
        }

        return 'wifi';
    }

    /**
     * Subscribe to connectivity status changes.
     * Fires immediately with the current state upon subscription.
     */
    public subscribe(listener: (isOnline: boolean) => void): () => void {
        this.listeners.add(listener);
        try {
            listener(this._isOnline);
        } catch (err) {
            logger.error('Error during initial network connectivity notification', 'NetworkConnectivity', { err });
        }

        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Teardown event listeners and timers (useful for unit tests and clean unmounts).
     */
    public destroy(): void {
        this.clearDebounce();
        this.abortProbe();
        this.listeners.clear();

        if (typeof window !== 'undefined') {
            window.removeEventListener('online', this.handleWindowOnline);
            window.removeEventListener('offline', this.handleWindowOffline);
        }
    }
}

export const networkConnectivity = new NetworkConnectivityService();
