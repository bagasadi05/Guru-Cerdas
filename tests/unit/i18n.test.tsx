import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { I18nProvider, useI18n, useTranslations } from '../../src/utils/i18n';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value; },
        removeItem: (key: string) => { delete store[key]; },
        clear: () => { store = {}; }
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('I18n Context', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <I18nProvider>{children}</I18nProvider>
    );

    describe('useI18n hook', () => {
        it('provides language state', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            expect(result.current.language).toBeDefined();
        });

        it('defaults to Indonesian', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            expect(result.current.language).toBe('id');
        });

        it('provides translations object', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            expect(result.current.t).toBeDefined();
            expect(result.current.t.common).toBeDefined();
        });

        it('allows changing language', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });

            act(() => {
                result.current.setLanguage('en');
            });

            expect(result.current.language).toBe('en');
        });

        it('provides translate function', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            expect(result.current.translate).toBeInstanceOf(Function);
        });

        it('provides formatDate function', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            expect(result.current.formatDate).toBeInstanceOf(Function);
        });

        it('provides formatNumber function', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            expect(result.current.formatNumber).toBeInstanceOf(Function);
        });

        it('provides languages list', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            expect(result.current.languages).toBeDefined();
            expect(result.current.languages.length).toBeGreaterThan(0);
        });
    });

    describe('translate function', () => {
        it('translates by dot path', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            const translated = result.current.translate('common.cancel');
            expect(translated).toBe('Batal'); // Indonesian default
        });

        it('returns English when language is en', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });

            act(() => {
                result.current.setLanguage('en');
            });

            const translated = result.current.translate('common.cancel');
            expect(translated).toBe('Cancel');
        });

        it('returns path if translation not found', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            const translated = result.current.translate('nonexistent.path');
            expect(translated).toBe('nonexistent.path');
        });
    });

    describe('formatDate function', () => {
        it('formats date in short format', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            const date = new Date('2024-12-06');
            const formatted = result.current.formatDate(date, 'short');
            expect(formatted).toBeDefined();
        });

        it('formats date in long format', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            const date = new Date('2024-12-06');
            const formatted = result.current.formatDate(date, 'long');
            expect(formatted).toBeDefined();
        });
    });

    describe('formatNumber function', () => {
        it('formats number with locale', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            const formatted = result.current.formatNumber(1234567);
            expect(formatted).toBeDefined();
        });
    });

    // The catalogue is scoped to the strings the app actually renders: the four
    // dashboard widgets plus ErrorBoundary. These assertions guard that scope —
    // if a section disappears, a live consumer breaks.
    describe('Translations structure', () => {
        it('has common translations', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            expect(result.current.t.common.cancel).toBeDefined();
            expect(result.current.t.common.all).toBeDefined();
        });

        it('has nav translations used by ErrorBoundary', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            expect(result.current.t.nav.dashboard).toBeDefined();
        });

        it('has errors translations used by ErrorBoundary', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            expect(result.current.t.errors.general).toBeDefined();
            expect(result.current.t.errors.tryAgain).toBeDefined();
            expect(result.current.t.errors.contactSupport).toBeDefined();
        });

        it('has every greeting variant DashboardGreeting indexes into', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            // DashboardGreeting picks these by computed key, so a missing one
            // fails silently at runtime rather than at compile time.
            expect(result.current.t.dashboard.greetingMorning).toBeDefined();
            expect(result.current.t.dashboard.greetingAfternoon).toBeDefined();
            expect(result.current.t.dashboard.greetingEvening).toBeDefined();
            expect(result.current.t.dashboard.greetingNight).toBeDefined();
        });

        it('has dashboard translations for the grade audit widget', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            expect(result.current.t.dashboard.gradeAuditTitle).toBeDefined();
            expect(result.current.t.dashboard.completionProgress).toBeDefined();
            expect(result.current.t.dashboard.allGraded).toBeDefined();
        });

        it('keeps Indonesian and English catalogues in sync', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            const idKeys = JSON.stringify(mapShape(result.current.t));

            act(() => {
                result.current.setLanguage('en');
            });

            expect(JSON.stringify(mapShape(result.current.t))).toBe(idKeys);
        });
    });

    describe('useTranslations hook', () => {
        it('provides t and translate', () => {
            const { result } = renderHook(() => useTranslations(), { wrapper });
            expect(result.current.t).toBeDefined();
            expect(result.current.translate).toBeInstanceOf(Function);
        });
    });

    describe('Language persistence', () => {
        it('persists language to localStorage', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });

            act(() => {
                result.current.setLanguage('en');
            });

            expect(localStorageMock.getItem('portal-guru-language')).toBe('en');
        });

        it('loads language from localStorage', () => {
            localStorageMock.setItem('portal-guru-language', 'en');

            const { result } = renderHook(() => useI18n(), { wrapper });

            expect(result.current.language).toBe('en');
        });
    });
});

/** Key names only, so two catalogues can be compared without their values. */
function mapShape(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') return typeof obj;
    return Object.fromEntries(
        Object.entries(obj as Record<string, unknown>)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => [key, mapShape(value)])
    );
}
