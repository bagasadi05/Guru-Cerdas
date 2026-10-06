import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/** Accept internal notification destinations and reject other origins. */
export function notificationDestination(value: unknown, origin: string): string | null {
    if (typeof value !== 'string') return null;
    try {
        const url = new URL(value, origin);
        if (url.origin !== origin || !['/jadwal', '/tugas', '/pengaturan'].includes(url.pathname)) return null;
        return url.pathname + url.search + url.hash;
    } catch { return null; }
}

/** Navigate a running PWA when its service worker focuses an existing window. */
export function usePushClickNavigation(): void {
    const navigate = useNavigate();
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;
        const handle = (event: MessageEvent) => {
            if (event.data?.type !== 'PUSH_CLICK') return;
            const destination = notificationDestination(event.data.payload?.url, window.location.origin);
            if (destination) navigate(destination);
        };
        navigator.serviceWorker.addEventListener('message', handle);
        return () => navigator.serviceWorker.removeEventListener('message', handle);
    }, [navigate]);
}
