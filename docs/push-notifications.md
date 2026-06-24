# Push Notifications - Orang Tua/Wali Murid

Dokumentasi lengkap fitur push notifikasi instan ke orang tua/wali murid di Portal Guru.

## Arsitektur

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                                  │
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐  │
│  │  Notifications  │───▶│ PushNotification│───▶│   pushSubscription.ts   │  │
│  │    Section.tsx  │    │    Service.ts   │    │   (Web Push Helpers)    │  │
│  └─────────────────┘    └────────┬────────┘    └───────────┬─────────────┘  │
│                                  │                         │                │
│                                  │  enableForParent()      │ subscribeToPush│
│                                  │  disableForParent()     │                │
│                                  │  getParentStatus()      │                │
│                                  ▼                         ▼                │
│                     ┌─────────────────────────────────────────┐             │
│                     │      Supabase RPC (via JS Client)       │             │
│                     │  subscribe_parent / unsubscribe_parent  │             │
│                     └─────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ RPC Call
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE (PostgreSQL)                             │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      push_subscriptions table                        │   │
│  │  - id, user_id, student_id, endpoint, p256dh, auth, is_active      │   │
│  │  - RLS: Users can manage their own subscriptions                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     RPC Functions (Security Definer)                 │   │
│  │  - subscribe_parent(p_student_id, p_access_code, p_endpoint, ...)  │   │
│  │  - unsubscribe_parent(p_student_id, p_access_code, p_endpoint)     │   │
│  │  - get_parent_subscription_status(...)                              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Trigger Functions (pg_net)                        │   │
│  │  - invoke_dispatch_push_instant(student_id, event_type, payload)   │   │
│  │  - on_academic_record_inserted() → grade_input                      │   │
│  │  - on_attendance_inserted_or_updated() → attendance_input           │   │
│  │  - on_announcement_inserted() → announcement_input                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ HTTP POST via pg_net
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EDGE FUNCTIONS (Deno Runtime)                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    dispatch-push/index.ts                            │   │
│  │  - Mode: instant, all, task-due-check, scheduled-check             │   │
│  │  - Queries push_subscriptions by student_id                        │   │
│  │  - Sends Web Push via VAPID + aes128gcm encryption                 │   │
│  │  - Uses _shared/web-push.ts for RFC 8030/8292/8188 compliance     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ Web Push (FCM/Mozilla)
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER DEVICE                                    │
│  - Service Worker receives push event                                      │
│  - Displays notification with title, body, icon                           │
│  - User clicks → opens app                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Flow Detail

### 1. Subscribe (Orang Tua)

```
1. User buka Settings → Notifications
2. Klik toggle "Notifikasi Push"
3. Browser minta izin (Notification.requestPermission())
4. Jika granted:
   a. subscribeToPush(VAPID_PUBLIC_KEY) → PushSubscription
   b. serializeSubscription() → endpoint, p256dh, auth
   c. pushNotificationService.enableForParent(accessCode, studentId)
   d. RPC subscribe_parent(access_code, student_id, endpoint, p256dh, auth, user_agent)
   e. Server validates access_code → upsert ke push_subscriptions
5. Jika ditolak → tampilkan error message
```

### 2. Unsubscribe

```
1. User matikan toggle "Notifikasi Push"
2. pushNotificationService.disableForParent(accessCode, studentId)
3. unsubscribeFromPush() → unsubscribe dari PushManager
4. RPC unsubscribe_parent(access_code, student_id, endpoint)
5. Server set is_active = false
```

### 3. Instant Push (Triggered by DB Events)

```
1. Guru input nilai → INSERT ke academic_records
2. Trigger on_academic_record_inserted() fires
3. Query student name
4. Build payload: { title: "📝 Nilai Baru Terinput", body: "..." }
5. invoke_dispatch_push_instant(student_id, 'grade_input', payload)
6. pg_net HTTP POST ke dispatch-push Edge Function
7. Edge Function:
   a. Query push_subscriptions WHERE student_id = X AND is_active = true
   b. For each subscription:
      - Create Web Push payload with VAPID auth
      - Encrypt with aes128gcm (RFC 8188)
      - POST to subscription endpoint (FCM/Mozilla)
8. Browser Service Worker receives push → display notification
```

## VAPID Keys

