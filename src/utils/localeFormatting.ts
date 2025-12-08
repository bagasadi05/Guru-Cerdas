/**
 * Locale Formatting Utilities
 * Format dates, numbers, and currency according to selected locale
 */

// Supported locales
export type SupportedLocale = 'id-ID' | 'en-US';

const LOCALE_MAP: Record<string, SupportedLocale> = {
    'id': 'id-ID',
    'en': 'en-US',
};

/**
 * Get the full locale code from language code
 */
export function getLocale(lang: string = 'id'): SupportedLocale {
    return LOCALE_MAP[lang] || 'id-ID';
}

// ============================================
// DATE FORMATTING
// ============================================

export interface DateFormatOptions {
    locale?: string;
    format?: 'short' | 'medium' | 'long' | 'full';
    includeTime?: boolean;
    includeDay?: boolean;
}

/**
 * Format date according to locale
 */
export function formatDate(
    date: Date | string | number,
    options: DateFormatOptions = {}
): string {
    const { locale = 'id', format = 'medium', includeTime = false, includeDay = true } = options;
    const fullLocale = getLocale(locale);
    const dateObj = date instanceof Date ? date : new Date(date);

    if (isNaN(dateObj.getTime())) {
        return '-';
    }

    const formatOptions: Intl.DateTimeFormatOptions = {};

    switch (format) {
        case 'short':
            formatOptions.day = '2-digit';
            formatOptions.month = '2-digit';
            formatOptions.year = 'numeric';
            break;
        case 'medium':
            formatOptions.day = 'numeric';
            formatOptions.month = 'short';
            formatOptions.year = 'numeric';
            break;
        case 'long':
            formatOptions.day = 'numeric';
            formatOptions.month = 'long';
            formatOptions.year = 'numeric';
            break;
        case 'full':
            formatOptions.weekday = 'long';
            formatOptions.day = 'numeric';
            formatOptions.month = 'long';
            formatOptions.year = 'numeric';
            break;
    }

    if (includeDay && format !== 'full') {
        formatOptions.weekday = 'short';
    }

    if (includeTime) {
        formatOptions.hour = '2-digit';
        formatOptions.minute = '2-digit';
    }

    return new Intl.DateTimeFormat(fullLocale, formatOptions).format(dateObj);
}

/**
 * Format time according to locale
 */
export function formatTime(
    date: Date | string | number,
    locale: string = 'id',
    use24Hour: boolean = true
): string {
    const fullLocale = getLocale(locale);
    const dateObj = date instanceof Date ? date : new Date(date);

    if (isNaN(dateObj.getTime())) {
        return '-';
    }

    return new Intl.DateTimeFormat(fullLocale, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: !use24Hour,
    }).format(dateObj);
}

/**
 * Get relative time (e.g., "5 minutes ago", "in 2 days")
 */
export function formatRelativeTime(
    date: Date | string | number,
    locale: string = 'id'
): string {
    const fullLocale = getLocale(locale);
    const dateObj = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diffMs = dateObj.getTime() - now.getTime();
    const diffSeconds = Math.round(diffMs / 1000);
    const diffMinutes = Math.round(diffSeconds / 60);
    const diffHours = Math.round(diffMinutes / 60);
    const diffDays = Math.round(diffHours / 24);
    const diffWeeks = Math.round(diffDays / 7);
    const diffMonths = Math.round(diffDays / 30);
    const diffYears = Math.round(diffDays / 365);

    const rtf = new Intl.RelativeTimeFormat(fullLocale, { numeric: 'auto' });

    if (Math.abs(diffSeconds) < 60) {
        return rtf.format(diffSeconds, 'seconds');
    } else if (Math.abs(diffMinutes) < 60) {
        return rtf.format(diffMinutes, 'minutes');
    } else if (Math.abs(diffHours) < 24) {
        return rtf.format(diffHours, 'hours');
    } else if (Math.abs(diffDays) < 7) {
        return rtf.format(diffDays, 'days');
    } else if (Math.abs(diffWeeks) < 4) {
        return rtf.format(diffWeeks, 'weeks');
    } else if (Math.abs(diffMonths) < 12) {
        return rtf.format(diffMonths, 'months');
    } else {
        return rtf.format(diffYears, 'years');
    }
}

/**
 * Get day name
 */
export function getDayName(
    dayIndex: number,
    locale: string = 'id',
    format: 'long' | 'short' | 'narrow' = 'long'
): string {
    const fullLocale = getLocale(locale);
    // Create a date that falls on the desired day
    // January 4, 2024 is a Thursday (dayIndex 4)
    const baseDate = new Date(2024, 0, 4 - 4 + dayIndex);
    return new Intl.DateTimeFormat(fullLocale, { weekday: format }).format(baseDate);
}

/**
 * Get month name
 */
export function getMonthName(
    monthIndex: number,
    locale: string = 'id',
    format: 'long' | 'short' | 'narrow' = 'long'
): string {
    const fullLocale = getLocale(locale);
    const date = new Date(2024, monthIndex, 1);
    return new Intl.DateTimeFormat(fullLocale, { month: format }).format(date);
}

// ============================================
// NUMBER FORMATTING
// ============================================

export interface NumberFormatOptions {
    locale?: string;
    decimals?: number;
    useGrouping?: boolean;
}

/**
 * Format number according to locale
 */
