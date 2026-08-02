import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MotionDiv, MotionSpan, MotionP } from '../ui/MotionComponents';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { easing } from '../../styles/motion';

const AUTO_REDIRECT_SECONDS = 15;

const PARTICLES_STATIC_DATA = [
  { top: '25%', left: '15%', duration: 2.5, delay: 0.1 },
  { top: '45%', left: '75%', duration: 3.2, delay: 0.5 },
  { top: '65%', left: '30%', duration: 2.1, delay: 1.2 },
  { top: '35%', left: '55%', duration: 3.8, delay: 0.2 },
  { top: '75%', left: '85%', duration: 2.9, delay: 0.8 },
  { top: '55%', left: '20%', duration: 3.5, delay: 1.5 },
];

/**
 * Premium 404 Not Found page with animated illustration,
 * countdown auto-redirect, and navigation options.
 */
const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(AUTO_REDIRECT_SECONDS);
  const { shouldReduceMotion } = useReducedMotion();

  useEffect(() => {
    if (countdown <= 0) {
      navigate('/dashboard', { replace: true });
      return;
    }
    const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, navigate]);

  return (
    <div className="min-h-screen cosmic-bg flex items-center justify-center p-6">
      <MotionDiv
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.6, ease: 'easeOut' }}
        className="text-center max-w-md w-full"
      >
        {/* Animated 404 Illustration */}
        <MotionDiv
          className="relative mx-auto mb-8 w-48 h-48"
          initial={shouldReduceMotion ? { scale: 1 } : { scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={shouldReduceMotion ? { duration: 0 } : { delay: 0.2, ...easing.spring }}
        >
          {/* Glowing circle background */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-500/20 to-brand-600/20 dark:from-brand-500/30 dark:to-brand-600/30 animate-pulse" />
          <div className="absolute inset-3 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 dark:from-brand-900/50 dark:to-brand-900/50 flex items-center justify-center">
            <MotionSpan
              className="text-6xl font-black bg-gradient-to-br from-brand-600 to-brand-700 dark:from-brand-400 dark:to-brand-500 bg-clip-text text-transparent"
              animate={shouldReduceMotion ? { rotateY: 0 } : { rotateY: [0, 10, -10, 0] }}
              transition={shouldReduceMotion ? { duration: 0 } : { duration: 3, repeat: Infinity, repeatDelay: 2 }}
            >
              404
            </MotionSpan>
          </div>
          {/* Floating particles */}
          {PARTICLES_STATIC_DATA.map((p, i) => (
            <MotionDiv
              key={i}
              className="absolute w-2 h-2 rounded-full bg-brand-400/40 dark:bg-brand-400/60"
              style={{
                top: p.top,
                left: p.left,
              }}
              animate={shouldReduceMotion ? { y: 0, opacity: 0.5 } : {
                y: [0, -15, 0],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={shouldReduceMotion ? { duration: 0 } : {
                duration: p.duration,
                repeat: Infinity,
                delay: p.delay,
              }}
            />
          ))}
        </MotionDiv>

        {/* Text Content */}
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
          Halaman Tidak Ditemukan
        </h1>
        <MotionP
          className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Maaf, halaman yang Anda cari tidak ada atau telah dipindahkan.
        </MotionP>

        {/* Action Buttons */}
        <MotionDiv
          className="flex flex-col sm:flex-row gap-3 justify-center mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <button type="button"
            onClick={() => navigate('/dashboard', { replace: true })}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-600 hover:to-brand-700 text-white rounded-xl font-semibold shadow-lg shadow-brand-600/25 hover:shadow-brand-600/40 transition-all duration-300 hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Ke Dashboard
          </button>
          <button type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-300 hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali
          </button>
        </MotionDiv>

        {/* Auto-redirect countdown */}
        <MotionDiv
          className="text-sm text-slate-400 dark:text-slate-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center justify-center gap-2">
            <div className="relative w-8 h-8">
              <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                <circle
                  cx="16" cy="16" r="14"
                  className="stroke-slate-200 dark:stroke-slate-700"
                  strokeWidth="2"
                  fill="none"
                />
                <circle
                  cx="16" cy="16" r="14"
                  className="stroke-brand-500"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray={`${(countdown / AUTO_REDIRECT_SECONDS) * 88} 88`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 1s linear' }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-brand-600 dark:text-brand-400">
                {countdown}
              </span>
            </div>
            <span>Redirect otomatis ke dashboard</span>
          </div>
        </MotionDiv>
      </MotionDiv>
    </div>
  );
};

export default NotFoundPage;
