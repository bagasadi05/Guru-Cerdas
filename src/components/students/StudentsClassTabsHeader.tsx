import React, { useRef, useState, useEffect } from 'react';
import { TabsList, TabsTrigger } from '../ui/Tabs';
import { ClassRow } from './types';
import { ChevronLeftIcon, ChevronRightIcon } from '../Icons';

interface StudentsClassTabsHeaderProps {
  classes: ClassRow[];
  classStudentCounts?: Record<string, number>;
}

export const StudentsClassTabsHeader: React.FC<StudentsClassTabsHeaderProps> = ({ classes, classStudentCounts }) => {
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
      setShowLeftArrow(scrollLeft > 4);
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 4);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    checkScroll();

    container.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);

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
    const walk = (x - startX) * 1.5;
    
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
      {/* Left scroll indicator / gradient overlay & button (Desktop only, mobile uses native swipe) */}
      {showLeftArrow && (
        <div className="hidden sm:flex absolute left-0 top-0 bottom-2 z-10 items-center pr-10 bg-gradient-to-r from-slate-50 via-slate-50/80 to-transparent dark:from-slate-950 dark:via-slate-950/80 to-transparent pointer-events-none transition-opacity duration-300">
          <button
            type="button"
            onClick={() => scroll('left')}
            className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl hover:bg-slate-100 dark:hover:bg-slate-800 shadow-md text-slate-700 dark:text-slate-200 pointer-events-auto transition-transform hover:scale-105 active:scale-95"
            aria-label="Kelas sebelumnya"
            title="Kelas sebelumnya"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Right scroll indicator / gradient overlay & button (Desktop only, mobile uses native swipe) */}
      {showRightArrow && (
        <div className="hidden sm:flex absolute right-0 top-0 bottom-2 z-10 items-center pl-10 bg-gradient-to-l from-slate-50 via-slate-50/80 to-transparent dark:from-slate-950 dark:via-slate-950/80 to-transparent pointer-events-none transition-opacity duration-300">
          <button
            type="button"
            onClick={() => scroll('right')}
            className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl hover:bg-slate-100 dark:hover:bg-slate-800 shadow-md text-slate-700 dark:text-slate-200 pointer-events-auto transition-transform hover:scale-105 active:scale-95"
            aria-label="Kelas berikutnya"
            title="Kelas berikutnya"
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
        className={`overflow-x-auto pb-2 scrollbar-hide select-none touch-pan-x overscroll-x-contain ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <TabsList className="bg-transparent p-0 gap-2 sm:gap-2.5 flex h-auto w-max pr-6 sm:pr-14">
          {classes.map((classItem) => {
            const count = classStudentCounts?.[classItem.id];
            return (
              <TabsTrigger
                key={classItem.id}
                value={classItem.id}
                className="group data-[state=active]:!bg-gradient-to-r data-[state=active]:!from-emerald-600 data-[state=active]:!to-teal-600 data-[state=active]:!text-white data-[state=active]:!border-transparent data-[state=active]:!shadow-md data-[state=active]:!shadow-emerald-600/25 data-[state=inactive]:bg-white dark:data-[state=inactive]:bg-slate-900 sm:data-[state=inactive]:bg-white/80 sm:dark:data-[state=inactive]:bg-slate-900/60 data-[state=inactive]:text-slate-600 dark:data-[state=inactive]:text-slate-300 data-[state=inactive]:border-slate-200/80 dark:data-[state=inactive]:border-white/10 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-white border sm:backdrop-blur-md !rounded-xl px-3.5 py-2 sm:px-4 sm:py-2.5 min-h-[40px] sm:min-h-[44px] text-xs sm:text-sm font-semibold flex-shrink-0 cursor-pointer focus-visible:!ring-emerald-500 dark:focus-visible:!ring-emerald-400 inline-flex items-center gap-2 transition-colors sm:transition-all duration-200 motion-reduce:transition-none"
              >
                <span>{classItem.name}</span>
                {typeof count === 'number' && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-lg transition-colors bg-slate-100/90 text-slate-600 dark:bg-white/10 dark:text-slate-300 group-data-[state=active]:!bg-white/25 group-data-[state=active]:!text-white">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>
    </div>
  );
};
