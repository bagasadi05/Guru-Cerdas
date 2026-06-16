import React, { createContext, useContext, useState } from 'react';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

export interface TabsProps {
  children: React.ReactNode;
  defaultValue?: string;
  value?: string;
  className?: string;
  style?: React.CSSProperties;
  onValueChange?: (value: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ children, defaultValue, value, className, style, onValueChange }) => {
  const [internalValue, setInternalValue] = useState(defaultValue);

  const isControlled = value !== undefined;
  const activeTab = isControlled ? value : internalValue;

  const handleSetActiveTab = (newValue: string) => {
    if (!isControlled) {
      setInternalValue(newValue);
    }
    if (onValueChange) {
      onValueChange(newValue);
    }
  };

  return (
    <TabsContext.Provider value={{ activeTab: activeTab!, setActiveTab: handleSetActiveTab }}>
      <div className={className} style={style}>{children}</div>
    </TabsContext.Provider>
  );
};

const useTabs = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('useTabs must be used within a Tabs component');
  }
  return context;
};

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
  sticky?: boolean;
}

export const TabsList: React.FC<TabsListProps> = ({ children, className, sticky = false }) => (
  <div
    role="tablist"
    className={`
      inline-flex h-auto items-center justify-start sm:justify-center 
      rounded-xl bg-slate-100 dark:bg-slate-800 p-1 
      text-slate-500 dark:text-slate-300
      ${sticky ? 'sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm shadow-sm' : ''}
      ${className}
    `}
  >
    {children}
  </div>
);

export const TabsTrigger: React.FC<{ children: React.ReactNode, value: string, className?: string }> = ({ children, value, className }) => {
  const { activeTab, setActiveTab } = useTabs();
  const isActive = activeTab === value;

  return (
    <button
      onClick={() => setActiveTab(value)}
      data-state={isActive ? 'active' : 'inactive'}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 h-10 text-sm font-medium ring-offset-white dark:ring-offset-slate-900 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-sm data-[state=inactive]:text-slate-400 dark:data-[state=inactive]:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 flex-shrink-0 ${className}`}
      aria-selected={isActive}
      role="tab"
    >
      {children}
    </button>
  );
};

export const TabsContent: React.FC<{ children: React.ReactNode, value: string, className?: string, style?: React.CSSProperties }> = ({ children, value, className, style }) => {
  const { activeTab } = useTabs();
  const isActive = activeTab === value;

  if (!isActive) return null;

  return (
    <div
      key={value}
      role="tabpanel"
      data-state={isActive ? 'active' : 'inactive'}
      className={`ring-offset-white dark:ring-offset-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};
