/**
 * Smart Reminders Widget
 * 
 * Shows intelligent reminders based on user's data and patterns
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
    Bell,
    AlertTriangle,
    Clock,
    CheckCircle,
    X,
    ChevronRight
} from 'lucide-react';

export interface Reminder {
    id: string;
    type: 'urgent' | 'warning' | 'info' | 'success';
    title: string;
    message: string;
    action?: {
        label: string;
        link: string;
    };
    dismissible?: boolean;
    timestamp?: Date;
}

interface SmartRemindersProps {
    reminders: Reminder[];
    onDismiss?: (id: string) => void;
}

const getReminderStyle = (type: Reminder['type']): {
    icon: React.ReactNode;
    bgColor: string;
    borderColor: string;
    textColor: string;
} => {
    switch (type) {
        case 'urgent':
            return {
                icon: <AlertTriangle className="w-5 h-5" />,
                bgColor: 'bg-red-50 dark:bg-red-900/20',
                borderColor: 'border-red-200 dark:border-red-700/50',
                textColor: 'text-red-700 dark:text-red-400',
            };
        case 'warning':
            return {
                icon: <Clock className="w-5 h-5" />,
                bgColor: 'bg-amber-50 dark:bg-amber-900/20',
                borderColor: 'border-amber-200 dark:border-amber-700/50',
                textColor: 'text-amber-700 dark:text-amber-400',
            };
        case 'success':
            return {
                icon: <CheckCircle className="w-5 h-5" />,
                bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
                borderColor: 'border-emerald-200 dark:border-emerald-700/50',
                textColor: 'text-emerald-700 dark:text-emerald-400',
            };
        default:
            return {
                icon: <Bell className="w-5 h-5" />,
                bgColor: 'bg-blue-50 dark:bg-blue-900/20',
                borderColor: 'border-blue-200 dark:border-blue-700/50',
                textColor: 'text-blue-700 dark:text-blue-400',
            };
    }
};

export const SmartReminders: React.FC<SmartRemindersProps> = ({
    reminders,
    onDismiss,
}) => {
    if (reminders.length === 0) {
        return null;
    }

    // Group reminders by type for better UX
    const urgentReminders = reminders.filter(r => r.type === 'urgent');
    const otherReminders = reminders.filter(r => r.type !== 'urgent');

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Bell className="w-5 h-5 text-indigo-500" />
                    Pengingat Pintar
                </h2>
                <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-semibold">
                    {reminders.length} item
                </span>
            </div>

            {/* Urgent Reminders - Always on top */}
            {urgentReminders.length > 0 && (
                <div className="space-y-2">
                    {urgentReminders.map((reminder) => {
                        const style = getReminderStyle(reminder.type);
                        return (
                            <div
                                key={reminder.id}
                                className={`relative p-4 rounded-2xl border-2 ${style.bgColor} ${style.borderColor} ${style.textColor} animate-pulse-subtle`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                        {style.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-sm mb-1">{reminder.title}</h3>
                                        <p className="text-xs opacity-90 line-clamp-2">{reminder.message}</p>

                                        {reminder.action && (
                                            <Link
                                                to={reminder.action.link}
                                                className="inline-flex items-center gap-1 mt-2 text-xs font-semibold hover:underline"
                                            >
                                                {reminder.action.label}
                                                <ChevronRight className="w-3 h-3" />
                                            </Link>
                                        )}
                                    </div>

                                    {reminder.dismissible && onDismiss && (
                                        <button
                                            onClick={() => onDismiss(reminder.id)}
                                            className="flex-shrink-0 p-1 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors"
                                            aria-label="Dismiss"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Other Reminders */}
            {otherReminders.length > 0 && (
                <div className="space-y-2">
                    {otherReminders.map((reminder) => {
                        const style = getReminderStyle(reminder.type);
                        return (
                            <div
                                key={reminder.id}
                                className={`group relative p-3 rounded-xl border ${style.bgColor} ${style.borderColor} ${style.textColor} hover:shadow-md transition-all`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                        {style.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-sm mb-0.5">{reminder.title}</h3>
                                        <p className="text-xs opacity-80 line-clamp-2">{reminder.message}</p>

                                        {reminder.action && (
                                            <Link
                                                to={reminder.action.link}
                                                className="inline-flex items-center gap-1 mt-2 text-xs font-semibold hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                {reminder.action.label}
                                                <ChevronRight className="w-3 h-3" />
                                            </Link>
                                        )}
                                    </div>

                                    {reminder.dismissible && onDismiss && (
                                        <button
                                            onClick={() => onDismiss(reminder.id)}
                                            className="flex-shrink-0 p-1 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors opacity-0 group-hover:opacity-100"
                                            aria-label="Dismiss"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
