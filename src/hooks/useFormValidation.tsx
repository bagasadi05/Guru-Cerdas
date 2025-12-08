import { useState, useCallback, useMemo, useEffect } from 'react';
import { z } from 'zod';

interface FieldState {
    value: any;
    error: string | null;
    touched: boolean;
    isDirty: boolean;
}

interface FormState<T> {
    values: T;
    errors: Partial<Record<keyof T, string>>;
    touched: Partial<Record<keyof T, boolean>>;
    isDirty: boolean;
    isValid: boolean;
    isSubmitting: boolean;
}

interface UseFormValidationOptions<T> {
    initialValues: T;
    schema?: z.ZodObject<any>;
    validateOnChange?: boolean;
    validateOnBlur?: boolean;
    autosave?: boolean;
    autosaveDelay?: number;
    autosaveKey?: string;
    onAutosave?: (values: T) => void;
}

export function useFormValidation<T extends Record<string, any>>({
    initialValues,
    schema,
    validateOnChange = true,
    validateOnBlur = true,
    autosave = false,
    autosaveDelay = 3000,
    autosaveKey,
    onAutosave,
}: UseFormValidationOptions<T>) {
    // Try to restore from autosave
    const getInitialValues = (): T => {
        if (autosaveKey) {
            try {
                const saved = localStorage.getItem(`form_autosave_${autosaveKey}`);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed.timestamp && Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
                        return { ...initialValues, ...parsed.values };
                    }
                }
            } catch {
                // Ignore parse errors
            }
        }
        return initialValues;
    };

    const [values, setValues] = useState<T>(getInitialValues);
    const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
    const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Check if form is dirty
    const isDirty = useMemo(() => {
        return JSON.stringify(values) !== JSON.stringify(initialValues);
    }, [values, initialValues]);

    // Check if form is valid
    const isValid = useMemo(() => {
        return Object.keys(errors).length === 0;
    }, [errors]);

    // Validate a single field
    const validateField = useCallback((name: keyof T, value: any): string | null => {
        if (!schema) return null;

        try {
            const fieldSchema = schema.shape[name as string];
            if (fieldSchema) {
                fieldSchema.parse(value);
            }
            return null;
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return error.errors[0]?.message || 'Nilai tidak valid';
            }
            return 'Terjadi kesalahan validasi';
        }
    }, [schema]);

    // Validate entire form
    const validateForm = useCallback((): boolean => {
        if (!schema) return true;

        try {
            schema.parse(values);
            setErrors({});
            return true;
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                const newErrors: Partial<Record<keyof T, string>> = {};
                error.errors.forEach((err) => {
                    const field = err.path[0] as keyof T;
                    if (field && !newErrors[field]) {
                        newErrors[field] = err.message;
                    }
                });
                setErrors(newErrors);
            }
            return false;
        }
    }, [schema, values]);

    // Set field value
    const setValue = useCallback((name: keyof T, value: any) => {
        setValues(prev => ({ ...prev, [name]: value }));

        if (validateOnChange) {
            const error = validateField(name, value);
            setErrors(prev => {
                if (error) {
                    return { ...prev, [name]: error };
                } else {
                    const { [name]: _, ...rest } = prev;
                    return rest as Partial<Record<keyof T, string>>;
                }
            });
        }
    }, [validateOnChange, validateField]);

    // Set field touched
    const setFieldTouched = useCallback((name: keyof T, isTouched = true) => {
        setTouched(prev => ({ ...prev, [name]: isTouched }));

        if (validateOnBlur && isTouched) {
            const error = validateField(name, values[name]);
            setErrors(prev => {
                if (error) {
                    return { ...prev, [name]: error };
                } else {
                    const { [name]: _, ...rest } = prev;
                    return rest as Partial<Record<keyof T, string>>;
                }
            });
        }
    }, [validateOnBlur, validateField, values]);

    // Handle change event
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const finalValue = type === 'number' ? (value === '' ? '' : Number(value)) : value;
        setValue(name as keyof T, finalValue);
    }, [setValue]);

    // Handle blur event
    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFieldTouched(e.target.name as keyof T, true);
    }, [setFieldTouched]);

    // Get field props for easy binding
    const getFieldProps = useCallback((name: keyof T) => ({
        name,
        value: values[name],
        onChange: handleChange,
        onBlur: handleBlur,
    }), [values, handleChange, handleBlur]);

    // Get field state
    const getFieldState = useCallback((name: keyof T): FieldState => ({
        value: values[name],
        error: touched[name] ? errors[name] || null : null,
        touched: touched[name] || false,
        isDirty: values[name] !== initialValues[name],
    }), [values, errors, touched, initialValues]);

    // Reset form
    const reset = useCallback((newValues?: Partial<T>) => {
        setValues(newValues ? { ...initialValues, ...newValues } : initialValues);
        setErrors({});
        setTouched({});

        if (autosaveKey) {
            localStorage.removeItem(`form_autosave_${autosaveKey}`);
        }
    }, [initialValues, autosaveKey]);

    // Submit handler wrapper
    const handleSubmit = useCallback((onSubmit: (values: T) => Promise<void> | void) => {
        return async (e?: React.FormEvent) => {
            e?.preventDefault();

            // Touch all fields
            const allTouched = Object.keys(values).reduce((acc, key) => {
                acc[key as keyof T] = true;
                return acc;
            }, {} as Partial<Record<keyof T, boolean>>);
            setTouched(allTouched);

            if (!validateForm()) return;

            setIsSubmitting(true);
            try {
                await onSubmit(values);

                // Clear autosave on successful submit
                if (autosaveKey) {
                    localStorage.removeItem(`form_autosave_${autosaveKey}`);
                }
            } finally {
                setIsSubmitting(false);
            }
        };
    }, [values, validateForm, autosaveKey]);

    // Autosave effect
    useEffect(() => {
        if (!autosave || !autosaveKey || !isDirty) return;

        const timer = setTimeout(() => {
            const saveData = {
                values,
                timestamp: Date.now(),
            };
            localStorage.setItem(`form_autosave_${autosaveKey}`, JSON.stringify(saveData));
            setLastSaved(new Date());
            onAutosave?.(values);
        }, autosaveDelay);

        return () => clearTimeout(timer);
    }, [autosave, autosaveKey, autosaveDelay, values, isDirty, onAutosave]);

    // Clear autosave
    const clearAutosave = useCallback(() => {
        if (autosaveKey) {
            localStorage.removeItem(`form_autosave_${autosaveKey}`);
            setLastSaved(null);
        }
    }, [autosaveKey]);

    // Check if there's autosaved data
    const hasAutosave = useMemo(() => {
        if (!autosaveKey) return false;
        try {
            const saved = localStorage.getItem(`form_autosave_${autosaveKey}`);
            return !!saved;
        } catch {
            return false;
        }
    }, [autosaveKey]);

    return {
        // State
        values,
        errors,
        touched,
        isDirty,
        isValid,
        isSubmitting,
        lastSaved,
        hasAutosave,

        // Actions
        setValue,
        setFieldTouched,
        validateField,
        validateForm,
        reset,
        handleChange,
        handleBlur,
        handleSubmit,
        clearAutosave,

        // Helpers
        getFieldProps,
        getFieldState,
    };
}

// Field error display component
interface FieldErrorProps {
    error: string | null | undefined;
    className?: string;
}

export const FieldError: React.FC<FieldErrorProps> = ({ error, className = '' }) => {
    if (!error) return null;

    return (
        <p className={`text-xs text-red-500 mt-1 animate-fade-in ${className}`}>
            {error}
        </p>
    );
};

// Need to import React for FieldError component
import React from 'react';

export default useFormValidation;
