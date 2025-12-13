import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Available theme options for the application
 * - 'light': Light theme
 * - 'dark': Dark theme
 * - 'system': Follow system preference
 */
type ThemePreference = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

/**
 * Theme context type providing theme state and operations
 */
interface ThemeContextType {
  /** Current theme preference (user selection) */
  themePreference: ThemePreference;
  /** Current resolved theme (actual applied theme) */
  theme: ResolvedTheme;
  /** Toggles between light, dark, and system themes */
  toggleTheme: () => void;
  /** Sets a specific theme preference */
  setTheme: (theme: ThemePreference) => void;
  /** Whether the theme is following system preference */
  isSystemTheme: boolean;
}

/**
 * React context for theme state and operations
 * @internal
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Gets the system color scheme preference
 */
const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/**
 * Theme provider component that manages application theme state
 * 
 * This component provides theme context to all child components, enabling:
 * - Light, dark, and system (auto) theme switching
 * - Theme persistence in localStorage
 * - Automatic DOM class updates for Tailwind dark mode
 * - Smooth theme transition animations
 * - System preference change detection
 * 
 * @param props - Component props
 * @param props.children - Child components that will have access to theme context
 * 
 * @since 2.0.0 - Added system preference support
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themePreference, setThemePreference] = useState<ThemePreference>(() => {
    if (typeof window === 'undefined') return 'system';
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    // Default to system preference
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (typeof window !== 'undefined' && document.documentElement.classList.contains('dark')) {
      return 'dark';
    }
    return 'light';
  });

  // Listen for system theme changes when in 'system' mode
  useEffect(() => {
    if (themePreference !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? 'dark' : 'light');
    };

    // Set initial system theme
    setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [themePreference]);

  // Update resolved theme when preference changes
  useEffect(() => {
    if (themePreference === 'system') {
      setResolvedTheme(getSystemTheme());
    } else {
      setResolvedTheme(themePreference);
    }
  }, [themePreference]);

  // Apply theme to DOM with transition animation
  useEffect(() => {
    const root = window.document.documentElement;

    // Add transition class for smooth color changes
    root.classList.add('theme-transitioning');

    // Apply theme
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Remove transition class after animation completes
    const timeout = setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 300);

    // Store preference
    localStorage.setItem('theme', themePreference);

    return () => clearTimeout(timeout);
  }, [resolvedTheme, themePreference]);

  const toggleTheme = useCallback(() => {
    setThemePreference(prev => {
      // Cycle: light -> dark -> system -> light
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'system';
      return 'light';
    });
  }, []);

  const setTheme = useCallback((theme: ThemePreference) => {
    setThemePreference(theme);
  }, []);

  const value = useMemo(() => ({
    themePreference,
    theme: resolvedTheme,
    toggleTheme,
    setTheme,
    isSystemTheme: themePreference === 'system',
  }), [themePreference, resolvedTheme, toggleTheme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * Custom hook for accessing and controlling application theme
 * 
 * Provides access to the current theme state and functions to change the theme.
 * The theme is persisted in localStorage and automatically applied to the DOM
 * via Tailwind's dark mode class on the html element.
 * 
 * Now supports 'system' mode which follows the OS color scheme preference.
 * 
 * Must be used within a ThemeProvider component.
 * 
 * @returns Theme context with current theme and control functions
 * @throws {Error} If used outside of ThemeProvider
 * 
 * @example
 * ```typescript
 * import { useTheme } from './hooks/useTheme';
 * 
 * function ThemeToggleButton() {
 *   const { theme, themePreference, toggleTheme, isSystemTheme } = useTheme();
 * 
 *   return (
 *     <button onClick={toggleTheme}>
 *       {isSystemTheme ? '🖥️ Auto' : theme === 'light' ? '☀️ Light' : '🌙 Dark'}
 *     </button>
 *   );
 * }
 * ```
 * 
 * @since 2.0.0
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};