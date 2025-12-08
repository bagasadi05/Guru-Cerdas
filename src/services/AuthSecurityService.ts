/**
 * Authentication Security Service
 * Features: Password complexity validation, account lockout, session management
 */

import { logger } from './logger';

// ============================================
// PASSWORD COMPLEXITY VALIDATION
// ============================================

export interface PasswordStrengthResult {
    isValid: boolean;
    score: number; // 0-100
    level: 'weak' | 'fair' | 'good' | 'strong';
    errors: string[];
    suggestions: string[];
}

export interface PasswordRequirements {
    minLength: number;
    maxLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumber: boolean;
    requireSpecial: boolean;
    specialChars: string;
}

const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecial: true,
    specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?'
};

// Common weak passwords to reject
const COMMON_PASSWORDS = new Set([
    'password', 'password123', '12345678', '123456789', 'qwerty123',
    'letmein', 'welcome', 'admin123', 'iloveyou', 'sunshine',
    'princess', 'monkey', 'dragon', 'master', 'qwerty',
    'password1', 'abc123', '111111', '123123', 'welcome1'
]);

/**
 * Validate password complexity
 */
export function validatePasswordComplexity(
    password: string,
    requirements: Partial<PasswordRequirements> = {}
): PasswordStrengthResult {
    const reqs = { ...DEFAULT_PASSWORD_REQUIREMENTS, ...requirements };
    const errors: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // Check if password exists
    if (!password) {
        return {
            isValid: false,
            score: 0,
            level: 'weak',
            errors: ['Password tidak boleh kosong'],
            suggestions: ['Masukkan password']
        };
    }

    // Check minimum length
    if (password.length < reqs.minLength) {
        errors.push(`Password minimal ${reqs.minLength} karakter`);
    } else {
        score += 20;
        if (password.length >= 12) score += 10;
        if (password.length >= 16) score += 10;
    }

    // Check maximum length
    if (password.length > reqs.maxLength) {
        errors.push(`Password maksimal ${reqs.maxLength} karakter`);
    }

    // Check uppercase
    if (reqs.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password harus mengandung huruf besar (A-Z)');
    } else if (/[A-Z]/.test(password)) {
        score += 15;
    }

    // Check lowercase
    if (reqs.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password harus mengandung huruf kecil (a-z)');
    } else if (/[a-z]/.test(password)) {
        score += 15;
    }

    // Check numbers
    if (reqs.requireNumber && !/[0-9]/.test(password)) {
        errors.push('Password harus mengandung angka (0-9)');
    } else if (/[0-9]/.test(password)) {
        score += 15;
    }

    // Check special characters
    const specialRegex = new RegExp(`[${reqs.specialChars.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}]`);
    if (reqs.requireSpecial && !specialRegex.test(password)) {
        errors.push(`Password harus mengandung karakter spesial (${reqs.specialChars})`);
    } else if (specialRegex.test(password)) {
        score += 15;
    }

    // Check for common passwords
    if (COMMON_PASSWORDS.has(password.toLowerCase())) {
        errors.push('Password terlalu umum dan mudah ditebak');
        score = Math.min(score, 20);
    }

    // Check for sequential characters
    if (/(.)\1{2,}/.test(password)) {
        suggestions.push('Hindari karakter yang berulang berturut-turut');
        score -= 10;
    }

    // Check for sequential numbers
    if (/012|123|234|345|456|567|678|789/.test(password)) {
        suggestions.push('Hindari urutan angka berurutan');
        score -= 10;
    }

    // Check for sequential letters
    if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) {
        suggestions.push('Hindari urutan huruf berurutan');
        score -= 10;
    }

    // Additional suggestions
    if (password.length < 12) {
        suggestions.push('Gunakan password yang lebih panjang (12+ karakter) untuk keamanan lebih baik');
    }

    if (!/[A-Z].*[A-Z]/.test(password)) {
        suggestions.push('Tambahkan lebih banyak huruf besar');
    }

    if (!/[0-9].*[0-9]/.test(password)) {
        suggestions.push('Tambahkan lebih banyak angka');
    }

    // Normalize score
    score = Math.max(0, Math.min(100, score));

    // Determine level
    let level: PasswordStrengthResult['level'];
    if (score < 30) level = 'weak';
    else if (score < 50) level = 'fair';
    else if (score < 80) level = 'good';
    else level = 'strong';

    return {
        isValid: errors.length === 0,
        score,
        level,
        errors,
        suggestions
    };
}

/**
 * Get password strength color for UI
 */
export function getPasswordStrengthColor(level: PasswordStrengthResult['level']): string {
    switch (level) {
        case 'weak': return 'text-red-500';
        case 'fair': return 'text-orange-500';
        case 'good': return 'text-yellow-500';
        case 'strong': return 'text-green-500';
        default: return 'text-gray-500';
    }
}

/**
 * Get password strength bg color for progress bar
 */
export function getPasswordStrengthBgColor(level: PasswordStrengthResult['level']): string {
    switch (level) {
        case 'weak': return 'bg-red-500';
        case 'fair': return 'bg-orange-500';
        case 'good': return 'bg-yellow-500';
        case 'strong': return 'bg-green-500';
        default: return 'bg-gray-300';
    }
}

// ============================================
// ACCOUNT LOCKOUT
// ============================================

const LOCKOUT_KEY = 'portal_guru_lockout';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

interface LockoutData {
    email: string;
    failedAttempts: number;
    lockedUntil: number | null;
    lastFailedAt: number;
}

/**
 * Get lockout data for an email
 */
function getLockoutData(email: string): LockoutData | null {
    try {
        const stored = localStorage.getItem(`${LOCKOUT_KEY}_${email.toLowerCase()}`);
        if (!stored) return null;
        return JSON.parse(stored);
    } catch {
        return null;
    }
}

