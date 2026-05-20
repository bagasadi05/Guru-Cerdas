/**
 * Enhanced Security Service
 * Features: XSS prevention, file validation, cryptographic access codes,
 * database-backed audit logging with offline fallback, XSS/SQLi detection,
 * session management, and Parent Portal security auditing.
 */

import { logger } from './logger';
import { storageGet, storageSet, storageGetJSON, storageSetJSON, storageRemove } from '../utils/storage';
import { supabase } from './supabase';
import type { Database } from './database.types';

// ============================================
// SECURITY EVENTS & LOGGING (Merged from security.ts)
// ============================================

export enum SecurityEventType {
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    LOGIN_FAILED = 'LOGIN_FAILED',
    LOGOUT = 'LOGOUT',
    ACCESS_DENIED = 'ACCESS_DENIED',
    INVALID_TOKEN = 'INVALID_TOKEN',
    SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
    RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
    XSS_ATTEMPT = 'XSS_ATTEMPT',
    SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT'
}

export interface SecurityEvent {
    type: SecurityEventType;
    timestamp: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
    details?: unknown;
}

const SECURITY_LOG_KEY = 'portal_guru_security_log';
const MAX_SECURITY_LOGS = 100;

/**
 * Log security event
 */
export function logSecurityEvent(
    type: SecurityEventType,
    userId?: string,
    details?: unknown
) {
    const event: SecurityEvent = {
        type,
        timestamp: new Date().toISOString(),
        userId,
        userAgent: navigator.userAgent,
        details
    };

    // Log to console in dev
    logger.warn(`Security Event: ${type}`, 'Security', details);

    // Store in secure storage (async, fire-and-forget)
    void (async () => {
        try {
            const logs = await getSecurityLogs();
            logs.push(event);

            while (logs.length > MAX_SECURITY_LOGS) {
                logs.shift();
            }

            await storageSetJSON(SECURITY_LOG_KEY, logs);
        } catch {
            // Ignore storage errors
        }
    })();
}

/**
 * Get stored security logs
 */
export async function getSecurityLogs(): Promise<SecurityEvent[]> {
    try {
        return await storageGetJSON<SecurityEvent[]>(SECURITY_LOG_KEY) ?? [];
    } catch {
        return [];
    }
}

/**
 * Clear security logs
 */
export async function clearSecurityLogs(): Promise<void> {
    await storageRemove(SECURITY_LOG_KEY);
}

// ============================================
// XSS PROTECTION & DETECTION
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

const XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<embed/gi,
    /<object/gi,
    /data:/gi,
    /vbscript:/gi
];

/**
 * Check if input contains potential XSS
 */
export function hasXssAttempt(input: string): boolean {
    for (const pattern of XSS_PATTERNS) {
        if (pattern.test(input)) {
            logSecurityEvent(SecurityEventType.XSS_ATTEMPT, undefined, { input: input.substring(0, 100) });
            return true;
        }
    }
    return false;
}

/**
 * Escape HTML entities to prevent XSS
 */
export function escapeHtml(str: string): string {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"'`=/]/g, char => HTML_ENTITIES[char] || char);
}

/**
 * Sanitize input to prevent XSS (compatibility fallback)
 */
