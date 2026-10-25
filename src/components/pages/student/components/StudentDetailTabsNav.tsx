import React, { useEffect } from 'react';
import { TabsList, TabsTrigger } from '../../../ui/Tabs';
import {
    BookOpen,
    Zap,
    ShieldAlert,
    Compass,
    Trophy,
    MessageSquare,
} from 'lucide-react';
import {
    FileTextIcon,
    BrainCircuitIcon,
    StarIcon,
} from '../../../Icons';

interface StudentDetailTabsNavProps {
    tabsScrollRef: React.RefObject<HTMLDivElement>;
    tabScrollState: { left: boolean; right: boolean };
    activeTab: string;
    totalViolationPoints: number;
    unreadMessagesCount: number;
}

export const StudentDetailTabsNav: React.FC<StudentDetailTabsNavProps> = ({
    tabsScrollRef,
    tabScrollState,
    activeTab,
    totalViolationPoints,
    unreadMessagesCount,
}) => {
    // Auto-scroll active tab into view on mobile/tablet
    useEffect(() => {
        if (!tabsScrollRef.current) return;
        const activeTabEl = tabsScrollRef.current.querySelector('[data-state="active"]');
        if (activeTabEl) {
            activeTabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [activeTab, tabsScrollRef]);

    return (
        <div className="border-b border-gray-200 dark:border-white/10 sticky top-0 z-20 bg-white/95 dark:bg-slate-800/95 rounded-t-2xl">
            <div className="relative">
                <div
                    className={`absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-slate-800 to-transparent pointer-events-none z-10 transition-opacity duration-300 ${
                        tabScrollState.left ? 'opacity-100' : 'opacity-0'
                    }`}
                />
                <div
                    className={`absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-slate-800 to-transparent pointer-events-none z-10 transition-opacity duration-300 ${
                        tabScrollState.right ? 'opacity-100' : 'opacity-0'
                    }`}
                />
                <div
                    ref={tabsScrollRef}
                    className="flex justify-start px-2 sm:px-4 py-2 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory"
                >
                    <TabsList className="bg-slate-100/80 dark:bg-slate-900/50 p-1.5 rounded-xl w-full flex justify-between gap-1 min-w-max lg:min-w-0 flex-nowrap lg:flex-wrap xl:flex-nowrap border border-slate-200/50 dark:border-slate-700/50">
                        <TabsTrigger
                            value="grades"
                            className="min-h-[44px] h-11 px-3 text-sm flex-1 lg:flex-none cursor-pointer active:scale-95 transition-all duration-150 select-none snap-start"
                        >
                            <BookOpen className="w-3.5 h-3.5 mr-1.5 inline text-emerald-500 shrink-0" aria-hidden="true" />
                            Nilai
                        </TabsTrigger>
                        <TabsTrigger
                            value="activity"
                            className="min-h-[44px] h-11 px-3 text-sm flex-1 lg:flex-none cursor-pointer active:scale-95 transition-all duration-150 select-none snap-start"
                        >
                            <Zap className="w-3.5 h-3.5 mr-1.5 inline text-amber-500 shrink-0" aria-hidden="true" />
                            Keaktifan
                        </TabsTrigger>
                        <TabsTrigger
                            value="violations"
                            className="min-h-[44px] h-11 px-3 text-sm flex-1 lg:flex-none cursor-pointer active:scale-95 transition-all duration-150 select-none snap-start"
                        >
                            <ShieldAlert className="w-3.5 h-3.5 mr-1.5 inline text-rose-500 shrink-0" aria-hidden="true" />
                            Pelanggaran
                            {totalViolationPoints > 0 && (
                                <span className="ml-1.5 text-xxs font-bold px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                                    {totalViolationPoints}
                                </span>
                            )}
                        </TabsTrigger>
                        <TabsTrigger
                            value="bintang"
                            className="min-h-[44px] h-11 px-3 text-sm flex-1 lg:flex-none cursor-pointer active:scale-95 transition-all duration-150 select-none snap-start"
                        >
                            <StarIcon className="w-3.5 h-3.5 mr-1.5 inline text-amber-500 fill-amber-500/20 shrink-0" aria-hidden="true" />
                            BINTANG
                        </TabsTrigger>
                        <TabsTrigger
                            value="extracurricular"
                            className="min-h-[44px] h-11 px-3 text-sm flex-1 lg:flex-none cursor-pointer active:scale-95 transition-all duration-150 select-none snap-start"
                        >
                            <Compass className="w-3.5 h-3.5 mr-1.5 inline text-teal-500 shrink-0" aria-hidden="true" />
                            Ekstra
                        </TabsTrigger>
                        <TabsTrigger
                            value="achievements"
                            className="min-h-[44px] h-11 px-3 text-sm flex-1 lg:flex-none cursor-pointer active:scale-95 transition-all duration-150 select-none snap-start"
                        >
                            <Trophy className="w-3.5 h-3.5 mr-1.5 inline text-amber-500 shrink-0" aria-hidden="true" />
                            Prestasi
                        </TabsTrigger>
                        <TabsTrigger
                            value="reports"
                            className="min-h-[44px] h-11 px-3 text-sm flex-1 lg:flex-none cursor-pointer active:scale-95 transition-all duration-150 select-none snap-start"
                        >
                            <FileTextIcon className="w-3.5 h-3.5 mr-1.5 inline text-blue-500 shrink-0" aria-hidden="true" />
                            Catatan Guru
                        </TabsTrigger>
                        <TabsTrigger
                            value="development"
                            className="min-h-[44px] h-11 px-3 text-sm flex-1 lg:flex-none cursor-pointer active:scale-95 transition-all duration-150 select-none snap-start"
                        >
                            <BrainCircuitIcon className="w-3.5 h-3.5 mr-1.5 inline text-indigo-500 shrink-0" aria-hidden="true" />
                            Perkembangan
                        </TabsTrigger>
                        <TabsTrigger
                            value="communication"
                            className="min-h-[44px] h-11 px-3 text-sm flex-1 lg:flex-none cursor-pointer active:scale-95 transition-all duration-150 select-none snap-start"
                        >
                            <div className="relative inline-flex items-center">
                                <MessageSquare className="w-3.5 h-3.5 mr-1.5 inline text-sky-500 shrink-0" aria-hidden="true" />
                                Komunikasi
                                {unreadMessagesCount > 0 && (
                                    <span className="absolute -top-1.5 -right-3 min-w-4 h-4 px-1 bg-red-500 rounded-full text-xxs text-white flex items-center justify-center font-bold">
                                        {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                                    </span>
                                )}
                            </div>
                        </TabsTrigger>
                    </TabsList>
                </div>
            </div>
        </div>
    );
};
