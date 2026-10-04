import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { usePushClickNavigation } from '../../src/hooks/usePushClickNavigation';

function RunningApp() {
    usePushClickNavigation();
    return <div data-testid="location">{useLocation().pathname}</div>;
}

describe('push click in a running PWA', () => {
    it('opens reminders and rejects destinations on another origin', () => {
        const worker = new EventTarget();
        const previous = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
        Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: worker });
        const view = render(<MemoryRouter initialEntries={['/']}><RunningApp /></MemoryRouter>);
        try {
            for (const url of ['/jadwal', '/tugas']) {
                act(() => worker.dispatchEvent(new MessageEvent('message', { data: { type: 'PUSH_CLICK', payload: { url } } })));
                expect(screen.getByTestId('location')).toHaveTextContent(url);
            }
            act(() => worker.dispatchEvent(new MessageEvent('message', { data: { type: 'PUSH_CLICK', payload: { url: 'https://other.example/jadwal' } } })));
            expect(screen.getByTestId('location')).toHaveTextContent('/tugas');
            view.unmount();
            act(() => worker.dispatchEvent(new MessageEvent('message', { data: { type: 'PUSH_CLICK', payload: { url: '/jadwal' } } })));
        } finally {
            view.unmount();
            if (previous) Object.defineProperty(navigator, 'serviceWorker', previous);
            else Reflect.deleteProperty(navigator, 'serviceWorker');
        }
    });
});
