/**
 * Tests for Sync Bypass Service
 *
 * Validates the counter-based state that protects against race conditions
 * when multiple sync processes are running concurrently.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
    beginSyncBypass,
    endSyncBypass,
    isSyncBypassActive,
} from '../syncBypass';

describe('syncBypass', () => {
    beforeEach(() => {
        // Reset bypass depth by ending until inactive
        while (isSyncBypassActive()) {
            endSyncBypass();
        }
    });

    describe('beginSyncBypass', () => {
        it('should activate bypass from idle state', () => {
            expect(isSyncBypassActive()).toBe(false);
            beginSyncBypass();
            expect(isSyncBypassActive()).toBe(true);
        });

        it('should stack depth when called multiple times', () => {
            beginSyncBypass();
            beginSyncBypass();
            beginSyncBypass();
            expect(isSyncBypassActive()).toBe(true);

            // Still active after two ends
            endSyncBypass();
            endSyncBypass();
            expect(isSyncBypassActive()).toBe(true);

            // Inactive after all ends
            endSyncBypass();
            expect(isSyncBypassActive()).toBe(false);
        });
    });

    describe('endSyncBypass', () => {
        it('should decrement depth and deactivate when reaching zero', () => {
            beginSyncBypass();
            expect(isSyncBypassActive()).toBe(true);
            endSyncBypass();
            expect(isSyncBypassActive()).toBe(false);
        });

        it('should not go below zero (idempotent)', () => {
            // End more times than began
            endSyncBypass();
            endSyncBypass();
            endSyncBypass();
            expect(isSyncBypassActive()).toBe(false);

            // Begin once
            beginSyncBypass();
            expect(isSyncBypassActive()).toBe(true);

            // End once - should go back to inactive
            endSyncBypass();
            expect(isSyncBypassActive()).toBe(false);
        });
    });

    describe('isSyncBypassActive', () => {
        it('should return false initially', () => {
            expect(isSyncBypassActive()).toBe(false);
        });

        it('should return true after beginSyncBypass', () => {
            beginSyncBypass();
            expect(isSyncBypassActive()).toBe(true);
        });

        it('should return false after balanced begin/end calls', () => {
            beginSyncBypass();
            endSyncBypass();
            expect(isSyncBypassActive()).toBe(false);
        });
    });

    describe('nested sync operations', () => {
        it('should handle realistic nested sync scenario', () => {
            // Simulate: online event triggers sync
            beginSyncBypass();
            expect(isSyncBypassActive()).toBe(true);

            // Simulate: focus event fires during sync
            beginSyncBypass();
            expect(isSyncBypassActive()).toBe(true);

            // First sync completes
            endSyncBypass();
            expect(isSyncBypassActive()).toBe(true); // Still active due to focus

            // Second sync completes
            endSyncBypass();
            expect(isSyncBypassActive()).toBe(false);
        });
    });
});
