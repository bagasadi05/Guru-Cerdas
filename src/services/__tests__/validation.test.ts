import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ValidationService } from '../ValidationService';

describe('ValidationService Property Tests', () => {

    it('property: required validator correctness', () => {
        const rule = ValidationService.validators.required();

        expect(rule.validate(null)).toBe(false);
        expect(rule.validate(undefined)).toBe(false);
        expect(rule.validate('')).toBe(false);
        expect(rule.validate('   ')).toBe(false);

        fc.assert(
            fc.property(fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), (str) => {
                return rule.validate(str);
            })
        );
    });

    it('property: minLength validator correctness', () => {
        fc.assert(
            fc.property(
                fc.string(),
                fc.integer({ min: 0, max: 100 }),
                (str, min) => {
                    const rule = ValidationService.validators.minLength(min);
                    const isValid = rule.validate(str);
                    if (str === '') return isValid === true;
                    return isValid === (str.length >= min);
                }
            )
        );
    });

    it('property: maxLength validator correctness', () => {
        fc.assert(
            fc.property(
                fc.string(),
                fc.integer({ min: 0, max: 100 }),
                (str, max) => {
                    const rule = ValidationService.validators.maxLength(max);
                    const isValid = rule.validate(str);
                    return isValid === (str.length <= max);
                }
            )
        );
    });

    it('property: email validator rejects invalid emails', () => {
        const rule = ValidationService.validators.email();
        const invalidEmails = ['plainaddress', '#@%^%#$@#$@#.com', '@example.com', 'Joe Smith <email@example.com>', 'email.example.com', 'email@example@example.com'];

        invalidEmails.forEach(email => {
            expect(rule.validate(email)).toBe(false);
        });

        fc.assert(
            fc.property(
                fc.emailAddress(),
                (email) => {
                    return rule.validate(email);
                }
            )
        );
    });

    it('property: form validation aggregates errors correctly', () => {
        const rules = {
            name: [ValidationService.validators.required()],
            age: [ValidationService.validators.number()]
        };

        const resultInvalid = ValidationService.validateForm({ name: '', age: 'abc' }, rules);
        expect(resultInvalid.isValid).toBe(false);
        expect(resultInvalid.errors).toHaveProperty('name');
        expect(resultInvalid.errors).toHaveProperty('age');

        const resultValid = ValidationService.validateForm({ name: 'John', age: '25' }, rules);
        expect(resultValid.isValid).toBe(true);
        expect(Object.keys(resultValid.errors)).toHaveLength(0);
    });
});
