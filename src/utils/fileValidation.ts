/**
 * Enhanced File Upload Validation
 * 
 * Comprehensive validation for file uploads including:
 * - File type validation
 * - File size limits
 * - Image dimension validation
 * - Security checks
 */

import { z } from 'zod';

// ============================================
// FILE TYPE DEFINITIONS
// ============================================

export const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
] as const;

export const ALLOWED_ALL_TYPES = [
    ...ALLOWED_IMAGE_TYPES,
    ...ALLOWED_DOCUMENT_TYPES,
] as const;

// ============================================
// SIZE LIMITS
// ============================================

export const SIZE_LIMITS = {
    avatar: 2 * 1024 * 1024,      // 2MB
    image: 5 * 1024 * 1024,       // 5MB
    document: 10 * 1024 * 1024,   // 10MB
    attachment: 25 * 1024 * 1024, // 25MB
} as const;

export const IMAGE_DIMENSION_LIMITS = {
    avatar: { minWidth: 100, minHeight: 100, maxWidth: 2000, maxHeight: 2000 },
    general: { minWidth: 50, minHeight: 50, maxWidth: 4096, maxHeight: 4096 },
} as const;

// ============================================
// FILE VALIDATION RESULT
// ============================================

export interface FileValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    file?: File;
    metadata?: {
        type: string;
        size: number;
        name: string;
        extension: string;
        isImage: boolean;
        dimensions?: { width: number; height: number };
    };
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Get file extension from filename
 */
function getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Check if file type matches extension (security check)
 */
function validateTypeMatchesExtension(file: File): boolean {
    const extension = getFileExtension(file.name);
    const mimeType = file.type.toLowerCase();

    const typeExtensionMap: Record<string, string[]> = {
        'image/jpeg': ['jpg', 'jpeg'],
        'image/png': ['png'],
        'image/gif': ['gif'],
        'image/webp': ['webp'],
        'application/pdf': ['pdf'],
        'application/msword': ['doc'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
        'application/vnd.ms-excel': ['xls'],
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
        'text/plain': ['txt'],
    };

    const allowedExtensions = typeExtensionMap[mimeType];
    return allowedExtensions ? allowedExtensions.includes(extension) : true;
}

/**
 * Check for potentially dangerous file signatures
 */
async function checkFileSignature(file: File): Promise<boolean> {
    // Read first few bytes to check file signature
    const buffer = await file.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Common dangerous signatures
    const dangerousSignatures = [
        [0x4D, 0x5A], // EXE files
        [0x50, 0x4B, 0x03, 0x04], // ZIP (could contain malware)
    ];

    for (const sig of dangerousSignatures) {
        if (sig.every((byte, i) => bytes[i] === byte)) {
            return false;
        }
    }

    return true;
}

/**
 * Get image dimensions
 */
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: img.width, height: img.height });
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
    return filename
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_{2,}/g, '_')
        .substring(0, 100);
}

// ============================================
// MAIN VALIDATION FUNCTION
// ============================================

export interface ValidateFileOptions {
    allowedTypes?: readonly string[];
    maxSize?: number;
    minSize?: number;
    checkDimensions?: boolean;
    dimensionLimits?: {
        minWidth?: number;
        minHeight?: number;
        maxWidth?: number;
        maxHeight?: number;
    };
    checkSignature?: boolean;
    required?: boolean;
}

/**
 * Comprehensive file validation
 */
