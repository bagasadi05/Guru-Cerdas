import { useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';
import { useToast } from './useToast';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook untuk notifikasi realtime saat guru lain mencatat pelanggaran baru
 * untuk siswa yang sedang dilihat di halaman detail.
 */
export const useViolationRealtimeNotifications = (studentId: string | undefined) => {
    const { user } = useAuth();
    const toast = useToast();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!studentId || !user?.id) return;

        const channel = supabase
            .channel(`violations-student-${studentId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'violations',
                    filter: `student_id=eq.${studentId}`,
                },
                async (payload) => {
                    const newViolation = payload.new as {
                        id: string;
                        user_id: string;
                        description: string;
                        points: number;
                        date: string;
                    };

                    // Jangan notifikasi untuk pelanggaran yang dicatat sendiri
                    if (newViolation.user_id === user.id) return;

                    // Dapatkan nama guru pencatat
                    let recorderName = 'Guru lain';
                    try {
                        const { data: roleRows } = await supabase
                            .from('user_roles')
                            .select('full_name')
                            .eq('user_id', newViolation.user_id)
                            .single();
                        if (roleRows?.full_name) {
                            recorderName = roleRows.full_name;
                        }
                    } catch {
                        // Ignore — fallback ke "Guru lain"
                    }

                    toast.info(
                        `${recorderName} mencatat pelanggaran "${newViolation.description}" (+${newViolation.points} poin) untuk siswa ini`,
                        { duration: 6000 }
                    );

                    // Refresh data
                    queryClient.invalidateQueries({ queryKey: ['studentStats'] });
                    queryClient.invalidateQueries({ queryKey: ['studentDetails'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [studentId, user?.id, toast, queryClient]);
};
