import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Read Supabase URL dynamically from .env file
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

// Mock token object to inject into localStorage.
// This matches Supabase client's format.
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
    updated_at: '2026-06-17T22:00:00Z'
  },
  expires_at: 9999999999
};

// Network mocking helper for Supabase REST endpoints
async function setupSupabaseMocks(page: any) {
  await page.route(`${supabaseUrl}/rest/v1/**`, async (route: any) => {
    const url = route.request().url();
    
    if (url.includes('/user_roles')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ role: 'teacher' }])
      });
    } else if (url.includes('/classes')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'class-1', name: 'Kelas 10-A', user_id: 'mock-user-uuid' }])
      });
    } else if (url.includes('/students')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: '1', name: 'Budi Santoso', class_id: 'class-1', nis: '12345', nisn: '0012345678', gender: 'L', guardian_name: 'Agus', guardian_phone: '08123456789' },
          { id: '2', name: 'Siti Aminah', class_id: 'class-1', nis: '12346', nisn: '0012345679', gender: 'P', guardian_name: 'Rina', guardian_phone: '08123456790' }
        ])
      });
    } else if (url.includes('/attendance')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    } else if (url.includes('/semesters')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'sem-1', name: 'Ganjil', is_active: true }])
      });
    } else if (url.includes('/academic_years')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'ay-1', name: '2025/2026', is_active: true }])
      });
    } else if (url.includes('/teacher_class_assignments')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    }
  });

  // Mock getSession call to avoid calling real Supabase
  await page.route(`${supabaseUrl}/auth/v1/user**`, async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_AUTH_SESSION.user)
    });
  });
}

test.describe('E2E Visual Regression Tests', () => {
  // 1. Role Selection Page (Unauthenticated)
  test('Role Selection Page', async ({ page }) => {
    await page.goto('/');
    // Wait for the container to render.
    await page.waitForSelector('text=Masuk Dasbor Guru');
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('role-selection.png');
  });

  // 2. Teacher Login Page (Unauthenticated)
  test('Teacher Login Page', async ({ page }) => {
    await page.goto('/guru-login');
    await page.waitForSelector('input[type="email"]');
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('teacher-login.png');
  });

  // 3. Parent Portal Login Page (Unauthenticated)
  test('Parent Portal Login Page', async ({ page }) => {
    await page.goto('/portal-login');
    await page.waitForSelector('text=Portal Orang Tua');
    await page.waitForTimeout(1000);
    await expect(page).toHaveScreenshot('parent-portal-login.png');
  });

  // 4. Authenticated Dashboard Page
  test('Authenticated Dashboard Page', async ({ page }) => {
    // Inject mock auth token to bypass login redirect and disable onboarding tour.
    await page.addInitScript((session) => {
      window.localStorage.setItem('portal-guru-auth', JSON.stringify(session));
      window.localStorage.setItem('onboarding_completed', 'true');
    }, MOCK_AUTH_SESSION);

    await setupSupabaseMocks(page);
    await page.goto('/dashboard');
    
    // Wait for dashboard content.
    await page.waitForSelector('text=Aksi Cepat');
    // Allow animation to finish.
    await page.waitForTimeout(1500);

    await expect(page).toHaveScreenshot('dashboard.png');
  });

  // 5. Authenticated Students Page
  test('Authenticated Students Page', async ({ page }) => {
    await page.addInitScript((session) => {
      window.localStorage.setItem('portal-guru-auth', JSON.stringify(session));
      window.localStorage.setItem('onboarding_completed', 'true');
    }, MOCK_AUTH_SESSION);

    await setupSupabaseMocks(page);
    await page.goto('/siswa');
    
    // Wait for students list to render.
    await page.waitForSelector('text=Budi Santoso');
    await page.waitForTimeout(1500);

    await expect(page).toHaveScreenshot('students-list.png');
  });
});
