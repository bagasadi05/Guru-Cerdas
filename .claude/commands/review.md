---
description: Review code changes specific to Portal Guru (React/TS/Supabase)
---

Perform a comprehensive code review of recent changes in this React/TypeScript/Supabase project.

## Steps

1. **Check what changed:**
   ```bash
   rtk git diff --stat
   rtk git diff
   ```

2. **TypeScript check:**
   ```bash
   rtk tsc
   ```
   - Fix any type errors before proceeding.

3. **Lint check:**
   ```bash
   rtk lint
   ```
   - Fix auto-fixable issues: `npm run lint:fix`

4. **Run tests:**
   ```bash
   rtk npm test
   ```
   - All tests must pass.

5. **Review checklist** (check each changed file):

   **TypeScript:**
   - [ ] No `any` types — use `unknown` + type guards
   - [ ] Proper interfaces/types for props and state
   - [ ] JSDoc on public functions

   **React:**
   - [ ] Functional components only
   - [ ] Proper hook dependencies in useEffect/useMemo/useCallback
   - [ ] No missing keys in lists
   - [ ] Lazy loading for page components
   - [ ] Error boundaries where needed

   **Supabase:**
   - [ ] Query keys use `queryKeys` factory from `lib/queryKeys.ts`
   - [ ] Mutations invalidate relevant queries
   - [ ] Error handling on all Supabase calls
   - [ ] No hardcoded table names — use types from `database.types.ts`

   **Styling:**
   - [ ] `emerald` not `green` for success colors
   - [ ] Dark mode support (`dark:` prefix)
   - [ ] Mobile-friendly touch targets (min 44px)
   - [ ] Responsive layout

   **i18n:**
   - [ ] User-facing strings use i18n keys, not hardcoded
   - [ ] Both `en` and `id` locales updated

   **Security:**
   - [ ] No secrets in code
   - [ ] Input validation with zod
   - [ ] XSS protection (DOMPurify for user content)

6. **Summarize findings** with severity (HIGH/MED/LOW) and suggested fixes.
