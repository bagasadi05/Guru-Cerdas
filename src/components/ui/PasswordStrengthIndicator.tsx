/**
 * Password Strength Indicator Component
 * Shows real-time password strength feedback with progress bar and tips
 */

import React, { useMemo } from 'react';
import {
    validatePasswordComplexity,
    getPasswordStrengthBgColor,
    PasswordStrengthResult
} from '../../services/AuthSecurityService';
import { CheckCircle2Icon, XCircleIcon, AlertCircleIcon } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
    password: string;
    showRequirements?: boolean;
    showSuggestions?: boolean;
    className?: string;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
    password,
    showRequirements = true,
    showSuggestions = true,
    className = ''
}) => {
    const result = useMemo(() => {
        return validatePasswordComplexity(password);
    }, [password]);

    if (!password) return null;

    const getLevelLabel = (level: PasswordStrengthResult['level']): string => {
        switch (level) {
            case 'weak': return 'Lemah';
            case 'fair': return 'Cukup';
            case 'good': return 'Baik';
            case 'strong': return 'Kuat';
            default: return '';
        }
    };

    const getLevelTextColor = (level: PasswordStrengthResult['level']): string => {
        switch (level) {
            case 'weak': return 'text-red-500';
            case 'fair': return 'text-orange-500';
            case 'good': return 'text-yellow-600 dark:text-yellow-400';
            case 'strong': return 'text-green-500';
            default: return 'text-slate-500';
        }
    };

    return (
        <div className={`space-y-2 ${className}`}>
            {/* Strength bar */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">Kekuatan Password</span>
                    <span className={`font-medium ${getLevelTextColor(result.level)}`}>
                        {getLevelLabel(result.level)}
                    </span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-300 ${getPasswordStrengthBgColor(result.level)}`}
                        style={{ width: `${result.score}%` }}
                    />
                </div>
            </div>

            {/* Requirements checklist */}
            {showRequirements && (
                <div className="space-y-1 text-xs">
                    <Requirement
                        met={password.length >= 8}
                        text="Minimal 8 karakter"
                    />
                    <Requirement
                        met={/[A-Z]/.test(password)}
                        text="Huruf besar (A-Z)"
                    />
                    <Requirement
                        met={/[a-z]/.test(password)}
                        text="Huruf kecil (a-z)"
                    />
                    <Requirement
                        met={/[0-9]/.test(password)}
                        text="Angka (0-9)"
                    />
                    <Requirement
                        met={/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)}
                        text="Karakter spesial (!@#$...)"
                    />
                </div>
            )}

            {/* Errors */}
            {result.errors.length > 0 && (
                <div className="space-y-1">
                    {result.errors.map((error, index) => (
                        <div
                            key={index}
                            className="flex items-start gap-1.5 text-xs text-red-500"
                        >
                            <XCircleIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Suggestions */}
            {showSuggestions && result.suggestions.length > 0 && result.errors.length === 0 && (
                <div className="space-y-1">
                    {result.suggestions.slice(0, 2).map((suggestion, index) => (
                        <div
                            key={index}
                            className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400"
                        >
                            <AlertCircleIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <span>{suggestion}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Requirement check item
const Requirement: React.FC<{ met: boolean; text: string }> = ({ met, text }) => (
    <div className={`flex items-center gap-1.5 ${met ? 'text-green-500' : 'text-slate-400'}`}>
        {met ? (
            <CheckCircle2Icon className="w-3.5 h-3.5" />
        ) : (
            <div className="w-3.5 h-3.5 rounded-full border border-current" />
        )}
        <span>{text}</span>
    </div>
);

export default PasswordStrengthIndicator;
