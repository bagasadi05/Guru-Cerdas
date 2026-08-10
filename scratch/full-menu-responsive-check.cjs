/* eslint-disable no-console */
// Full-menu mobile responsive audit — injects mock auth + mocks Supabase REST,
// then measures horizontal overflow on every menu page at mobile viewports.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3000';

// Mirror e2e/visual/visual.spec.ts helpers
function getSupabaseUrl() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      if (line.trim().startsWith('VITE_SUPABASE_URL=')) {
        return line.split('=')[1].trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }
  return 'https://test.supabase.co';
}

const supabaseUrl = getSupabaseUrl();

const MOCK_AUTH_SESSION = {
  access_token: 'mock-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  refresh_token: 'mock-refresh-token',
  user: {
    id: 'mock-user-uuid',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'guru@example.com',
    email_confirmed_at: '2026-06-17T22:00:00Z',
    phone: '',
    confirmed_at: '2026-06-17T22:00:00Z',
    last_sign_in_at: '2026-06-17T22:00:00Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { name: 'Guru Cerdas', school_name: 'SMA Unggul Bangsa' },
    identities: [],
    created_at: '2026-06-17T22:00:00Z',
    updated_at: '2026-06-17T22:00:00Z',
  },
  expires_at: 9999999999,
};

const STUDENTS = [
  { id: '1', name: 'Budi Santoso', class_id: 'class-1', nis: '12345', nisn: '0012345678', gender: 'L', guardian_name: 'Agus', guardian_phone: '08123456789', access_code: '123456' },
  { id: '2', name: 'Siti Aminah', class_id: 'class-1', nis: '12346', nisn: '0012345679', gender: 'P', guardian_name: 'Rina', guardian_phone: '08123456790', access_code: '654321' },
];

async function setupSupabaseMocks(page) {
  await page.route(`${supabaseUrl}/rest/v1/**`, async (route) => {
    const url = route.request().url();
    let body = [];
    if (url.includes('/user_roles')) body = [{ role: 'teacher' }];
    else if (url.includes('/classes')) body = [{ id: 'class-1', name: 'Kelas 10-A', user_id: 'mock-user-uuid' }];
    else if (url.includes('/students')) body = STUDENTS;
    else if (url.includes('/attendance')) body = [];
    else if (url.includes('/semesters')) body = [{ id: 'sem-1', name: 'Ganjil', is_active: true }];
    else if (url.includes('/academic_years')) body = [{ id: 'ay-1', name: '2025/2026', is_active: true }];
    else if (url.includes('/teacher_class_assignments')) body = [];
    else if (url.includes('/schedules')) body = [];
    else if (url.includes('/tasks')) body = [];
    else if (url.includes('/journal')) body = [];
    else if (url.includes('/academic_records')) body = [];
    else if (url.includes('/quiz_points')) body = [];
    else if (url.includes('/student_development_analyses')) body = [];
    else if (url.includes('/extracurriculars')) body = [];
    else if (url.includes('/reports')) body = [];
    else if (url.includes('/communications')) body = [];
    else if (url.includes('/user_settings')) body = [];
    else if (url.includes('/action_history')) body = [];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.route(`${supabaseUrl}/auth/v1/user**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUTH_SESSION.user) });
  });
}

const MENUS = [
  { path: '/dashboard', label: 'Dashboard', ready: 'text=Aksi Cepat' },
  { path: '/siswa', label: 'Siswa', ready: 'text=Budi Santoso' },
  { path: '/absensi', label: 'Absensi', ready: 'text=Direktori Peserta Didik' },
  { path: '/jadwal', label: 'Jadwal', ready: null },
  { path: '/tugas', label: 'Tugas', ready: null },
  { path: '/input-massal', label: 'Input Massal', ready: null },
  { path: '/brankas', label: 'Brankas', ready: null },
  { path: '/pemulihan', label: 'Pemulihan', ready: null },
  { path: '/analytics', label: 'Analytics', ready: null },
  { path: '/ekstrakurikuler', label: 'Ekskul', ready: null },
  { path: '/bintang', label: 'Bintang', ready: null },
  { path: '/modul-ajar', label: 'Modul Ajar', ready: null },
  { path: '/pengaturan', label: 'Pengaturan', ready: null },
];

async function auditPage(page, menu, width) {
  const result = { menu: menu.label, path: menu.path, width, ok: true, overflowX: 0, notes: [] };
  await page.setViewportSize({ width, height: 800 });
  try {
    await page.addInitScript((session) => {
      window.localStorage.setItem('portal-guru-auth', JSON.stringify(session));
      window.localStorage.setItem('onboarding_completed', 'true');
    }, MOCK_AUTH_SESSION);
    await setupSupabaseMocks(page);
    await page.goto(`${BASE}${menu.path}`, { waitUntil: 'networkidle', timeout: 25000 });
    // wait for redirect (login guard) to settle
    await page.waitForTimeout(2500);
  } catch (e) {
    result.ok = false;
    result.error = `goto failed: ${e.message.slice(0, 150)}`;
    console.log(JSON.stringify(result));
    return;
  }

  // If redirected to login, we could not auth
  const url = page.url();
  if (url.includes('guru-login') || url.includes('portal-login') || url === `${BASE}/`) {
    result.ok = false;
    result.error = 'redirected to login (mock auth failed)';
    console.log(JSON.stringify(result));
    return;
  }

  const audit = await page.evaluate(() => {
    const doc = document.documentElement;
    const overflowX = Math.max(0, doc.scrollWidth - doc.clientWidth);
    const vw = window.innerWidth;
    const offenders = [];
    // Only flag elements in the content plane that actually cause overflow
    document.querySelectorAll('body *').forEach((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const isFixed = style.position === 'fixed';
      const isDecorative = (el.getAttribute('class') || '').includes('blur-') || (el.getAttribute('class') || '').includes('orb') || (el.getAttribute('class') || '').includes('-left-64') || (el.getAttribute('class') || '').includes('pointer-events-none');
      if (!isFixed && !isDecorative && (rect.right > vw + 1 || rect.left < -1)) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.getAttribute('class') || '').slice(0, 90),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        });
      }
    });
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflowX,
      offenderCount: offenders.length,
      offenders: offenders.slice(0, 8),
      bodyText: document.body.innerText.slice(0, 200),
    };
  });

  result.overflowX = audit.overflowX;
  result.scrollWidth = audit.scrollWidth;
  result.clientWidth = audit.clientWidth;
  result.ok = audit.overflowX === 0;
  result.offenders = audit.offenders;
  result.pagePreview = audit.bodyText.replace(/\s+/g, ' ').slice(0, 120);
  console.log(JSON.stringify(result));
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const width of [320, 375]) {
    for (const menu of MENUS) {
      await auditPage(page, menu, width);
    }
  }
  await browser.close();
})();
