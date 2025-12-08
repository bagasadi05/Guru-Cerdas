// ============================================
// FORM VALIDATION UTILITIES
// Real-time validation with debouncing and visual feedback
// ============================================

import { useState, useCallback, useEffect } from 'react';

export interface ValidationRule {
    required?: boolean | string;
    minLength?: { value: number; message: string };
    maxLength?: { value: number; message: string };
    pattern?: { value: RegExp; message: string };
    min?: { value: number; message: string };
    max?: { value: number; message: string };
    validate?: (value: any) => boolean | string;
    custom?: (value: any) => Promise<boolean | string>;
}

export interface FieldState {
    value: any;
    error: string;
    touched: boolean;
    validating: boolean;
    isValid: boolean;
}

export interface FormState {
    [key: string]: FieldState;
}

// Debounce utility for real-time validation
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

// Validate a single field
function validateField(value: any, rules: ValidationRule): string {
    // Required check
    if (rules.required) {
        const isEmpty = value === undefined || value === null || value === '' ||
            (Array.isArray(value) && value.length === 0);
        if (isEmpty) {
            return typeof rules.required === 'string' ? rules.required : 'This field is required';
        }
    }

    // If value is empty and not required, skip other validations
    if (value === '' || value === undefined || value === null) {
        return '';
    }

    // MinLength check
    if (rules.minLength && String(value).length < rules.minLength.value) {
        return rules.minLength.message;
    }

    // MaxLength check
    if (rules.maxLength && String(value).length > rules.maxLength.value) {
        return rules.maxLength.message;
    }

    // Pattern check
    if (rules.pattern && !rules.pattern.value.test(String(value))) {
        return rules.pattern.message;
    }

    // Min value check
    if (rules.min !== undefined && Number(value) < rules.min.value) {
        return rules.min.message;
    }

    // Max value check
    if (rules.max !== undefined && Number(value) > rules.max.value) {
        return rules.max.message;
    }

    // Custom validation
    if (rules.validate) {
        const result = rules.validate(value);
        if (result !== true && typeof result === 'string') {
            return result;
        }
    }

    return '';
}

