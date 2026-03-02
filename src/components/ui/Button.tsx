import React from 'react';
import { useSound } from '../../hooks/useSound';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'success';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', children, onClick, ...props }, ref) => {
    const { playClick } = useSound();
    // Enhanced accessibility: improved focus ring, better contrast
    const baseClasses = "relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200 ease-out min-w-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900 disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed transform-gpu active:scale-[0.98]";

    const variantClasses = {
      default: 'bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-md',
      primary: 'bg-emerald-500 text-white hover:bg-emerald-600 hover:shadow-md',
      secondary: 'bg-slate-700 text-white hover:bg-slate-600 hover:shadow-md',
      success: 'bg-green-500 text-white hover:bg-green-600 hover:shadow-md',
      destructive: 'bg-red-500 text-white hover:bg-red-600 hover:shadow-md',
      outline: 'ripple-dark bg-transparent border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800',
      ghost: 'ripple-dark bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800',
    };

    const sizeClasses = {
      default: 'h-11 sm:h-10 px-5 text-base',
      sm: 'h-10 px-3 text-sm',
      lg: 'h-12 px-6 text-base',
      icon: 'h-11 w-11 sm:h-10 sm:w-10 p-0',
    };

    const handleRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
      playClick();
      if (onClick) {
        onClick(event);
      }

      const button = event.currentTarget;
      // Hapus ripple yang ada
      const existingRipple = button.getElementsByClassName("ripple")[0];
      if (existingRipple) {
        existingRipple.remove();
      }

      const circle = document.createElement("span");
      const diameter = Math.max(button.clientWidth, button.clientHeight);
      const radius = diameter / 2;

      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
      circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
      circle.classList.add("ripple");

      button.appendChild(circle);

      // Hapus ripple setelah animasi selesai
      setTimeout(() => {
        if (circle.parentElement) {
          circle.remove();
        }
      }, 600);
    };

    return (
      <button
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        ref={ref}
        onClick={handleRipple}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