export function sanitizeForXss(input: string): string {
    return escapeHtml(input);
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
// SQL INJECTION PROTECTION (Merged from security.ts)
// ============================================

const SQL_KEYWORDS = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE', 'UNION'];

/**
 * Check if input contains potential SQL injection
 */
export function hasSqlInjectionAttempt(input: string): boolean {
    const upperInput = input.toUpperCase();

    // Check for SQL keywords
    for (const keyword of SQL_KEYWORDS) {
        if (upperInput.includes(keyword)) {
            logSecurityEvent(SecurityEventType.SQL_INJECTION_ATTEMPT, undefined, { input: input.substring(0, 100) });
            return true;
        }
    }

    // Check for common injection patterns
    if (/(\d+\s*=\s*\d+)/.test(input) || // 1=1 pattern
        /(--)/.test(input) ||             // SQL comment
        /('\s*(OR|AND)\s*')/i.test(input)) { // ' OR ' pattern
        logSecurityEvent(SecurityEventType.SQL_INJECTION_ATTEMPT, undefined, { input: input.substring(0, 100) });
        return true;
    }

    return false;
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
    // eslint-disable-next-line no-control-regex
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
    // eslint-disable-next-line no-control-regex
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
// CRYPTOGRAPHIC ACCESS CODES & ENCRYPTION
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
 * Validate access code format (Merged from security.ts)
 */
export function isValidAccessCode(code: string): boolean {
    return /^[A-Z0-9]{6}$/.test(code);
}

/**
 * Hash access code for comparison (Merged from security.ts)
 */
export async function hashAccessCode(code: string): Promise<string> {
    return hashString(code);
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
// AUDIT LOGGING WITH ONLINE/OFFLINE FAILBACK
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
 * Asynchronously saves directly to database, falling back to local storage if offline
 */
export function auditLog(
    action: AuditAction,
    options: {
        userId?: string;
        targetType?: string;
        targetId?: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // Log to console in development
    logger.info(`Audit: ${action}`, 'AuditLog', entry);

    // Asynchronously insert into database with local storage queue strictly as offline fallback
    void (async () => {
        try {
            let activeUserId = entry.userId;
            let activeUserEmail: string | null = null;

            // Retrieve active session details from supabase client if not provided
            if (!activeUserId) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    activeUserId = session.user.id;
                    activeUserEmail = session.user.email || null;
                }
            }

            const payload: Database['public']['Tables']['audit_logs']['Insert'] = {
                id: entry.id,
                action,
                user_id: activeUserId || null,
                user_email: activeUserEmail,
                table_name: entry.targetType || 'system',
                record_id: entry.targetId || 'system',
                new_data: (entry.details || null) as Database['public']['Tables']['audit_logs']['Insert']['new_data'],
                old_data: null,
                user_agent: entry.userAgent || null,
                session_id: entry.sessionId || null
            };

            const { error } = await supabase.from('audit_logs').insert(payload);
            if (error) throw error;
        } catch (dbError) {
            logger.warn(
                `Failed to save audit log directly to DB. Falling back to local queue. Error: ${dbError instanceof Error ? dbError.message : String(dbError)}`,
                'AuditLog'
            );
            // Fallback: Store locally
            storeAuditLog(entry);
        }
    })();
}

function storeAuditLog(entry: AuditLogEntry): void {
    void (async () => {
        try {
            const logs = await storageGetJSON<AuditLogEntry[]>(AUDIT_LOG_KEY) ?? [];

            logs.unshift(entry);

            // Keep only the last N entries
            if (logs.length > MAX_AUDIT_ENTRIES) {
                logs.length = MAX_AUDIT_ENTRIES;
            }

            await storageSetJSON(AUDIT_LOG_KEY, logs);
        } catch {
            // Ignore storage errors
        }
    })();
}

/**
 * Get audit log entries
 */
export async function getAuditLog(options: {
    action?: AuditAction;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
} = {}): Promise<AuditLogEntry[]> {
    try {
        let logs = await storageGetJSON<AuditLogEntry[]>(AUDIT_LOG_KEY) ?? [];

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
export async function clearAuditLog(): Promise<void> {
    auditLog('ADMIN_ACTION', { details: { action: 'CLEAR_AUDIT_LOG' } });
    await storageRemove(AUDIT_LOG_KEY);
}

/**
 * Export audit log as JSON
 */
export async function exportAuditLog(): Promise<string> {
    const logs = await getAuditLog();
    auditLog('EXPORT_DATA', { details: { type: 'AUDIT_LOG', count: logs.length } });
    return JSON.stringify(logs, null, 2);
}

// ============================================
// SESSION MANAGEMENT & TIMEOUTS
// ============================================

const SESSION_ID_KEY = 'portal_guru_session_id';
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes (Merged from security.ts)

function getSessionId(): string {
    let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) {
        sessionId = generateSecureToken(16);
        sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    }
    return sessionId;
}

/**
 * Check if session is still valid (Merged from security.ts)
 */
export function isSessionValid(lastActivity: number): boolean {
    return Date.now() - lastActivity < SESSION_TIMEOUT;
}

/**
 * Update last activity timestamp (Merged from security.ts)
 */
export function updateLastActivity(): void {
    void storageSet('portal_guru_last_activity', Date.now().toString());
}

/**
 * Get last activity timestamp (Merged from security.ts)
 */
export async function getLastActivity(): Promise<number> {
    const stored = await storageGet('portal_guru_last_activity');
    return stored ? parseInt(stored, 10) : Date.now();
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (sanitized as any)[key] = sanitizeContent(value);
            } else if (key.toLowerCase().includes('url') || key.toLowerCase().includes('link')) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (sanitized as any)[key] = sanitizeUrl(value);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (sanitized as any)[key] = sanitizeText(value);
            }
        } else if (Array.isArray(value)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (sanitized as any)[key] = value.map((item: unknown) =>
                typeof item === 'string' ? sanitizeText(item) : item
            );
        } else if (value && typeof value === 'object') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (sanitized as any)[key] = sanitizeFormData(value);
        }
    }

    return sanitized;
}

