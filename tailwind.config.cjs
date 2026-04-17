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
