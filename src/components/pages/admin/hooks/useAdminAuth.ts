import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../../services/supabase';
import { useAuth } from '../../../../hooks/useAuth';

export const useAdminAuth = () => {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

    useEffect(() => {
        let isMounted = true;

        const verifyAdmin = async () => {
            if (!user) {
                navigate('/');
                return;
            }
            try {
                const { data, error } = await supabase
                    .from('user_roles')
                    .select('role')
                    .eq('user_id', user.id)
                    .single();
                if (!isMounted) return;
                if (error || !data || data.role !== 'admin') {
                    navigate('/');
                    return;
                }
                setIsAdmin(true);
            } catch {
                if (isMounted) navigate('/');
            }
        };

        if (!authLoading) {
            void verifyAdmin();
        }

        return () => {
            isMounted = false;
        };
    }, [user, authLoading, navigate]);

    return {
        user,
        authLoading,
        isAdmin,
    };
};
