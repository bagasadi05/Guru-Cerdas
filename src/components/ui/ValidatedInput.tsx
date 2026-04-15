// ============================================
// VALIDATED INPUT COMPONENT
// Enhanced input with real-time validation feedback
// ============================================

import React from 'react';
import { CheckCircleIcon, AlertCircleIcon } from '../Icons';
import { Loader2 } from 'lucide-react';

export interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    isValid?: boolean;
    isValidating?: boolean;
    helperText?: string;
    showValidationIcon?: boolean;
}

const fieldBaseClasses = `
    rounded-lg border
    bg-white dark:bg-slate-800
    text-sm text-slate-900 dark:text-white
    placeholder:text-slate-400 dark:placeholder:text-slate-500
    focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
    focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900
    disabled:cursor-not-allowed disabled:opacity-50
    disabled:bg-slate-50 dark:disabled:bg-slate-900
    transition-all duration-200
`;

const getValidationStateClasses = (hasError: boolean, showSuccess: boolean) => {
    if (hasError) {
        return 'border-rose-500 focus:border-rose-500 focus-visible:ring-rose-500';
    }

    if (showSuccess) {
        return 'border-emerald-500 focus:border-emerald-500 focus-visible:ring-emerald-500';
    }

    return 'border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus-visible:ring-indigo-500';
};

export const ValidatedInput = React.forwardRef<HTMLInputElement, ValidatedInputProps>(
    (
        {
            label,
            error,
            isValid,
            isValidating,
            helperText,
            showValidationIcon = true,
            className = '',
            id,
            ...props
        },
        ref
    ) => {
        const inputId = id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;
        const hasError = !!error;
        const showSuccess = !!isValid && !isValidating && !hasError && Boolean(props.value);

        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                        {label}
                        {props.required && <span className="text-rose-500 ml-1">*</span>}
                    </label>
                )}

                <div className="relative">
                    <input
                        ref={ref}
                        id={inputId}
                        aria-invalid={hasError}
                        aria-describedby={
                            hasError
                                ? `${inputId}-error`
                                : helperText
                                    ? `${inputId}-helper`
                                    : undefined
                        }
                        className={`
                            flex h-11 w-full px-4 py-2.5
                            ${fieldBaseClasses}
                            ${getValidationStateClasses(hasError, showSuccess)}
                            ${showValidationIcon ? 'pr-11' : ''}
                            ${className}
                        `}
                        {...props}
                    />

                    {/* Validation Icon */}
                    {showValidationIcon && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            {isValidating ? (
                                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                            ) : hasError ? (
                                <AlertCircleIcon className="w-5 h-5 text-rose-500" />
                            ) : showSuccess ? (
                                <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                            ) : null}
                        </div>
                    )}
                </div>

                {/* Error Message */}
                {hasError && (
                    <p
                        id={`${inputId}-error`}
                        className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 animate-fade-in"
                        role="alert"
                    >
                        <AlertCircleIcon className="w-3 h-3 flex-shrink-0" />
                        {error}
                    </p>
                )}

                {/* Helper Text */}
                {!hasError && helperText && (
                    <p
                        id={`${inputId}-helper`}
                        className="text-xs text-slate-500 dark:text-slate-400"
                    >
                        {helperText}
                    </p>
                )}
            </div>
        );
    }
);

ValidatedInput.displayName = 'ValidatedInput';

// ============================================
// VALIDATED TEXTAREA
// ============================================

export interface ValidatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    isValid?: boolean;
    helperText?: string;
    showCharCount?: boolean;
    maxLength?: number;
}

