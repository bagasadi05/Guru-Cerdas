# 🔄 Supabase Keep-Alive Setup Guide

## Mencegah Auto-Pause pada Supabase Free Plan

Supabase Free Plan akan otomatis di-pause setelah **7 hari tidak ada aktivitas**. 
Workflow ini akan ping database setiap 5 hari untuk mencegah hal tersebut.

---

## 📋 Langkah Setup

### 1. Push Repository ke GitHub

Jika belum, push repository ini ke GitHub:

```bash
git add .
git commit -m "Add Supabase keep-alive workflow"
git push origin main
```

### 2. Tambahkan GitHub Secrets

Buka repository di GitHub, lalu:

1. Klik **Settings** → **Secrets and variables** → **Actions**
2. Klik **New repository secret**
3. Tambahkan 2 secrets berikut:

| Secret Name | Value |
|-------------|-------|
| `SUPABASE_URL` | URL project Supabase (contoh: `https://xxxxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | Anon/Public key dari Supabase Dashboard |

### 3. Cara Mendapatkan Value

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project Anda
3. Klik **Settings** → **API**
4. Copy nilai dari:
   - **Project URL** → untuk `SUPABASE_URL`
   - **anon public** key → untuk `SUPABASE_ANON_KEY`

---

## 🧪 Test Manual

Untuk test workflow secara manual:

1. Buka tab **Actions** di repository GitHub
2. Pilih workflow **"Keep Supabase Alive"**
3. Klik **Run workflow** → **Run workflow**
4. Tunggu beberapa detik dan cek hasilnya

---

## 📅 Schedule

Workflow akan berjalan otomatis:
- **Setiap 5 hari** pada pukul 00:00 UTC (07:00 WIB)
- Cukup jauh sebelum batas 7 hari auto-pause

---

## ⚠️ Catatan Penting

- Pastikan secrets sudah ditambahkan dengan benar
- Jika workflow gagal, cek tab Actions untuk melihat error log
- Workflow ini **gratis** karena menggunakan GitHub Actions free tier

---

## 🔧 Troubleshooting

### Error: "Bad credentials"
→ Pastikan `SUPABASE_ANON_KEY` sudah benar

### Error: "Could not resolve host"
→ Pastikan `SUPABASE_URL` format-nya benar (harus include `https://`)

### Workflow tidak jalan otomatis
→ Pastikan repository public atau GitHub Actions enabled untuk private repo
