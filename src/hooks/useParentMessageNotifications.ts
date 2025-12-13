import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';
import { useToast } from './useToast';
import { useQueryClient } from '@tanstack/react-query';
import { playMessageSound } from '../utils/notificationSound';

/**
 * Hook for listening to real-time parent messages.
 * Shows toast notifications when new messages from parents arrive.
 * Also supports browser notifications if permission is granted.
 */
export const useParentMessageNotifications = () => {
    const { user } = useAuth();
    const toast = useToast();
    const queryClient = useQueryClient();
    const isSubscribedRef = useRef(false);
    const lastMessageIdRef = useRef<string | null>(null);

    // Request browser notification permission
    const requestNotificationPermission = useCallback(async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    }, []);

    // Show browser notification
    const showBrowserNotification = useCallback((title: string, body: string) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(title, {
                body,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-72x72.png',
                tag: 'parent-message',
                requireInteraction: false,
            });

            // Auto-close after 5 seconds
            setTimeout(() => notification.close(), 5000);

            // Focus window when notification is clicked
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }
    }, []);

    useEffect(() => {
        if (!user?.id || isSubscribedRef.current) return;

        // Request notification permission on mount
        requestNotificationPermission();

        // Subscribe to real-time changes on communications table
        const channel = supabase
            .channel('parent-messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'communications',
                    filter: `user_id=eq.${user.id}`,
                },
                async (payload) => {
                    const newMessage = payload.new as {
                        id: string;
                        message: string;
                        sender: 'teacher' | 'parent';
                        student_id: string;
                        created_at: string;
                    };

                    // Only notify for parent messages (not teacher's own messages)
                    if (newMessage.sender === 'parent' && newMessage.id !== lastMessageIdRef.current) {
                        lastMessageIdRef.current = newMessage.id;

                        // Get student name for the notification
                        const { data: student } = await supabase
                            .from('students')
                            .select('name')
                            .eq('id', newMessage.student_id)
                            .single();

                        const studentName = student?.name || 'Wali Murid';
                        const messagePreview = newMessage.message.length > 50
                            ? newMessage.message.substring(0, 50) + '...'
                            : newMessage.message;

                        // Play custom notification sound
                        playMessageSound();

                        // Show toast notification
                        toast.info(
                            `💬 Pesan baru dari wali ${studentName}: "${messagePreview}"`,
                            { duration: 8000 }
                        );

                        // Show browser notification if page is not focused
                        if (document.hidden) {
                            showBrowserNotification(
                                `Pesan dari Wali ${studentName}`,
                                messagePreview
                            );
                        }

                        // Invalidate queries to refresh data
                        queryClient.invalidateQueries({ queryKey: ['studentDetails'] });
                        queryClient.invalidateQueries({ queryKey: ['dashboardData'] });
                    }
                }
            )
            .subscribe();

        isSubscribedRef.current = true;

        // Cleanup on unmount
        return () => {
            supabase.removeChannel(channel);
            isSubscribedRef.current = false;
        };
    }, [user?.id, toast, queryClient, requestNotificationPermission, showBrowserNotification]);

    return { requestNotificationPermission };
};
