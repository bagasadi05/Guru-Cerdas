import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import {
    Check,
    X,
    AlertCircle,
    HelpCircle,
    Eye,
    EyeOff,
    Info,
    CheckCircle2,
    Loader2
} from 'lucide-react';

/**
 * Enhanced Form Validation Components
 * Features: Real-time validation, inline errors, success states, help tooltips
 */

// ============================================
// TYPES
// ============================================

export type ValidationRule = {
    validate: (value: any) => boolean;
    message: string;
};

export type FieldState = 'idle' | 'validating' | 'valid' | 'invalid';

export interface FieldValidation {
    state: FieldState;
    message?: string;
    touched: boolean;
}

export interface FormField {
    value: any;
    validation: FieldValidation;
    rules: ValidationRule[];
}

// ============================================
// VALIDATION RULES
// ============================================

export const validationRules = {
    required: (message = 'Field ini wajib diisi'): ValidationRule => ({
        validate: (value) => value !== undefined && value !== null && value !== '',
        message
    }),

    minLength: (min: number, message?: string): ValidationRule => ({
        validate: (value) => !value || String(value).length >= min,
        message: message || `Minimal ${min} karakter`
    }),

    maxLength: (max: number, message?: string): ValidationRule => ({
        validate: (value) => !value || String(value).length <= max,
        message: message || `Maksimal ${max} karakter`
    }),

    email: (message = 'Format email tidak valid'): ValidationRule => ({
        validate: (value) => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        message
    }),

    phone: (message = 'Format nomor telepon tidak valid'): ValidationRule => ({
        validate: (value) => !value || /^(\+62|62|0)[0-9]{9,13}$/.test(value.replace(/\s|-/g, '')),
        message
    }),

    numeric: (message = 'Harus berupa angka'): ValidationRule => ({
        validate: (value) => !value || /^\d+$/.test(value),
        message
    }),

    alphanumeric: (message = 'Hanya huruf dan angka'): ValidationRule => ({
        validate: (value) => !value || /^[a-zA-Z0-9]+$/.test(value),
        message
    }),

    pattern: (regex: RegExp, message: string): ValidationRule => ({
        validate: (value) => !value || regex.test(value),
        message
    }),

    min: (min: number, message?: string): ValidationRule => ({
        validate: (value) => !value || Number(value) >= min,
        message: message || `Minimal ${min}`
    }),

    max: (max: number, message?: string): ValidationRule => ({
        validate: (value) => !value || Number(value) <= max,
        message: message || `Maksimal ${max}`
    }),

    range: (min: number, max: number, message?: string): ValidationRule => ({
        validate: (value) => !value || (Number(value) >= min && Number(value) <= max),
        message: message || `Harus antara ${min} dan ${max}`
    }),

    dateAfter: (date: Date, message?: string): ValidationRule => ({
        validate: (value) => !value || new Date(value) > date,
        message: message || `Harus setelah ${date.toLocaleDateString('id-ID')}`
    }),

    dateBefore: (date: Date, message?: string): ValidationRule => ({
        validate: (value) => !value || new Date(value) < date,
        message: message || `Harus sebelum ${date.toLocaleDateString('id-ID')}`
    }),

    custom: (validateFn: (value: any) => boolean, message: string): ValidationRule => ({
        validate: validateFn,
        message
    })
};

// ============================================
// VALIDATION HOOK
// ============================================

interface UseFieldValidationOptions {
    rules: ValidationRule[];
    debounceMs?: number;
    validateOnChange?: boolean;
    validateOnBlur?: boolean;
}

