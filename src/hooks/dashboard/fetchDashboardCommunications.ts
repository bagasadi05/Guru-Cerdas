/**
 * @fileoverview Communications data fetching for Dashboard (Unread parent messages)
 * 
 * @module hooks/dashboard/fetchDashboardCommunications
 */

import { supabase } from '../../services/supabase';
import type { DashboardQueryData } from '../../types';

export interface DashboardCommunicationsData {
    unreadParentMessages: DashboardQueryData['unreadParentMessages'];
}

export const fetchDashboardCommunications = async (
    activeStudentIds: Set<string>
): Promise<DashboardCommunicationsData> => {
    const unreadParentMessagesRes = await supabase
        .from('communications')
        .select('id, student_id, message, created_at, sender, is_read')
        .eq('sender', 'parent')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10);

    if (unreadParentMessagesRes.error) {
        console.warn('[DashboardCommunications] Error loading parent messages:', unreadParentMessagesRes.error.message);
    }

    return {
        unreadParentMessages: (unreadParentMessagesRes.data || []).filter(m => activeStudentIds.has(m.student_id)),
    };
};
