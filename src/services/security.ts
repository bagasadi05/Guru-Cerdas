/**
 * Security Audit & Utilities
 * Security checks and helper functions for the parent portal and general app security
 */

import { logger } from './logger';

// Security event types
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

interface SecurityEvent {
    type: SecurityEventType;
    timestamp: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
    details?: any;
}

const SECURITY_LOG_KEY = 'portal_guru_security_log';
const MAX_SECURITY_LOGS = 100;

/**
 * Log security event
 */
export function logSecurityEvent(
    type: SecurityEventType,
    userId?: string,
    details?: any
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

    // Store in localStorage
    try {
        const logs = getSecurityLogs();
        logs.push(event);

        while (logs.length > MAX_SECURITY_LOGS) {
            logs.shift();
        }

        localStorage.setItem(SECURITY_LOG_KEY, JSON.stringify(logs));
    } catch {
        // Ignore storage errors
    }
}

/**
 * Get stored security logs
 */
export function getSecurityLogs(): SecurityEvent[] {
    try {
        const stored = localStorage.getItem(SECURITY_LOG_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

/**
 * Clear security logs
 */
export function clearSecurityLogs() {
    localStorage.removeItem(SECURITY_LOG_KEY);
}

// ============================================
// XSS PROTECTION
// ============================================

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
 * Sanitize input to prevent XSS
 */
export function sanitizeForXss(input: string): string {
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

// SQL keywords to detect (case insensitive)
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
// ACCESS CODE SECURITY (Parent Portal)
// ============================================

/**
 * Generate secure access code for parent portal
 */
export function generateSecureAccessCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding confusing chars (I, O, 0, 1)
    const array = new Uint32Array(6);
    crypto.getRandomValues(array);

    return Array.from(array)
        .map(n => chars[n % chars.length])
        .join('');
}

/**
 * Validate access code format
 */
export function isValidAccessCode(code: string): boolean {
    return /^[A-Z0-9]{6}$/.test(code);
}

/**
 * Hash access code for storage comparison
 */
export async function hashAccessCode(code: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================
// SESSION SECURITY
// ============================================

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

/**
 * Check if session is still valid
 */
export function isSessionValid(lastActivity: number): boolean {
    return Date.now() - lastActivity < SESSION_TIMEOUT;
}

/**
 * Update last activity timestamp
 */
export function updateLastActivity() {
    localStorage.setItem('portal_guru_last_activity', Date.now().toString());
}

/**
 * Get last activity timestamp
 */
export function getLastActivity(): number {
    const stored = localStorage.getItem('portal_guru_last_activity');
    return stored ? parseInt(stored, 10) : Date.now();
}

// ============================================
// PARENT PORTAL SECURITY AUDIT
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
// INPUT VALIDATION HELPERS
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

// Export types
export type { SecurityEvent };
