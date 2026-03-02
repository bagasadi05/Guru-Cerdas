import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MoreHorizontalIcon } from '../Icons';
import { useSound } from '../../hooks/useSound';
import { useHaptic } from '../../hooks/useHaptic';
import { mobileNavItems } from './mobileNavConfig';

interface MoreMenuItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface EnhancedMobileBottomNavProps {
  moreMenuItems: MoreMenuItem[];
  isMoreMenuOpen: boolean;
  onMoreMenuToggle: () => void;
}

/**
 * Enhanced Mobile Bottom Navigation Bar
 * Features:
 * - Optimized touch targets (60x52px)
 * - Active indicator pill
 * - Haptic feedback
 * - Better typography (12px)
 * - Safe area insets support
 */
const EnhancedMobileBottomNav: React.FC<EnhancedMobileBottomNavProps> = ({
  moreMenuItems,
  isMoreMenuOpen,
  onMoreMenuToggle,
}) => {
  const location = useLocation();
  const { playClick } = useSound();
  const { triggerHaptic } = useHaptic();

  // Check if current path is active
  const isPathActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  // Check if any "More" menu item is active
  const isMoreMenuActive = moreMenuItems.some((item) => isPathActive(item.href));
  const isMoreMenuHighlighted = isMoreMenuOpen || isMoreMenuActive;

  const handleNavClick = () => {
    playClick();
    triggerHaptic('light');
  };

  const handleMoreClick = () => {
    playClick();
    triggerHaptic('medium');
    onMoreMenuToggle();
  };

  return (
    <nav
      className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-30 
                bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl 
                border-t border-slate-200/50 dark:border-slate-700/50 
                shadow-[0_-2px_10px_rgba(0,0,0,0.1)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.3)]"
      style={{
        minHeight: '60px',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around px-3 pt-2">
        {/* Primary Navigation Items */}
        {mobileNavItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/dashboard'}
            onClick={handleNavClick}
            className="flex flex-col items-center justify-center gap-1 
                      relative touch-manipulation focus-visible:outline-none 
                      focus-visible:ring-2 focus-visible:ring-emerald-500/50 
                      focus-visible:ring-offset-2 rounded-xl transition-all duration-200"
            style={{ minWidth: '60px', minHeight: '52px' }}
            aria-label={item.label}
          >
            {({ isActive }) => (
              <>
                {/* Top Active Indicator Pill */}
                {isActive && (
                  <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 
                              w-8 h-1 bg-emerald-500 dark:bg-emerald-400 
                              rounded-full"
                  />
                )}

                {/* Icon Container */}
                <div
                  className={`p-2 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-emerald-500/15 dark:bg-emerald-500/20'
                      : 'bg-transparent'
                  }`}
                >
                  <item.icon
                    className={`w-[22px] h-[22px] transition-colors duration-200 ${
                      isActive
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  />
                </div>

                {/* Label with Responsive Size */}
                <span
                  className={`text-xs leading-4 transition-colors duration-200 ${
                              isActive
                                ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                                : 'font-medium text-slate-600 dark:text-slate-400'
                            }`}
                >
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}

        {/* More Button */}
        <button
          onClick={handleMoreClick}
          className="flex flex-col items-center justify-center gap-1 
                    relative touch-manipulation focus-visible:outline-none 
                    focus-visible:ring-2 focus-visible:ring-emerald-500/50 
                    focus-visible:ring-offset-2 rounded-xl transition-all duration-200"
          style={{ minWidth: '60px', minHeight: '52px' }}
          aria-label="More options"
          aria-expanded={isMoreMenuOpen}
          aria-haspopup="dialog"
          aria-current={isMoreMenuActive ? 'page' : undefined}
        >
          {/* Top Active Indicator for More Menu */}
          {isMoreMenuHighlighted && (
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 
                        w-8 h-1 bg-emerald-500 dark:bg-emerald-400 
                        rounded-full"
            />
          )}

          {/* Icon */}
          <div
            className={`p-2 rounded-xl transition-all duration-200 ${
              isMoreMenuHighlighted
                ? 'bg-emerald-500/15 dark:bg-emerald-500/20'
                : 'bg-transparent'
            }`}
          >
            <MoreHorizontalIcon
              className={`w-[22px] h-[22px] transition-colors duration-200 ${
                isMoreMenuHighlighted
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            />
          </div>

          {/* Label */}
          <span
            className={`text-xs leading-4 transition-colors duration-200 ${
                        isMoreMenuHighlighted
                          ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                          : 'font-medium text-slate-600 dark:text-slate-400'
                      }`}
          >
            Lainnya
          </span>
        </button>
      </div>
    </nav>
  );
};

export default EnhancedMobileBottomNav;
