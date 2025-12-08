# Troubleshooting Guide

Panduan ini berisi solusi untuk masalah umum yang mungkin Anda temui saat menggunakan atau mengembangkan Portal Guru.

## Table of Contents

1. [Build Issues](#build-issues)
2. [Runtime Issues](#runtime-issues)
3. [Authentication Issues](#authentication-issues)
4. [Database Issues](#database-issues)
5. [PWA/Offline Issues](#pwaoffline-issues)
6. [Performance Issues](#performance-issues)
7. [Deployment Issues](#deployment-issues)

---

## Build Issues

### ❌ Error: Module not found

**Symptoms:**
```
Error: Cannot find module 'xxx'
Module not found: Error: Can't resolve 'xxx'
```

**Solutions:**

1. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules
   rm package-lock.json
   npm install
   ```

2. **Check import path:**
   ```typescript
   // ❌ Wrong
   import { Button } from 'components/ui/Button';
   
   // ✅ Correct
   import { Button } from '@/components/ui/Button';
   // or
   import { Button } from '../components/ui/Button';
   ```

3. **Verify tsconfig paths:**
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/*"]
       }
     }
   }
   ```

---

### ❌ TypeScript compilation errors

**Symptoms:**
```
TS2307: Cannot find module
TS2339: Property 'x' does not exist on type 'y'
```

**Solutions:**

1. **Check TypeScript version:**
   ```bash
   npx tsc --version
   # Should be 5.x
   ```

2. **Regenerate type definitions:**
   ```bash
   npm run typecheck
   ```

3. **For Supabase types, regenerate:**
   ```bash
   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/services/database.types.ts
   ```

---

### ❌ Vite build fails with memory error

**Symptoms:**
```
FATAL ERROR: Reached heap limit Allocation failed
JavaScript heap out of memory
```

**Solutions:**

1. **Increase Node memory:**
   ```bash
   # Windows
   set NODE_OPTIONS=--max-old-space-size=4096
   
   # Linux/Mac
   export NODE_OPTIONS=--max-old-space-size=4096
   
   npm run build
   ```

2. **Add to package.json:**
   ```json
   {
     "scripts": {
       "build": "NODE_OPTIONS=--max-old-space-size=4096 vite build"
     }
   }
   ```

---

## Runtime Issues

### ❌ Blank white screen on load

**Symptoms:**
- Application shows blank white page
- No errors in console

**Diagnostic steps:**

1. **Check console for errors:**
   - Open DevTools (F12) → Console tab
   - Look for red error messages

2. **Check Network tab:**
   - Look for failed requests (red)
   - Check if JavaScript files loaded

**Solutions:**

1. **Clear browser cache:**
   ```
   Ctrl+Shift+Delete → Clear cached images and files
   ```

2. **Check environment variables:**
   ```typescript
   // Add to main.tsx temporarily
   console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
   ```

3. **Check for JavaScript errors:**
   ```bash
   npm run build
   npm run preview
   # Check console for errors
   ```

---

### ❌ Data not loading / Infinite loading

**Symptoms:**
- Skeleton loaders never stop
- Data never appears
- "Loading..." shown indefinitely

**Diagnostic commands:**

```javascript
// In browser console
localStorage.clear();
sessionStorage.clear();
location.reload();
```

**Solutions:**

1. **Check Supabase connection:**
   ```typescript
   // Test in console
   import { supabase } from './services/supabase';
   const { data, error } = await supabase.from('students').select('*').limit(1);
   console.log({ data, error });
   ```

2. **Check RLS policies:**
   - Go to Supabase Dashboard
   - Table Editor → Select table
   - Check if RLS is blocking access

3. **Check user authentication:**
   ```javascript
   // In browser console
   const { data } = await supabase.auth.getUser();
   console.log(data.user);
   ```

---

### ❌ Form submission fails silently

**Symptoms:**
- Form submits but nothing happens
- No success/error message
- Data not saved

**Solutions:**

1. **Check mutation error:**
   ```typescript
   const { mutate, error } = useMutation({
     // ...
     onError: (err) => {
       console.error('Mutation error:', err);
     }
   });
   ```

2. **Check network request:**
   - DevTools → Network tab
   - Filter by "Fetch/XHR"
   - Look for failed POST/PATCH requests

3. **Validate data format:**
   ```typescript
   console.log('Submitting:', formData);
   mutate(formData);
   ```

---

## Authentication Issues

### ❌ Login fails with "Invalid credentials"

**Solutions:**

1. **Verify email is confirmed:**
   - Check Supabase Dashboard → Authentication → Users
   - Look for "Confirmed" status

2. **Reset password:**
   ```typescript
   await supabase.auth.resetPasswordForEmail(email);
   ```

3. **Check auth settings:**
   - Supabase Dashboard → Authentication → Settings
   - Verify Site URL matches your domain

---

### ❌ Session expires unexpectedly

**Solutions:**

1. **Check JWT expiry settings:**
   - Supabase Dashboard → Settings → Auth
   - Adjust JWT expiry time

2. **Handle session refresh:**
   ```typescript
   supabase.auth.onAuthStateChange((event, session) => {
     if (event === 'TOKEN_REFRESHED') {
       console.log('Token refreshed');
     }
   });
   ```

---

## Database Issues

### ❌ RLS policy blocking access

**Symptoms:**
```
Error: new row violates row-level security policy
```

**Diagnostic steps:**

```sql
-- In Supabase SQL Editor
SELECT * FROM pg_policies WHERE tablename = 'students';
```

**Solutions:**

1. **Check policy conditions:**
   ```sql
   -- Example: Allow users to see their own data
   CREATE POLICY "Users can view own students"
   ON students FOR SELECT
   USING (auth.uid() = user_id);
   ```

2. **Test as authenticated user:**
   ```sql
   -- Set session user
   SET request.jwt.claim.sub = 'user-uuid-here';
   SELECT * FROM students;
   ```

---

### ❌ Foreign key constraint violation

**Symptoms:**
```
Error: insert or update on table "students" violates foreign key constraint
```

**Solutions:**

1. **Ensure parent record exists:**
   ```typescript
   // First create class, then student
   await supabase.from('classes').insert({ name: 'Class A' });
   await supabase.from('students').insert({ class_id: classId, ... });
   ```

3. **Handle deletion order:**
   ```typescript
   // Delete children first
   await supabase.from('students').delete().eq('class_id', classId);
   await supabase.from('classes').delete().eq('id', classId);
   ```

---

### ❌ Database Schema Drift (400 Bad Request)

**Symptoms:**
```
400 Bad Request (PATCH/POST)
Error: column "deleted_at" of relation "tasks" does not exist
```

**Cause:**
Database schema di Supabase tidak sinkron dengan kode aplikasi. Ini sering terjadi jika Anda pull perubahan kode baru yang memerlukan kolom database baru, tetapi migrasi database belum dijalankan.

**Solutions:**

1. **Jalankan Migrasi:**
   - Buka file `docs/REQUIRED_DATABASE_UPDATE.md`
   - Copy script SQL
   - Buka [Supabase Dashboard](https://supabase.com/dashboard)
   - Masuk ke SQL Editor
   - Paste dan jalankan script

2. **Periksa tabel secara manual:**
   - Table Editor → `tasks`
   - Pastikan kolom `deleted_at` (timestamp) ada. Jika tidak, tambahkan manual.

---

## PWA/Offline Issues

### ❌ PWA not installing

**Solutions:**

1. **Check manifest:**
   - DevTools → Application → Manifest
   - Verify all required fields present

2. **Verify HTTPS:**
   - PWA only works on HTTPS (or localhost)

3. **Check service worker:**
   - DevTools → Application → Service Workers
   - Should show "Activated and running"

---

### ❌ Old content after update

**Symptoms:**
- New features not appearing
- Old UI showing after deploy

**Solutions:**

1. **Force refresh:**
   ```
   Ctrl+Shift+R (Windows/Linux)
   Cmd+Shift+R (Mac)
   ```

2. **Clear service worker cache:**
   - DevTools → Application → Storage
   - Click "Clear site data"

3. **Unregister service worker:**
   - DevTools → Application → Service Workers
   - Click "Unregister"

---

### ❌ Offline queue not syncing

**Solutions:**

1. **Check queue status:**
   ```javascript
   // In console
   const queue = JSON.parse(localStorage.getItem('supabase-offline-queue') || '[]');
   console.log('Pending mutations:', queue);
   ```

2. **Manual sync:**
   ```javascript
   import { processQueue } from './hooks/useSyncQueue';
   await processQueue();
   ```

---

## Performance Issues

### ❌ Slow initial load

**Diagnostic:**
- DevTools → Performance → Start profiling
- Check Lighthouse report

**Solutions:**

1. **Check bundle size:**
   ```bash
   npm run build
   # Look for large chunks
   ```

2. **Lazy load pages:**
   ```typescript
   const Dashboard = lazy(() => import('./pages/Dashboard'));
   ```

3. **Optimize images:**
   - Use WebP format
   - Implement lazy loading

---

### ❌ UI freezing during operations

**Solutions:**

1. **Use Web Workers for heavy operations:**
   ```typescript
   const worker = new Worker('./workers/exportWorker.ts');
   worker.postMessage(data);
   ```

2. **Debounce input handlers:**
   ```typescript
   const debouncedSearch = useMemo(
     () => debounce((value) => setSearch(value), 300),
     []
   );
   ```

---

## Deployment Issues

### ❌ 404 on page refresh (SPA routing)

**Solutions:**

1. **Vercel - add vercel.json:**
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/" }]
   }
   ```

2. **Netlify - add _redirects:**
   ```
   /* /index.html 200
   ```

3. **Nginx:**
   ```nginx
   location / {
     try_files $uri $uri/ /index.html;
   }
   ```

---

### ❌ Environment variables not working

**Solutions:**

1. **Prefix with VITE_:**
   ```env
   # ❌ Wrong
   SUPABASE_URL=xxx
   
   # ✅ Correct
   VITE_SUPABASE_URL=xxx
   ```

2. **Rebuild after changing:**
   ```bash
   npm run build
   ```

3. **Add to hosting platform:**
   - Vercel: Settings → Environment Variables
   - Netlify: Site settings → Environment

---

## Getting Help

If none of these solutions work:

1. **Search existing issues:** [GitHub Issues](https://github.com/your-org/portal-guru/issues)
2. **Create new issue** with:
   - Error message
   - Steps to reproduce
   - Browser/OS information
   - Console logs
3. **Contact maintainers** via email

---

## Related Documentation

- [Architecture Overview](../architecture/overview.md)
- [Contributing Guide](./contributing.md)
- [Deployment Guide](./deployment.md)
