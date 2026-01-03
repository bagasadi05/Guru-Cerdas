/**
 * Real-time Form Validation Components
 * 
 * Components for providing immediate validation feedback:
 * - Live validation indicators
 * - Character counters
 * - Password strength meters
 * - Input with validation state
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Check, X, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';

// ============================================
// VALIDATION STATUS INDICATOR
// ============================================

export type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid' | 'warning';

interface ValidationIndicatorProps {
    status: ValidationStatus;
    message?: string;
    className?: string;
}

export const ValidationIndicator: React.FC<ValidationIndicatorProps> = ({
    status,
    message,
    className = '',
}) => {
    const config = {
        idle: { icon: null, color: 'text-slate-400' },
        validating: { icon: <Loader2 className="w-4 h-4 animate-spin" />, color: 'text-blue-500' },
        valid: { icon: <Check className="w-4 h-4" />, color: 'text-emerald-500' },
        invalid: { icon: <X className="w-4 h-4" />, color: 'text-rose-500' },
        warning: { icon: <AlertCircle className="w-4 h-4" />, color: 'text-amber-500' },
    };

    const { icon, color } = config[status];

    if (status === 'idle') return null;

    return (
        <div className={`flex items-center gap-1.5 ${color} ${className}`}>
            {icon}
            {message && <span className="text-xs">{message}</span>}
        </div>
    );
};

// ============================================
// CHARACTER COUNTER
// ============================================

interface CharacterCounterProps {
    current: number;
    max: number;
    min?: number;
    className?: string;
}

export const CharacterCounter: React.FC<CharacterCounterProps> = ({
    current,
    max,
    min = 0,
    className = '',
}) => {
    const percentage = (current / max) * 100;
    const isNearLimit = percentage >= 80;
    const isOverLimit = current > max;
    const isBelowMin = current < min && current > 0;

    const color = isOverLimit
        ? 'text-rose-500'
        : isBelowMin
            ? 'text-amber-500'
            : isNearLimit
                ? 'text-amber-500'
                : 'text-slate-400';

    return (
        <div className={`text-xs ${color} ${className}`}>
            <span className={isOverLimit ? 'font-semibold' : ''}>
                {current}
            </span>
            <span>/{max}</span>
            {min > 0 && current < min && (
                <span className="ml-2">(min. {min})</span>
            )}
        </div>
    );
};

// ============================================
// PASSWORD STRENGTH METER
// ============================================

export interface PasswordStrength {
    score: 0 | 1 | 2 | 3 | 4;
    label: string;
    suggestions: string[];
}

export function calculatePasswordStrength(password: string): PasswordStrength {
    let score = 0;
    const suggestions: string[] = [];

    if (password.length >= 8) score++;
    else suggestions.push('Minimal 8 karakter');

    if (password.length >= 12) score++;

    if (/[A-Z]/.test(password)) score++;
    else suggestions.push('Tambahkan huruf besar');

    if (/[a-z]/.test(password)) {
        // Already counts toward base
    } else suggestions.push('Tambahkan huruf kecil');

    if (/[0-9]/.test(password)) score++;
    else suggestions.push('Tambahkan angka');

    if (/[^A-Za-z0-9]/.test(password)) score++;
    else suggestions.push('Tambahkan karakter khusus');

    // Cap at 4
    score = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4;

    const labels = ['Sangat Lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat Kuat'];

    return {
        score,
        label: labels[score],
        suggestions,
    };
}

interface PasswordStrengthMeterProps {
    password: string;
    className?: string;
    showSuggestions?: boolean;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
    password,
    className = '',
    showSuggestions = true,
}) => {
    const strength = useMemo(() => calculatePasswordStrength(password), [password]);

    const colors = ['bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-400', 'bg-emerald-500'];
    const textColors = ['text-rose-500', 'text-orange-500', 'text-amber-500', 'text-emerald-400', 'text-emerald-500'];

    if (!password) return null;

    return (
        <div className={`space-y-2 ${className}`}>
            {/* Strength bars */}
            <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors ${i < strength.score ? colors[strength.score] : 'bg-slate-200 dark:bg-slate-700'
                            }`}
                    />
                ))}
            </div>

            {/* Label */}
            <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${textColors[strength.score]}`}>
                    {strength.label}
                </span>
            </div>

            {/* Suggestions */}
            {showSuggestions && strength.suggestions.length > 0 && (
                <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
                    {strength.suggestions.slice(0, 2).map((suggestion, i) => (
                        <li key={i} className="flex items-center gap-1">
                            <span className="w-1 h-1 bg-slate-400 rounded-full" />
                            {suggestion}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

// ============================================
// VALIDATED INPUT
// ============================================

interface ValidatedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    label?: string;
    error?: string | null;
    hint?: string;
    schema?: z.ZodType<string>;
    onChange?: (value: string, isValid: boolean) => void;
    onValidationChange?: (status: ValidationStatus, error?: string) => void;
    showCharCount?: boolean;
    maxLength?: number;
    debounceMs?: number;
    validateOnMount?: boolean;
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
    label,
    error: externalError,
    hint,
    schema,
    onChange,
    onValidationChange,
    showCharCount = false,
    maxLength,
    debounceMs = 300,
    validateOnMount = false,
    className = '',
    type = 'text',
    ...props
}) => {
    const [value, setValue] = useState(props.value as string || props.defaultValue as string || '');
    const [internalError, setInternalError] = useState<string | null>(null);
    const [status, setStatus] = useState<ValidationStatus>('idle');
    const [showPassword, setShowPassword] = useState(false);

    const error = externalError ?? internalError;

    const validate = useCallback((val: string) => {
        if (!schema) return true;

        setStatus('validating');

        try {
            schema.parse(val);
            setInternalError(null);
            setStatus('valid');
            onValidationChange?.('valid');
            return true;
        } catch (err) {
            if (err instanceof z.ZodError) {
                const message = err.errors[0]?.message || 'Nilai tidak valid';
                setInternalError(message);
                setStatus('invalid');
                onValidationChange?.('invalid', message);
            }
            return false;
        }
    }, [schema, onValidationChange]);

    // Debounced validation
    useEffect(() => {
        if (!schema || (!value && !validateOnMount)) return;

        const timer = setTimeout(() => {
            validate(value);
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [value, debounceMs, validate, schema, validateOnMount]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setValue(newValue);
        setStatus('validating');

        const isValid = schema ? false : true; // Will be validated by effect
        onChange?.(newValue, isValid);
    };

    const inputType = type === 'password' && showPassword ? 'text' : type;

    return (
        <div className="space-y-1">
            {label && (
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {label}
                    {props.required && <span className="text-rose-500 ml-0.5">*</span>}
                </label>
            )}

            <div className="relative">
                <input
                    {...props}
                    type={inputType}
                    value={value}
                    onChange={handleChange}
                    maxLength={maxLength}
                    className={`
                        w-full px-3 py-2 rounded-lg border transition-colors
                        ${error
                            ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500'
                            : status === 'valid'
                                ? 'border-emerald-300 dark:border-emerald-700 focus:ring-emerald-500'
                                : 'border-slate-300 dark:border-slate-600 focus:ring-indigo-500'
                        }
                        focus:outline-none focus:ring-2 focus:ring-offset-0
                        bg-white dark:bg-slate-800
                        text-slate-900 dark:text-white
                        placeholder-slate-400
                        ${type === 'password' ? 'pr-10' : ''}
                        ${className}
                    `}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${props.id}-error` : undefined}
                />

                {/* Password toggle */}
                {type === 'password' && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                )}

                {/* Validation indicator */}
                {status !== 'idle' && type !== 'password' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <ValidationIndicator status={status} />
                    </div>
                )}
            </div>

            {/* Footer: Error, hint, or character count */}
            <div className="flex items-center justify-between">
                <div>
                    {error && (
                        <p id={`${props.id}-error`} className="text-xs text-rose-500" role="alert">
                            {error}
                        </p>
                    )}
                    {!error && hint && (
                        <p className="text-xs text-slate-500">{hint}</p>
                    )}
                </div>
                {showCharCount && maxLength && (
                    <CharacterCounter current={value.length} max={maxLength} />
                )}
            </div>
        </div>
    );
};

// ============================================
// VALIDATED TEXTAREA
// ============================================

interface ValidatedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
    label?: string;
    error?: string | null;
    hint?: string;
    schema?: z.ZodType<string>;
    onChange?: (value: string, isValid: boolean) => void;
    showCharCount?: boolean;
    minLength?: number;
    debounceMs?: number;
}

export const ValidatedTextarea: React.FC<ValidatedTextareaProps> = ({
    label,
    error: externalError,
    hint,
    schema,
    onChange,
    showCharCount = true,
    minLength = 0,
    debounceMs = 300,
    className = '',
    ...props
}) => {
    const [value, setValue] = useState(props.value as string || props.defaultValue as string || '');
    const [internalError, setInternalError] = useState<string | null>(null);
    const [status, setStatus] = useState<ValidationStatus>('idle');

    const error = externalError ?? internalError;

    useEffect(() => {
        if (!schema || !value) return;

        const timer = setTimeout(() => {
            try {
                schema.parse(value);
                setInternalError(null);
                setStatus('valid');
            } catch (err) {
                if (err instanceof z.ZodError) {
                    setInternalError(err.errors[0]?.message || 'Nilai tidak valid');
                    setStatus('invalid');
                }
            }
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [value, schema, debounceMs]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setValue(newValue);
        onChange?.(newValue, !schema);
    };

    return (
        <div className="space-y-1">
            {label && (
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    {label}
                    {props.required && <span className="text-rose-500 ml-0.5">*</span>}
                </label>
            )}

            <textarea
                {...props}
                value={value}
                onChange={handleChange}
                className={`
                    w-full px-3 py-2 rounded-lg border transition-colors resize-y min-h-[100px]
                    ${error
                        ? 'border-rose-300 dark:border-rose-700 focus:ring-rose-500'
                        : status === 'valid'
                            ? 'border-emerald-300 dark:border-emerald-700 focus:ring-emerald-500'
                            : 'border-slate-300 dark:border-slate-600 focus:ring-indigo-500'
                    }
                    focus:outline-none focus:ring-2 focus:ring-offset-0
                    bg-white dark:bg-slate-800
                    text-slate-900 dark:text-white
                    placeholder-slate-400
                    ${className}
                `}
                aria-invalid={!!error}
            />

            <div className="flex items-center justify-between">
                <div>
                    {error && (
                        <p className="text-xs text-rose-500" role="alert">{error}</p>
                    )}
                    {!error && hint && (
                        <p className="text-xs text-slate-500">{hint}</p>
                    )}
                </div>
                {showCharCount && props.maxLength && (
                    <CharacterCounter
                        current={value.length}
                        max={props.maxLength}
                        min={minLength}
                    />
                )}
            </div>
        </div>
    );
};

export default {
    ValidationIndicator,
    CharacterCounter,
    PasswordStrengthMeter,
    ValidatedInput,
    ValidatedTextarea,
    calculatePasswordStrength,
};