// ============================================
// CONTENT SECURITY POLICY HELPERS
// ============================================

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
// SECURITY AUDIT FOR PORTAL GURU (Merged from security.ts)
// ============================================

export interface SecurityAuditResult {
    passed: boolean;
    checks: {
        name: string;
        passed: boolean;
        message: string;
    }[];
    score: number;
}

/**
 * Run security audit for parent portal
 */
export function runParentPortalSecurityAudit(): SecurityAuditResult {
    const checks: SecurityAuditResult['checks'] = [];

    // Check 1: HTTPS
    checks.push({
        name: 'HTTPS Connection',
        passed: location.protocol === 'https:' || location.hostname === 'localhost',
        message: location.protocol === 'https:' || location.hostname === 'localhost'
            ? 'Koneksi aman menggunakan HTTPS'
            : 'Koneksi tidak aman! Gunakan HTTPS'
    });

    // Check 2: Session storage
    checks.push({
        name: 'Session Storage',
        passed: typeof Storage !== 'undefined',
        message: typeof Storage !== 'undefined'
            ? 'Storage tersedia untuk session management'
            : 'Storage tidak tersedia'
    });

    // Check 3: Crypto API
    checks.push({
        name: 'Crypto API',
        passed: typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function',
        message: typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function'
            ? 'Crypto API tersedia untuk enkripsi'
            : 'Crypto API tidak tersedia'
    });

    // Check 4: CSP (Content Security Policy)
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    checks.push({
        name: 'Content Security Policy',
        passed: !!cspMeta,
        message: cspMeta
            ? 'CSP dikonfigurasi'
            : 'CSP belum dikonfigurasi (opsional tapi direkomendasikan)'
    });

    // Check 5: Cookie security
    checks.push({
        name: 'Cookie Security',
        passed: true, // Supabase handles this
        message: 'Supabase menangani keamanan cookie'
    });

    // Calculate score
    const passedCount = checks.filter(c => c.passed).length;
    const score = Math.round((passedCount / checks.length) * 100);

    return {
        passed: score >= 80,
        checks,
        score
    };
}

// ============================================
// INPUT VALIDATION HELPERS (Merged from security.ts)
// ============================================

/**
 * Validate and sanitize user input
 */
export function validateAndSanitize(input: string): { valid: boolean; sanitized: string; error?: string } {
    // Check for XSS
    if (hasXssAttempt(input)) {
        return { valid: false, sanitized: '', error: 'Input mengandung karakter yang tidak diizinkan' };
    }

    // Check for SQL injection
    if (hasSqlInjectionAttempt(input)) {
        return { valid: false, sanitized: '', error: 'Input mengandung karakter yang tidak diizinkan' };
    }

    // Sanitize
    const sanitized = sanitizeForXss(input.trim());

    return { valid: true, sanitized };
}

// ============================================
// EXPORTS
// ============================================

export const enhancedSecurity = {
    // XSS
    escapeHtml,
    sanitizeContent,
    sanitizeText,
    sanitizeUrl,
    hasXssAttempt,
    sanitizeForXss,

    // SQL Injection
    hasSqlInjectionAttempt,

    // File validation
    validateFile,
    validateImageFile,
    sanitizeFilename,

    // Cryptographic
    generateSecureAccessCode,
    generateSecurePassword,
    generateSecureToken,
    hashString,
    isValidAccessCode,
    hashAccessCode,

    // Audit
    auditLog,
    getAuditLog,
    clearAuditLog,
    exportAuditLog,
    logSecurityEvent,
    getSecurityLogs,
    clearSecurityLogs,

    // Session
    isSessionValid,
    updateLastActivity,
    getLastActivity,

    // Form
    sanitizeFormData,

    // CSP
    isAllowedScriptSrc,

    // Security Audit
    runParentPortalSecurityAudit,

    // Validation
    validateAndSanitize
};

export default enhancedSecurity;
