import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('i18n system', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('exports I18nProvider and useTranslation', async () => {
    const mod = await import('../i18n');
    expect(mod.I18nProvider).toBeDefined();
    expect(mod.useTranslation).toBeDefined();
    expect(mod.useI18n).toBeDefined();
    expect(mod.LanguageSelector).toBeDefined();
  });

  it('defaults to Indonesian language', async () => {
    const { I18nProvider, useTranslation } = await import('../i18n');
    const { result } = renderHook(() => useTranslation(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(I18nProvider, null, children),
    });
    expect(result.current.language).toBe('id');
  });

  it('contains common.cancel in translations', async () => {
    const { I18nProvider, useTranslation } = await import('../i18n');
    const { result } = renderHook(() => useTranslation(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(I18nProvider, null, children),
    });
    expect(result.current.t.common.cancel).toBe('Batal');
  });

  it('can switch language to English', async () => {
    const { I18nProvider, useTranslation } = await import('../i18n');
    const { result } = renderHook(() => useTranslation(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(I18nProvider, null, children),
    });
    
    act(() => { result.current.setLanguage('en'); });
    
    expect(result.current.language).toBe('en');
    expect(result.current.t.common.cancel).toBe('Cancel');
  });
});
