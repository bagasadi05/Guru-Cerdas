import React, { useRef, useState, useEffect } from 'react';
import { TabsList, TabsTrigger } from '../ui/Tabs';
import { ClassRow } from './types';
import { ChevronLeftIcon, ChevronRightIcon } from '../Icons';

interface StudentsClassTabsHeaderProps {
  classes: ClassRow[];
}

export const StudentsClassTabsHeader: React.FC<StudentsClassTabsHeaderProps> = ({ classes }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [dragged, setDragged] = useState(false);

  const checkScroll = () => {
    const container = containerRef.current;
    if (container) {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      // Show left arrow if we have scrolled right at all
      setShowLeftArrow(scrollLeft > 4);
      // Show right arrow if we haven't reached the end yet
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 4);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    checkScroll();

    container.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);

    // Recheck scroll state when classes update
    const timer = setTimeout(checkScroll, 100);

    return () => {
      container.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      clearTimeout(timer);
    };
  }, [classes]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;

    setIsDragging(true);
    setDragged(false);
    setStartX(e.pageX - container.offsetLeft);
    setScrollLeft(container.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();

    const container = containerRef.current;
    if (!container) return;

    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll speed multiplier
    
    if (Math.abs(walk) > 5) {
      setDragged(true);
    }
    
    container.scrollLeft = scrollLeft - walk;
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (dragged) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    const container = containerRef.current;
    if (!container) return;

    const scrollAmount = direction === 'left' ? -250 : 250;
    container.scrollTo({
      left: container.scrollLeft + scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative mb-6 group/scroll-container">
      {/* Left scroll indicator / gradient overlay & button */}
      {showLeftArrow && (
        <div className="absolute left-0 top-0 bottom-2 z-10 flex items-center pr-10 bg-gradient-to-r from-slate-50 via-slate-50/70 to-transparent dark:from-slate-950/90 dark:via-slate-950/70 to-transparent pointer-events-none transition-opacity duration-300">
          <button
            onClick={() => scroll('left')}
            className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-md text-slate-600 dark:text-slate-300 pointer-events-auto transition-transform hover:scale-105 active:scale-95"
            aria-label="Scroll left"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Right scroll indicator / gradient overlay & button */}
      {showRightArrow && (
        <div className="absolute right-0 top-0 bottom-2 z-10 flex items-center pl-10 bg-gradient-to-l from-slate-50 via-slate-50/70 to-transparent dark:from-slate-950/90 dark:via-slate-950/70 to-transparent pointer-events-none transition-opacity duration-300">
          <button
            onClick={() => scroll('right')}
            className="flex items-center justify-center w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-800/90 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-md text-slate-600 dark:text-slate-300 pointer-events-auto transition-transform hover:scale-105 active:scale-95"
            aria-label="Scroll right"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Scrollable Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onClickCapture={handleContainerClick}
        className={`overflow-x-auto pb-2 scrollbar-hide select-none touch-pan-x ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <TabsList className="bg-transparent p-0 gap-2 flex h-auto w-max">
          {classes.map((classItem) => (
            <TabsTrigger
              key={classItem.id}
              value={classItem.id}
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white dark:data-[state=active]:bg-indigo-500 dark:data-[state=active]:text-white bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg px-5 py-3 min-h-[44px] text-sm font-semibold transition-all shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex-shrink-0"
            >
              {classItem.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </div>
  );
};

