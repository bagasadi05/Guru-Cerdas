import React from 'react';
import { BarChartIcon, BookOpenIcon, ClockIcon, SendIcon, SparklesIcon } from '../../Icons';
import { TabsList, TabsTrigger } from '../../ui/Tabs';
import type { PortalPrimaryTab } from './types';

interface PortalNavigationProps {
    activeTab: PortalPrimaryTab;
    unreadMessagesCount: number;
    attentionCount: number;
}

const tabs: Array<{ value: PortalPrimaryTab; label: string; icon: React.ElementType }> = [
    { value: 'beranda', label: 'Beranda', icon: SparklesIcon },
    { value: 'perkembangan', label: 'Perkembangan', icon: BarChartIcon },
    { value: 'kehadiran', label: 'Kehadiran', icon: ClockIcon },
    { value: 'komunikasi', label: 'Komunikasi', icon: SendIcon },
    { value: 'lainnya', label: 'Lainnya', icon: BookOpenIcon },
];

export const PortalNavigation: React.FC<PortalNavigationProps> = ({ activeTab, unreadMessagesCount, attentionCount }) => {
    return (
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-hide">
            <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex gap-1 min-w-max sm:w-auto">
                {tabs.map((tab) => (
                    <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm rounded-lg transition-all whitespace-nowrap">
                        <tab.icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                        {tab.value === 'komunikasi' && unreadMessagesCount > 0 && (
                            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">{unreadMessagesCount}</span>
                        )}
                        {tab.value === 'beranda' && attentionCount > 0 && (
                            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">{attentionCount}</span>
                        )}
                    </TabsTrigger>
                ))}
            </TabsList>
        </div>
    );
};