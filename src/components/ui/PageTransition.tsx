import React from 'react';
import { motion } from 'framer-motion';
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
    <motion.div
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
    </motion.div>
  );
};

export default PageTransition;
