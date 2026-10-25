import { useState, useCallback } from 'react';
import { supabase } from '../../../../services/supabase';
import { softDelete } from '../../../../services/SoftDeleteService';
import { useToast } from '../../../../hooks/useToast';
import type { Announcement } from '../types';

interface UseAdminAnnouncementsOptions {
    onError: (msg: string) => void;
    onLogAction?: (tableName: string, action: string, recordId: string, oldData?: unknown, newData?: unknown) => Promise<void>;
}

export const useAdminAnnouncements = ({ onError, onLogAction }: UseAdminAnnouncementsOptions) => {
    const toast = useToast();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [announcementsLoading, setAnnouncementsLoading] = useState(true);

    const fetchAnnouncements = useCallback(async () => {
        setAnnouncementsLoading(true);
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setAnnouncements(data || []);
        } catch (err) {
            const message = (err as Error)?.message || 'Gagal memuat pengumuman';
            console.error('Announcements fetch error:', err);
            toast.error(`Gagal memuat pengumuman: ${message}`, { duration: 6000 });
            setAnnouncements([]);
        } finally {
            setAnnouncementsLoading(false);
        }
    }, [toast]);

    const handleCreateAnnouncement = async (form: { title: string; content: string; audience_type: string }) => {
        if (!form.title || !form.content) {
            onError('Judul dan konten wajib diisi');
            return;
        }
        try {
            const { data, error } = await supabase
                .from('announcements')
                .insert({
                    title: form.title,
                    content: form.content,
                    audience_type: form.audience_type || 'all',
                })
                .select()
                .single();
            if (error) throw error;
            if (data && onLogAction) {
                await onLogAction('announcements', 'INSERT', data.id, null, data);
            }
            fetchAnnouncements();
        } catch (err: unknown) {
            console.error('Create announcement error:', err);
            onError('Error: ' + (err as Error).message);
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        if (!id) return;
        try {
            const announcement = announcements.find((a) => a.id === id) || null;
            const result = await softDelete('announcements', id);
            if (!result.success) {
                onError('Gagal menghapus pengumuman: ' + result.error);
                return;
            }
            if (onLogAction) {
                await onLogAction('announcements', 'DELETE', id, announcement, null);
            }
            fetchAnnouncements();
        } catch (err: unknown) {
            console.error('Delete announcement exception:', err);
            onError('Error: ' + (err as Error).message);
        }
    };

    return {
        announcements,
        announcementsLoading,
        fetchAnnouncements,
        handleCreateAnnouncement,
        handleDeleteAnnouncement,
    };
};
