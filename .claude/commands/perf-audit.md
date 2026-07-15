---
description: Performance audit — bundle size, lazy loading, query efficiency
---

Run a performance audit of the Portal Guru application.

## Steps

1. **Bundle analysis:**
   ```bash
   npm run analyze
   ```
   - Check for unexpectedly large chunks
   - Identify libraries that could be dynamically imported
   - Target: initial bundle < 500KB gzipped

2. **Lazy loading audit:**
   ```bash
   grep -rn "React.lazy" src/ | wc -l
   grep -rn "import(" src/ | wc -l
   ```
   - All page components should be lazy-loaded
   - Heavy libraries (jspdf, exceljs, recharts, framer-motion) should be dynamically imported

3. **React Query efficiency:**
   - Check `lib/queryKeys.ts` — are keys granular enough?
   - Check for duplicate queries (same data fetched in multiple hooks)
   - Check staleTime/gcTime configuration
   - Check for missing cache invalidations after mutations

4. **Re-render analysis:**
   - Components passing inline objects/arrays as props
   - Missing `useMemo`/`useCallback` in hot paths
   - Context providers causing unnecessary re-renders

5. **Image/asset optimization:**
   - Images in `public/` — are they optimized (WebP, compressed)?
   - Icons — using Lucide (tree-shakeable) or loading full icon sets?

6. **PWA/Offline:**
   - Service worker configuration in `vite.config.ts`
   - Offline queue in `services/offlineQueue.ts` — is it efficient?
   - Cache strategy in `sw.js`

7. **Lighthouse check** (if dev server running):
   ```bash
   npm run lighthouse
   ```

## Output

```
Performance Score: X/100
Bundle Size: X KB (gzipped)
Lazy Chunks: X/Y pages lazy-loaded
Query Efficiency: X duplicate queries found
Top 3 Fixes:
  1. [HIGH] ...
  2. [MED] ...
  3. [LOW] ...
```
