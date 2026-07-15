---
description: Update project documentation to reflect current state
---

Update documentation in `docs/` and `README.md` to reflect current codebase state.

## Steps

1. **Check what changed since last docs update:**
   ```bash
   rtk git log --oneline -20
   rtk git diff --stat HEAD~10
   ```

2. **Update README.md** if needed:
   - Feature list matches actual features in `components/pages/`
   - Tech stack matches `package.json` dependencies
   - Installation steps still work
   - Project structure matches actual directory layout

3. **Update docs/ files:**
   - `docs/DESIGN_STANDARDS.md` — matches current Tailwind config
   - `docs/ROADMAP.md` — completed items marked done
   - `docs/DESIGN_SYSTEM.md` — matches actual UI components

4. **Validate docs:**
   ```bash
   npm run docs:validate
   ```

5. **Check for stale docs:**
   ```bash
   # Find references to removed files
   grep -rn "TODO\|FIXME\|WIP\|coming soon\|placeholder" docs/ README.md
   ```

6. **Update API docs** if services changed:
   ```bash
   npm run docs:api
   ```

7. **Summary:**
   - List files updated
   - List files that need manual review
   - List stale content found
