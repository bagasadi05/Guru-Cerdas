---
description: Deep-dive feature repair — systematically fix a feature/module. Usage: /focused-fix <feature-path>
---

Systematically repair the feature/module at `$ARGUMENTS` using the focused-fix 5-phase protocol.

If `$ARGUMENTS` is empty, ask which feature/module to fix.

## Phase 1: SCOPE
Map the feature boundary:
- Entry point (page component in `components/pages/` or feature dir)
- All child components
- Related hooks in `hooks/`
- Related services in `services/`
- Related types in `types/`
- Related utils in `utils/`

## Phase 2: TRACE
Map dependencies:
- Which hooks does this feature use?
- Which services/APIs does it call?
- Which Supabase tables does it query?
- Which other components import from this feature?
- Which routes in `App.tsx` reference it?

## Phase 3: DIAGNOSE
Check for issues (IN ORDER):
1. **TypeScript errors**: `rtk tsc` — filter to this feature's files
2. **Lint issues**: `rtk lint` — filter to this feature's files
3. **Test failures**: `rtk npm test` — filter to this feature's tests
4. **Runtime issues**: Check error handling, loading states, edge cases
5. **Pattern violations**: Check against conventions in CLAUDE.md

Assign risk: HIGH (broken/blocking), MED (degraded), LOW (cosmetic/style).

## Phase 4: FIX
Repair in order: deps → types → logic → tests → integration.
- One fix at a time
- Verify after each fix
- 3-strike escalation: if a fix breaks something else, step back and reassess

## Phase 5: VERIFY
- Run feature-specific tests
- Run full test suite: `rtk npm test`
- Type check: `rtk tsc`
- Lint: `rtk lint`
- Manual smoke test checklist for the feature

**Iron Law:** No fixes before completing Phase 3. No exceptions.
