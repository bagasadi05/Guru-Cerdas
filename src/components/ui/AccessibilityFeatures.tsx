import React, { createContext, useContext, useState, useEffect } from 'react';

// Skip Links Component
export const SkipLinks: React.FC = () => {
    return (
        <div className="skip-links">
            <a href="#main-content" className="skip-link">
                Skip to main content
            </a>
            <a href="#navigation" className="skip-link">
                Skip to navigation
            </a>
            <a href="#search" className="skip-link">
                Skip to search
            </a>
        </div>
    );
};

// High Contrast Mode Context
interface AccessibilityContextType {
    highContrastMode: boolean;
    toggleHighContrast: () => void;
    reducedMotion: boolean;
    toggleReducedMotion: () => void;
    fontSize: 'normal' | 'large' | 'x-large';
    setFontSize: (size: 'normal' | 'large' | 'x-large') => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [highContrastMode, setHighContrastMode] = useState(() => {
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem('highContrastMode') === 'true';
        }
        return false;
    });

    const [reducedMotion, setReducedMotion] = useState(() => {
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem('reducedMotion') === 'true';
        }
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });

    const [fontSize, setFontSize] = useState<'normal' | 'large' | 'x-large'>(() => {
        if (typeof localStorage !== 'undefined') {
            return (localStorage.getItem('fontSize') as 'normal' | 'large' | 'x-large') || 'normal';
        }
        return 'normal';
    });

    useEffect(() => {
        if (highContrastMode) {
            document.documentElement.classList.add('high-contrast');
        } else {
            document.documentElement.classList.remove('high-contrast');
        }
        localStorage.setItem('highContrastMode', String(highContrastMode));
    }, [highContrastMode]);

    useEffect(() => {
        if (reducedMotion) {
            document.documentElement.classList.add('reduce-motion');
        } else {
            document.documentElement.classList.remove('reduce-motion');
        }
        localStorage.setItem('reducedMotion', String(reducedMotion));
    }, [reducedMotion]);

    useEffect(() => {
        document.documentElement.setAttribute('data-font-size', fontSize);
        localStorage.setItem('fontSize', fontSize);
    }, [fontSize]);

    const toggleHighContrast = () => setHighContrastMode(prev => !prev);
    const toggleReducedMotion = () => setReducedMotion(prev => !prev);

    return (
        <AccessibilityContext.Provider
            value={{
                highContrastMode,
                toggleHighContrast,
                reducedMotion,
                toggleReducedMotion,
                fontSize,
                setFontSize,
            }}
        >
            {children}
        </AccessibilityContext.Provider>
    );
};

export const useAccessibility = () => {
    const context = useContext(AccessibilityContext);
    if (!context) {
        throw new Error('useAccessibility must be used within AccessibilityProvider');
    }
    return context;
};

// Accessibility Settings Panel
export const AccessibilitySettings: React.FC<{ className?: string }> = ({ className = '' }) => {
    const { highContrastMode, toggleHighContrast, reducedMotion, toggleReducedMotion, fontSize, setFontSize } =
        useAccessibility();

    return (
        <div className={`space-y-6 ${className}`}>
            <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                    Accessibility Settings
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Customize the interface to better suit your needs
                </p>
            </div>

            {/* High Contrast Mode */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div>
                    <label
                        htmlFor="high-contrast-toggle"
                        className="font-medium text-slate-900 dark:text-white block mb-1"
                    >
                        High Contrast Mode
                    </label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Increase color contrast for better readability
                    </p>
                </div>
                <button
                    id="high-contrast-toggle"
                    onClick={toggleHighContrast}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${highContrastMode ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                    role="switch"
                    aria-checked={highContrastMode}
                    aria-label="Toggle high contrast mode"
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${highContrastMode ? 'translate-x-6' : 'translate-x-1'
                            }`}
                    />
                </button>
            </div>

            {/* Reduced Motion */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <div>
                    <label
                        htmlFor="reduced-motion-toggle"
                        className="font-medium text-slate-900 dark:text-white block mb-1"
                    >
                        Reduce Motion
                    </label>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Minimize animations and transitions
                    </p>
                </div>
                <button
                    id="reduced-motion-toggle"
                    onClick={toggleReducedMotion}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${reducedMotion ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                    role="switch"
                    aria-checked={reducedMotion}
                    aria-label="Toggle reduced motion"
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${reducedMotion ? 'translate-x-6' : 'translate-x-1'
                            }`}
                    />
                </button>
            </div>

            {/* Font Size */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <label className="font-medium text-slate-900 dark:text-white block mb-3">
                    Text Size
                </label>
                <div className="flex gap-2">
                    {(['normal', 'large', 'x-large'] as const).map((size) => (
                        <button
                            key={size}
                            onClick={() => setFontSize(size)}
                            className={`flex-1 px-4 py-2 rounded-lg font-medium text-sm transition-all ${fontSize === size
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                                }`}
                            aria-label={`Set text size to ${size}`}
                        >
                            {size === 'normal' && 'Normal'}
                            {size === 'large' && 'Large'}
                            {size === 'x-large' && 'X-Large'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Screen Reader Information */}
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <h4 className="font-medium text-blue-900 dark:text-blue-200 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                            fillRule="evenodd"
                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                            clipRule="evenodd"
                        />
                    </svg>
                    Screen Reader Users
                </h4>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                    This application includes ARIA labels and landmarks for screen reader compatibility.
                    Press <kbd className="px-2 py-1 bg-white dark:bg-blue-950 rounded border border-blue-300 dark:border-blue-700 text-xs font-semibold">?</kbd> to view keyboard shortcuts.
                </p>
            </div>
        </div>
    );
};

export default { SkipLinks, AccessibilityProvider, useAccessibility, AccessibilitySettings };
