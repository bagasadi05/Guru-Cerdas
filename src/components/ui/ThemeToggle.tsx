
import React from 'react';
import { useTheme } from '../../hooks/useTheme';
import { Button } from './Button';
import { SunIcon, MoonIcon } from '../Icons';
import { Monitor } from 'lucide-react';

/**
 * Theme Toggle Button Component
 * 
 * Cycles through: Light → Dark → System (Auto)
 * Includes smooth icon animation when switching themes
 */
const ThemeToggle: React.FC = () => {
  const { theme, themePreference, toggleTheme, isSystemTheme } = useTheme();
  const iconKey = themePreference;

  const getIcon = () => {
    if (isSystemTheme) {
      return <Monitor className="w-5 h-5 text-brand-600 dark:text-brand-400" />;
    }
    if (theme === 'light') {
      return <SunIcon className="w-5 h-5 text-amber-500" />;
    }
    return <MoonIcon className="w-5 h-5 text-brand-400" />;
  };

  const getTooltip = () => {
    if (isSystemTheme) return 'Mode: Otomatis (Sistem)';
    if (theme === 'light') return 'Mode: Terang';
    return 'Mode: Gelap';
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title={getTooltip()}
      className="relative flex items-center justify-center h-11 w-11 min-h-[44px] min-w-[44px] rounded-xl border border-black/5 bg-white/50 hover:bg-white dark:border-white/10 dark:bg-slate-800/50 dark:hover:bg-slate-800 transition-all active:scale-95 overflow-hidden"
    >
      <div key={iconKey} className="animate-icon-spin">
        {getIcon()}
      </div>

      {/* Indicator dot for system mode */}
      {isSystemTheme && (
        <span className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 bg-brand-500 rounded-full" />
      )}
    </Button>
  );
};

export default ThemeToggle;
