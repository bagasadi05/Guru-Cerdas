import React from 'react';
import { MotionDiv } from '../ui/MotionComponents';
import { duration as motionDuration, easing } from '../../styles/motion';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface PageTransitionProps {
  children: React.ReactNode;
  transitionKey?: string;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  transitionKey,
  className = 'h-full',
}) => {
  const { shouldReduceMotion } = useReducedMotion();

  return (
    <MotionDiv
      key={transitionKey}
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0.05 : motionDuration.base,
        ease: easing.easeOut,
      }}
      className={className}
    >
      {children}
    </MotionDiv>
  );
};

export default PageTransition;
