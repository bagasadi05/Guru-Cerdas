import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SWUpdateBanner } from '../../src/components/StatusIndicators';

describe('SWUpdateBanner (Smart Auto-Reload)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        sessionStorage.clear();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('is hidden by default when no update event is dispatched', () => {
        render(<SWUpdateBanner />);
        expect(screen.queryByText('Pembaruan Terdeteksi!')).not.toBeInTheDocument();
    });

    it('renders countdown banner when sw-update-available event is dispatched', () => {
        render(<SWUpdateBanner />);

        act(() => {
            window.dispatchEvent(new CustomEvent('sw-update-available', {
                detail: { updateSW: vi.fn() }
            }));
        });

        expect(screen.getByText('Pembaruan Terdeteksi!')).toBeInTheDocument();
        expect(screen.getByText(/3 detik/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Muat Ulang Sekarang/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Tunda 1 Menit/i })).toBeInTheDocument();
    });

    it('automatically counts down and calls updateSW when countdown reaches 0', () => {
        const updateSWMock = vi.fn();
        render(<SWUpdateBanner />);

        act(() => {
            window.dispatchEvent(new CustomEvent('sw-update-available', {
                detail: { updateSW: updateSWMock }
            }));
        });

        expect(screen.getByText(/3 detik/i)).toBeInTheDocument();

        // Advance 1s -> 2 detik
        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(screen.getByText(/2 detik/i)).toBeInTheDocument();

        // Advance 1s -> 1 detik
        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(screen.getByText(/1 detik/i)).toBeInTheDocument();

        // Advance 1s -> triggers reboot!
        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(updateSWMock).toHaveBeenCalledWith(true);
        expect(sessionStorage.getItem('post-reload-path')).toBe(window.location.pathname + window.location.search);
    });

    it('immediately calls updateSW when clicking Muat Ulang Sekarang', () => {
        const updateSWMock = vi.fn();
        render(<SWUpdateBanner />);

        act(() => {
            window.dispatchEvent(new CustomEvent('sw-update-available', {
                detail: { updateSW: updateSWMock }
            }));
        });

        const reloadBtn = screen.getByRole('button', { name: /Muat Ulang Sekarang/i });
        fireEvent.click(reloadBtn);

        expect(updateSWMock).toHaveBeenCalledWith(true);
        expect(sessionStorage.getItem('post-reload-path')).toBe(window.location.pathname + window.location.search);
    });

    it('pauses auto-reload when user clicks Tunda 1 Menit', () => {
        const updateSWMock = vi.fn();
        render(<SWUpdateBanner />);

        act(() => {
            window.dispatchEvent(new CustomEvent('sw-update-available', {
                detail: { updateSW: updateSWMock }
            }));
        });

        const snoozeBtn = screen.getByRole('button', { name: /Tunda 1 Menit/i });
        fireEvent.click(snoozeBtn);

        expect(screen.getByText(/Pembaruan ditunda selama 1 menit/i)).toBeInTheDocument();

        // Advancing 5 seconds does NOT trigger reboot because it is paused
        act(() => {
            vi.advanceTimersByTime(5000);
        });
        expect(updateSWMock).not.toHaveBeenCalled();
    });
});
