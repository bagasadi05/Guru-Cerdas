---
description: Quick health check — types, lint, tests, build
---

Run a quick health check of the project. Report PASS/FAIL for each gate.

```bash
# 1. TypeScript
echo "=== TypeScript ===" && rtk tsc

# 2. ESLint
echo "=== ESLint ===" && rtk lint

# 3. Tests
echo "=== Tests ===" && rtk npm test

# 4. Build
echo "=== Build ===" && npm run build 2>&1 | tail -20
```

Report format:
```
✅ TypeScript — 0 errors
✅ ESLint — 0 warnings
❌ Tests — 3 failures (see details)
✅ Build — success (dist/ 2.1MB)
```

If any gate fails, provide the top 3 most actionable fixes.
