import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellIcon, CheckIcon, TrashIcon, XIcon, AlertTriangleIcon, ClockIcon, MessageSquareIcon, SettingsIcon } from 'lucide-react';
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    getUnreadCount,
    checkAndNotify,
    formatTimeAgo,
    Notification,
    NotificationType
} from '../../services/NotificationService';
import { useAuth } from '../../hooks/useAuth';
import { Button } from './Button';

interface NotificationPanelProps {
    className?: string;
}

const NotificationIcon: React.FC<{ type: NotificationType }> = ({ type }) => {
    switch (type) {
        case 'task_overdue':
            return <AlertTriangleIcon className="w-4 h-4 text-red-500" />;
        case 'task_due':
            return <ClockIcon className="w-4 h-4 text-amber-500" />;
        case 'message':
            return <MessageSquareIcon className="w-4 h-4 text-blue-500" />;
        default:
            return <BellIcon className="w-4 h-4 text-gray-500" />;
    }
};

const NotificationItem: React.FC<{
    notification: Notification;
    onRead: (id: string) => void;
    onNavigate: (link?: string) => void;
}> = ({ notification, onRead, onNavigate }) => {
    const handleClick = () => {
        if (!notification.read) {
            onRead(notification.id);
        }
        onNavigate(notification.link);
    };

    return (
        <button
            onClick={handleClick}
            className={`w-full text-left p-3 rounded-xl transition-colors flex items-start gap-3 ${notification.read
                    ? 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
                    : 'bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
                }`}
        >
            <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${notification.type === 'task_overdue'
                    ? 'bg-red-100 dark:bg-red-900/30'
                    : notification.type === 'task_due'
                        ? 'bg-amber-100 dark:bg-amber-900/30'
                        : 'bg-gray-100 dark:bg-gray-800'
                }`}>
                <NotificationIcon type={notification.type} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${notification.read
                            ? 'text-gray-700 dark:text-gray-300'
                            : 'text-gray-900 dark:text-white'
                        }`}>
                        {notification.title}
                    </p>
                    {!notification.read && (
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-indigo-500 mt-1.5" />
                    )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                    {notification.message}
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                    {formatTimeAgo(notification.timestamp)}
                </p>
            </div>
        </button>
    );
};

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ className = '' }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const panelRef = useRef<HTMLDivElement>(null);

    // Load notifications and check for new ones
    const refreshNotifications = useCallback(async () => {
        if (!user) return;

        await checkAndNotify(user.id);
        setNotifications(getNotifications());
        setUnreadCount(getUnreadCount());
    }, [user]);

    useEffect(() => {
        refreshNotifications();

        // Check every 5 minutes
        const interval = setInterval(refreshNotifications, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, [refreshNotifications]);

    // Close panel when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleRead = (id: string) => {
        markAsRead(id);
        setNotifications(getNotifications());
        setUnreadCount(getUnreadCount());
    };

    const handleMarkAllRead = () => {
        markAllAsRead();
        setNotifications(getNotifications());
        setUnreadCount(0);
    };

    const handleClear = () => {
        clearNotifications();
        setNotifications([]);
        setUnreadCount(0);
    };

    const handleNavigate = (link?: string) => {
        setIsOpen(false);
        if (link) {
            navigate(link);
        }
    };

    return (
        <div className={`relative ${className}`} ref={panelRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Notifikasi"
            >
                <BellIcon className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Notification Panel */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-fade-in">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Notifikasi</h3>
                        <div className="flex items-center gap-1">
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                                    title="Tandai semua sudah dibaca"
                                >
                                    <CheckIcon className="w-4 h-4" />
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button
                                    onClick={handleClear}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    title="Hapus semua"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Notification List */}
                    <div className="max-h-96 overflow-y-auto p-2">
                        {notifications.length === 0 ? (
                            <div className="text-center py-12">
                                <BellIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                                <p className="text-gray-500 dark:text-gray-400 font-medium">Tidak ada notifikasi</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    Anda akan menerima notifikasi saat ada tugas mendekati deadline
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {notifications.map(notification => (
                                    <NotificationItem
                                        key={notification.id}
                                        notification={notification}
                                        onRead={handleRead}
                                        onNavigate={handleNavigate}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setIsOpen(false); navigate('/pengaturan'); }}
                                className="w-full text-gray-500 hover:text-indigo-600"
                            >
                                <SettingsIcon className="w-4 h-4 mr-2" />
                                Pengaturan Notifikasi
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationPanel;