export function useFieldValidation(options: UseFieldValidationOptions) {
    const { rules, debounceMs = 300, validateOnChange = true, validateOnBlur = true } = options;

    const [value, setValue] = useState<any>('');
    const [state, setState] = useState<FieldState>('idle');
    const [message, setMessage] = useState<string>('');
    const [touched, setTouched] = useState(false);
    const debounceRef = useRef<NodeJS.Timeout>();

    const validate = useCallback((val: any): { isValid: boolean; message: string } => {
        for (const rule of rules) {
            if (!rule.validate(val)) {
                return { isValid: false, message: rule.message };
            }
        }
        return { isValid: true, message: '' };
    }, [rules]);

    const runValidation = useCallback((val: any) => {
        setState('validating');

        // Clear previous timeout
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            const result = validate(val);
            setState(result.isValid ? 'valid' : 'invalid');
            setMessage(result.message);
        }, debounceMs);
    }, [validate, debounceMs]);

    const handleChange = useCallback((newValue: any) => {
        setValue(newValue);
        if (validateOnChange && touched) {
            runValidation(newValue);
        }
    }, [validateOnChange, touched, runValidation]);

    const handleBlur = useCallback(() => {
        setTouched(true);
        if (validateOnBlur) {
            runValidation(value);
        }
    }, [validateOnBlur, value, runValidation]);

    const reset = useCallback(() => {
        setValue('');
        setState('idle');
        setMessage('');
        setTouched(false);
    }, []);

    const setValueAndValidate = useCallback((val: any) => {
        setValue(val);
        setTouched(true);
        runValidation(val);
    }, [runValidation]);

    return {
        value,
        setValue: handleChange,
        state,
        message,
        touched,
        isValid: state === 'valid',
        isInvalid: state === 'invalid',
        isValidating: state === 'validating',
        onBlur: handleBlur,
        reset,
        validate: () => {
            setTouched(true);
            const result = validate(value);
            setState(result.isValid ? 'valid' : 'invalid');
            setMessage(result.message);
            return result.isValid;
        },
        setValueAndValidate
    };
}

// ============================================
// FORM CONTEXT
// ============================================

interface FormContextValue {
    registerField: (name: string, validate: () => boolean) => void;
    unregisterField: (name: string) => void;
    validateAll: () => boolean;
    isSubmitting: boolean;
    setIsSubmitting: (val: boolean) => void;
}

const FormContext = createContext<FormContextValue | null>(null);

export const useFormContext = () => useContext(FormContext);

interface ValidatedFormProps {
    children: React.ReactNode;
    onSubmit: (e: React.FormEvent) => void | Promise<void>;
    className?: string;
}

