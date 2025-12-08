import React, { useCallback, useMemo } from 'react';
import {
    sanitizeFormData,
    validateFile,
    validateImageFile,
    sanitizeFilename,
    escapeHtml,
    auditLog
} from '../services/securityEnhanced';

// ============================================
// SECURE INPUT COMPONENT
// ============================================

interface SecureInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    name: string;
    label?: string;
    error?: string;
    sanitize?: boolean;
    onChange?: (value: string, event: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SecureInput: React.FC<SecureInputProps> = ({
    name,
    label,
    error,
    sanitize = true,
    onChange,
    className = '',
    ...props
}) => {
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;

        if (sanitize) {
            // Basic sanitization - escape HTML
            value = escapeHtml(value);
        }

        onChange?.(value, e);
    }, [onChange, sanitize]);

    const inputId = `input-${name}`;

    return (
        <div className="w-full">
            {label && (
                <label
                    htmlFor={inputId}
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                    {label}
                    {props.required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <input
                id={inputId}
                name={name}
                onChange={handleChange}
                className={`
                    w-full px-4 py-2.5 rounded-xl border
                    ${error
                        ? 'border-red-300 dark:border-red-600 focus:ring-red-500'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'
                    }
                    bg-white dark:bg-slate-800 
                    text-slate-900 dark:text-white
                    placeholder-slate-400 dark:placeholder-slate-500
                    focus:outline-none focus:ring-2 focus:border-transparent
                    transition-colors
                    ${className}
                `}
                {...props}
            />
            {error && (
                <p className="mt-1.5 text-sm text-red-500">{error}</p>
            )}
        </div>
    );
};

// ============================================
// SECURE TEXTAREA COMPONENT
// ============================================

interface SecureTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
    name: string;
    label?: string;
    error?: string;
    sanitize?: boolean;
    allowHtml?: boolean;
    onChange?: (value: string, event: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export const SecureTextarea: React.FC<SecureTextareaProps> = ({
    name,
    label,
    error,
    sanitize = true,
    allowHtml = false,
    onChange,
    className = '',
    ...props
}) => {
    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
        let value = e.target.value;

        if (sanitize && !allowHtml) {
            value = escapeHtml(value);
        }

        onChange?.(value, e);
    }, [onChange, sanitize, allowHtml]);

    const inputId = `textarea-${name}`;

    return (
        <div className="w-full">
            {label && (
                <label
                    htmlFor={inputId}
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                    {label}
                    {props.required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <textarea
                id={inputId}
                name={name}
                onChange={handleChange}
                className={`
                    w-full px-4 py-2.5 rounded-xl border resize-none
                    ${error
                        ? 'border-red-300 dark:border-red-600 focus:ring-red-500'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'
                    }
                    bg-white dark:bg-slate-800 
                    text-slate-900 dark:text-white
                    placeholder-slate-400 dark:placeholder-slate-500
                    focus:outline-none focus:ring-2 focus:border-transparent
                    transition-colors
                    ${className}
                `}
                {...props}
            />
            {error && (
                <p className="mt-1.5 text-sm text-red-500">{error}</p>
            )}
        </div>
    );
};

// ============================================
// SECURE FILE INPUT COMPONENT
// ============================================

interface SecureFileInputProps {
    name: string;
    label?: string;
    accept?: string;
    maxSizeBytes?: number;
    allowedTypes?: string[];
    onFileSelect?: (file: File | null, error?: string) => void;
    error?: string;
    className?: string;
    disabled?: boolean;
    required?: boolean;
}

export const SecureFileInput: React.FC<SecureFileInputProps> = ({
    name,
    label,
    accept = 'image/*,.pdf,.doc,.docx',
    maxSizeBytes = 5 * 1024 * 1024,
    allowedTypes,
    onFileSelect,
    error,
    className = '',
    disabled = false,
    required = false
}) => {
    const handleChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (!file) {
            onFileSelect?.(null);
            return;
        }

        // Validate file
        const validation = validateFile(file, { maxSizeBytes, allowedTypes });

        if (!validation.valid) {
            onFileSelect?.(null, validation.error);
            e.target.value = ''; // Clear input
            return;
        }

        // Sanitize filename
        const sanitizedName = sanitizeFilename(file.name);

        // Create new file with sanitized name if different
        const sanitizedFile = sanitizedName !== file.name
            ? new File([file], sanitizedName, { type: file.type })
            : file;

        // Log file upload
        auditLog('FILE_UPLOAD', {
            details: {
                originalName: file.name,
                sanitizedName,
                size: file.size,
                type: file.type
            }
        });

        onFileSelect?.(sanitizedFile);
    }, [maxSizeBytes, allowedTypes, onFileSelect]);

    const inputId = `file-${name}`;
    const maxSizeMB = Math.round(maxSizeBytes / 1024 / 1024);

    return (
        <div className="w-full">
            {label && (
                <label
                    htmlFor={inputId}
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className={`
                relative border-2 border-dashed rounded-xl p-6 text-center
                ${error
                    ? 'border-red-300 dark:border-red-600'
                    : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                transition-colors
                ${className}
            `}>
                <input
                    type="file"
                    id={inputId}
                    name={name}
                    accept={accept}
                    onChange={handleChange}
                    disabled={disabled}
                    required={required}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <svg
                    className="w-10 h-10 mx-auto text-slate-400 mb-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                </svg>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                    Klik atau seret file ke sini
                </p>
                <p className="text-xs text-slate-400 mt-1">
                    Maks. {maxSizeMB}MB
                </p>
            </div>
            {error && (
                <p className="mt-1.5 text-sm text-red-500">{error}</p>
            )}
        </div>
    );
};

// ============================================
// SECURE IMAGE INPUT COMPONENT
// ============================================

interface SecureImageInputProps extends Omit<SecureFileInputProps, 'accept' | 'allowedTypes'> {
    preview?: string;
    maxDimensions?: { width: number; height: number };
    onPreviewChange?: (preview: string | null) => void;
}

export const SecureImageInput: React.FC<SecureImageInputProps> = ({
    name,
    label = 'Upload Gambar',
    maxSizeBytes = 2 * 1024 * 1024,
    maxDimensions,
    onFileSelect,
    onPreviewChange,
    preview,
    error: externalError,
    className = '',
    ...props
}) => {
    const [localError, setLocalError] = React.useState<string>();
    const [localPreview, setLocalPreview] = React.useState<string | undefined>(preview);

    const handleFileSelect = useCallback(async (file: File | null, validationError?: string) => {
        if (validationError) {
            setLocalError(validationError);
            onFileSelect?.(null, validationError);
            return;
        }

        if (!file) {
            setLocalPreview(undefined);
            onPreviewChange?.(null);
            onFileSelect?.(null);
            return;
        }

        // Additional image validation
        const imageValidation = await validateImageFile(file, { maxSizeBytes, maxDimensions });

        if (!imageValidation.valid) {
            setLocalError(imageValidation.error);
            onFileSelect?.(null, imageValidation.error);
            return;
        }

        setLocalError(undefined);

        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewUrl = e.target?.result as string;
            setLocalPreview(previewUrl);
            onPreviewChange?.(previewUrl);
        };
        reader.readAsDataURL(file);

        onFileSelect?.(file);
    }, [maxSizeBytes, maxDimensions, onFileSelect, onPreviewChange]);

    const error = externalError || localError;

    return (
        <div className={`w-full ${className}`}>
            {label && (
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {label}
                    {props.required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            {localPreview ? (
                <div className="relative">
                    <img
                        src={localPreview}
                        alt="Preview"
                        className="w-full max-w-xs rounded-xl border border-slate-200 dark:border-slate-700"
                    />
                    <button
                        type="button"
                        onClick={() => handleFileSelect(null)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            ) : (
                <SecureFileInput
                    name={name}
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    maxSizeBytes={maxSizeBytes}
                    allowedTypes={['image/jpeg', 'image/png', 'image/gif', 'image/webp']}
                    onFileSelect={handleFileSelect}
                    error={error}
                    {...props}
                />
            )}

            {error && !localPreview && (
                <p className="mt-1.5 text-sm text-red-500">{error}</p>
            )}
        </div>
    );
};

// ============================================
// SECURE FORM WRAPPER
// ============================================

interface SecureFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
    onSecureSubmit?: (data: Record<string, any>) => void;
    children: React.ReactNode;
}

export const SecureForm: React.FC<SecureFormProps> = ({
    onSecureSubmit,
    children,
    className = '',
    ...props
}) => {
    const handleSubmit = useCallback((e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const formData = new FormData(e.currentTarget);
        const data: Record<string, any> = {};

        formData.forEach((value, key) => {
            if (typeof value === 'string') {
                data[key] = value;
            }
        });

        // Sanitize all form data
        const sanitizedData = sanitizeFormData(data);

        onSecureSubmit?.(sanitizedData);
    }, [onSecureSubmit]);

    return (
        <form
            onSubmit={handleSubmit}
            className={className}
            {...props}
        >
            {children}
        </form>
    );
};

// ============================================
// SECURE DISPLAY COMPONENT
// ============================================

interface SecureTextProps {
    children: string;
    as?: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    className?: string;
}

/**
 * Safely display user-generated text content
 * Automatically escapes HTML to prevent XSS
 */
export const SecureText: React.FC<SecureTextProps> = ({
    children,
    as: Component = 'span',
    className = ''
}) => {
    const safeContent = useMemo(() => escapeHtml(children), [children]);

    return (
        <Component className={className}>
            {safeContent}
        </Component>
    );
};

// ============================================
// EXPORTS
// ============================================

export default {
    SecureInput,
    SecureTextarea,
    SecureFileInput,
    SecureImageInput,
    SecureForm,
    SecureText
};