// Main form validation hook
export function useFormValidation<T extends Record<string, any>>(
    initialValues: T,
    validationRules: Partial<Record<keyof T, ValidationRule>>,
    options: {
        validateOnChange?: boolean;
        validateOnBlur?: boolean;
        debounceMs?: number;
    } = {}
) {
    const {
        validateOnChange = true,
        validateOnBlur = true,
        debounceMs = 300,
    } = options;

    // Initialize form state
    const [formState, setFormState] = useState<FormState>(() => {
        const initial: FormState = {};
        Object.keys(initialValues).forEach((key) => {
            initial[key] = {
                value: initialValues[key],
                error: '',
                touched: false,
                validating: false,
                isValid: false,
            };
        });
        return initial;
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Get field value (for debouncing)
    const getFieldValue = (name: string) => formState[name]?.value;

    // Set field value
    const setFieldValue = useCallback((name: string, value: any) => {
        setFormState((prev) => ({
            ...prev,
            [name]: {
                ...prev[name],
                value,
                touched: true,
            },
        }));
    }, []);

    // Validate single field
    const validateSingleField = useCallback(
        async (name: string, value: any) => {
            const rules = validationRules[name as keyof T];
            if (!rules) return '';

            // Synchronous validation
            const syncError = validateField(value, rules);
            if (syncError) return syncError;

            // Asynchronous validation
            if (rules.custom) {
                setFormState((prev) => ({
                    ...prev,
                    [name]: { ...prev[name], validating: true },
                }));

                try {
                    const result = await rules.custom(value);
                    const error = result === true ? '' : (typeof result === 'string' ? result : 'Validation failed');

                    setFormState((prev) => ({
                        ...prev,
                        [name]: {
                            ...prev[name],
                            validating: false,
                            error,
                            isValid: !error,
                        },
                    }));

                    return error;
                } catch (err) {
                    setFormState((prev) => ({
                        ...prev,
                        [name]: {
                            ...prev[name],
                            validating: false,
                            error: 'Validation error',
                            isValid: false,
                        },
                    }));
                    return 'Validation error';
                }
            }

            return syncError;
        },
        [validationRules]
    );

    // Handle field change
    const handleChange = useCallback(
        (name: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
            const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
            setFieldValue(name, value);
        },
        [setFieldValue]
    );

    // Handle field blur
    const handleBlur = useCallback(
        (name: string) => async () => {
            if (!validateOnBlur) return;

            const value = formState[name]?.value;
            const error = await validateSingleField(name, value);

            setFormState((prev) => ({
                ...prev,
                [name]: {
                    ...prev[name],
                    error,
                    isValid: !error,
                    touched: true,
                },
            }));
        },
        [formState, validateOnBlur, validateSingleField]
    );

    // Validate all fields
    const validateAll = useCallback(async () => {
        const errors: Record<string, string> = {};
        const validationPromises = Object.keys(formState).map(async (key) => {
            const error = await validateSingleField(key, formState[key].value);
            if (error) {
                errors[key] = error;
            }
        });

        await Promise.all(validationPromises);

        // Update all field states
        setFormState((prev) => {
            const updated = { ...prev };
            Object.keys(updated).forEach((key) => {
                updated[key] = {
                    ...updated[key],
                    error: errors[key] || '',
                    isValid: !errors[key],
                    touched: true,
                };
            });
            return updated;
        });

        return Object.keys(errors).length === 0;
    }, [formState, validateSingleField]);

    // Handle form submit
    const handleSubmit = useCallback(
        (onSubmit: (values: T) => void | Promise<void>) =>
            async (e: React.FormEvent) => {
                e.preventDefault();
                setIsSubmitting(true);

                const isValid = await validateAll();

                if (isValid) {
                    const values = Object.keys(formState).reduce((acc, key) => {
                        acc[key as keyof T] = formState[key].value;
                        return acc;
                    }, {} as T);

                    try {
                        await onSubmit(values);
                    } catch (error) {
                        console.error('Form submission error:', error);
                    }
                }

                setIsSubmitting(false);
            },
        [formState, validateAll]
    );

    // Reset form
    const reset = useCallback(() => {
        setFormState(() => {
            const initial: FormState = {};
            Object.keys(initialValues).forEach((key) => {
                initial[key] = {
                    value: initialValues[key],
                    error: '',
                    touched: false,
                    validating: false,
                    isValid: false,
                };
            });
            return initial;
        });
    }, [initialValues]);

    // Real-time validation on change
    useEffect(() => {
        if (!validateOnChange) return;

        const validationTimeouts: Record<string, NodeJS.Timeout> = {};

        Object.keys(formState).forEach((key) => {
            if (formState[key].touched) {
                validationTimeouts[key] = setTimeout(async () => {
                    const error = await validateSingleField(key, formState[key].value);
                    setFormState((prev) => ({
                        ...prev,
                        [key]: {
                            ...prev[key],
                            error,
                            isValid: !error,
                        },
                    }));
                }, debounceMs);
            }
        });

        return () => {
            Object.values(validationTimeouts).forEach(clearTimeout);
        };
    }, [formState, validateOnChange, debounceMs, validateSingleField]);

    return {
        formState,
        setFieldValue,
        handleChange,
        handleBlur,
        handleSubmit,
        validateAll,
        reset,
        isSubmitting,
        values: Object.keys(formState).reduce((acc, key) => {
            acc[key as keyof T] = formState[key].value;
            return acc;
        }, {} as T),
    };
}

// Preset validation rules
export const ValidationRules = {
    required: (message = 'Field ini wajib diisi'): ValidationRule => ({
        required: message,
    }),

    email: (message = 'Format email tidak valid'): ValidationRule => ({
        pattern: {
            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
            message,
        },
    }),

    minLength: (length: number, message?: string): ValidationRule => ({
        minLength: {
            value: length,
            message: message || `Minimal ${length} karakter`,
        },
    }),

    maxLength: (length: number, message?: string): ValidationRule => ({
        maxLength: {
            value: length,
            message: message || `Maksimal ${length} karakter`,
        },
    }),

    phoneNumber: (message = 'Nomor telepon tidak valid'): ValidationRule => ({
        pattern: {
            value: /^(\+62|62|0)[0-9]{9,12}$/,
            message,
        },
    }),

    number: (message = 'Harus berupa angka'): ValidationRule => ({
        pattern: {
            value: /^[0-9]+$/,
            message,
        },
    }),

    alphanumeric: (message = 'Hanya boleh huruf dan angka'): ValidationRule => ({
        pattern: {
            value: /^[a-zA-Z0-9]+$/,
            message,
        },
    }),

    url: (message = 'URL tidak valid'): ValidationRule => ({
        pattern: {
            value: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
            message,
        },
    }),
};

export default useFormValidation;
