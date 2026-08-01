import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCachedResponse,
  setCachedResponse,
  clearAiCache,
  buildCacheKey,
} from '../../src/utils/aiConfig';

describe('aiConfig — Response Cache (getCachedResponse/setCachedResponse)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-31T00:00:00Z'));
    clearAiCache();
  });

  afterEach(() => {
    clearAiCache();
    vi.useRealTimers();
  });

  describe('buildCacheKey', () => {
    it('returns deterministic keys with ai_cache_ prefix', () => {
      const key = buildCacheKey('hello');
      expect(key).toMatch(/^ai_cache_-?\d+$/);
      expect(key).toBe(buildCacheKey('hello'));
      expect(buildCacheKey('')).toMatch(/^ai_cache_-?\d+$/);
    });

    it('produces different keys for different prompts', () => {
      expect(buildCacheKey('prompt A')).not.toBe(buildCacheKey('prompt B'));
    });
  });

  describe('cache hit/miss', () => {
    it('returns undefined on miss (nothing cached)', () => {
      expect(getCachedResponse('missing-prompt')).toBeUndefined();
    });

    it('returns cached data on hit', () => {
      setCachedResponse('same-prompt', { ok: true });
      expect(getCachedResponse('same-prompt')).toEqual({ ok: true });
    });

    it('round-trips through generic typing', () => {
      setCachedResponse<string[]>('list-prompt', ['a', 'b', 'c']);
      const result = getCachedResponse<string[]>('list-prompt');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('hits the same entry for an identical prompt (deterministic key)', () => {
      setCachedResponse('duplicate-check', 'value-1');
      setCachedResponse('duplicate-check', 'value-2');
      expect(getCachedResponse('duplicate-check')).toBe('value-2');
    });

    it('does not collide across different prompts', () => {
      setCachedResponse('prompt-1', 'one');
      setCachedResponse('prompt-2', 'two');
      expect(getCachedResponse('prompt-1')).toBe('one');
      expect(getCachedResponse('prompt-2')).toBe('two');
    });
  });

  describe('TTL & expiry', () => {
    it('default TTL is 2 minutes', () => {
      setCachedResponse('ttl-default', 'data');
      expect(getCachedResponse('ttl-default')).toBe('data');

      vi.advanceTimersByTime(2 * 60 * 1000 - 1);
      expect(getCachedResponse('ttl-default')).toBe('data');

      vi.advanceTimersByTime(2);
      expect(getCachedResponse('ttl-default')).toBeUndefined();
    });

    it('insight category lives 5 minutes', () => {
      setCachedResponse('ttl-insight', 'data', 'insight');
      vi.advanceTimersByTime(5 * 60 * 1000 - 1);
      expect(getCachedResponse('ttl-insight')).toBe('data');

      vi.advanceTimersByTime(2);
      expect(getCachedResponse('ttl-insight')).toBeUndefined();
    });

    it('modulAjar category lives 60 minutes', () => {
      setCachedResponse('ttl-modul', 'data', 'modulAjar');
      vi.advanceTimersByTime(60 * 60 * 1000 - 1);
      expect(getCachedResponse('ttl-modul')).toBe('data');

      vi.advanceTimersByTime(2);
      expect(getCachedResponse('ttl-modul')).toBeUndefined();
    });

    it('expired entries are evicted on read (no stale data)', () => {
      setCachedResponse('stale', 'old');
      vi.advanceTimersByTime(3 * 60 * 1000);
      expect(getCachedResponse('stale')).toBeUndefined();
      // Second read still miss — entry removed, not just hidden
      expect(getCachedResponse('stale')).toBeUndefined();
    });
  });

  describe('clearAiCache & eviction', () => {
    it('clearAiCache wipes all entries', () => {
      setCachedResponse('a', 1);
      setCachedResponse('b', 2);
      clearAiCache();
      expect(getCachedResponse('a')).toBeUndefined();
      expect(getCachedResponse('b')).toBeUndefined();
    });

    it('evicts oldest entry when cache exceeds 200 entries (memory guard)', () => {
      // Insert 201 entries; oldest must be evicted, newest kept
      for (let i = 0; i < 201; i++) {
        setCachedResponse(`bulk-${i}`, i);
      }
      expect(getCachedResponse('bulk-0')).toBeUndefined();
      expect(getCachedResponse('bulk-200')).toBe(200);
    });
  });
});
