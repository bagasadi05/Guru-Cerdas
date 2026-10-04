interface QueryResult { data: unknown; error: { message: string } | null; }
const PAGE_SIZE = 500;

/** Read every ordered page and propagate failures instead of returning empty data. */
export async function reminderPages<T>(query: (from: number, to: number) => PromiseLike<QueryResult>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await query(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

/** Keep REST filters small while retaining every subscribed account. */
export async function reminderBatches<T>(ids: string[], query: (ids: string[]) => Promise<T[]>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < ids.length; from += 200) rows.push(...await query(ids.slice(from, from + 200)));
  return rows;
}
