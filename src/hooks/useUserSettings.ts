import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

export interface UserSettings {
    user_id: string;
    school_name: string;
    kkm: number;
    updated_at?: string;
}

const DEFAULT_KKM = 75;
const DEFAULT_SCHOOL_NAME = 'MI AL IRSYAD KOTA MADIUN';

const getKkmStorageKey = (userId: string) => `user_settings:${userId}:kkm`;

const readStoredKkm = (userId: string): number => {
    if (typeof localStorage === 'undefined') return DEFAULT_KKM;

    const value = Number(localStorage.getItem(getKkmStorageKey(userId)));
    return Number.isFinite(value) && value >= 0 && value <= 100 ? value : DEFAULT_KKM;
};

const writeStoredKkm = (userId: string, value: number | undefined) => {
    if (typeof localStorage === 'undefined' || value === undefined) return;

    const normalizedValue = Math.min(100, Math.max(0, Number(value) || DEFAULT_KKM));
    localStorage.setItem(getKkmStorageKey(userId), String(normalizedValue));
};

const normalizeSettings = (data: {
    user_id: string;
    school_name: string | null;
    updated_at?: string;
}): UserSettings => ({
    user_id: data.user_id,
    school_name: data.school_name || DEFAULT_SCHOOL_NAME,
    kkm: readStoredKkm(data.user_id),
    updated_at: data.updated_at,
});

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
                    school_name: DEFAULT_SCHOOL_NAME,
                };

                const { data: newData, error: insertError } = await supabase
                    .from('user_settings')
                    .insert(defaultSettings)
                    .select()
                    .single();

                if (insertError) throw insertError;
                return normalizeSettings(newData);
            }

            return normalizeSettings(data);
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Update mutation
    const { mutate: updateSettings, isPending: isUpdating } = useMutation({
        mutationFn: async (newSettings: Partial<UserSettings>) => {
            if (!user) throw new Error('No user logged in');

            const { kkm, ...databaseSettings } = newSettings;
            writeStoredKkm(user.id, kkm);

            const { data, error } = await supabase
                .from('user_settings')
                .upsert({
                    user_id: user.id,
                    ...databaseSettings,
                    updated_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            const normalizedSettings = normalizeSettings(data);
            return kkm === undefined
                ? normalizedSettings
                : { ...normalizedSettings, kkm: readStoredKkm(user.id) };
        },
        onSuccess: (newSettings) => {
            queryClient.setQueryData(['userSettings', user?.id], newSettings);
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
        schoolName: settings?.school_name ?? 'MI AL IRSYAD KOTA MADIUN',
        kkm: settings?.kkm ?? DEFAULT_KKM // Default KKM 75
    };
};
