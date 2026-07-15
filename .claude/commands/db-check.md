---
description: Supabase database health check — schema, RLS, queries
---

Check Supabase database health and integration.

## Steps

1. **Check Supabase connection:**
   - Verify `services/supabase.ts` has valid config
   - Check `.env` for `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

2. **Check database types sync:**
   - Compare `services/database.types.ts` with actual schema
   - Flag any tables/columns in queries that don't exist in types
   ```bash
   # Find all table references in code
   grep -rn "\.from('" src/services/ src/hooks/ | head -50
   ```

3. **Audit RLS policies:**
   - Use MCP: `mcp__supabase__execute_sql` to check RLS status
   ```sql
   SELECT schemaname, tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY tablename;
   ```

4. **Check query patterns:**
   - All queries should use `queryKeys` factory from `lib/queryKeys.ts`
   - Mutations should invalidate queries
   - No raw SQL without parameterization

5. **Check for common issues:**
   - N+1 queries (multiple sequential selects that could be joined)
   - Missing `.select()` columns (fetching more than needed)
   - Unhandled `.error` responses from Supabase

6. **Report findings** with:
   - Tables with missing RLS
   - Queries referencing non-existent types
   - Performance concerns (N+1, full table scans)
   - Security concerns (exposed data, missing validation)
