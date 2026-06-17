/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        slate: {
          850: '#151e32',
          900: '#0f172a',
          950: '#020617',
        },
        violet: {
          950: '#1e1b4b',
        },
        amber: {
          400: '#fbbf24',
          500: '#f59e0b',
        },
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        accent: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        neutral: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#10b981',
          900: '#064e3b',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          900: '#78350f',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          900: '#7f1d1d',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          900: '#7f1d1d',
        },
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
      },
      spacing: {
        '2xs': '0.125rem', // 2px
        'xs': '0.25rem',   // 4px
        'sm': '0.5rem',    // 8px
        'md': '0.75rem',   // 12px
        'lg': '1rem',      // 16px
        'xl': '1.25rem',   // 20px
        '2xl': '1.5rem',   // 24px
        '3xl': '2rem',     // 32px
        '4xl': '2.5rem',   // 40px
        '5xl': '3rem',     // 48px
        '6xl': '4rem',     // 64px
        '7xl': '5rem',     // 80px
        '8xl': '6rem',     // 96px
      },
      zIndex: {
        behind: '-1',
        base: '0',
        dropdown: '10',
        sticky: '20',
        fixed: '30',
        overlay: '40',
        modal: '50',
        popover: '60',
        toast: '70',
        max: '9999',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.08)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Tinos', 'serif'],
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.6s ease-out both',
        shimmer: 'shimmer 3s infinite linear',
        'shimmer-slide': 'shimmer-slide 1.5s infinite',
        'slide-down': 'slide-down 0.3s ease-out both',
        'slide-up': 'slide-up 0.3s ease-out both',
        float: 'float 6s ease-in-out infinite',
        'page-transition': 'page-transition 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both',
        'grow-bar': 'grow-bar 1s cubic-bezier(0.25, 1, 0.5, 1) both',
        'pulse-glow': 'pulse-glow 3s infinite ease-in-out',
        'subtle-pop': 'subtle-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'pulse-border': 'pulse-border 2s ease-in-out infinite',
        'holographic-shine': 'holographic-shine 2s ease-in-out infinite',
        'aurora-glow': 'aurora-glow 20s infinite linear alternate',
        'border-spin': 'border-spin 4s linear infinite',
        'glass-shine': 'glass-shine 1.5s ease-in-out infinite',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) both',
        'draw-check': 'draw-check 0.4s ease-out 0.2s both',
        'slide-in-right': 'slide-in-right 0.3s ease-out both',
      },
      keyframes: {
        'glass-shine': {
          '0%': { transform: 'translateX(-100%) skewX(-15deg)', opacity: '0' },
          '50%': { opacity: '0.5' },
          '100%': { transform: 'translateX(200%) skewX(-15deg)', opacity: '0' },
        },
        'border-spin': {
          '100%': { transform: 'rotate(360deg)' },
        },
        'aurora-glow': {
          '0%': { transform: 'translateX(-50%) translateY(-50%) rotate(0deg)', opacity: '0.3' },
          '50%': { transform: 'translateX(-50%) translateY(-50%) rotate(180deg)', opacity: '0.5' },
          '100%': { transform: 'translateX(-50%) translateY(-50%) rotate(360deg)', opacity: '0.3' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(30px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'page-transition': {
          from: { opacity: '0', transform: 'translateY(20px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'grow-bar': {
          from: { transform: 'scaleY(0)' },
          to: { transform: 'scaleY(1)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        shimmer: {
          '0%': { 'background-position': '200% 0' },
          '100%': { 'background-position': '-200% 0' },
        },
        'shimmer-slide': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-glow': {
          '0%, 100%': { 'box-shadow': '0 0 0 0 rgba(99, 102, 241, 0.4)' },
          '50%': { 'box-shadow': '0 0 20px 5px rgba(99, 102, 241, 0.1)' },
        },
        'subtle-pop': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.03)' },
          '100%': { transform: 'scale(1)' },
        },
        'pulse-border': {
          '0%, 100%': { 'border-color': 'rgba(99, 102, 241, 0.3)' },
          '50%': { 'border-color': 'rgba(99, 102, 241, 0.8)' },
        },
        'holographic-shine': {
          from: { transform: 'translateX(-100%) skewX(-30deg)' },
          to: { transform: 'translateX(200%) skewX(-30deg)' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'draw-check': {
          '0%': { 'stroke-dashoffset': '100' },
          '100%': { 'stroke-dashoffset': '0' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      transitionTimingFunction: {
        springy: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