export const ValidatedTextarea = React.forwardRef<HTMLTextAreaElement, ValidatedTextareaProps>(
    (
        {
            label,
            error,
            isValid,
            helperText,
            showCharCount,
            maxLength,
            className = '',
            id,
            value,
            ...props
        },
        ref
    ) => {
        const inputId = id || `textarea-${label?.toLowerCase().replace(/\s+/g, '-')}`;
        const hasError = !!error;
        const showSuccess = !!isValid && !hasError && Boolean(value);
        const charCount = String(value || '').length;

        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                        {label}
                        {props.required && <span className="text-rose-500 ml-1">*</span>}
                    </label>
                )}

                <div className="relative">
                    <textarea
                        ref={ref}
                        id={inputId}
                        value={value}
                        maxLength={maxLength}
                        aria-invalid={hasError}
                        aria-describedby={
                            hasError
                                ? `${inputId}-error`
                                : helperText
                                    ? `${inputId}-helper`
                                    : undefined
                        }
                        className={`
                            flex min-h-[100px] w-full px-4 py-3 resize-none
                            ${fieldBaseClasses}
                            ${getValidationStateClasses(hasError, showSuccess)}
                            ${className}
                        `}
                        {...props}
                    />

                    {/* Success Icon */}
                    {showSuccess && (
                        <div className="absolute right-3 top-3">
                            <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                        </div>
                    )}
                </div>

                {/* Character Count */}
                {showCharCount && maxLength && (
                    <div className="flex justify-end">
                        <span
                            className={`text-xs ${charCount > maxLength
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-slate-500 dark:text-slate-400'
                                }`}
                        >
                            {charCount} / {maxLength}
                        </span>
                    </div>
                )}

                {/* Error Message */}
                {hasError && (
                    <p
                        id={`${inputId}-error`}
                        className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 animate-fade-in"
                        role="alert"
                    >
                        <AlertCircleIcon className="w-3 h-3 flex-shrink-0" />
                        {error}
                    </p>
                )}

                {/* Helper Text */}
                {!hasError && helperText && (
                    <p
                        id={`${inputId}-helper`}
                        className="text-xs text-slate-500 dark:text-slate-400"
                    >
                        {helperText}
                    </p>
                )}
            </div>
        );
    }
);

ValidatedTextarea.displayName = 'ValidatedTextarea';

// ============================================
// VALIDATED SELECT
// ============================================

export interface ValidatedSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    isValid?: boolean;
    helperText?: string;
    options: Array<{ value: string | number; label: string }>;
}

export const ValidatedSelect = React.forwardRef<HTMLSelectElement, ValidatedSelectProps>(
    (
        {
            label,
            error,
            isValid,
            helperText,
            options,
            className = '',
            id,
            ...props
        },
        ref
    ) => {
        const inputId = id || `select-${label?.toLowerCase().replace(/\s+/g, '-')}`;
        const hasError = !!error;
        const showSuccess = !!isValid && !hasError && Boolean(props.value);

        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                        {label}
                        {props.required && <span className="text-rose-500 ml-1">*</span>}
                    </label>
                )}

                <div className="relative">
                    <select
                        ref={ref}
                        id={inputId}
                        aria-invalid={hasError}
                        aria-describedby={
                            hasError
                                ? `${inputId}-error`
                                : helperText
                                    ? `${inputId}-helper`
                                    : undefined
                        }
                        className={`
                            flex h-11 w-full px-4 py-2.5
                            ${fieldBaseClasses}
                            ${getValidationStateClasses(hasError, showSuccess)}
                            ${className}
                        `}
                        {...props}
                    >
                        {options.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>

                    {/* Success Icon */}
                    {showSuccess && (
                        <div className="absolute right-10 top-1/2 -translate-y-1/2 pointer-events-none">
                            <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                        </div>
                    )}
                </div>

                {/* Error Message */}
                {hasError && (
                    <p
                        id={`${inputId}-error`}
                        className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 animate-fade-in"
                        role="alert"
                    >
                        <AlertCircleIcon className="w-3 h-3 flex-shrink-0" />
                        {error}
                    </p>
                )}

                {/* Helper Text */}
                {!hasError && helperText && (
                    <p
                        id={`${inputId}-helper`}
                        className="text-xs text-slate-500 dark:text-slate-400"
                    >
                        {helperText}
                    </p>
                )}
            </div>
        );
    }
);

ValidatedSelect.displayName = 'ValidatedSelect';

