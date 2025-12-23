import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';
import { useToast } from './useToast';
import { SEMESTER_LOCK_KEY, setSemester1Locked } from '../utils/semesterUtils';
import { useEffect } from 'react';

export interface UserSettings {
    user_id: string;
    semester_1_locked: boolean;
    school_name: string;
    updated_at?: string;
}

export const useUserSettings = () => {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const toast = useToast();

    // Fetch settings
    const { data: settings, isLoading } = useQuery({
        queryKey: ['userSettings', user?.id],
        queryFn: async () => {
            if (!user) return null;

            // Try to fetch existing settings
            const { data, error } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                // If not found, create default settings
                const defaultSettings = {
                    user_id: user.id,
                    semester_1_locked: false,
                    school_name: 'MI AL IRSYAD KOTA MADIUN'
                };

                const { data: newData, error: insertError } = await supabase
                    .from('user_settings')
                    .insert(defaultSettings)
                    .select()
                    .single();

                if (insertError) throw insertError;
                return newData as UserSettings;
            }

            return data as UserSettings;

            return data as UserSettings;
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Sync to local storage for synchronous access in non-react utilities
    useEffect(() => {
        if (settings) {
            // Update local storage to keep sync with DB
            // This ensures existing calls to isSemester1Locked() still work
            // although they might be slightly stale if DB changes elsewhere
            setSemester1Locked(settings.semester_1_locked);
        }
    }, [settings]);

    // Update mutation
    const { mutate: updateSettings, isPending: isUpdating } = useMutation({
        mutationFn: async (newSettings: Partial<UserSettings>) => {
            if (!user) throw new Error('No user logged in');

            const { data, error } = await supabase
                .from('user_settings')
                .upsert({
                    user_id: user.id,
                    ...newSettings,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (newSettings) => {
            queryClient.setQueryData(['userSettings', user?.id], newSettings);

            // Sync local state immediately
            if (newSettings && typeof newSettings.semester_1_locked !== 'undefined') {
                setSemester1Locked(newSettings.semester_1_locked);
            }

            toast.success('Pengaturan berhasil disimpan');
        },
        onError: (err: any) => {
            console.error('Error updating settings:', err);
            toast.error('Gagal menyimpan pengaturan');
        }
    });

    return {
        settings,
        isLoading,
        updateSettings,
        isUpdating,
        // Helper to check lock directly
        isSemester1Locked: settings?.semester_1_locked ?? false, // Default false if loading
        schoolName: settings?.school_name ?? 'MI AL IRSYAD KOTA MADIUN'
    };
};
