import React from 'react';
import { MotionConfig } from 'framer-motion';
import { useReducedMotion } from '../hooks/useReducedMotion';

export function AnimationProvider({ children }: { children: React.ReactNode }) {
  const { shouldReduceMotion } = useReducedMotion();

  return (
    <MotionConfig reducedMotion={shouldReduceMotion ? 'always' : 'never'}>
      {children}
    </MotionConfig>
  );
}
