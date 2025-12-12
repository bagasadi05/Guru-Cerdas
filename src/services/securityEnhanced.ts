/**
 * Enhanced Security Service
 * Features: CSRF protection, XSS prevention, file validation, 
 * cryptographic access codes, and audit logging
 */

import { logger } from './logger';

// ============================================
// CSRF PROTECTION
// ============================================

const CSRF_TOKEN_KEY = 'portal_guru_csrf_token';
const CSRF_TOKEN_HEADER = 'X-CSRF-Token';
const CSRF_TOKEN_EXPIRY = 3600000; // 1 hour

interface CSRFToken {
    token: string;
    createdAt: number;
}

/**
 * Generate cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

    const tokenData: CSRFToken = {
        token,
        createdAt: Date.now()
    };

    sessionStorage.setItem(CSRF_TOKEN_KEY, JSON.stringify(tokenData));
    return token;
}

/**
 * Validate CSRF token
 */
export function validateCSRFToken(token: string): boolean {
    try {
        const stored = sessionStorage.getItem(CSRF_TOKEN_KEY);
        if (!stored) return false;

        const tokenData: CSRFToken = JSON.parse(stored);

        // Check if token matches
        if (tokenData.token !== token) return false;

        // Check if token is expired
        if (Date.now() - tokenData.createdAt > CSRF_TOKEN_EXPIRY) {
            sessionStorage.removeItem(CSRF_TOKEN_KEY);
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * Get CSRF token for forms and requests
 */
export function getCSRFToken(): string {
    try {
        const stored = sessionStorage.getItem(CSRF_TOKEN_KEY);
        if (stored) {
            const tokenData: CSRFToken = JSON.parse(stored);
            if (Date.now() - tokenData.createdAt < CSRF_TOKEN_EXPIRY) {
                return tokenData.token;
            }
        }
    } catch {
        // Generate new token if retrieval fails
    }
    return generateCSRFToken();
}

/**
 * CSRF middleware for fetch requests
 */
export function csrfFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers);
    headers.set(CSRF_TOKEN_HEADER, getCSRFToken());

    return fetch(url, { ...options, headers });
}

// ============================================
// XSS PROTECTION
// ============================================

// HTML entities map for escaping
const HTML_ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
};

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(str: string): string {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"'`=/]/g, char => HTML_ENTITIES[char] || char);
}

/**
 * Sanitize user-generated content for safe display
 * Removes script tags, event handlers, and dangerous attributes
 */
export function sanitizeContent(html: string): string {
    if (typeof html !== 'string') return '';

    let sanitized = html;

    // Remove script tags and their content
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove style tags and their content
    sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Remove event handlers (onclick, onerror, etc.)
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

    // Remove javascript: URLs
    sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
    sanitized = sanitized.replace(/src\s*=\s*["']javascript:[^"']*["']/gi, 'src=""');

    // Remove data: URLs (except for images)
    sanitized = sanitized.replace(/src\s*=\s*["']data:(?!image)[^"']*["']/gi, 'src=""');

    // Remove iframe, object, embed tags
    sanitized = sanitized.replace(/<(iframe|object|embed)[^>]*>.*?<\/\1>/gi, '');
    sanitized = sanitized.replace(/<(iframe|object|embed)[^>]*\/?>/gi, '');

    // Remove form and input tags
    sanitized = sanitized.replace(/<(form|input|button|select|textarea)[^>]*>.*?<\/\1>/gi, '');
    sanitized = sanitized.replace(/<(form|input|button|select|textarea)[^>]*\/?>/gi, '');

    // Remove base and meta tags
    sanitized = sanitized.replace(/<(base|meta)[^>]*\/?>/gi, '');

    // Remove link tags (external stylesheets)
    sanitized = sanitized.replace(/<link[^>]*\/?>/gi, '');

    // Remove expression() in CSS
    sanitized = sanitized.replace(/expression\s*\([^)]*\)/gi, '');

    // Remove behavior in CSS
    sanitized = sanitized.replace(/behavior\s*:\s*url[^;]*/gi, '');

    return sanitized.trim();
}

