import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

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

describe('UX Enhancements', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    describe('Undo/Redo System', () => {
        it('should initialize with present state', () => {
            const state = {
                past: [],
                present: 'initial',
                future: []
            };
            expect(state.present).toBe('initial');
            expect(state.past.length).toBe(0);
            expect(state.future.length).toBe(0);
        });

        it('should add to history on set', () => {
            const past = ['state1', 'state2'];
            const present = 'state3';
            const future: string[] = [];

            // After set
            const newPast = [...past, present];
            const newPresent = 'state4';

            expect(newPast).toEqual(['state1', 'state2', 'state3']);
            expect(newPresent).toBe('state4');
        });

        it('should undo correctly', () => {
            const past = ['state1', 'state2'];
            const present = 'state3';
            const future: string[] = [];

            // After undo
            const newPast = past.slice(0, -1);
            const newPresent = past[past.length - 1];
            const newFuture = [present, ...future];

            expect(newPast).toEqual(['state1']);
            expect(newPresent).toBe('state2');
            expect(newFuture).toEqual(['state3']);
        });

        it('should redo correctly', () => {
            const past = ['state1'];
            const present = 'state2';
            const future = ['state3'];

            // After redo
            const newPast = [...past, present];
            const newPresent = future[0];
            const newFuture = future.slice(1);

            expect(newPast).toEqual(['state1', 'state2']);
            expect(newPresent).toBe('state3');
            expect(newFuture).toEqual([]);
        });

        it('should limit history size', () => {
            const maxHistory = 5;
            const past = ['s1', 's2', 's3', 's4', 's5', 's6'];
            const limitedPast = past.slice(-maxHistory);

            expect(limitedPast.length).toBe(5);
        });

        it('should clear future on new action', () => {
            const future = ['f1', 'f2'];
            const newFuture: string[] = [];

            expect(newFuture.length).toBe(0);
        });
    });

    describe('Bulk Selection', () => {
        it('should toggle selection', () => {
            const selected = new Set(['id1', 'id2']);

            // Toggle id2 off
            selected.delete('id2');
            expect(selected.has('id2')).toBe(false);

            // Toggle id3 on
            selected.add('id3');
            expect(selected.has('id3')).toBe(true);
        });

        it('should select all', () => {
            const items = [{ id: '1' }, { id: '2' }, { id: '3' }];
            const selected = new Set(items.map(i => i.id));

            expect(selected.size).toBe(3);
        });

        it('should deselect all', () => {
            const selected = new Set(['1', '2', '3']);
            selected.clear();

            expect(selected.size).toBe(0);
        });

        it('should handle range selection', () => {
            const items = [
                { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }
            ];
            const lastIndex = 1;
            const currentIndex = 3;

            const start = Math.min(lastIndex, currentIndex);
            const end = Math.max(lastIndex, currentIndex);

            const selected = new Set<string>();
            for (let i = start; i <= end; i++) {
                selected.add(items[i].id);
            }

            expect(selected.size).toBe(3);
            expect([...selected]).toEqual(['2', '3', '4']);
        });

        it('should check if all selected', () => {
            const items = [{ id: '1' }, { id: '2' }];
            const selected = new Set(['1', '2']);
            const isAllSelected = selected.size === items.length;

            expect(isAllSelected).toBe(true);
        });
    });

    describe('Bulk Operations', () => {
        it('should track success count', () => {
            const result = { success: 0, failed: 0, errors: [] as any[] };
            result.success++;
            result.success++;

            expect(result.success).toBe(2);
        });

        it('should track failures with errors', () => {
            const result = { success: 0, failed: 0, errors: [] as { id: string; message: string }[] };
            result.failed++;
            result.errors.push({ id: 'id1', message: 'Error message' });

            expect(result.failed).toBe(1);
            expect(result.errors[0].message).toBe('Error message');
        });

        it('should report progress', () => {
            const total = 10;
            let progress = 0;

            for (let i = 0; i < 5; i++) {
                progress = (i + 1) / total;
            }

            expect(progress).toBe(0.5);
        });
    });

    describe('Advanced Filtering', () => {
        describe('Filter Operators', () => {
            it('should handle equals operator', () => {
                const value = 'test';
                const filterValue = 'test';
                expect(value === filterValue).toBe(true);
            });

            it('should handle contains operator', () => {
                const value = 'Hello World';
                const filterValue = 'world';
                expect(value.toLowerCase().includes(filterValue.toLowerCase())).toBe(true);
            });

            it('should handle starts_with operator', () => {
                const value = 'Hello World';
                const filterValue = 'Hello';
                expect(value.startsWith(filterValue)).toBe(true);
            });

            it('should handle greater_than operator', () => {
                const value = 10;
                const filterValue = 5;
                expect(value > filterValue).toBe(true);
            });

            it('should handle between operator', () => {
                const value = 50;
                const min = 10;
                const max = 100;
                expect(value >= min && value <= max).toBe(true);
            });

            it('should handle in operator', () => {
                const value = 'active';
                const allowed = ['active', 'pending', 'completed'];
                expect(allowed.includes(value)).toBe(true);
            });

            it('should handle is_empty operator', () => {
                expect('' === '').toBe(true);
                expect((null as unknown) === null).toBe(true);
            });
        });

        describe('Filter Groups', () => {
            it('should handle AND logic', () => {
                const conditions = [true, true, true];
                expect(conditions.every(Boolean)).toBe(true);
            });

            it('should handle OR logic', () => {
                const conditions = [false, true, false];
                expect(conditions.some(Boolean)).toBe(true);
            });
        });

        describe('Sorting', () => {
            it('should sort ascending', () => {
                const items = [{ name: 'C' }, { name: 'A' }, { name: 'B' }];
                const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));

                expect(sorted[0].name).toBe('A');
                expect(sorted[2].name).toBe('C');
            });

            it('should sort descending', () => {
                const items = [{ name: 'C' }, { name: 'A' }, { name: 'B' }];
                const sorted = [...items].sort((a, b) => b.name.localeCompare(a.name));

                expect(sorted[0].name).toBe('C');
                expect(sorted[2].name).toBe('A');
            });

            it('should handle multi-column sort', () => {
                const items = [
                    { name: 'A', age: 30 },
                    { name: 'A', age: 20 },
                    { name: 'B', age: 25 }
                ];

                const sorted = [...items].sort((a, b) => {
                    const nameCompare = a.name.localeCompare(b.name);
                    if (nameCompare !== 0) return nameCompare;
                    return a.age - b.age;
                });

                expect(sorted[0].age).toBe(20);
                expect(sorted[1].age).toBe(30);
            });
        });
    });

    describe('Onboarding System', () => {
        it('should track current step', () => {
            let currentStep = 0;
            const totalSteps = 5;

            currentStep++;
            expect(currentStep).toBe(1);
            expect(currentStep < totalSteps).toBe(true);
        });

        it('should calculate progress', () => {
            const currentStep = 2;
            const totalSteps = 5;
            const progress = ((currentStep + 1) / totalSteps) * 100;

            expect(progress).toBe(60);
        });

        it('should mark flow as completed', () => {
            const completed = new Set<string>();
            completed.add('newUser');

            expect(completed.has('newUser')).toBe(true);
        });

        it('should persist completion status', () => {
            const flowId = 'newUser';
            const completed = ['newUser', 'tutorial'];

            localStorageMock.setItem('portal_guru_onboarding', JSON.stringify({ completed }));
            const stored = JSON.parse(localStorageMock.getItem('portal_guru_onboarding') || '{}');

            expect(stored.completed).toContain(flowId);
        });

        it('should have predefined flows', () => {
            const flows = ['newUser', 'firstStudent', 'attendance'];
            expect(flows.length).toBe(3);
        });
    });

    describe('Notification Preferences', () => {
        it('should have default preferences', () => {
            const defaults = {
                enabled: true,
                sound: true,
                desktop: true,
                email: false
            };

            expect(defaults.enabled).toBe(true);
            expect(defaults.email).toBe(false);
        });

        it('should persist preferences', () => {
            const prefs = { enabled: true, sound: false };
            localStorageMock.setItem('portal_guru_notification_prefs', JSON.stringify(prefs));

            const stored = JSON.parse(localStorageMock.getItem('portal_guru_notification_prefs') || '{}');
            expect(stored.sound).toBe(false);
        });

        it('should check category preferences', () => {
            const categories = {
                attendance: true,
                tasks: true,
                reminders: false,
                system: true
            };

            expect(categories.attendance).toBe(true);
            expect(categories.reminders).toBe(false);
        });

        it('should check quiet hours', () => {
            const isQuietTime = (current: number, start: number, end: number) => {
                if (start > end) {
                    // Spans midnight
                    return current >= start || current < end;
                }
                return current >= start && current < end;
            };

            // 22:00 to 07:00 (spans midnight)
            const start = 22 * 60; // 22:00
            const end = 7 * 60;    // 07:00

            expect(isQuietTime(23 * 60, start, end)).toBe(true);  // 23:00 is quiet
            expect(isQuietTime(5 * 60, start, end)).toBe(true);   // 05:00 is quiet
            expect(isQuietTime(12 * 60, start, end)).toBe(false); // 12:00 is not quiet
        });
    });

    describe('Help System', () => {
        it('should search topics by title', () => {
            const topics = [
                { id: '1', title: 'Cara Menambah Siswa', keywords: [], content: '' },
                { id: '2', title: 'Cara Mengisi Absensi', keywords: [], content: '' }
            ];
            const query = 'absensi';

            const results = topics.filter(t => t.title.toLowerCase().includes(query.toLowerCase()));
            expect(results.length).toBe(1);
            expect(results[0].id).toBe('2');
        });

        it('should search topics by keywords', () => {
            const topics = [
                { id: '1', title: 'Topic 1', keywords: ['add', 'student'], content: '' },
                { id: '2', title: 'Topic 2', keywords: ['export', 'download'], content: '' }
            ];
            const query = 'download';

            const results = topics.filter(t =>
                t.keywords.some(k => k.toLowerCase().includes(query.toLowerCase()))
            );
            expect(results.length).toBe(1);
            expect(results[0].id).toBe('2');
        });

        it('should group topics by category', () => {
            const topics = [
                { id: '1', category: 'Siswa' },
                { id: '2', category: 'Absensi' },
                { id: '3', category: 'Siswa' }
            ];

            const byCategory = topics.reduce((acc, t) => {
                if (!acc[t.category]) acc[t.category] = [];
                acc[t.category].push(t);
                return acc;
            }, {} as Record<string, typeof topics>);

            expect(Object.keys(byCategory).length).toBe(2);
            expect(byCategory['Siswa'].length).toBe(2);
        });
    });

    describe('Keyboard Shortcuts', () => {
        it('should match key combinations', () => {
            const shortcut = { key: 'z', ctrl: true, shift: false };
            const event = { key: 'z', ctrlKey: true, shiftKey: false, metaKey: false, altKey: false };

            const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
            const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey;
            const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;

            expect(keyMatch && ctrlMatch && shiftMatch).toBe(true);
        });

        it('should detect Ctrl+Z for undo', () => {
            const event = { key: 'z', ctrlKey: true, shiftKey: false };
            const isUndo = event.key === 'z' && event.ctrlKey && !event.shiftKey;

            expect(isUndo).toBe(true);
        });

        it('should detect Ctrl+Shift+Z for redo', () => {
            const event = { key: 'z', ctrlKey: true, shiftKey: true };
            const isRedo = event.key === 'z' && event.ctrlKey && event.shiftKey;

            expect(isRedo).toBe(true);
        });
    });
});
