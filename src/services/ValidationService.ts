import { ValidationRule, ValidationRules } from '../types';
import { logger } from './logger';

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

export interface FormValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
}

export class ValidationService {
    /**
     * Validate a single value against a list of rules
     */
    static validateField(value: any, rules: ValidationRule[]): ValidationResult {
        for (const rule of rules) {
            try {
                if (!rule.validate(value)) {
                    return { isValid: false, error: rule.message };
                }
            } catch (error) {
                logger.error('Error during field validation', error as Error, { value, ruleMessage: rule.message }, 'ValidationService');
                return { isValid: false, error: 'Validation error occurred' };
            }
        }
        return { isValid: true };
    }

    /**
     * Validate an entire form object against a schema of rules
     */
    static validateForm(values: Record<string, any>, rules: ValidationRules): FormValidationResult {
        const errors: Record<string, string> = {};
        let isValid = true;

        for (const field in rules) {
            if (Object.prototype.hasOwnProperty.call(rules, field)) {
                const result = this.validateField(values[field], rules[field]);
                if (!result.isValid && result.error) {
                    errors[field] = result.error;
                    isValid = false;
                }
            }
        }

        return { isValid, errors };
    }

    /**
     * Pre-built validators
     */
    static validators = {
        required: (message = 'Wajib diisi'): ValidationRule => ({
            validate: (value: any) => {
                if (value === null || value === undefined) return false;
                if (typeof value === 'string') return value.trim().length > 0;
                if (Array.isArray(value)) return value.length > 0;
                return true;
            },
            message
        }),

        minLength: (length: number, message?: string): ValidationRule => ({
            validate: (value: any) => {
                if (!value) return true; // Skip if empty (use required for non-empty check)
                return String(value).length >= length;
            },
            message: message || `Minimal ${length} karakter`
        }),

        maxLength: (length: number, message?: string): ValidationRule => ({
            validate: (value: any) => {
                if (!value) return true;
                return String(value).length <= length;
            },
            message: message || `Maksimal ${length} karakter`
        }),

        email: (message = 'Format email tidak valid'): ValidationRule => ({
            validate: (value: string) => {
                if (!value) return true;
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(value);
            },
            message
        }),

        phoneNumber: (message = 'Nomor telepon tidak valid'): ValidationRule => ({
            validate: (value: string) => {
                if (!value) return true;
                // Basic phone validation: 10-15 digits, optional + prefix
                const phoneRegex = /^\+?[\d\s-]{10,15}$/;
                return phoneRegex.test(value.replace(/\s|-/g, ''));
            },
            message
        }),

        number: (message = 'Harus berupa angka'): ValidationRule => ({
            validate: (value: any) => {
                if (value === null || value === undefined || value === '') return true;
                return !isNaN(Number(value));
            },
            message
        }),

        alphanumeric: (message = 'Hanya huruf dan angka'): ValidationRule => ({
            validate: (value: string) => {
                if (!value) return true;
                return /^[a-zA-Z0-9]*$/.test(value);
            },
            message
        }),

        url: (message = 'URL tidak valid'): ValidationRule => ({
            validate: (value: string) => {
                if (!value) return true;
                try {
                    new URL(value);
                    return true;
                } catch {
                    return false;
                }
            },
            message
        }),

        futureDate: (message = 'Harus tanggal di masa depan'): ValidationRule => ({
            validate: (value: string | Date) => {
                if (!value) return true;
                const date = new Date(value);
                return date > new Date();
            },
            message
        })
    };
}
