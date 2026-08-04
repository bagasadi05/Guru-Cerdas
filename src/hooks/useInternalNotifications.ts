import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';
import { useToast } from './useToast';
import { logger } from '../services/logger';

export interface InternalNotification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'danger' | 'success';
    is_read: boolean;
    action_url: string | null;
    created_at: string;
}

/**
 * Friendly message that helps surface RLS/policy bugs instead of silently
 * swallowing them. The raw Supabase message (e.g. "new row violates
 * row-level security policy") is appended so misconfiguration is detectable.
 */
const buildErrorMessage = (prefix: string, message?: string): string => {
    if (!message) return prefix;
    return `${prefix}: ${message}`;
};

export const useInternalNotifications = () => {
    const { user } = useAuth();
    const toast = useToast();
    const [notifications, setNotifications] = useState<InternalNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('internal_notifications' as any)
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            logger.error('Gagal memuat notifikasi', error, { userId: user.id }, 'Notifications');
            toast.error(buildErrorMessage('Gagal memuat notifikasi', error.message), { duration: 6000 });
            setLoading(false);
            return;
        }
        if (data) {
            const typedData = data as unknown as InternalNotification[];
            setNotifications(typedData);
            setUnreadCount(typedData.filter(n => !n.is_read).length);
        }
        setLoading(false);
    }, [user, toast]);

    useEffect(() => {
        if (!user) {
            const timer = setTimeout(() => {
                setNotifications([]);
                setUnreadCount(0);
                setLoading(false);
            }, 0);
            return () => clearTimeout(timer);
        }

        setTimeout(() => {
            void fetchNotifications();
        }, 0);

        // Subscribe to realtime changes
        const subscription = supabase
            .channel(`internal_notifications_${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'internal_notifications',
                    filter: `user_id=eq.${user.id}`,
                },
                (_payload) => {
                    fetchNotifications(); // Refresh on any change
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, [user, fetchNotifications]);

    const markAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));

        const { error } = await supabase
            .from('internal_notifications' as any)
            .update({ is_read: true })
            .eq('id', id);

        if (error) {
            // Roll back the optimistic update so the UI reflects server truth.
            logger.error('Gagal menandai notifikasi dibaca', error, { id }, 'Notifications');
            toast.error(buildErrorMessage('Gagal menandai notifikasi dibaca', error.message), { duration: 6000 });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: false } : n));
            setUnreadCount(prev => prev + 1);
        }
    };

    const markAllAsRead = async () => {
        const previouslyUnread = notifications.filter(n => !n.is_read);

        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);

        const { error } = await supabase
            .from('internal_notifications' as any)
            .update({ is_read: true })
            .eq('user_id', user!.id)
            .eq('is_read', false);

        if (error) {
            logger.error('Gagal menandai semua notifikasi dibaca', error, { userId: user?.id }, 'Notifications');
            toast.error(buildErrorMessage('Gagal menandai semua notifikasi dibaca', error.message), { duration: 6000 });
            // Roll back to the previous unread state.
            const unreadIds = new Set(previouslyUnread.map(n => n.id));
            setNotifications(prev => prev.map(n => unreadIds.has(n.id) ? { ...n, is_read: false } : n));
            setUnreadCount(previouslyUnread.length);
        }
    };

    const deleteNotification = async (id: string) => {
        // Optimistic removal
        const removed = notifications.find(n => n.id === id);
        setNotifications(prev => prev.filter(n => n.id !== id));

        const { error } = await supabase
            .from('internal_notifications' as any)
            .delete()
            .eq('id', id);

        if (error) {
            logger.error('Gagal menghapus notifikasi', error, { id }, 'Notifications');
            toast.error(buildErrorMessage('Gagal menghapus notifikasi', error.message), { duration: 6000 });
            // Restore the notification if the delete failed.
            if (removed) {
                setNotifications(prev => {
                    if (prev.some(n => n.id === id)) return prev;
                    return [removed, ...prev];
                });
            }
        }
    };

    const clearAllNotifications = async () => {
        const previous = notifications;
        const previousUnread = previous.filter(n => !n.is_read).length;

        setNotifications([]);
        setUnreadCount(0);

        const { error } = await supabase
            .from('internal_notifications' as any)
            .delete()
            .eq('user_id', user!.id);

        if (error) {
            logger.error('Gagal menghapus semua notifikasi', error, { userId: user?.id }, 'Notifications');
            toast.error(buildErrorMessage('Gagal menghapus semua notifikasi', error.message), { duration: 6000 });
            // Restore the previous list.
            setNotifications(previous);
            setUnreadCount(previousUnread);
        }
    };

    return {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAllNotifications,
    };
};
