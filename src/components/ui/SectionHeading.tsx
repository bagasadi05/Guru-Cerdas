import React from 'react';

interface SectionHeadingProps {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({ children, className = '', animate = false }) => {
  return (
    <div className={`flex items-center gap-2 mb-4 px-2 ${animate ? 'animate-fade-in' : ''} ${className}`}>
      <span className="w-1.5 h-5 bg-emerald-500 rounded-full inline-block"></span>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
        {children}
      </h2>
    </div>
  );
};

export default SectionHeading;