/**
 * Sanitize plain text input (no HTML allowed)
 */
export function sanitizeText(text: string): string {
    if (typeof text !== 'string') return '';
    return escapeHtml(text.trim());
}

/**
 * Sanitize URL to prevent javascript: and data: schemes
 */
export function sanitizeUrl(url: string): string {
    if (typeof url !== 'string') return '';

    const trimmed = url.trim().toLowerCase();

    // Block dangerous protocols
    if (trimmed.startsWith('javascript:') ||
        trimmed.startsWith('data:') ||
        trimmed.startsWith('vbscript:')) {
        return '';
    }

    return url.trim();
}

// ============================================
// FILE UPLOAD VALIDATION
// ============================================

interface FileValidationResult {
    valid: boolean;
    error?: string;
}

interface FileValidationOptions {
    maxSizeBytes?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
    maxNameLength?: number;
}

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const DEFAULT_DOCUMENT_TYPES = ['application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

/**
 * Validate file upload
 */
export function validateFile(
    file: File,
    options: FileValidationOptions = {}
): FileValidationResult {
    const {
        maxSizeBytes = DEFAULT_MAX_SIZE,
        allowedTypes = [...DEFAULT_IMAGE_TYPES, ...DEFAULT_DOCUMENT_TYPES],
        allowedExtensions,
        maxNameLength = 255
    } = options;

    // Check file exists
    if (!file) {
        return { valid: false, error: 'File tidak ditemukan' };
    }

    // Check file size
    if (file.size > maxSizeBytes) {
        const maxMB = Math.round(maxSizeBytes / 1024 / 1024);
        return { valid: false, error: `Ukuran file maksimal ${maxMB}MB` };
    }

    // Check file size is not zero
    if (file.size === 0) {
        return { valid: false, error: 'File kosong' };
    }

    // Check MIME type
    if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: `Tipe file tidak diizinkan: ${file.type}` };
    }

    // Check extension if specified
    if (allowedExtensions) {
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (!extension || !allowedExtensions.includes(extension)) {
            return { valid: false, error: `Ekstensi file tidak diizinkan: .${extension}` };
        }
    }

    // Check filename length
    if (file.name.length > maxNameLength) {
        return { valid: false, error: `Nama file terlalu panjang (max ${maxNameLength} karakter)` };
    }

    // Check for dangerous characters in filename
    const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (dangerousChars.test(file.name)) {
        return { valid: false, error: 'Nama file mengandung karakter tidak valid' };
    }

    return { valid: true };
}

/**
 * Validate image file specifically
 */
export function validateImageFile(
    file: File,
    options: { maxSizeBytes?: number; maxDimensions?: { width: number; height: number } } = {}
): Promise<FileValidationResult> {
    const { maxSizeBytes = 2 * 1024 * 1024, maxDimensions } = options;

    return new Promise((resolve) => {
        // Basic validation
        const basicResult = validateFile(file, {
            maxSizeBytes,
            allowedTypes: DEFAULT_IMAGE_TYPES,
            allowedExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
        });

        if (!basicResult.valid) {
            resolve(basicResult);
            return;
        }

        // Check dimensions if specified
        if (maxDimensions && file.type !== 'image/svg+xml') {
            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(url);

                if (img.width > maxDimensions.width || img.height > maxDimensions.height) {
                    resolve({
                        valid: false,
                        error: `Dimensi maksimal ${maxDimensions.width}x${maxDimensions.height}px`
                    });
                } else {
                    resolve({ valid: true });
                }
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve({ valid: false, error: 'File gambar tidak valid' });
            };

            img.src = url;
        } else {
            resolve({ valid: true });
        }
    });
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
    if (typeof filename !== 'string') return 'file';

    // Remove path separators and dangerous characters
    let sanitized = filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');

    // Remove leading/trailing dots and spaces
    sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');

    // Limit length
    if (sanitized.length > 200) {
        const ext = sanitized.split('.').pop() || '';
        const name = sanitized.substring(0, 200 - ext.length - 1);
        sanitized = `${name}.${ext}`;
    }

    return sanitized || 'file';
}

