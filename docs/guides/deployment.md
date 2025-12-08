# Deployment Guide

Panduan ini menjelaskan cara deploy Portal Guru ke berbagai platform hosting.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Build for Production](#build-for-production)
4. [Deployment Options](#deployment-options)
   - [Vercel](#vercel-recommended)
   - [Netlify](#netlify)
   - [Self-Hosted](#self-hosted)
5. [Database Migration](#database-migration)
6. [Post-Deployment Checklist](#post-deployment-checklist)
7. [Monitoring & Logging](#monitoring--logging)
8. [Rollback Strategies](#rollback-strategies)

---

## Prerequisites

Sebelum deployment, pastikan:

- [ ] Supabase project sudah dibuat dan dikonfigurasi
- [ ] Database schema sudah di-migrate
- [ ] Environment variables sudah disiapkan
- [ ] Domain sudah disiapkan (opsional)

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key | `eyJhbGci...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_GEMINI_API_KEY` | Google Gemini API key for AI features | `` |
| `VITE_APP_VERSION` | Application version | `1.0.0` |
| `VITE_SENTRY_DSN` | Sentry DSN for error tracking | `` |

### Getting Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **API**
4. Copy the **Project URL** and **anon public** key

```bash
# Example .env.production
VITE_SUPABASE_URL=https://fddvcyqbfqydvsfujcxd.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Build for Production

### Standard Build

```bash
# Install dependencies
npm ci

# Build for production
npm run build

# Preview locally (optional)
npm run preview
```

### Build Output

After building, the `dist/` folder contains:
- `index.html` - Entry point
- `assets/` - JavaScript, CSS, and images
- `sw.js` - Service Worker for PWA
- `manifest.webmanifest` - PWA manifest

---

## Deployment Options

### Vercel (Recommended)

Vercel provides the easiest deployment experience for Vite projects.

#### Option 1: Via GitHub Integration

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and sign in
3. Click **New Project**
4. Import your GitHub repository
5. Configure environment variables:
   - Add `VITE_SUPABASE_URL`
   - Add `VITE_SUPABASE_ANON_KEY`
6. Click **Deploy**

#### Option 2: Via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

#### Vercel Configuration

Create `vercel.json` in project root:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" }
      ]
    }
  ]
}
```

---

### Netlify

#### Option 1: Via UI

1. Go to [Netlify](https://netlify.com) and sign in
2. Click **Add new site** → **Import an existing project**
3. Connect to GitHub and select repository
4. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Add environment variables in Site settings
6. Click **Deploy site**

#### Option 2: Via CLI

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Login
netlify login

# Deploy preview
netlify deploy

# Deploy to production
netlify deploy --prod
```

#### Netlify Configuration

Create `netlify.toml` in project root:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "no-cache"
```

---

### Self-Hosted

For self-hosting with Nginx or Apache.

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name portal-guru.example.com;
    root /var/www/portal-guru/dist;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # Serve static files with cache
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service Worker - no cache
    location /sw.js {
        add_header Cache-Control "no-cache";
    }

    # SPA routing - fallback to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

#### Docker Deployment

Create `Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Build and run:

```bash
docker build -t portal-guru .
docker run -p 80:80 portal-guru
```

---

## Database Migration

### Initial Setup

1. Create a new Supabase project
2. Run the migration SQL in Supabase SQL Editor
3. Enable Row Level Security on all tables

### Migration Script

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables (example)
CREATE TABLE IF NOT EXISTS classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own classes" ON classes
    FOR SELECT USING (auth.uid() = user_id);
```

### Running Migrations

```bash
# Using Supabase CLI
supabase db push

# Or manually via SQL Editor in Dashboard
```

---

## Post-Deployment Checklist

After deploying, verify:

- [ ] ✅ Application loads correctly
- [ ] ✅ Login/logout works
- [ ] ✅ Data fetching works (check Network tab)
- [ ] ✅ CRUD operations work
- [ ] ✅ PWA installs correctly
- [ ] ✅ Offline mode works (disconnect network)
- [ ] ✅ Push notifications work (if enabled)
- [ ] ✅ PDF generation works
- [ ] ✅ Export features work

---

## Monitoring & Logging

### Recommended Tools

| Tool | Purpose |
|------|---------|
| Vercel Analytics | Page performance |
| Sentry | Error tracking |
| LogRocket | Session replay |
| Supabase Studio | Database monitoring |

### Setting up Sentry

1. Create Sentry project
2. Install SDK: `npm install @sentry/react`
3. Add to `.env`: `VITE_SENTRY_DSN=your_dsn`
4. Initialize in `main.tsx`

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
});
```

---

## Rollback Strategies

### Vercel Rollback

1. Go to Vercel Dashboard
2. Select project
3. Go to **Deployments** tab
4. Find previous working deployment
5. Click **•••** menu → **Promote to Production**

### Netlify Rollback

1. Go to Netlify Dashboard
2. Select site
3. Go to **Deploys** tab
4. Find previous working deploy
5. Click **Publish deploy**

### Manual Rollback

```bash
# Checkout previous version
git checkout v1.0.0

# Rebuild and deploy
npm run build
vercel --prod
```

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| 404 on page refresh | Configure SPA routing (see Nginx config) |
| CORS errors | Check Supabase URL is correct |
| Service Worker not updating | Clear browser cache, use skip waiting |
| Build fails | Check Node.js version >= 18 |

### Debug Commands

```bash
# Check build output
npm run build -- --debug

# Check environment variables
echo $VITE_SUPABASE_URL

# Test production build locally
npm run preview
```

---

## Related Documentation

- [Architecture Overview](../architecture/overview.md)
- [Contributing Guide](./contributing.md)
- [Troubleshooting Guide](./troubleshooting.md)
