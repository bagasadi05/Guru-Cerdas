import React, { useState, useEffect, useRef } from 'react';
import { BellIcon, CheckIcon, TrashIcon, XIcon } from 'lucide-react';
import { Button } from './Button';

export interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
    timestamp: Date;
    read: boolean;
}

interface NotificationCenterProps {
    notifications: Notification[];
    onMarkAsRead: (id: string) => void;
    onMarkAllAsRead: () => void;
    onDelete: (id: string) => void;
    onClearAll: () => void;
}

const TYPE_COLORS = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500',
};

const TYPE_BG_COLORS = {
    success: 'bg-green-50 dark:bg-green-900/20',
    error: 'bg-red-50 dark:bg-red-900/20',
    warning: 'bg-amber-50 dark:bg-amber-900/20',
    info: 'bg-blue-50 dark:bg-blue-900/20',
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
    notifications,
    onMarkAsRead,
    onMarkAllAsRead,
    onDelete,
    onClearAll,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter(n => !n.read).length;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsOpen(false);
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    const formatTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Baru saja';
        if (minutes < 60) return `${minutes} menit lalu`;
        if (hours < 24) return `${hours} jam lalu`;
        if (days < 7) return `${days} hari lalu`;
        return date.toLocaleDateString('id-ID');
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label={`Notifikasi${unreadCount > 0 ? `, ${unreadCount} belum dibaca` : ''}`}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                <BellIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-fade-in-up"
                    role="menu"
                    aria-orientation="vertical"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                            Notifikasi
                            {unreadCount > 0 && (
                                <span className="ml-2 text-xs font-normal text-slate-500">
                                    ({unreadCount} baru)
                                </span>
                            )}
                        </h3>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onMarkAllAsRead}
                                    className="text-xs"
                                    aria-label="Tandai semua dibaca"
                                >
                                    <CheckIcon className="w-3 h-3 mr-1" />
                                    Baca Semua
                                </Button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                aria-label="Tutup"
                            >
                                <XIcon className="w-4 h-4 text-slate-500" />
                            </button>
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[400px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="py-12 text-center">
                                <BellIcon className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Tidak ada notifikasi
                                </p>
                            </div>
                        ) : (
                            <ul role="list" className="divide-y divide-slate-100 dark:divide-slate-800">
                                {notifications.map(notification => (
                                    <li
                                        key={notification.id}
                                        className={`
                                            p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors
                                            ${!notification.read ? TYPE_BG_COLORS[notification.type] : ''}
                                        `}
                                        role="menuitem"
                                    >
                                        <div className="flex gap-3">
                                            {/* Status dot */}
                                            <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${TYPE_COLORS[notification.type]}`} />

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium ${!notification.read ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                                                    {formatTime(notification.timestamp)}
                                                </p>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-start gap-1">
                                                {!notification.read && (
                                                    <button
                                                        onClick={() => onMarkAsRead(notification.id)}
                                                        className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
                                                        aria-label="Tandai dibaca"
                                                    >
                                                        <CheckIcon className="w-3 h-3 text-slate-500" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => onDelete(notification.id)}
                                                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20"
                                                    aria-label="Hapus notifikasi"
                                                >
                                                    <TrashIcon className="w-3 h-3 text-red-500" />
                                                </button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClearAll}
                                className="w-full text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                <TrashIcon className="w-3 h-3 mr-1" />
                                Hapus Semua
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Hook for managing notifications
export const useNotifications = () => {
    const [notifications, setNotifications] = useState<Notification[]>(() => {
        const saved = localStorage.getItem('portal-guru-notifications');
        if (saved) {
            const parsed = JSON.parse(saved);
            return parsed.map((n: any) => ({ ...n, timestamp: new Date(n.timestamp) }));
        }
        return [];
    });

    // Save to localStorage whenever notifications change
    useEffect(() => {
        localStorage.setItem('portal-guru-notifications', JSON.stringify(notifications));
    }, [notifications]);

    const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
        const newNotification: Notification = {
            ...notification,
            id: crypto.randomUUID(),
            timestamp: new Date(),
            read: false,
        };
        setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep max 50
    };

    const markAsRead = (id: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const deleteNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const clearAll = () => {
        setNotifications([]);
    };

    // Generate reminder notifications based on app data
    const generateReminders = (data: {
        pendingTasks?: { title: string; dueDate: string }[];
        unmarkedAttendanceDates?: string[];
        studentsWithLowGrades?: { name: string; subject: string; score: number }[];
    }) => {
        const reminders: Omit<Notification, 'id' | 'timestamp' | 'read'>[] = [];

        // Pending tasks reminders
        if (data.pendingTasks) {
            data.pendingTasks.forEach(task => {
                const dueDate = new Date(task.dueDate);
                const today = new Date();
                const daysLeft = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                if (daysLeft <= 2 && daysLeft >= 0) {
                    reminders.push({
                        title: '📋 Tugas Mendekati Deadline',
                        message: `"${task.title}" jatuh tempo dalam ${daysLeft} hari.`,
                        type: daysLeft === 0 ? 'error' : 'warning',
                    });
                }
            });
        }

        // Unmarked attendance reminders
        if (data.unmarkedAttendanceDates && data.unmarkedAttendanceDates.length > 0) {
            reminders.push({
                title: '📝 Absensi Belum Diisi',
                message: `Anda belum mengisi absensi untuk ${data.unmarkedAttendanceDates.length} hari. Segera lengkapi!`,
                type: 'warning',
            });
        }

        // Low grades alert
        if (data.studentsWithLowGrades && data.studentsWithLowGrades.length > 0) {
            data.studentsWithLowGrades.slice(0, 3).forEach(student => {
                reminders.push({
                    title: '⚠️ Nilai Rendah',
                    message: `${student.name} mendapat nilai ${student.score} pada ${student.subject}.`,
                    type: 'info',
                });
            });
        }

        // Add reminders that don't already exist (check by message)
        const existingMessages = new Set(notifications.map(n => n.message));
        reminders.forEach(reminder => {
            if (!existingMessages.has(reminder.message)) {
                addNotification(reminder);
            }
        });
    };

    return {
        notifications,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        generateReminders,
    };
};

export default NotificationCenter;
