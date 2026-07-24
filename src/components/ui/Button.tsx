import React, { useState, useCallback } from 'react';
import { useSound } from '../../hooks/useSound';
import { motion, HTMLMotionProps } from 'framer-motion';
import { componentStyles } from '../../styles/designTokens';
import { useIsLowPerformanceDevice } from '../../hooks/useReducedMotion';

interface Ripple {
  x: number;
  y: number;
  size: number;
  id: number;
}

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'default' | 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'success';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

let rippleId = 0;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', children, onClick, ...props }, ref) => {
    const { playClick } = useSound();
    const isLowPerf = useIsLowPerformanceDevice();
    const [ripples, setRipples] = useState<Ripple[]>([]);

    const baseClasses = "relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 ease-out min-w-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed transform-gpu active:scale-[0.98]";

    const variantClasses = {
      default: componentStyles.buttonPrimary,
      primary: componentStyles.buttonPrimary,
      secondary: 'bg-slate-700 text-white hover:bg-slate-600 hover:shadow-md',
      success: componentStyles.buttonPrimary,
      destructive: 'bg-red-600 text-white shadow-sm shadow-red-500/20 hover:bg-red-700 hover:shadow-md hover:shadow-red-500/25',
      outline: 'ripple-dark bg-transparent border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800',
      ghost: componentStyles.buttonGhost,
    };

    const sizeClasses = {
      default: 'h-11 sm:h-10 px-5 text-base',
      sm: 'h-10 px-3 text-sm',
      lg: 'h-12 px-6 text-base',
      icon: 'h-11 w-11 sm:h-10 sm:w-10 p-0',
    };

    const handleRipple = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      playClick();
      onClick?.(event);

      const rect = event.currentTarget.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const id = ++rippleId;
      const ripple: Ripple = {
        x: event.clientX - rect.left - size / 2,
        y: event.clientY - rect.top - size / 2,
        size,
        id,
      };

      setRipples(prev => [...prev, ripple]);

      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== id));
      }, 600);
    }, [playClick, onClick]);

    return (
      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.95 }}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        ref={ref}
        onClick={handleRipple}
        {...props}
      >
        <>
          {ripples.map(r => (
            <span
              key={r.id}
              className="ripple"
              style={{
                width: r.size,
                height: r.size,
                left: r.x,
                top: r.y,
              }}
            />
          ))}
          {children}
        </>
      </motion.button>
    );
  }
);
Button.displayName = 'Button';