### Generate Keys

```bash
npx web-push generate-vapid-keys
```

Output:
```
VAPID public key: <base64url-encoded>
VAPID private key: <base64url-encoded>
```

### Set di Supabase

```bash
supabase secrets set VAPID_PUBLIC_KEY=<public-key>
supabase secrets set VAPID_PRIVATE_KEY=<private-key>
supabase secrets set VAPID_SUBJECT=mailto:admin@portalguru.app
```

### Set di Client (.env)

```
VITE_VAPID_PUBLIC_KEY=<public-key>
```

## Toggle di SettingsModal

File: `src/components/settings/NotificationsSection.tsx`

Fitur:
1. **Status Cards**: Izin Browser, Push Subscription, Status User, Belum Dibaca
2. **Master Switch**: Aktifkan/nonaktifkan push notifications
3. **Task Reminders**: Pengingat tugas mendekati deadline
4. **Attendance Reminders**: Pengingat mengisi absensi
5. **Sound Picker**: Pilih nada notifikasi
6. **Test Push**: Kirim notifikasi test via Service Worker

## Test Manual E2E

### 1. Setup

```bash
# Pastikan VAPID keys sudah di-set
supabase secrets list

# Deploy Edge Function
supabase functions deploy dispatch-push

# Pastikan pg_cron aktif
SELECT * FROM cron.job;
```

### 2. Test Subscribe

1. Buka aplikasi di browser
2. Login sebagai guru
3. Buka Settings → Notifications
4. Klik toggle "Notifikasi Push"
5. Izinkan notifikasi di browser
6. Pastikan status berubah menjadi "Aktif & terdaftar"

### 3. Test Instant Push (Grade Input)

1. Buka halaman siswa
2. Input nilai baru
3. Periksa log Edge Function:
   ```bash
   supabase functions logs dispatch-push
   ```
4. Pastikan notifikasi muncul di device

### 4. Test Parent Push

1. Login sebagai parent (portal login)
2. Buka Settings → Notifications
3. Aktifkan push notifications
4. Input nilai untuk siswa tersebut
5. Pastikan parent menerima notifikasi

### 5. Debug

```bash
# Cek subscriptions
SELECT * FROM push_subscriptions WHERE is_active = true;

# Cek Edge Function logs
supabase functions logs dispatch-push

# Cek pg_cron jobs
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

## Troubleshooting

| Masalah | Kemungkinan Penyebab | Solusi |
|---------|---------------------|--------|
| Toggle tidak bisa diklik | Browser tidak support push | Gunakan Chrome/Firefox/Edge |
| "Izin notifikasi diblokir" | User memblokir notifikasi | Buka Settings browser →允izinkan notifikasi |
| Push tidak sampai | VAPID keys salah | Regenerate keys, update secrets |
| Push tidak sampai | Subscription expired | Re-subscribe (toggle off/on) |
| Error "Push service error" | VPN/ad blocker blokir FCM | Nonaktifkan VPN/ad blocker |
| iOS tidak menerima push | Buka di Safari biasa | Install ke Home Screen dulu |

## Database Schema

### push_subscriptions

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_seen_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT chk_user_or_student CHECK (
    (user_id IS NOT NULL) OR (student_id IS NOT NULL)
  )
);
```

### RPC Functions

```sql
-- Subscribe parent
SELECT subscribe_parent(
  p_student_id := '<uuid>',
  p_access_code := '<code>',
  p_endpoint := '<endpoint>',
  p_p256dh := '<key>',
  p_auth := '<auth>',
  p_user_agent := '<ua>'
);

-- Unsubscribe parent
SELECT unsubscribe_parent(
  p_student_id := '<uuid>',
  p_access_code := '<code>',
  p_endpoint := '<endpoint>'
);

-- Check status
SELECT get_parent_subscription_status(
  p_student_id := '<uuid>',
  p_access_code := '<code>',
  p_endpoint := '<endpoint>'
);
```

## Referensi

- [Web Push Protocol (RFC 8030)](https://datatracker.ietf.org/doc/html/rfc8030)
- [VAPID (RFC 8292)](https://datatracker.ietf.org/doc/html/rfc8292)
- [Web Push Encryption (RFC 8188)](https://datatracker.ietf.org/doc/html/rfc8188)
- [Push API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
