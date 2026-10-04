import React from 'react';

interface PageTransitionProps {
  children: React.ReactNode;
  transitionKey?: string;
  className?: string;
}

/**
 * Fades each route in. Uses a CSS animation rather than framer-motion so the
 * fade runs on the compositor and stays smooth while the main thread is busy
 * mounting the new page. Reduced motion is honoured via `motion-safe:` (OS
 * setting) and the global `.reduce-motion` rule in accessibility.css.
 */
export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  transitionKey,
  className = 'h-full',
}) => (
  <div key={transitionKey} className={`${className} motion-safe:animate-page-in`}>
    {children}
  </div>
);

export default PageTransition;
