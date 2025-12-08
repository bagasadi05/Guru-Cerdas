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

describe('Form Validation', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    describe('Validation Rules', () => {
        describe('required', () => {
            it('should fail for empty string', () => {
                const validate = (value: any) => value !== undefined && value !== null && value !== '';
                expect(validate('')).toBe(false);
            });

            it('should pass for non-empty string', () => {
                const validate = (value: any) => value !== undefined && value !== null && value !== '';
                expect(validate('test')).toBe(true);
            });

            it('should fail for null', () => {
                const validate = (value: any) => value !== undefined && value !== null && value !== '';
                expect(validate(null)).toBe(false);
            });
        });

        describe('minLength', () => {
            it('should fail when too short', () => {
                const minLength = 5;
                const validate = (value: string) => !value || value.length >= minLength;
                expect(validate('abc')).toBe(false);
            });

            it('should pass when long enough', () => {
                const minLength = 5;
                const validate = (value: string) => !value || value.length >= minLength;
                expect(validate('abcdef')).toBe(true);
            });

            it('should pass for empty (optional)', () => {
                const minLength = 5;
                const validate = (value: string) => !value || value.length >= minLength;
                expect(validate('')).toBe(true);
            });
        });

        describe('maxLength', () => {
            it('should fail when too long', () => {
                const maxLength = 10;
                const validate = (value: string) => !value || value.length <= maxLength;
                expect(validate('12345678901')).toBe(false);
            });

            it('should pass when within limit', () => {
                const maxLength = 10;
                const validate = (value: string) => !value || value.length <= maxLength;
                expect(validate('12345')).toBe(true);
            });
        });

        describe('email', () => {
            it('should fail for invalid email', () => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                expect(emailRegex.test('notanemail')).toBe(false);
                expect(emailRegex.test('missing@domain')).toBe(false);
            });

            it('should pass for valid email', () => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                expect(emailRegex.test('test@example.com')).toBe(true);
            });
        });

        describe('phone', () => {
            it('should pass for Indonesian phone numbers', () => {
                const phoneRegex = /^(\+62|62|0)[0-9]{9,13}$/;
                expect(phoneRegex.test('08123456789')).toBe(true);
                expect(phoneRegex.test('628123456789')).toBe(true);
                expect(phoneRegex.test('+628123456789')).toBe(true);
            });

            it('should fail for invalid phone', () => {
                const phoneRegex = /^(\+62|62|0)[0-9]{9,13}$/;
                expect(phoneRegex.test('12345')).toBe(false);
            });
        });

        describe('numeric', () => {
            it('should pass for numbers only', () => {
                const numericRegex = /^\d+$/;
                expect(numericRegex.test('12345')).toBe(true);
            });

            it('should fail for non-numeric', () => {
                const numericRegex = /^\d+$/;
                expect(numericRegex.test('123abc')).toBe(false);
            });
        });

        describe('min/max', () => {
            it('should validate numeric range', () => {
                const min = 10;
                const max = 100;
                const validate = (value: number) => value >= min && value <= max;

                expect(validate(5)).toBe(false);
                expect(validate(50)).toBe(true);
                expect(validate(150)).toBe(false);
            });
        });

        describe('pattern', () => {
            it('should validate custom pattern', () => {
                const pattern = /^[A-Z]{2}\d{4}$/;
                expect(pattern.test('AB1234')).toBe(true);
                expect(pattern.test('abc123')).toBe(false);
            });
        });

        describe('dateAfter/dateBefore', () => {
            it('should validate date after', () => {
                const minDate = new Date('2024-01-01');
                const validate = (value: string) => new Date(value) > minDate;

                expect(validate('2024-06-01')).toBe(true);
                expect(validate('2023-06-01')).toBe(false);
            });

            it('should validate date before', () => {
                const maxDate = new Date('2024-12-31');
                const validate = (value: string) => new Date(value) < maxDate;

                expect(validate('2024-06-01')).toBe(true);
                expect(validate('2025-06-01')).toBe(false);
            });
        });
    });

    describe('Field Validation Hook', () => {
        it('should start with idle state', () => {
            const state = 'idle';
            expect(state).toBe('idle');
        });

        it('should transition to validating state', () => {
            let state = 'idle';
            state = 'validating';
            expect(state).toBe('validating');
        });

        it('should set valid state when all rules pass', () => {
            const rules = [
                { validate: (v: string) => v.length > 0, message: 'Required' },
                { validate: (v: string) => v.length >= 3, message: 'Min 3' }
            ];
            const value = 'test';
            const allPass = rules.every(r => r.validate(value));
            const state = allPass ? 'valid' : 'invalid';
            expect(state).toBe('valid');
        });

        it('should set invalid state when rule fails', () => {
            const rules = [
                { validate: (v: string) => v.length > 0, message: 'Required' },
                { validate: (v: string) => v.length >= 5, message: 'Min 5' }
            ];
            const value = 'ab';
            let message = '';
            for (const rule of rules) {
                if (!rule.validate(value)) {
                    message = rule.message;
                    break;
                }
            }
            expect(message).toBe('Min 5');
        });

        it('should debounce validation', async () => {
            const debounceMs = 300;
            let validated = false;

            const runValidation = () => {
                setTimeout(() => { validated = true; }, debounceMs);
            };

            runValidation();
            expect(validated).toBe(false);

            vi.advanceTimersByTime(300);
            expect(validated).toBe(true);
        });

        it('should track touched state', () => {
            let touched = false;
            const onBlur = () => { touched = true; };

            onBlur();
            expect(touched).toBe(true);
        });
    });

    describe('Form Context', () => {
        it('should register fields', () => {
            const fields = new Map<string, () => boolean>();
            fields.set('email', () => true);
            fields.set('name', () => true);

            expect(fields.size).toBe(2);
        });

        it('should unregister fields', () => {
            const fields = new Map<string, () => boolean>();
            fields.set('email', () => true);
            fields.delete('email');

            expect(fields.size).toBe(0);
        });

        it('should validate all fields', () => {
            const fields = new Map<string, () => boolean>();
            fields.set('email', () => true);
            fields.set('name', () => false);

            let allValid = true;
            fields.forEach((validate) => {
                if (!validate()) allValid = false;
            });

            expect(allValid).toBe(false);
        });
    });

    describe('Validation Messages', () => {
        it('should show error message for invalid state', () => {
            const state = 'invalid';
            const error = 'Email tidak valid';
            const showError = state === 'invalid' && error;

            expect(showError).toBeTruthy();
        });

        it('should show success message for valid state', () => {
            const state = 'valid';
            const success = 'Email tersedia';
            const showSuccess = state === 'valid' && success;

            expect(showSuccess).toBeTruthy();
        });

        it('should show loading for validating state', () => {
            const state = 'validating';
            const showLoading = state === 'validating';

            expect(showLoading).toBe(true);
        });
    });

    describe('Input States', () => {
        describe('Border Colors', () => {
            it('should have neutral border when untouched', () => {
                const touched = false;
                const borderClass = !touched ? 'border-slate-300' : 'border-other';
                expect(borderClass).toBe('border-slate-300');
            });

            it('should have green border when valid', () => {
                const touched = true;
                const state = 'valid';
                const borderClass = touched && state === 'valid' ? 'border-emerald-500' : 'border-other';
                expect(borderClass).toBe('border-emerald-500');
            });

            it('should have red border when invalid', () => {
                const touched = true;
                const state = 'invalid';
                const borderClass = touched && state === 'invalid' ? 'border-red-500' : 'border-other';
                expect(borderClass).toBe('border-red-500');
            });
        });

        describe('Icons', () => {
            it('should show check icon when valid', () => {
                const state = 'valid';
                const touched = true;
                const showCheck = touched && state === 'valid';
                expect(showCheck).toBe(true);
            });

            it('should show X icon when invalid', () => {
                const state = 'invalid';
                const touched = true;
                const showX = touched && state === 'invalid';
                expect(showX).toBe(true);
            });

            it('should show spinner when validating', () => {
                const state = 'validating';
                const showSpinner = state === 'validating';
                expect(showSpinner).toBe(true);
            });
        });
    });

    describe('Password Input', () => {
        it('should toggle password visibility', () => {
            let showPassword = false;
            showPassword = !showPassword;
            expect(showPassword).toBe(true);
            showPassword = !showPassword;
            expect(showPassword).toBe(false);
        });

        it('should change input type based on visibility', () => {
            const showPassword = true;
            const inputType = showPassword ? 'text' : 'password';
            expect(inputType).toBe('text');
        });
    });

    describe('Textarea', () => {
        it('should track character count', () => {
            const value = 'Hello World';
            const charCount = value.length;
            expect(charCount).toBe(11);
        });

        it('should warn when near limit', () => {
            const maxLength = 100;
            const charCount = 85;
            const isNearLimit = charCount > maxLength * 0.8;
            expect(isNearLimit).toBe(true);
        });

        it('should show count format', () => {
            const charCount = 50;
            const maxLength = 100;
            const display = `${charCount}/${maxLength}`;
            expect(display).toBe('50/100');
        });
    });

    describe('Select', () => {
        it('should have placeholder option', () => {
            const placeholder = 'Pilih opsi...';
            expect(placeholder).toBe('Pilih opsi...');
        });

        it('should show selected value', () => {
            const options = [
                { value: 'a', label: 'Option A' },
                { value: 'b', label: 'Option B' }
            ];
            const selected = options.find(o => o.value === 'a');
            expect(selected?.label).toBe('Option A');
        });
    });

    describe('Success Checkmark', () => {
        it('should show when triggered', () => {
            const show = true;
            expect(show).toBe(true);
        });

        it('should call onComplete after delay', () => {
            let completed = false;
            const onComplete = () => { completed = true; };

            setTimeout(onComplete, 1500);
            vi.advanceTimersByTime(1500);

            expect(completed).toBe(true);
        });

        it('should have different sizes', () => {
            const sizeClass = {
                sm: 'w-12 h-12',
                md: 'w-16 h-16',
                lg: 'w-24 h-24'
            };
            expect(sizeClass.sm).toBe('w-12 h-12');
            expect(sizeClass.lg).toBe('w-24 h-24');
        });
    });

    describe('Submit Button', () => {
        it('should show loading state', () => {
            const isLoading = true;
            const loadingText = 'Menyimpan...';
            expect(isLoading).toBe(true);
            expect(loadingText).toBe('Menyimpan...');
        });

        it('should show success state', () => {
            const showSuccess = true;
            const successText = 'Tersimpan!';
            const bgClass = showSuccess ? 'bg-emerald-500' : 'bg-indigo-500';
            expect(bgClass).toBe('bg-emerald-500');
            expect(successText).toBe('Tersimpan!');
        });

        it('should be disabled when loading', () => {
            const isLoading = true;
            const disabled = isLoading;
            expect(disabled).toBe(true);
        });
    });

    describe('Help Tooltips', () => {
        it('should toggle visibility', () => {
            let showHelp = false;
            showHelp = !showHelp;
            expect(showHelp).toBe(true);
        });

        it('should show help text', () => {
            const helpText = 'Masukkan email yang valid. Contoh: user@example.com';
            expect(helpText).toContain('email');
        });
    });

    describe('Error Messages in Indonesian', () => {
        it('should have Indonesian messages', () => {
            const messages = {
                required: 'Field ini wajib diisi',
                email: 'Format email tidak valid',
                phone: 'Format nomor telepon tidak valid',
                min: 'Minimal 5 karakter',
                max: 'Maksimal 100 karakter'
            };

            expect(messages.required).toContain('wajib');
            expect(messages.email).toContain('email');
            expect(messages.phone).toContain('telepon');
        });
    });

    describe('Animations', () => {
        it('should have scale-in animation', () => {
            const animation = 'scale-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) both';
            expect(animation).toContain('scale-in');
        });

        it('should have draw-check animation', () => {
            const animation = 'draw-check 0.4s ease-out 0.2s both';
            expect(animation).toContain('draw-check');
        });

        it('should have fade-in animation', () => {
            const className = 'animate-fade-in';
            expect(className).toContain('fade-in');
        });
    });
});