export async function validateFile(
    file: File | null | undefined,
    options: ValidateFileOptions = {}
): Promise<FileValidationResult> {
    const {
        allowedTypes = ALLOWED_ALL_TYPES,
        maxSize = SIZE_LIMITS.attachment,
        minSize = 1,
        checkDimensions = false,
        dimensionLimits = IMAGE_DIMENSION_LIMITS.general,
        checkSignature = true,
        required = true,
    } = options;

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if file is provided
    if (!file) {
        if (required) {
            errors.push('File harus dipilih');
        }
        return { valid: !required, errors, warnings };
    }

    const isImage = file.type.startsWith('image/');
    const extension = getFileExtension(file.name);

    // Check file type
    if (!allowedTypes.includes(file.type)) {
        errors.push(`Tipe file tidak diizinkan. Tipe yang diizinkan: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`);
    }

    // Check type matches extension
    if (!validateTypeMatchesExtension(file)) {
        errors.push('Ekstensi file tidak sesuai dengan tipe file');
    }

    // Check file size
    if (file.size < minSize) {
        errors.push('File terlalu kecil atau kosong');
    }
    if (file.size > maxSize) {
        const maxMB = (maxSize / (1024 * 1024)).toFixed(1);
        errors.push(`Ukuran file terlalu besar. Maksimal ${maxMB}MB`);
    }

    // Check file signature for security
    if (checkSignature) {
        try {
            const isSafe = await checkFileSignature(file);
            if (!isSafe) {
                errors.push('File berpotensi berbahaya dan tidak diizinkan');
            }
        } catch {
            warnings.push('Tidak dapat memverifikasi keamanan file');
        }
    }

    // Check image dimensions
    let dimensions: { width: number; height: number } | undefined;
    if (isImage && checkDimensions) {
        try {
            dimensions = await getImageDimensions(file);

            const { minWidth, minHeight, maxWidth, maxHeight } = dimensionLimits;

            if (minWidth && dimensions.width < minWidth) {
                errors.push(`Lebar gambar minimal ${minWidth}px`);
            }
            if (minHeight && dimensions.height < minHeight) {
                errors.push(`Tinggi gambar minimal ${minHeight}px`);
            }
            if (maxWidth && dimensions.width > maxWidth) {
                errors.push(`Lebar gambar maksimal ${maxWidth}px`);
            }
            if (maxHeight && dimensions.height > maxHeight) {
                errors.push(`Tinggi gambar maksimal ${maxHeight}px`);
            }
        } catch {
            errors.push('Tidak dapat membaca dimensi gambar');
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        file,
        metadata: {
            type: file.type,
            size: file.size,
            name: file.name,
            extension,
            isImage,
            dimensions,
        },
    };
}

// ============================================
// ZOD SCHEMAS FOR FILE VALIDATION
// ============================================

export const fileSchema = z.custom<File>(
    (val) => val instanceof File,
    { message: 'Harus berupa file' }
);

export const imageFileSchema = fileSchema.refine(
    (file) => ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number]),
    { message: 'Harus berupa file gambar (JPEG, PNG, GIF, atau WebP)' }
).refine(
    (file) => file.size <= SIZE_LIMITS.image,
    { message: `Ukuran file maksimal ${SIZE_LIMITS.image / (1024 * 1024)}MB` }
);

export const avatarFileSchema = fileSchema.refine(
    (file) => ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number]),
    { message: 'Harus berupa file gambar' }
).refine(
    (file) => file.size <= SIZE_LIMITS.avatar,
    { message: `Ukuran avatar maksimal ${SIZE_LIMITS.avatar / (1024 * 1024)}MB` }
);

export const documentFileSchema = fileSchema.refine(
    (file) => ALLOWED_DOCUMENT_TYPES.includes(file.type as typeof ALLOWED_DOCUMENT_TYPES[number]),
    { message: 'Harus berupa dokumen (PDF, Word, Excel, atau Text)' }
).refine(
    (file) => file.size <= SIZE_LIMITS.document,
    { message: `Ukuran dokumen maksimal ${SIZE_LIMITS.document / (1024 * 1024)}MB` }
);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validate multiple files
 */
export async function validateFiles(
    files: FileList | File[],
    options: ValidateFileOptions & { maxFiles?: number } = {}
): Promise<{
    valid: boolean;
    results: FileValidationResult[];
    errors: string[];
}> {
    const { maxFiles = 10, ...fileOptions } = options;
    const fileArray = Array.from(files);

    if (fileArray.length > maxFiles) {
        return {
            valid: false,
            results: [],
            errors: [`Maksimal ${maxFiles} file dapat diunggah`],
        };
    }

    const results = await Promise.all(
        fileArray.map(file => validateFile(file, fileOptions))
    );

    const allValid = results.every(r => r.valid);
    const allErrors = results.flatMap((r, i) =>
        r.errors.map(e => `File ${i + 1}: ${e}`)
    );

    return {
        valid: allValid,
        results,
        errors: allErrors,
    };
}

export default {
    validateFile,
    validateFiles,
    sanitizeFilename,
    formatFileSize,
    ALLOWED_IMAGE_TYPES,
    ALLOWED_DOCUMENT_TYPES,
    SIZE_LIMITS,
    IMAGE_DIMENSION_LIMITS,
};
