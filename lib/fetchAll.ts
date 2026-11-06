// Supabase/PostgREST caps a single response at 1000 rows by default; trade
// data for one country easily exceeds that (27 reporters × codes × years).
export async function fetchAll<T = any>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  pageSize = 1000
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return out;
}
