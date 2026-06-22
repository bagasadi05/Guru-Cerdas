import { supabase } from './supabase';
import { r2StorageService } from './r2StorageService';
import type {
    TeachingJournal,
    TeachingJournalInsert,
    TeachingJournalUpdate,
    TeachingJournalFilters,
    TeachingJournalRekap,
} from '../types/teachingJournal';

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

/**
 * Extract the relative storage path from a Supabase public URL.
 */
const extractStoragePathFromPublicUrl = (publicUrl: string | null | undefined, bucket: string) => {
    if (!publicUrl) return null;
    try {
        const url = new URL(publicUrl);
        const marker = `/${bucket}/`;
        const [, path] = url.pathname.split(marker);
        return path ? decodeURIComponent(path) : null;
    } catch {
        return null;
    }
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Fetch journals for the authenticated user filtered by optional params.
 * Results are ordered by date descending.
 */
const getByPeriod = async (filters: TeachingJournalFilters = {}): Promise<TeachingJournal[]> => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
        throw new Error('User session not found.');
    }

    let query = supabase
        .from('teaching_journals')
        .select('*')
        .eq('user_id', userData.user.id);

    if (filters.classId) {
        query = query.eq('class_id', filters.classId);
    }
    if (filters.subject) {
        query = query.eq('subject', filters.subject);
    }
    if (filters.date) {
        query = query.eq('date', filters.date);
    }
    if (filters.startDate) {
        query = query.gte('date', filters.startDate);
    }
    if (filters.endDate) {
        query = query.lte('date', filters.endDate);
    }

    query = query.order('date', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    return (data || []) as TeachingJournal[];
};

/**
 * Fetch journals for a specific class (current user).
 */
const getByClass = async (classId: string): Promise<TeachingJournal[]> => {
    return getByPeriod({ classId });
};

/**
 * Fetch journals for a specific date (current user).
 */
const getByDate = async (date: string): Promise<TeachingJournal[]> => {
    return getByPeriod({ date });
};

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Create a new teaching journal entry. user_id is injected from the auth session.
 */
const create = async (
    payload: Omit<TeachingJournalInsert, 'user_id'>
): Promise<TeachingJournal> => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
        throw new Error('User session not found.');
    }

    const fullPayload: TeachingJournalInsert = {
        ...payload,
        user_id: userData.user.id,
    };

    const { data, error } = await supabase
        .from('teaching_journals')
        .insert(fullPayload)
        .select('*')
        .single();

    if (error) throw error;

    return data as TeachingJournal;
};

/**
 * Update an existing teaching journal entry.
 */
const update = async (
    id: string,
    payload: TeachingJournalUpdate
): Promise<TeachingJournal> => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
        throw new Error('User session not found.');
    }

    const { data, error } = await supabase
        .from('teaching_journals')
        .update(payload)
        .eq('id', id)
        .eq('user_id', userData.user.id)
        .select('*')
        .single();

    if (error) throw error;

    return data as TeachingJournal;
};

/**
 * Delete a teaching journal entry. Also removes any associated attachment from storage.
 */
const remove = async (id: string): Promise<void> => {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
        throw new Error('User session not found.');
    }

    // 1. Fetch attachment URL before deletion
    const { data: journal, error: fetchError } = await supabase
        .from('teaching_journals')
        .select('attachment_url')
        .eq('id', id)
        .eq('user_id', userData.user.id)
        .single();

    if (fetchError) throw fetchError;

    // 2. Remove attachment file from storage if it exists
    if (journal?.attachment_url) {
        try {
            await removeAttachment(journal.attachment_url);
        } catch {
            // Storage cleanup failed but the DB record will still be deleted
        }
    }

    // 3. Delete the database record
    const { error: deleteError } = await supabase
        .from('teaching_journals')
        .delete()
        .eq('id', id)
        .eq('user_id', userData.user.id);

    if (deleteError) throw deleteError;
};

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

/**
 * Upload an attachment file to the teaching_journals folder in Cloudflare R2.
 */
const uploadAttachment = async (
    _userId: string,
    file: File
): Promise<{ publicUrl: string; storagePath: string }> => {
    const result = await r2StorageService.uploadFile(file, 'teaching_journals');
    return {
        publicUrl: result.publicUrl,
        storagePath: result.key,
    };
};

/**
 * Remove an attachment file from storage by its public URL.
 */
const removeAttachment = async (url: string): Promise<void> => {
    await r2StorageService.deleteFile({ publicUrl: url });
};

// ---------------------------------------------------------------------------
// Rekap (Recap / Summary)
// ---------------------------------------------------------------------------

/**
 * Get a recap of journal entries grouped by class and subject.
 * Aggregation is done client-side for simplicity.
 */
const getRekap = async (filters: TeachingJournalFilters = {}): Promise<TeachingJournalRekap[]> => {
    const journals = await getByPeriod(filters);

    // Fetch class names for all referenced class_ids
    const classIds = [...new Set(journals.map((j) => j.class_id).filter(Boolean))] as string[];
    let classMap: Record<string, string> = {};

    if (classIds.length > 0) {
        const { data: classes } = await supabase
            .from('classes')
            .select('id, name')
            .in('id', classIds);

        if (classes) {
            classMap = classes.reduce(
                (acc: Record<string, string>, c: { id: string; name: string }) => {
                    acc[c.id] = c.name;
                    return acc;
                },
                {} as Record<string, string>
            );
        }
    }

    // Group by classId + subject
    const grouped: Record<string, TeachingJournal[]> = {};
    for (const j of journals) {
        const key = `${j.class_id ?? 'no-class'}::${j.subject}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(j);
    }

    return Object.entries(grouped).map(([key, entries]) => {
        const [classId, subject] = key.split('::');
        const dates = entries.map((e) => e.date).sort();
        return {
            classId,
            className: classMap[classId] ?? 'Unknown Class',
            subject,
            totalMeetings: entries.length,
            journalsFilled: entries.length,
            lastJournalDate: dates.length > 0 ? dates[dates.length - 1] : null,
        };
    });
};

export default {
    getByPeriod,
    getByClass,
    getByDate,
    create,
    update,
    remove,
    uploadAttachment,
    removeAttachment,
    getRekap,
};
