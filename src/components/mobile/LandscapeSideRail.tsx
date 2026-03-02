import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSound } from '../../hooks/useSound';
import { useHaptic } from '../../hooks/useHaptic';
import { MoreHorizontalIcon } from '../Icons';
import { type MobileNavItem } from './mobileNavConfig';

interface LandscapeSideRailProps {
  navItems: MobileNavItem[];
  moreMenuItems: MobileNavItem[];
  isMoreMenuOpen: boolean;
  onMoreMenuToggle: () => void;
}

/**
 * Landscape Side Rail Navigation
 * Displays vertically on the left side in landscape orientation
 * Optimizes horizontal screen space (16:9 ratio)
 */
const LandscapeSideRail: React.FC<LandscapeSideRailProps> = ({
  navItems,
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
    <aside
      className="fixed left-0 top-16 bottom-0 w-16 z-30
                bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl 
                border-r border-slate-200/50 dark:border-slate-800/50
                flex flex-col items-center py-3 gap-1
                overflow-y-auto scrollbar-hide"
      role="navigation"
      aria-label="Side rail navigation"
    >
      {/* Primary Navigation Items */}
      {navItems.map((item) => {
        const isActive = isPathActive(item.href);
        return (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/dashboard'}
            onClick={handleNavClick}
            className={`w-12 h-12 rounded-xl flex items-center justify-center
                      transition-all duration-300 relative group
                      focus-visible:outline-none focus-visible:ring-2 
                      focus-visible:ring-green-500/60 ${
                        isActive
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/20'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            {/* Active Indicator Bar */}
            {isActive && (
              <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="absolute left-0 top-1/2 -translate-y-1/2 
                          w-1 h-8 bg-white dark:bg-green-400 rounded-r-full"
              />
            )}

            {/* Icon */}
            <item.icon
              className={`w-6 h-6 transition-transform ${
                isActive
                  ? 'text-white scale-110'
                  : 'text-slate-600 dark:text-slate-400 group-hover:scale-110'
              }`}
            />

            {/* Tooltip on hover */}
            <div
              className="absolute left-full ml-2 px-3 py-1.5 rounded-lg
                        bg-slate-900 dark:bg-slate-800 text-white text-sm
                        opacity-0 group-hover:opacity-100 pointer-events-none
                        transition-opacity duration-200 whitespace-nowrap
                        shadow-lg"
            >
              {item.label}
            </div>
          </NavLink>
        );
      })}

      {/* Divider */}
      <div className="w-8 h-px bg-slate-200 dark:bg-slate-700 my-1" />

      {/* More Button */}
      <button
        onClick={handleMoreClick}
        className={`w-12 h-12 rounded-xl flex items-center justify-center
                  transition-all duration-300 relative group
                  focus-visible:outline-none focus-visible:ring-2 
                  focus-visible:ring-green-500/60 ${
                    isMoreMenuHighlighted
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/20'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
        aria-label="More options"
        aria-expanded={isMoreMenuOpen}
        aria-haspopup="dialog"
      >
        {/* Active Indicator Bar */}
        {isMoreMenuHighlighted && (
          <motion.div
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute left-0 top-1/2 -translate-y-1/2 
                      w-1 h-8 bg-white dark:bg-green-400 rounded-r-full"
          />
        )}

        {/* Icon with rotation */}
        <motion.div
          animate={{
            rotate: isMoreMenuOpen ? 90 : 0,
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20,
          }}
        >
          <MoreHorizontalIcon
            className={`w-6 h-6 transition-transform ${
              isMoreMenuHighlighted
                ? 'text-white scale-110'
                : 'text-slate-600 dark:text-slate-400 group-hover:scale-110'
            }`}
          />
        </motion.div>

        {/* Tooltip */}
        <div
          className="absolute left-full ml-2 px-3 py-1.5 rounded-lg
                    bg-slate-900 dark:bg-slate-800 text-white text-sm
                    opacity-0 group-hover:opacity-100 pointer-events-none
                    transition-opacity duration-200 whitespace-nowrap
                    shadow-lg"
        >
          Lainnya
        </div>
      </button>
    </aside>
  );
};

export default LandscapeSideRail;
