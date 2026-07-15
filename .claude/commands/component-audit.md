---
description: Audit component patterns — props, memoization, accessibility, mobile
---

Audit components in the specified path (or all page components if no path given).

Usage: `/component-audit src/components/pages/DashboardPage.tsx`

## Audit Criteria

### Structure
- [ ] Functional component with proper TypeScript props interface
- [ ] Lazy-loaded if it's a page component
- [ ] Proper error boundary wrapping
- [ ] Loading skeleton defined

### Performance
- [ ] `React.memo()` on expensive sub-components
- [ ] `useMemo` for computed values (not inline objects/arrays in JSX)
- [ ] `useCallback` for handlers passed to child components
- [ ] No unnecessary re-renders (check dependency arrays)
- [ ] Dynamic imports for heavy libraries (pdf, excel, charts)

### Accessibility (a11y)
- [ ] Semantic HTML elements (button, nav, main, section, etc.)
- [ ] `aria-label` on icon-only buttons
- [ ] Keyboard navigation support (tab, enter, escape)
- [ ] Focus management for modals/dialogs
- [ ] Color contrast (not just green→emerald, but text readability)
- [ ] Screen reader friendly (no content only conveyed visually)

### Mobile
- [ ] Touch targets ≥ 44x44px
- [ ] Responsive layout (test at 320px, 375px, 768px, 1024px)
- [ ] Bottom sheet / drawer for mobile actions (not tiny dropdowns)
- [ ] No horizontal overflow

### Styling
- [ ] Uses `emerald` not `green`
- [ ] Dark mode support (`dark:` prefix)
- [ ] Consistent with `docs/DESIGN_STANDARDS.md`
- [ ] Uses design tokens from `tailwind.config.cjs`

### Data
- [ ] Uses React Query for server state
- [ ] Proper loading/error/empty states
- [ ] Optimistic updates where appropriate

## Output

Rate each criterion: ✅ PASS / ⚠️ WARN / ❌ FAIL
Provide specific line numbers and fixes for any WARN/FAIL items.
