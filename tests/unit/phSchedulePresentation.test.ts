import { describe, expect, it } from 'vitest';
import { choosePhClass, phSubjectColor } from '../../src/components/schedule/engine/phSchedulePresentation';

const classes = [{ id: 'a' }, { id: 'b' }];

describe('PH presentation', () => {
    it('honors an explicit class before the remembered class', () => {
        expect(choosePhClass(classes, ['a', 'b'], ['b'])).toBe('a');
    });
    it('restores a valid remembered class and ignores deleted classes', () => {
        expect(choosePhClass(classes, ['deleted', 'b'], ['a'])).toBe('b');
        expect(choosePhClass(classes, ['deleted'], ['b'])).toBe('b');
        expect(choosePhClass(classes, [], [])).toBe('a');
        expect(choosePhClass([], ['a'], [])).toBe('');
    });
    it('keeps subject colors stable across capitalization and spacing', () => {
        expect(phSubjectColor('Matematika')).toBe('bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.45)]');
        expect(phSubjectColor(' MATEMATIKA ')).toBe('bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.45)]');
        expect(phSubjectColor('Aqidah Akhlak')).toBe('bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.45)]');
    });
});
