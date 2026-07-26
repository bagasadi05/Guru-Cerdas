import React from 'react';
import { fireEvent, render, screen, waitFor, renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { AccessibilityProvider, useAccessibility } from '../../src/components/ui/AccessibilityFeatures';
import { getDashboardMoreMenuItems, getDashboardNavSections } from '../../src/components/navigation/dashboardMenuConfig';
import { EASY_MODE_PATHS } from '../../src/components/navigation/menuRegistry';
import { useReducedMotion } from '../../src/hooks/useReducedMotion';

const ADMIN = { isAdmin: true, role: 'admin' };
const TEACHER = { isAdmin: false, role: null };

const EasyModeHarness: React.FC = () => {
    const { isEasyMode, toggleEasyMode } = useAccessibility();

    return (
        <button type="button" onClick={toggleEasyMode} aria-pressed={isEasyMode}>
            {isEasyMode ? 'Nonaktifkan Mode Mudah' : 'Aktifkan Mode Mudah'}
        </button>
    );
};

const setEasyModeAttribute = (on: boolean) =>
    document.documentElement.setAttribute('data-easy-mode', String(on));

describe('Mode Mudah', () => {
    beforeEach(() => {
        localStorage.clear();
        document.documentElement.className = '';
        document.documentElement.removeAttribute('data-easy-mode');
        document.documentElement.removeAttribute('data-font-size');
    });

    it('raises contrast on, restores it off, and never rewrites the saved font size', async () => {
        localStorage.setItem('fontSize', 'x-large');
        render(<AccessibilityProvider><EasyModeHarness /></AccessibilityProvider>);

        fireEvent.click(screen.getByRole('button', { name: 'Aktifkan Mode Mudah' }));

        await waitFor(() => {
            expect(document.documentElement).toHaveAttribute('data-easy-mode', 'true');
            expect(document.documentElement).toHaveClass('high-contrast');
            // Easy Mode sizes text through its own CSS rule; the user's choice
            // must survive untouched so it is still there when they switch back.
            expect(document.documentElement).toHaveAttribute('data-font-size', 'x-large');
        });

        fireEvent.click(screen.getByRole('button', { name: 'Nonaktifkan Mode Mudah' }));

        await waitFor(() => {
            expect(document.documentElement).toHaveAttribute('data-easy-mode', 'false');
            expect(document.documentElement).not.toHaveClass('high-contrast');
            expect(document.documentElement).toHaveAttribute('data-font-size', 'x-large');
        });
        expect(localStorage.getItem('fontSize')).toBe('x-large');
    });

    it('does not strip reduce-motion that Easy Mode applied', async () => {
        // AccessibilityProvider and useReducedMotion both write this class. The
        // provider used to remove it whenever its own toggle was off, undoing
        // Easy Mode — visible only once both were mounted, so unit tests on the
        // hook alone stayed green while the real page animated.
        render(<AccessibilityProvider><EasyModeHarness /></AccessibilityProvider>);

        fireEvent.click(screen.getByRole('button', { name: 'Aktifkan Mode Mudah' }));

        await waitFor(() => {
            expect(document.documentElement).toHaveClass('reduce-motion');
        });

        fireEvent.click(screen.getByRole('button', { name: 'Nonaktifkan Mode Mudah' }));

        await waitFor(() => {
            expect(document.documentElement).not.toHaveClass('reduce-motion');
        });
        // The user never touched the motion toggle, so nothing was persisted for it.
        expect(localStorage.getItem('reducedMotion')).toBe('false');
    });

    it('leaves an explicit high-contrast preference on after Easy Mode is switched off', async () => {
        // The old implementation guarded this branch with `else if
        // (!highContrastMode)`, so the two settings could clobber each other.
        localStorage.setItem('highContrastMode', 'true');
        render(<AccessibilityProvider><EasyModeHarness /></AccessibilityProvider>);

        fireEvent.click(screen.getByRole('button', { name: 'Aktifkan Mode Mudah' }));
        await waitFor(() => {
            expect(document.documentElement).toHaveClass('high-contrast');
        });

        fireEvent.click(screen.getByRole('button', { name: 'Nonaktifkan Mode Mudah' }));
        await waitFor(() => {
            expect(document.documentElement).toHaveAttribute('data-easy-mode', 'false');
        });
        // Still on, because the user asked for it independently of Easy Mode.
        expect(document.documentElement).toHaveClass('high-contrast');
    });

    // The menu trim is a display concern, applied by the sidebar and the mobile
    // sheet. The config itself must keep every destination, so the "show all"
    // escape hatch always has something to reveal.
    describe('keeps every navigation destination available', () => {
        it('never drops an item from the sidebar config', () => {
            const hrefs = getDashboardNavSections(ADMIN).flatMap((s) => s.items.map((i) => i.href));
            expect(hrefs).toContain('/pengaturan');
            expect(hrefs).toContain('/analytics');
            expect(hrefs.length).toBeGreaterThan(EASY_MODE_PATHS.size);
        });

        it('never drops an item from the mobile sheet config', () => {
            const hrefs = getDashboardMoreMenuItems(ADMIN).map((i) => i.href);
            expect(hrefs).toContain('/pengaturan');
            expect(hrefs).toContain('/admin');
        });
    });

    describe('simplifies navigation on mobile too, not only desktop', () => {
        it('trims the mobile sheet to fewer items than the full list', () => {
            const full = getDashboardMoreMenuItems(TEACHER);
            const trimmed = full.filter((item) => EASY_MODE_PATHS.has(item.href));
            expect(trimmed.length).toBeGreaterThan(0);
            expect(trimmed.length).toBeLessThan(full.length);
        });

        it('keeps every Easy Mode path reachable from the sidebar', () => {
            const hrefs = new Set(
                getDashboardNavSections(TEACHER).flatMap((s) => s.items.map((i) => i.href)),
            );
            for (const path of EASY_MODE_PATHS) {
                expect(hrefs.has(path)).toBe(true);
            }
        });
    });

    // Easy Mode's CSS flattens transitions, but Framer Motion animates in JS and
    // ignores CSS durations. These guard the JS half.
    describe('calms Framer Motion, not just CSS', () => {
        it('reports reduced motion while Easy Mode is on', () => {
            setEasyModeAttribute(true);
            const { result } = renderHook(() => useReducedMotion());
            expect(result.current.shouldReduceMotion).toBe(true);
        });

        it('does not report reduced motion when Easy Mode is off', () => {
            setEasyModeAttribute(false);
            const { result } = renderHook(() => useReducedMotion());
            expect(result.current.shouldReduceMotion).toBe(false);
        });

        it('outranks an explicit "keep animations" preference', () => {
            localStorage.setItem('portal_guru_reduced_motion', 'false');
            setEasyModeAttribute(true);
            const { result } = renderHook(() => useReducedMotion());
            expect(result.current.shouldReduceMotion).toBe(true);
        });

        it('still honours the manual preference when Easy Mode is off', () => {
            localStorage.setItem('portal_guru_reduced_motion', 'true');
            setEasyModeAttribute(false);
            const { result } = renderHook(() => useReducedMotion());
            expect(result.current.shouldReduceMotion).toBe(true);
        });

        it('reacts when Easy Mode is switched on after mount', async () => {
            setEasyModeAttribute(false);
            const { result } = renderHook(() => useReducedMotion());
            expect(result.current.shouldReduceMotion).toBe(false);

            await act(async () => {
                setEasyModeAttribute(true);
                // MutationObserver callbacks arrive as microtasks.
                await Promise.resolve();
            });

            expect(result.current.shouldReduceMotion).toBe(true);
        });

        it('marks the document so CSS-only consumers agree', () => {
            setEasyModeAttribute(true);
            renderHook(() => useReducedMotion());
            expect(document.documentElement.classList.contains('reduce-motion')).toBe(true);
        });
    });
});
