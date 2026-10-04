/**
 * PostgREST caps every response at `max_rows` (1000 on this project) and
 * silently drops the rest. Reads that can exceed that — a class's attendance
 * for a semester already does — must page through with a stable order.
 */
export const SUPABASE_PAGE_SIZE = 1000;

export async function fetchAllPages<T>(
    fetchPage: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>,
    pageSize: number = SUPABASE_PAGE_SIZE,
): Promise<T[]> {
    const rows: T[] = [];
    for (let from = 0; ; from += pageSize) {
        const { data, error } = await fetchPage(from, from + pageSize - 1);
        if (error) throw error;
        const page = (data || []) as T[];
        rows.push(...page);
        if (page.length < pageSize) return rows;
    }
}