/**
 * Save lockout data
 */
function saveLockoutData(data: LockoutData): void {
    try {
        localStorage.setItem(`${LOCKOUT_KEY}_${data.email.toLowerCase()}`, JSON.stringify(data));
    } catch {
        // Ignore storage errors
    }
}

/**
 * Clear lockout data for an email
 */
export function clearLockout(email: string): void {
    try {
        localStorage.removeItem(`${LOCKOUT_KEY}_${email.toLowerCase()}`);
    } catch {
        // Ignore storage errors
    }
}

/**
 * Check if account is locked
 */
export function isAccountLocked(email: string): {
    locked: boolean;
    remainingTime: number;
    attemptsRemaining: number;
} {
    const data = getLockoutData(email);

    if (!data) {
        return { locked: false, remainingTime: 0, attemptsRemaining: MAX_FAILED_ATTEMPTS };
    }

    // Check if lockout has expired
    if (data.lockedUntil && Date.now() >= data.lockedUntil) {
        clearLockout(email);
        return { locked: false, remainingTime: 0, attemptsRemaining: MAX_FAILED_ATTEMPTS };
    }

    // Currently locked
    if (data.lockedUntil) {
        const remainingTime = data.lockedUntil - Date.now();
        return { locked: true, remainingTime, attemptsRemaining: 0 };
    }

    // Not locked yet, but has failed attempts
    return {
        locked: false,
        remainingTime: 0,
        attemptsRemaining: MAX_FAILED_ATTEMPTS - data.failedAttempts
    };
}

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(email: string): {
    locked: boolean;
    remainingAttempts: number;
    lockoutDuration: number;
} {
    let data = getLockoutData(email);

    if (!data) {
        data = {
            email: email.toLowerCase(),
            failedAttempts: 0,
            lockedUntil: null,
            lastFailedAt: Date.now()
        };
    }

    // Check if previous lockout expired
    if (data.lockedUntil && Date.now() >= data.lockedUntil) {
        // Reset after lockout expiry
        data.failedAttempts = 0;
        data.lockedUntil = null;
    }

    data.failedAttempts += 1;
    data.lastFailedAt = Date.now();

    // Check if should lock
    if (data.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        data.lockedUntil = Date.now() + LOCKOUT_DURATION;
        logger.warn('AuthSecurity', `Account locked due to ${MAX_FAILED_ATTEMPTS} failed attempts`, { email });
    }

    saveLockoutData(data);

    return {
        locked: data.lockedUntil !== null,
        remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - data.failedAttempts),
        lockoutDuration: data.lockedUntil ? LOCKOUT_DURATION : 0
    };
}

/**
 * Record successful login (clears lockout)
 */
export function recordSuccessfulLogin(email: string): void {
    clearLockout(email);
    logger.info('AuthSecurity', 'Successful login, lockout cleared', { email });
}

/**
 * Format remaining lockout time for display
 */
export function formatLockoutTime(remainingMs: number): string {
    const minutes = Math.ceil(remainingMs / 60000);
    if (minutes === 1) return '1 menit';
    return `${minutes} menit`;
}

// ============================================
// SESSION SECURITY
// ============================================

const SESSION_CONFIG_KEY = 'portal_guru_session_config';
const DEFAULT_SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const REMEMBER_ME_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

interface SessionConfig {
    lastActivity: number;
    rememberMe: boolean;
    timeout: number;
}

/**
 * Initialize session configuration
 */
export function initSession(rememberMe: boolean = false): void {
    const config: SessionConfig = {
        lastActivity: Date.now(),
        rememberMe,
        timeout: rememberMe ? REMEMBER_ME_DURATION : DEFAULT_SESSION_TIMEOUT
    };
    localStorage.setItem(SESSION_CONFIG_KEY, JSON.stringify(config));
}

/**
 * Update last activity timestamp
 */
export function updateSessionActivity(): void {
    try {
        const stored = localStorage.getItem(SESSION_CONFIG_KEY);
        if (stored) {
            const config: SessionConfig = JSON.parse(stored);
            config.lastActivity = Date.now();
            localStorage.setItem(SESSION_CONFIG_KEY, JSON.stringify(config));
        }
    } catch {
        // Ignore errors
    }
}

/**
 * Check if session has expired
 */
export function isSessionExpired(): boolean {
    try {
        const stored = localStorage.getItem(SESSION_CONFIG_KEY);
        if (!stored) return true;

        const config: SessionConfig = JSON.parse(stored);
        const now = Date.now();
        const elapsed = now - config.lastActivity;

        return elapsed > config.timeout;
    } catch {
        return true;
    }
}

/**
 * Get remaining session time
 */
export function getSessionTimeRemaining(): number {
    try {
        const stored = localStorage.getItem(SESSION_CONFIG_KEY);
        if (!stored) return 0;

        const config: SessionConfig = JSON.parse(stored);
        const elapsed = Date.now() - config.lastActivity;
        return Math.max(0, config.timeout - elapsed);
    } catch {
        return 0;
    }
}

/**
 * Clear session on logout
 */
export function clearSession(): void {
    localStorage.removeItem(SESSION_CONFIG_KEY);
    sessionStorage.clear();
    logger.info('AuthSecurity', 'Session cleared');
}

// ============================================
// EXPORTS
// ============================================

export const authSecurity = {
    // Password validation
    validatePasswordComplexity,
    getPasswordStrengthColor,
    getPasswordStrengthBgColor,

    // Account lockout
    isAccountLocked,
    recordFailedAttempt,
    recordSuccessfulLogin,
    clearLockout,
    formatLockoutTime,

    // Session management
    initSession,
    updateSessionActivity,
    isSessionExpired,
    getSessionTimeRemaining,
    clearSession
};

export default authSecurity;
