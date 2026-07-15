<!-- guru-cerdas-claude v2 -->
# 📚 Portal Guru — Claude Code Instructions

## Project Identity

**Portal Guru** — Aplikasi manajemen sekolah untuk guru Indonesia.
Stack: React 18 + TypeScript + Vite 6 + Supabase + Tailwind CSS + TanStack Query + Framer Motion.

**Bahasa**: Code & komentar dalam Bahasa Inggris. Dokumentasi & user-facing text dalam Bahasa Indonesia.

---

## Architecture Quick Reference

```
src/
├── components/          # React components (feature-based dirs)
│   ├── pages/           # Route-level page components (lazy-loaded)
│   ├── ui/              # Reusable UI primitives (Button, Modal, CustomDropdown)
│   ├── skeletons/       # Loading skeleton components
│   ├── attendance/      # Attendance feature components
│   ├── students/        # Student feature components
│   ├── dashboard/       # Dashboard widgets
│   ├── gamification/    # Gamification components
│   └── [feature]/       # Other feature-specific components
├── hooks/               # Custom React hooks (use*.ts)
├── services/            # API services, Supabase client, external integrations
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── contexts/            # React contexts (minimal usage)
├── locales/             # i18n translations (en/, id/)
├── lib/                 # Query keys factory, achievement metadata
├── constants.tsx        # App-wide constants
└── App.tsx              # Root component + routing
```

### Key Patterns

| Pattern | Location | Notes |
|---------|----------|-------|
| Data fetching | `hooks/use*.ts` + `@tanstack/react-query` | All server state via React Query |
| API calls | `services/*.ts` | Supabase client in `services/supabase.ts` |
| DB types | `services/database.types.ts` | Auto-generated from Supabase (59KB) |
| Query keys | `lib/queryKeys.ts` | Centralized query key factory |
| Routing | `App.tsx` | React Router v6, lazy-loaded |
| Auth | `hooks/useAuth.tsx` | Supabase Auth, role-based |
| Forms | `react-hook-form` + `zod` | Schemas in `types/forms.ts` |
| Styling | Tailwind CSS | Config: `tailwind.config.cjs` |
| Animations | Framer Motion | UI transitions |
| PDF | `services/pdfGenerator.ts` | jsPDF |
| Excel | `hooks/useExcelParser.ts` | ExcelJS |
| i18n | `locales/en/`, `locales/id/` | react-i18next |
| AI | `services/openRouterService.ts` | Via Vercel proxy |
| Offline | `services/offlineQueue.ts` | Workbox + custom queue |
| Push | `services/PushNotificationService.ts` | Web Push API |
| Soft delete | `services/SoftDeleteService.ts` | Trash + recovery |
| Gamification | `services/gamificationService.ts` | Points, badges |
| Storage | `services/r2StorageService.ts` | AWS R2 for uploads |

---

## Code Conventions

### TypeScript
- **Strict mode** — no `any`, use `unknown` + type guards
- `interface` for object shapes, `type` for unions/intersections
- JSDoc on all public functions

### React
- Functional components only
- Page components: `components/pages/` — lazy-loaded with `React.lazy()`
- Reusable UI: `components/ui/`
- `React.memo()` for expensive re-renders
- Proper hook dependency arrays (no missing deps)

### Naming
- Components: `PascalCase` — `AttendancePage.tsx`
- Hooks: `camelCase` with `use` — `useAttendance.ts`
- Services: `camelCase` or `PascalCase` — `journalService.ts`, `AuthSecurityService.ts`
- Utils: `camelCase` — `dateHelpers.ts`
- Enums: `PascalCase` name, `UPPER_SNAKE_CASE` values

### Tailwind CSS
- **`emerald` not `green`** for success colors
- `slate` for grays
- Dark mode via `dark:` prefix
- Mobile-first responsive
- Touch targets ≥ 44x44px

### State
- Server state: TanStack Query
- Local state: `useState` / `useReducer`
- Shared state: React Context (minimal)
- Forms: `react-hook-form`

### Error Handling
- Error boundaries at route level (`ErrorBoundary.tsx`)
- Service errors: `services/errorHandling.ts`
- Toasts: `hooks/useToast.tsx`
- Offline: `hooks/useNetworkStatus.ts`

---

## Database (Supabase)

- Client: `services/supabase.ts`
- Types: `services/database.types.ts`
- RLS enabled on sensitive tables
- MCP available: `mcp__supabase__execute_sql`, `mcp__supabase__apply_migration`

```typescript
// Fetch pattern
const { data, isLoading } = useQuery({
  queryKey: queryKeys.students.list(classId),
  queryFn: () => supabase.from('students').select('*').eq('class_id', classId),
});

// Mutation pattern
const mutation = useMutation({
  mutationFn: (data) => supabase.from('students').insert(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.students.all }),
});
```

---

## Commands

| Action | Command |
|--------|---------|
| Dev server | `npm run dev` |
| Tests | `rtk npm test` |
| Type check | `rtk tsc` |
| Lint | `rtk lint` |
| Build | `npm run build` |
| E2E | `npm run test:e2e` |
| Format | `npm run format` |
| DB query | `mcp__supabase__execute_sql` |
| DB migrate | `mcp__supabase__apply_migration` |

### Project Skills (`.claude/commands/`)
- `/review` — Code review (React/TS/Supabase specific)
- `/check` — Quick health check (types + lint + tests + build)
- `/db-check` — Supabase database health
- `/component-audit` — Component patterns audit
- `/perf-audit` — Performance audit
- `/i18n-check` — Internationalization coverage
- `/security-scan` — Security scan
- `/focused-fix` — Deep-dive feature repair
- `/update-docs` — Update documentation

---

## Startup Ritual

**Ketika user mengirim pesan pertama di sesi baru**, jalankan SEBELUM menjawab:

1. **`/review`** — Review kode yang berubah
2. **`/check`** — Quick health gate (types + lint + tests)
3. **`/security-scan`** — Scan keamanan

**Rules:**
- Pesan mendesak (error, bug) → jawab dulu, ritual sesudah.
- Skill error/skip → lanjut ke skill berikutnya.
- Skill lain tersedia on-demand.

---

## Anti-Patterns (DO NOT)

- ❌ `any` type → `unknown` + narrowing
- ❌ Class components → functional only
- ❌ Business logic in components → hooks/services
- ❌ Hardcoded strings → i18n keys
- ❌ `green-*` Tailwind → `emerald-*`
- ❌ Unhandled Supabase errors → always wrap
- ❌ New Context without checking React Query
- ❌ Bypass RLS → respect security policies
- ❌ Commit `.env` → use `.env.example`
- ❌ Synchronous storage in components → use hooks

---

## RTK (Rust Token Killer)

Always prefix CLI commands with `rtk`. See `~/.claude/CLAUDE.md` for full reference.

```bash
rtk npm test       # Failures only
rtk git status     # Compact
rtk git diff       # Compact
rtk tsc            # Grouped errors
rtk lint           # Grouped violations
```
<!-- /guru-cerdas-claude -->
