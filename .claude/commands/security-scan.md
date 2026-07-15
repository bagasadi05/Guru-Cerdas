---
description: Security scan for Portal Guru (Supabase RLS, secrets, XSS, auth)
---

Run a security audit specific to this React/Supabase application.

## Steps

1. **Secrets scan:**
   ```bash
   grep -rn "VITE_.*KEY\|VITE_.*SECRET\|VITE_.*TOKEN" src/ --include="*.ts" --include="*.tsx" | grep -v "import.meta.env"
   grep -rn "sk-\|eyJ" src/ --include="*.ts" --include="*.tsx" | grep -v ".d.ts"
   ```
   - No API keys hardcoded in source
   - `.env` not committed (check `.gitignore`)

2. **Supabase RLS audit:**
   - Use MCP to check RLS status on all public tables
   ```sql
   SELECT schemaname, tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY tablename;
   ```
   - Flag tables with RLS disabled that contain sensitive data
   - Check for overly permissive policies

3. **Auth security:**
   - Check `services/AuthSecurityService.ts` for session management
   - Verify role-based access control in routes
   - Check `hooks/useAuth.tsx` for proper auth state handling
   - Verify session timeout configuration

4. **XSS protection:**
   ```bash
   grep -rn "innerHTML\|outerHTML" src/ --include="*.tsx"
   grep -rn "DOMPurify\|sanitize" src/ --include="*.ts" --include="*.tsx"
   ```
   - All user-generated content must be sanitized via DOMPurify
   - No raw HTML injection without sanitization

5. **Input validation:**
   - Forms use `zod` schemas (check `types/forms.ts`)
   - API inputs validated before Supabase calls
   - File upload validation in `utils/fileValidation.ts`

6. **CSP & Security Headers:**
   - Check `vite.config.ts` for CSP configuration
   - Check `vercel.json` for security headers

7. **Dependency audit:**
   ```bash
   npm audit --production 2>&1 | head -30
   ```

8. **Rate limiting:**
   - Check `services/rateLimiter.ts` implementation
   - Verify API proxy has rate limiting

## Output

```
Security Score: X/10
✅ Secrets — no hardcoded keys
⚠️ RLS — 2 tables without RLS (list them)
✅ Auth — session timeout configured
⚠️ XSS — 1 unsanitized HTML injection
✅ Input — zod validation present
✅ CSP — configured
⚠️ Dependencies — 3 vulnerabilities
```

Fix priority: RLS gaps > XSS > secrets > dependencies > headers.
