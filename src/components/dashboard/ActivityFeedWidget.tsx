import React, { useState } from 'react';
import { SmartReminders, Reminder } from './SmartReminders';
import { RecentActivityTimeline, ActivityItem } from './RecentActivityTimeline';
import { Bell, Activity } from 'lucide-react';

interface ActivityFeedWidgetProps {
    reminders: Reminder[];
    activities: ActivityItem[];
    onDismissReminder: (id: string) => void;
}

const ActivityFeedWidget: React.FC<ActivityFeedWidgetProps> = ({
    reminders,
    activities,
    onDismissReminder
}) => {
    const [activeTab, setActiveTab] = useState<'activity' | 'reminders'>('activity');

    const reminderCount = reminders.length;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            {/* Header / Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-800">
                <button
                    onClick={() => setActiveTab('activity')}
                    className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors relative ${activeTab === 'activity'
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    <Activity className="w-4 h-4" />
                    Aktivitas
                    {activeTab === 'activity' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('reminders')}
                    className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors relative ${activeTab === 'reminders'
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    <Bell className="w-4 h-4" />
                    <span className="relative">
                        Pengingat
                        {reminderCount > 0 && (
                            <span className="absolute -top-1 -right-4 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white">
                                {reminderCount}
                            </span>
                        )}
                    </span>
                    {activeTab === 'reminders' && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
                    )}
                </button>
            </div>

            {/* Content */}
            <div className="p-4">
                {activeTab === 'activity' ? (
                    <RecentActivityTimeline activities={activities} />
                ) : (
                    <div className="min-h-[300px]">
                        {reminders.length > 0 ? (
                            <SmartReminders reminders={reminders} onDismiss={onDismissReminder} />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                                    <Bell className="w-6 h-6 text-slate-400" />
                                </div>
                                <p className="text-slate-900 dark:text-white font-medium">Tidak ada pengingat</p>
                                <p className="text-xs text-slate-500 mt-1">Anda sudah menyelesaikan semua tugas!</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityFeedWidget;
