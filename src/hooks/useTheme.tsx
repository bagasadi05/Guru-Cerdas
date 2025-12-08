import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Available theme options for the application
 */
type Theme = 'light' | 'dark';

/**
 * Theme context type providing theme state and operations
 */
interface ThemeContextType {
  /** Current active theme */
  theme: Theme;
  /** Toggles between light and dark themes */
  toggleTheme: () => void;
  /** Sets a specific theme */
  setTheme: (theme: Theme) => void;
}

/**
 * React context for theme state and operations
 * @internal
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Theme provider component that manages application theme state
 * 
 * This component provides theme context to all child components, enabling:
 * - Light and dark theme switching
 * - Theme persistence in localStorage
 * - Automatic DOM class updates for Tailwind dark mode
 * - Prevention of Flash of Unstyled Content (FOUC) on page load
 * 
 * The provider synchronizes with an inline script in index.html that sets the initial
 * theme class before React hydrates, preventing theme flicker on page load.
 * 
 * @param props - Component props
 * @param props.children - Child components that will have access to theme context
 * 
 * @example
 * ```typescript
 * import { ThemeProvider } from './hooks/useTheme';
 * 
 * function App() {
 *   return (
 *     <ThemeProvider>
 *       <YourApp />
 *     </ThemeProvider>
 *   );
 * }
 * ```
 * 
 * @since 1.0.0
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    // Pada mount awal, React state disinkronkan dengan DOM.
    // Ini bergantung pada skrip inline di `index.html` yang telah berjalan
    // dan mengatur kelas yang benar pada elemen <html> untuk mencegah FOUC.
    if (typeof window !== 'undefined' && document.documentElement.classList.contains('dark')) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    // Effect ini menyinkronkan perubahan status (misalnya, dari toggle)
    // kembali ke DOM dan localStorage.
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    // Pertahankan pengaturan tema baru ke localStorage.
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme, setTheme }), [theme, toggleTheme]);

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
 *   const { theme, toggleTheme } = useTheme();
 * 
 *   return (
 *     <button onClick={toggleTheme}>
 *       {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
 *     </button>
 *   );
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Set a specific theme
 * function ThemeSelector() {
 *   const { theme, setTheme } = useTheme();
 * 
 *   return (
 *     <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
 *       <option value="light">Light</option>
 *       <option value="dark">Dark</option>
 *     </select>
 *   );
 * }
 * ```
 * 
 * @since 1.0.0
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};