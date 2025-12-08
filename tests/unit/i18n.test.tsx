import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { I18nProvider, useI18n, useTranslations, Language } from '../../src/contexts/I18nContext';

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

        it('provides formatRelativeTime function', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            expect(result.current.formatRelativeTime).toBeInstanceOf(Function);
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
            const translated = result.current.translate('common.save');
            expect(translated).toBe('Simpan'); // Indonesian default
        });

        it('returns English when language is en', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });

            act(() => {
                result.current.setLanguage('en');
            });

            const translated = result.current.translate('common.save');
            expect(translated).toBe('Save');
        });

        it('returns path if translation not found', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            const translated = result.current.translate('nonexistent.path');
            expect(translated).toBe('nonexistent.path');
        });

        it('replaces parameters in translation', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            const translated = result.current.translate('validation.minLength', { min: 8 });
            expect(translated).toContain('8');
        });
    });

    describe('formatRelativeTime function', () => {
        it('formats recent time as just now', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            const now = new Date();
            const formatted = result.current.formatRelativeTime(now);
            expect(formatted).toBe('Baru saja'); // Indonesian
        });

        it('formats minutes ago', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const formatted = result.current.formatRelativeTime(fiveMinutesAgo);
            expect(formatted).toContain('5');
        });

        it('formats hours ago', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
            const formatted = result.current.formatRelativeTime(twoHoursAgo);
            expect(formatted).toContain('2');
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

    describe('Translations structure', () => {
        it('has common translations', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            expect(result.current.t.common.save).toBeDefined();
            expect(result.current.t.common.cancel).toBeDefined();
            expect(result.current.t.common.delete).toBeDefined();
        });

        it('has nav translations', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            expect(result.current.t.nav.dashboard).toBeDefined();
            expect(result.current.t.nav.attendance).toBeDefined();
            expect(result.current.t.nav.students).toBeDefined();
        });

        it('has auth translations', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            expect(result.current.t.auth.login).toBeDefined();
            expect(result.current.t.auth.logout).toBeDefined();
            expect(result.current.t.auth.email).toBeDefined();
        });

        it('has attendance translations', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            expect(result.current.t.attendance.present).toBeDefined();
            expect(result.current.t.attendance.absent).toBeDefined();
        });

        it('has students translations', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            expect(result.current.t.students.addStudent).toBeDefined();
            expect(result.current.t.students.deleteStudent).toBeDefined();
        });

        it('has tasks translations', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            expect(result.current.t.tasks.pending).toBeDefined();
            expect(result.current.t.tasks.completed).toBeDefined();
        });

        it('has schedule translations', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            expect(result.current.t.schedule.monday).toBeDefined();
            expect(result.current.t.schedule.friday).toBeDefined();
        });

        it('has settings translations', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            expect(result.current.t.settings.darkMode).toBeDefined();
            expect(result.current.t.settings.lightMode).toBeDefined();
        });

        it('has validation translations', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            expect(result.current.t.validation.required).toBeDefined();
            expect(result.current.t.validation.email).toBeDefined();
        });

        it('has errors translations', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            expect(result.current.t.errors.general).toBeDefined();
            expect(result.current.t.errors.network).toBeDefined();
        });

        it('has time translations', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            expect(result.current.t.time.today).toBeDefined();
            expect(result.current.t.time.yesterday).toBeDefined();
        });

        it('has parentPortal translations', () => {
            const { result } = renderHook(() => useI18n(), { wrapper });
            expect(result.current.t.parentPortal.title).toBeDefined();
            expect(result.current.t.parentPortal.welcome).toBeDefined();
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
