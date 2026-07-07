import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';

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

export const useInternalNotifications = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<InternalNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) {
            const timer = setTimeout(() => {
                setNotifications([]);
                setUnreadCount(0);
                setLoading(false);
            }, 0);
            return () => clearTimeout(timer);
        }

        const fetchNotifications = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('internal_notifications' as any)
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);

            if (!error && data) {
                const typedData = data as unknown as InternalNotification[];
                setNotifications(typedData);
                setUnreadCount(typedData.filter(n => !n.is_read).length);
            }
            setLoading(false);
        };

        fetchNotifications();

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
    }, [user]);

    const markAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));

        await supabase
            .from('internal_notifications' as any)
            .update({ is_read: true })
            .eq('id', id);
    };

    const markAllAsRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);

        await supabase
            .from('internal_notifications' as any)
            .update({ is_read: true })
            .eq('user_id', user!.id)
            .eq('is_read', false);
    };

    const deleteNotification = async (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
        await supabase
            .from('internal_notifications' as any)
            .delete()
            .eq('id', id);
    };

    const clearAllNotifications = async () => {
        setNotifications([]);
        setUnreadCount(0);
        await supabase
            .from('internal_notifications' as any)
            .delete()
            .eq('user_id', user!.id);
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
