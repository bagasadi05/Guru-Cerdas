import React from 'react';
import { SmartReminders, Reminder } from './SmartReminders';
import { RecentActivityTimeline, ActivityItem } from './RecentActivityTimeline';
import { Bell, Activity } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/Tabs';

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
    const reminderCount = reminders.length;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-700/60 overflow-hidden shadow-sm">
            <Tabs defaultValue="activity" className="w-full">
                <div className="p-4 border-b border-slate-200/60 dark:border-slate-700/60">
                    <TabsList className="w-full grid grid-cols-2">
                        <TabsTrigger value="activity" className="justify-center">
                            <Activity className="w-4 h-4" />
                            Aktivitas
                        </TabsTrigger>
                        <TabsTrigger value="reminders" className="justify-center">
                            <span className="relative flex items-center gap-2">
                                <Bell className="w-4 h-4" />
                                Pengingat
                                {reminderCount > 0 && (
                                    <span className="absolute -top-1 -right-4 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                                        {reminderCount}
                                    </span>
                                )}
                            </span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                <div className="p-4">
                    <TabsContent value="activity">
                        <RecentActivityTimeline activities={activities} />
                    </TabsContent>
                    <TabsContent value="reminders">
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
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
};

export default ActivityFeedWidget;