// ============================================
// CRYPTOGRAPHIC ACCESS CODES
// ============================================

/**
 * Generate cryptographically secure access code
 * Uses crypto.getRandomValues for true randomness
 */
export function generateSecureAccessCode(length: number = 6): string {
    // Exclude confusing characters: 0, O, I, L, 1
    const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);

    return Array.from(array, num => CHARS[num % CHARS.length]).join('');
}

/**
 * Generate cryptographically secure password
 */
export function generateSecurePassword(length: number = 16): string {
    const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const LOWER = 'abcdefghijklmnopqrstuvwxyz';
    const NUMBERS = '0123456789';
    const SPECIAL = '!@#$%^&*';
    const ALL = UPPER + LOWER + NUMBERS + SPECIAL;

    const array = new Uint32Array(length);
    crypto.getRandomValues(array);

    // Ensure at least one of each type
    const password = [
        UPPER[array[0] % UPPER.length],
        LOWER[array[1] % LOWER.length],
        NUMBERS[array[2] % NUMBERS.length],
        SPECIAL[array[3] % SPECIAL.length],
        ...Array.from(array.slice(4), num => ALL[num % ALL.length])
    ];

    // Shuffle the password
    for (let i = password.length - 1; i > 0; i--) {
        const j = array[i] % (i + 1);
        [password[i], password[j]] = [password[j], password[i]];
    }

    return password.join('');
}

/**
 * Generate secure token for sessions/verification
 */
export function generateSecureToken(byteLength: number = 32): string {
    const array = new Uint8Array(byteLength);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash string using SHA-256 (for non-password purposes)
 */
export async function hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

// ============================================
// AUDIT LOGGING
// ============================================

type AuditAction =
    | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED'
    | 'CREATE' | 'UPDATE' | 'DELETE'
    | 'VIEW_SENSITIVE' | 'EXPORT_DATA'
    | 'CHANGE_PASSWORD' | 'GENERATE_ACCESS_CODE'
    | 'PERMISSION_GRANTED' | 'PERMISSION_DENIED'
    | 'FILE_UPLOAD' | 'FILE_DELETE'
    | 'SETTING_CHANGED' | 'ADMIN_ACTION';

interface AuditLogEntry {
    id: string;
    action: AuditAction;
    userId?: string;
    targetType?: string;
    targetId?: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    timestamp: string;
    sessionId?: string;
}

const AUDIT_LOG_KEY = 'portal_guru_audit_log';
const MAX_AUDIT_ENTRIES = 1000;

/**
 * Log sensitive operation for audit trail
 */
export function auditLog(
    action: AuditAction,
    options: {
        userId?: string;
        targetType?: string;
        targetId?: string;
        details?: Record<string, any>;
    } = {}
): void {
    const entry: AuditLogEntry = {
        id: crypto.randomUUID(),
        action,
        userId: options.userId,
        targetType: options.targetType,
        targetId: options.targetId,
        details: options.details,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        sessionId: getSessionId()
    };

    // Store locally
    storeAuditLog(entry);

    // Log to console in development
    logger.info(`Audit: ${action}`, 'AuditLog', entry);

    // In production, you would send this to a secure server
    // sendAuditToServer(entry);
}

function storeAuditLog(entry: AuditLogEntry): void {
    try {
        const stored = localStorage.getItem(AUDIT_LOG_KEY);
        const logs: AuditLogEntry[] = stored ? JSON.parse(stored) : [];

        logs.unshift(entry);

        // Keep only the last N entries
        if (logs.length > MAX_AUDIT_ENTRIES) {
            logs.length = MAX_AUDIT_ENTRIES;
        }

        localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(logs));
    } catch {
        // Ignore storage errors
    }
}

/**
 * Get audit log entries
 */