export const ValidatedForm: React.FC<ValidatedFormProps> = ({
    children,
    onSubmit,
    className = ''
}) => {
    const fieldsRef = useRef<Map<string, () => boolean>>(new Map());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const registerField = useCallback((name: string, validate: () => boolean) => {
        fieldsRef.current.set(name, validate);
    }, []);

    const unregisterField = useCallback((name: string) => {
        fieldsRef.current.delete(name);
    }, []);

    const validateAll = useCallback(() => {
        let allValid = true;
        fieldsRef.current.forEach((validate) => {
            if (!validate()) {
                allValid = false;
            }
        });
        return allValid;
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (validateAll()) {
            setIsSubmitting(true);
            try {
                await onSubmit(e);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    return (
        <FormContext.Provider value={{ registerField, unregisterField, validateAll, isSubmitting, setIsSubmitting }}>
            <form onSubmit={handleSubmit} className={className} noValidate>
                {children}
            </form>
        </FormContext.Provider>
    );
};

// ============================================
// FORM FIELD WRAPPER
// ============================================

interface FormFieldProps {
    label: string;
    name: string;
    required?: boolean;
    helpText?: string;
    error?: string;
    success?: boolean | string;
    state?: FieldState;
    className?: string;
    children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
    label,
    name,
    required = false,
    helpText,
    error,
    success,
    state = 'idle',
    className = '',
    children
}) => {
    const [showHelp, setShowHelp] = useState(false);

    return (
        <div className={`mb-4 ${className}`}>
            {/* Label */}
            <div className="flex items-center justify-between mb-1.5">
                <label
                    htmlFor={name}
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                    {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {helpText && (
                    <button
                        type="button"
                        onClick={() => setShowHelp(!showHelp)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                        <HelpCircle className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Help Text Tooltip */}
            {showHelp && helpText && (
                <div className="mb-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-indigo-500" />
                    {helpText}
                </div>
            )}

            {/* Input */}
            {children}

            {/* Validation Message */}
            <ValidationMessage state={state} error={error} success={success} />
        </div>
    );
};

// ============================================
// VALIDATION MESSAGE
// ============================================

interface ValidationMessageProps {
    state: FieldState;
    error?: string;
    success?: boolean | string;
}

export const ValidationMessage: React.FC<ValidationMessageProps> = ({
    state,
    error,
    success
}) => {
    if (state === 'validating') {
        return (
            <div className="mt-1.5 flex items-center gap-1.5 text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="text-xs">Memeriksa...</span>
            </div>
        );
    }

    if (state === 'invalid' && error) {
        return (
            <div className="mt-1.5 flex items-center gap-1.5 text-red-500 animate-fade-in">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="text-xs">{error}</span>
            </div>
        );
    }

    if (state === 'valid' && success) {
        return (
            <div className="mt-1.5 flex items-center gap-1.5 text-emerald-500 animate-fade-in">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-xs">{typeof success === 'string' ? success : 'Valid'}</span>
            </div>
        );
    }

    return null;
};

// ============================================
// VALIDATED INPUT
// ============================================

interface ValidatedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    name: string;
    label: string;
    rules?: ValidationRule[];
    helpText?: string;
    successMessage?: string;
    showSuccessState?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    onChange?: (value: string) => void;
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
    name,
    label,
    rules = [],
    helpText,
    successMessage,
    showSuccessState = true,
    leftIcon,
    rightIcon,
    required,
    type = 'text',
    className = '',
    onChange,
    ...props
}) => {
    const formContext = useFormContext();
    const allRules = required ? [validationRules.required(), ...rules] : rules;

    const {
        value,
        setValue,
        state,
        message,
        touched,
        onBlur,
        validate
    } = useFieldValidation({ rules: allRules });

    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';

    // Register with form context
    useEffect(() => {
        if (formContext) {
            formContext.registerField(name, validate);
            return () => formContext.unregisterField(name);
        }
    }, [formContext, name, validate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
        onChange?.(e.target.value);
    };

    const getBorderClass = () => {
        if (!touched) return 'border-slate-300 dark:border-slate-600';
        if (state === 'valid') return 'border-emerald-500 focus:ring-emerald-500/20';
        if (state === 'invalid') return 'border-red-500 focus:ring-red-500/20';
        return 'border-slate-300 dark:border-slate-600';
    };

    return (
        <FormField
            label={label}
            name={name}
            required={required}
            helpText={helpText}
            error={message}
            success={showSuccessState && state === 'valid' ? successMessage : undefined}
            state={state}
        >
            <div className="relative">
                {leftIcon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        {leftIcon}
                    </div>
                )}
                <input
                    id={name}
                    name={name}
                    type={isPassword && showPassword ? 'text' : type}
                    value={value}
                    onChange={handleChange}
                    onBlur={onBlur}
                    className={`
                        w-full px-4 py-3 min-h-[48px] rounded-xl border-2 transition-all duration-200
                        bg-white dark:bg-slate-800 
                        text-slate-900 dark:text-white
                        placeholder-slate-400
                        focus:outline-none focus:ring-4
                        ${getBorderClass()}
                        ${leftIcon ? 'pl-10' : ''}
                        ${rightIcon || isPassword || (touched && state !== 'idle') ? 'pr-10' : ''}
                        ${className}
                    `}
                    {...props}
                />

                {/* Right side icons */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {/* Password toggle */}
                    {isPassword && (
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="text-slate-400 hover:text-slate-600"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    )}

                    {/* Validation state icon */}
                    {touched && state === 'valid' && (
                        <Check className="w-4 h-4 text-emerald-500 animate-scale-in" />
                    )}
                    {touched && state === 'invalid' && (
                        <X className="w-4 h-4 text-red-500" />
                    )}
                    {state === 'validating' && (
                        <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                    )}

                    {rightIcon && !isPassword && state === 'idle' && rightIcon}
                </div>
            </div>
        </FormField>
    );
};

// ============================================
// VALIDATED TEXTAREA
// ============================================

interface ValidatedTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
    name: string;
    label: string;
    rules?: ValidationRule[];
    helpText?: string;
    showCharCount?: boolean;
    onChange?: (value: string) => void;
}

export const ValidatedTextarea: React.FC<ValidatedTextareaProps> = ({
    name,
    label,
    rules = [],
    helpText,
    showCharCount = false,
    maxLength,
    required,
    className = '',
    onChange,
    ...props
}) => {
    const formContext = useFormContext();
    const allRules = required ? [validationRules.required(), ...rules] : rules;

    const {
        value,
        setValue,
        state,
        message,
        touched,
        onBlur,
        validate
    } = useFieldValidation({ rules: allRules });

    useEffect(() => {
        if (formContext) {
            formContext.registerField(name, validate);
            return () => formContext.unregisterField(name);
        }
    }, [formContext, name, validate]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setValue(e.target.value);
        onChange?.(e.target.value);
    };

    const getBorderClass = () => {
        if (!touched) return 'border-slate-300 dark:border-slate-600';
        if (state === 'valid') return 'border-emerald-500 focus:ring-emerald-500/20';
        if (state === 'invalid') return 'border-red-500 focus:ring-red-500/20';
        return 'border-slate-300 dark:border-slate-600';
    };

    const charCount = String(value).length;
    const isNearLimit = maxLength && charCount > maxLength * 0.8;

    return (
        <FormField
            label={label}
            name={name}
            required={required}
            helpText={helpText}
            error={message}
            state={state}
        >
            <div className="relative">
                <textarea
                    id={name}
                    name={name}
                    value={value}
                    onChange={handleChange}
                    onBlur={onBlur}
                    maxLength={maxLength}
                    className={`
                        w-full px-4 py-3 rounded-xl border-2 transition-all duration-200
                        bg-white dark:bg-slate-800 
                        text-slate-900 dark:text-white
                        placeholder-slate-400
                        focus:outline-none focus:ring-4
                        resize-y min-h-[100px]
                        ${getBorderClass()}
                        ${className}
                    `}
                    {...props}
                />

                {/* Character count */}
                {showCharCount && (
                    <div className={`absolute bottom-2 right-3 text-xs ${isNearLimit ? 'text-amber-500' : 'text-slate-400'
                        }`}>
                        {charCount}{maxLength ? `/${maxLength}` : ''}
                    </div>
                )}
            </div>
        </FormField>
    );
};

// ============================================
// VALIDATED SELECT
// ============================================

interface SelectOption {
    value: string;
    label: string;
    disabled?: boolean;
}

interface ValidatedSelectProps {
    name: string;
    label: string;
    options: SelectOption[];
    rules?: ValidationRule[];
    helpText?: string;
    placeholder?: string;
    required?: boolean;
    className?: string;
    onChange?: (value: string) => void;
}

export const ValidatedSelect: React.FC<ValidatedSelectProps> = ({
    name,
    label,
    options,
    rules = [],
    helpText,
    placeholder = 'Pilih opsi...',
    required,
    className = '',
    onChange
}) => {
    const formContext = useFormContext();
    const allRules = required ? [validationRules.required(), ...rules] : rules;

    const {
        value,
        setValue,
        state,
        message,
        touched,
        onBlur,
        validate
    } = useFieldValidation({ rules: allRules });

    useEffect(() => {
        if (formContext) {
            formContext.registerField(name, validate);
            return () => formContext.unregisterField(name);
        }
    }, [formContext, name, validate]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setValue(e.target.value);
        onChange?.(e.target.value);
    };

    const getBorderClass = () => {
        if (!touched) return 'border-slate-300 dark:border-slate-600';
        if (state === 'valid') return 'border-emerald-500';
        if (state === 'invalid') return 'border-red-500';
        return 'border-slate-300 dark:border-slate-600';
    };

    return (
        <FormField
            label={label}
            name={name}
            required={required}
            helpText={helpText}
            error={message}
            state={state}
        >
            <div className="relative">
                <select
                    id={name}
                    name={name}
                    value={value}
                    onChange={handleChange}
                    onBlur={onBlur}
                    className={`
                        w-full px-4 py-3 min-h-[48px] rounded-xl border-2 transition-all duration-200
                        bg-white dark:bg-slate-800 
                        text-slate-900 dark:text-white
                        focus:outline-none focus:ring-4
                        appearance-none cursor-pointer
                        ${getBorderClass()}
                        ${!value ? 'text-slate-400' : ''}
                        ${className}
                    `}
                >
                    <option value="" disabled>{placeholder}</option>
                    {options.map(opt => (
                        <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                            {opt.label}
                        </option>
                    ))}
                </select>

                {/* Dropdown icon */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1">
                    {touched && state === 'valid' && (
                        <Check className="w-4 h-4 text-emerald-500" />
                    )}
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
        </FormField>
    );
};

// ============================================
// SUCCESS ANIMATION
// ============================================

interface SuccessCheckmarkProps {
    show: boolean;
    size?: 'sm' | 'md' | 'lg';
    onComplete?: () => void;
}

export const SuccessCheckmark: React.FC<SuccessCheckmarkProps> = ({
    show,
    size = 'md',
    onComplete
}) => {
    const sizeClass = {
        sm: 'w-12 h-12',
        md: 'w-16 h-16',
        lg: 'w-24 h-24'
    }[size];

    useEffect(() => {
        if (show && onComplete) {
            const timer = setTimeout(onComplete, 1500);
            return () => clearTimeout(timer);
        }
    }, [show, onComplete]);

    if (!show) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/20 backdrop-blur-sm animate-fade-in">
            <div className={`${sizeClass} rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/50 animate-scale-in`}>
                <Check className="w-1/2 h-1/2 text-white animate-draw-check" strokeWidth={3} />
            </div>
        </div>
    );
};

// ============================================
// FORM SUBMIT BUTTON
// ============================================

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    loadingText?: string;
    successText?: string;
    showSuccess?: boolean;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
    children,
    isLoading = false,
    loadingText = 'Menyimpan...',
    successText = 'Tersimpan!',
    showSuccess = false,
    disabled,
    className = '',
    ...props
}) => {
    const formContext = useFormContext();
    const loading = isLoading || formContext?.isSubmitting;

    return (
        <button
            type="submit"
            disabled={loading || disabled}
            className={`
                relative w-full py-3 px-6 rounded-xl font-medium
                transition-all duration-200 overflow-hidden
                disabled:cursor-not-allowed
                ${showSuccess
                    ? 'bg-emerald-500 text-white'
                    : 'bg-indigo-500 hover:bg-indigo-600 text-white disabled:bg-indigo-300'
                }
                ${className}
            `}
            {...props}
        >
            <span className={`flex items-center justify-center gap-2 transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`}>
                {showSuccess ? (
                    <>
                        <Check className="w-5 h-5" />
                        {successText}
                    </>
                ) : children}
            </span>

            {loading && (
                <span className="absolute inset-0 flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {loadingText}
                </span>
            )}
        </button>
    );
};

// ============================================
// INLINE VALIDATION INPUT (SIMPLE)
// ============================================

interface InlineValidatedInputProps {
    value: string;
    onChange: (value: string) => void;
    validate: (value: string) => string | null;
    placeholder?: string;
    className?: string;
}

export const InlineValidatedInput: React.FC<InlineValidatedInputProps> = ({
    value,
    onChange,
    validate,
    placeholder,
    className = ''
}) => {
    const [error, setError] = useState<string | null>(null);
    const [touched, setTouched] = useState(false);
    const debounceRef = useRef<NodeJS.Timeout>();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        onChange(newValue);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            if (touched) {
                setError(validate(newValue));
            }
        }, 300);
    };

    const handleBlur = () => {
        setTouched(true);
        setError(validate(value));
    };

    const hasError = touched && error;
    const isValid = touched && !error && value;

    return (
        <div className="relative">
            <input
                type="text"
                value={value}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder={placeholder}
                className={`
                    w-full px-4 py-2 rounded-lg border-2 transition-colors
                    ${hasError ? 'border-red-500 pr-10' : isValid ? 'border-emerald-500 pr-10' : 'border-slate-300'}
                    ${className}
                `}
            />
            {hasError && (
                <>
                    <X className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                    <p className="mt-1 text-xs text-red-500">{error}</p>
                </>
            )}
            {isValid && (
                <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
            )}
        </div>
    );
};

// ============================================
// EXPORTS
// ============================================

export default {
    validationRules,
    useFieldValidation,
    ValidatedForm,
    FormField,
    ValidationMessage,
    ValidatedInput,
    ValidatedTextarea,
    ValidatedSelect,
    SuccessCheckmark,
    SubmitButton,
    InlineValidatedInput
};