export function formatNumber(
    value: number,
    options: NumberFormatOptions = {}
): string {
    const { locale = 'id', decimals, useGrouping = true } = options;
    const fullLocale = getLocale(locale);

    const formatOptions: Intl.NumberFormatOptions = {
        useGrouping,
    };

    if (decimals !== undefined) {
        formatOptions.minimumFractionDigits = decimals;
        formatOptions.maximumFractionDigits = decimals;
    }

    return new Intl.NumberFormat(fullLocale, formatOptions).format(value);
}

/**
 * Format percentage
 */
export function formatPercent(
    value: number,
    locale: string = 'id',
    decimals: number = 0
): string {
    const fullLocale = getLocale(locale);

    return new Intl.NumberFormat(fullLocale, {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(value / 100);
}

/**
 * Format ordinal number (1st, 2nd, 3rd, etc.)
 */
export function formatOrdinal(value: number, locale: string = 'id'): string {
    if (locale === 'id') {
        return `ke-${value}`;
    } else {
        // English ordinals
        const suffixes = ['th', 'st', 'nd', 'rd'];
        const v = value % 100;
        return value + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
    }
}

// ============================================
// CURRENCY FORMATTING
// ============================================

export interface CurrencyFormatOptions {
    locale?: string;
    currency?: string;
    decimals?: number;
    compact?: boolean;
}

/**
 * Format currency according to locale
 */
export function formatCurrency(
    value: number,
    options: CurrencyFormatOptions = {}
): string {
    const { locale = 'id', currency = 'IDR', decimals = 0, compact = false } = options;
    const fullLocale = getLocale(locale);

    const formatOptions: Intl.NumberFormatOptions = {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    };

    if (compact) {
        formatOptions.notation = 'compact';
        formatOptions.compactDisplay = 'short';
    }

    return new Intl.NumberFormat(fullLocale, formatOptions).format(value);
}

/**
 * Format currency in a short form (e.g., Rp 1,5 jt)
 */
export function formatCurrencyShort(value: number, locale: string = 'id'): string {
    const fullLocale = getLocale(locale);

    if (locale === 'id') {
        if (value >= 1000000000) {
            return `Rp ${formatNumber(value / 1000000000, { locale, decimals: 1 })} M`;
        } else if (value >= 1000000) {
            return `Rp ${formatNumber(value / 1000000, { locale, decimals: 1 })} jt`;
        } else if (value >= 1000) {
            return `Rp ${formatNumber(value / 1000, { locale, decimals: 1 })} rb`;
        }
        return `Rp ${formatNumber(value, { locale })}`;
    } else {
        return new Intl.NumberFormat(fullLocale, {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
            compactDisplay: 'short',
        }).format(value);
    }
}

// ============================================
// FILE SIZE FORMATTING
// ============================================

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number, locale: string = 'id'): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let size = bytes;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${formatNumber(size, { locale, decimals: unitIndex === 0 ? 0 : 1 })} ${units[unitIndex]}`;
}

// ============================================
// DURATION FORMATTING
// ============================================

/**
 * Format duration in human-readable format
 */
export function formatDuration(
    seconds: number,
    locale: string = 'id',
    showSeconds: boolean = true
): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];

    if (locale === 'id') {
        if (hours > 0) parts.push(`${hours} jam`);
        if (minutes > 0) parts.push(`${minutes} menit`);
        if (showSeconds && secs > 0) parts.push(`${secs} detik`);
    } else {
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        if (showSeconds && secs > 0) parts.push(`${secs}s`);
    }

    return parts.length > 0 ? parts.join(' ') : (locale === 'id' ? '0 detik' : '0s');
}

// ============================================
// LIST FORMATTING
// ============================================

/**
 * Format a list with proper grammar
 */
export function formatList(
    items: string[],
    locale: string = 'id',
    type: 'conjunction' | 'disjunction' = 'conjunction'
): string {
    const fullLocale = getLocale(locale);

    if (items.length === 0) return '';
    if (items.length === 1) return items[0];

    try {
        return new Intl.ListFormat(fullLocale, { style: 'long', type }).format(items);
    } catch {
        // Fallback for browsers without ListFormat
        const conjunction = locale === 'id'
            ? (type === 'conjunction' ? ' dan ' : ' atau ')
            : (type === 'conjunction' ? ' and ' : ' or ');

        if (items.length === 2) {
            return items.join(conjunction);
        }

        return items.slice(0, -1).join(', ') + `,${conjunction}` + items[items.length - 1];
    }
}

// ============================================
// PLURAL FORMATTING
// ============================================

/**
 * Get correct plural form for Indonesian
 */
export function pluralize(
    count: number,
    singular: string,
    plural?: string,
    locale: string = 'id'
): string {
    // Indonesian doesn't have grammatical plural forms
    if (locale === 'id') {
        return `${formatNumber(count, { locale })} ${singular}`;
    }

    // English uses plural for count !== 1
    const word = count === 1 ? singular : (plural || singular + 's');
    return `${formatNumber(count, { locale })} ${word}`;
}

// ============================================
// EXPORTS
// ============================================

export const localeUtils = {
    getLocale,
    formatDate,
    formatTime,
    formatRelativeTime,
    getDayName,
    getMonthName,
    formatNumber,
    formatPercent,
    formatOrdinal,
    formatCurrency,
    formatCurrencyShort,
    formatFileSize,
    formatDuration,
    formatList,
    pluralize,
};

export default localeUtils;