export function getAuditLog(options: {
    action?: AuditAction;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
} = {}): AuditLogEntry[] {
    try {
        const stored = localStorage.getItem(AUDIT_LOG_KEY);
        if (!stored) return [];

        let logs: AuditLogEntry[] = JSON.parse(stored);

        // Filter by action
        if (options.action) {
            logs = logs.filter(l => l.action === options.action);
        }

        // Filter by user
        if (options.userId) {
            logs = logs.filter(l => l.userId === options.userId);
        }

        // Filter by date range
        if (options.startDate) {
            logs = logs.filter(l => new Date(l.timestamp) >= options.startDate!);
        }
        if (options.endDate) {
            logs = logs.filter(l => new Date(l.timestamp) <= options.endDate!);
        }

        // Apply limit
        if (options.limit) {
            logs = logs.slice(0, options.limit);
        }

        return logs;
    } catch {
        return [];
    }
}

/**
 * Clear audit log (admin only)
 */
export function clearAuditLog(): void {
    auditLog('ADMIN_ACTION', { details: { action: 'CLEAR_AUDIT_LOG' } });
    localStorage.removeItem(AUDIT_LOG_KEY);
}

/**
 * Export audit log as JSON
 */
export function exportAuditLog(): string {
    const logs = getAuditLog();
    auditLog('EXPORT_DATA', { details: { type: 'AUDIT_LOG', count: logs.length } });
    return JSON.stringify(logs, null, 2);
}

// ============================================
// SESSION MANAGEMENT
// ============================================

const SESSION_ID_KEY = 'portal_guru_session_id';

function getSessionId(): string {
    let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) {
        sessionId = generateSecureToken(16);
        sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    }
    return sessionId;
}

// ============================================
// FORM SANITIZATION WRAPPER
// ============================================

/**
 * Sanitize all string fields in an object
 */
export function sanitizeFormData<T extends Record<string, any>>(data: T): T {
    const sanitized = { ...data };

    for (const key in sanitized) {
        const value = sanitized[key];

        if (typeof value === 'string') {
            // Sanitize based on field type
            if (key.toLowerCase().includes('html') || key.toLowerCase().includes('content')) {
                (sanitized as any)[key] = sanitizeContent(value);
            } else if (key.toLowerCase().includes('url') || key.toLowerCase().includes('link')) {
                (sanitized as any)[key] = sanitizeUrl(value);
            } else {
                (sanitized as any)[key] = sanitizeText(value);
            }
        } else if (Array.isArray(value)) {
            (sanitized as any)[key] = value.map((item: any) =>
                typeof item === 'string' ? sanitizeText(item) : item
            );
        } else if (value && typeof value === 'object') {
            (sanitized as any)[key] = sanitizeFormData(value);
        }
    }

    return sanitized;
}

// ============================================
// CONTENT SECURITY POLICY HELPERS
// ============================================

/**
 * Get CSP nonce for inline scripts (should be generated server-side)
 */
export function getCSPNonce(): string {
    return generateSecureToken(16);
}

/**
 * Check if script src is allowed
 */
export function isAllowedScriptSrc(src: string, allowedDomains: string[]): boolean {
    try {
        const url = new URL(src);
        return allowedDomains.some(domain =>
            url.hostname === domain || url.hostname.endsWith(`.${domain}`)
        );
    } catch {
        return false;
    }
}

// ============================================
// EXPORTS
// ============================================

export const enhancedSecurity = {
    // CSRF
    generateCSRFToken,
    validateCSRFToken,
    getCSRFToken,
    csrfFetch,

    // XSS
    escapeHtml,
    sanitizeContent,
    sanitizeText,
    sanitizeUrl,

    // File validation
    validateFile,
    validateImageFile,
    sanitizeFilename,

    // Cryptographic
    generateSecureAccessCode,
    generateSecurePassword,
    generateSecureToken,
    hashString,

    // Audit
    auditLog,
    getAuditLog,
    clearAuditLog,
    exportAuditLog,

    // Form
    sanitizeFormData,

    // CSP
    getCSPNonce,
    isAllowedScriptSrc
};

export default enhancedSecurity;
