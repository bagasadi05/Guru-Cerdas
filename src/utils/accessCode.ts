// Enhanced Access Code Generator with improved security
// - Longer codes (10 characters instead of 6)
// - Mixed case and special characters
// - Rate limiting
// - Expiration support

const ACCESS_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars (0, O, 1, I)
const SECURE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; // More entropy

// Rate limiting storage
const RATE_LIMIT_KEY = 'access_code_rate_limit';
const MAX_CODES_PER_HOUR = 10;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in ms

interface RateLimitData {
    timestamps: number[];
}

// Check rate limit
export const checkRateLimit = (): { allowed: boolean; remaining: number; resetIn: number } => {
    const now = Date.now();
    let data: RateLimitData;

    try {
        data = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || '{"timestamps":[]}');
    } catch {
        data = { timestamps: [] };
    }

    // Filter timestamps within the rate limit window
    const validTimestamps = data.timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);

    const remaining = MAX_CODES_PER_HOUR - validTimestamps.length;
    const oldestTimestamp = validTimestamps[0] || now;
    const resetIn = Math.max(0, RATE_LIMIT_WINDOW - (now - oldestTimestamp));

    return {
        allowed: remaining > 0,
        remaining,
        resetIn,
    };
};

// Record a code generation
const recordCodeGeneration = () => {
    const now = Date.now();
    let data: RateLimitData;

    try {
        data = JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || '{"timestamps":[]}');
    } catch {
        data = { timestamps: [] };
    }

    // Add new timestamp and filter old ones
    data.timestamps = [...data.timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW), now];
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data));
};

// Generate simple access code (6 chars, compatible with old system)
export const generateSimpleAccessCode = (): string => {
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += ACCESS_CODE_CHARS.charAt(Math.floor(Math.random() * ACCESS_CODE_CHARS.length));
    }
    return result;
};

// Generate secure access code (10 chars, mixed case)
export const generateSecureAccessCode = (): string => {
    let result = '';
    for (let i = 0; i < 10; i++) {
        result += SECURE_CODE_CHARS.charAt(Math.floor(Math.random() * SECURE_CODE_CHARS.length));
    }
    return result;
};

// Generate access code with rate limiting
export const generateAccessCodeWithRateLimit = (
    secure = false
): { code: string | null; error: string | null; remaining: number } => {
    const rateLimit = checkRateLimit();

    if (!rateLimit.allowed) {
        const minutes = Math.ceil(rateLimit.resetIn / 60000);
        return {
            code: null,
            error: `Batas pembuatan kode tercapai. Coba lagi dalam ${minutes} menit.`,
            remaining: 0,
        };
    }

    recordCodeGeneration();

    return {
        code: secure ? generateSecureAccessCode() : generateSimpleAccessCode(),
        error: null,
        remaining: rateLimit.remaining - 1,
    };
};

// Format access code for display (add dashes for readability)
export const formatAccessCode = (code: string): string => {
    if (code.length === 6) {
        return `${code.slice(0, 3)}-${code.slice(3)}`;
    }
    if (code.length === 10) {
        return `${code.slice(0, 3)}-${code.slice(3, 6)}-${code.slice(6)}`;
    }
    return code;
};

// Validate access code format
export const validateAccessCode = (code: string): boolean => {
    // Remove dashes if present
    const cleanCode = code.replace(/-/g, '');

    // Check length (6 or 10)
    if (cleanCode.length !== 6 && cleanCode.length !== 10) {
        return false;
    }

    // Check characters
    const validChars = cleanCode.length === 6 ? ACCESS_CODE_CHARS : SECURE_CODE_CHARS;
    return cleanCode.split('').every(char => validChars.includes(char));
};

// Calculate code strength
export const calculateCodeStrength = (code: string): 'weak' | 'medium' | 'strong' => {
    const cleanCode = code.replace(/-/g, '');

    if (cleanCode.length < 6) return 'weak';
    if (cleanCode.length < 8) return 'medium';

    // Check for mixed case
    const hasUpper = /[A-Z]/.test(cleanCode);
    const hasLower = /[a-z]/.test(cleanCode);
    const hasNumber = /[0-9]/.test(cleanCode);

    if (hasUpper && hasLower && hasNumber && cleanCode.length >= 10) {
        return 'strong';
    }

    return 'medium';
};

// Generate time-limited access code (with expiration)
export interface TimeLimitedCode {
    code: string;
    expiresAt: Date;
    isSecure: boolean;
}

export const generateTimeLimitedCode = (
    expirationHours = 24,
    secure = true
): TimeLimitedCode | null => {
    const result = generateAccessCodeWithRateLimit(secure);

    if (!result.code) return null;

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expirationHours);

    return {
        code: result.code,
        expiresAt,
        isSecure: secure,
    };
};

// Check if code is expired
export const isCodeExpired = (expiresAt: Date): boolean => {
    return new Date() > new Date(expiresAt);
};

export default {
    generateSimpleAccessCode,
    generateSecureAccessCode,
    generateAccessCodeWithRateLimit,
    formatAccessCode,
    validateAccessCode,
    calculateCodeStrength,
    generateTimeLimitedCode,
    isCodeExpired,
    checkRateLimit,
};
