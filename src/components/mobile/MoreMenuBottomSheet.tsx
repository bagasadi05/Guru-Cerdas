import React, { useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSound } from '../../hooks/useSound';
import { useHaptic } from '../../hooks/useHaptic';

interface MoreMenuItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface MoreMenuBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  items: MoreMenuItem[];
}

/**
 * More Menu Bottom Sheet Component
 * Simplified version without complex drag gestures for better reliability
 */
const MoreMenuBottomSheet: React.FC<MoreMenuBottomSheetProps> = ({
  isOpen,
  onClose,
  items,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { playClick } = useSound();
  const { triggerHaptic } = useHaptic();
  const sheetRef = useRef<HTMLDivElement>(null);

  // Check if current path is active
  const isPathActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  // Close handler - memoized to prevent stale closure
  const handleClose = useCallback(() => {
    playClick();
    triggerHaptic('light');
    onClose();
  }, [onClose, playClick, triggerHaptic]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  // Handle item click
  const handleItemClick = (href: string) => {
    playClick();
    triggerHaptic('medium');
    onClose();
    // Small delay to let animation start before navigation
    setTimeout(() => navigate(href), 50);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={handleClose}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleClose();
        }}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 z-[101]
                  bg-white dark:bg-slate-900 
                  rounded-t-3xl shadow-2xl 
                  border-t border-slate-200 dark:border-slate-700
                  animate-slide-up"
        style={{
          maxHeight: '70vh',
          paddingBottom: 'max(env(safe-area-inset-bottom), 16px)',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="More menu"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle Visual (tap to close) */}
        <button
          type="button"
          onClick={handleClose}
          className="w-full flex justify-center pt-3 pb-2 cursor-pointer 
                    hover:bg-slate-50 dark:hover:bg-slate-800/50 
                    transition-colors rounded-t-3xl"
          aria-label="Close menu"
        >
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
        </button>

        {/* Header */}
        <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            Menu Lainnya
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Pilih menu untuk melanjutkan
          </p>
        </div>

        {/* Content - Grid Layout */}
        <div 
          className="px-6 py-4 overflow-y-auto overscroll-contain" 
          style={{ maxHeight: 'calc(70vh - 180px)' }}
        >
          <div className="grid grid-cols-2 gap-3">
            {items.map((item) => {
              const isActive = isPathActive(item.href);
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => handleItemClick(item.href)}
                  className={`flex flex-col items-center gap-3 p-4 rounded-2xl
                            transition-all duration-200 
                            active:scale-95
                            focus-visible:outline-none 
                            focus-visible:ring-2 focus-visible:ring-green-500/60 
                            focus-visible:ring-offset-2 ${
                              isActive
                                ? 'bg-green-50 dark:bg-green-500/20 ring-2 ring-green-500/50'
                                : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700'
                            }`}
                  style={{ minHeight: '96px' }}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {/* Icon Container */}
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform ${
                      isActive
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30 scale-105'
                        : 'bg-white dark:bg-slate-700'
                    }`}
                  >
                    <item.icon
                      className={`w-6 h-6 ${
                        isActive ? 'text-white' : 'text-slate-600 dark:text-slate-400'
                      }`}
                    />
                  </div>

                  {/* Label */}
                  <span
                    className={`text-sm text-center leading-tight ${
                      isActive
                        ? 'font-bold text-green-700 dark:text-green-200'
                        : 'font-semibold text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Close Button */}
        <div className="px-6 pb-4 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="w-full py-3.5 rounded-xl
                      bg-slate-100 dark:bg-slate-800 
                      hover:bg-slate-200 dark:hover:bg-slate-700
                      active:bg-slate-300 dark:active:bg-slate-600
                      text-slate-700 dark:text-slate-300 
                      font-semibold text-sm
                      transition-colors duration-150
                      focus-visible:outline-none focus-visible:ring-2 
                      focus-visible:ring-green-500/60
                      select-none"
          >
            Tutup
          </button>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { 
            transform: translateY(100%); 
            opacity: 0;
          }
          to { 
            transform: translateY(0); 
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default MoreMenuBottomSheet;
export type { MoreMenuItem };
