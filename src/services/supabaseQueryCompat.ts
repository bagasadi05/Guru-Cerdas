type SupabaseMaybeSingleResult<T> = Promise<{
    data: T | null;
    error: { code?: string; message?: string } | null;
}>;

type MaybeSingleCapable<T> = {
    maybeSingle?: () => SupabaseMaybeSingleResult<T>;
    single?: () => Promise<{
        data: T | null;
        error: { code?: string; message?: string } | null;
    }>;
};

export const maybeSingleCompat = async <T>(
    query: MaybeSingleCapable<T>,
): SupabaseMaybeSingleResult<T> => {
    if (typeof query.maybeSingle === 'function') {
        return query.maybeSingle();
    }

    if (typeof query.single !== 'function') {
        throw new Error('Supabase query builder does not support single-row selection');
    }

    const result = await query.single();
    if (result.error?.code === 'PGRST116') {
        return { data: null, error: null };
    }

    return result;
};
