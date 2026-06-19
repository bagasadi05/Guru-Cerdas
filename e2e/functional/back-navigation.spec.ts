import { test, expect, type Page } from '@playwright/test';

/**
 * Functional back-navigation regression tests (S10-5).
 *
 * These guard against the "blank screen after pressing Back" bug class that
 * Sprint 10 hardened (PageTransition exit-animation race + ErrorBoundary reuse).
 * Unlike the visual specs, these assert DOM content directly so they are
 * deterministic across platforms (no win32 screenshot baselines).
 */

const supabaseUrl = 'https://test.supabase.co';

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

async function setupSupabaseMocks(page: Page) {
  await page.route(`${supabaseUrl}/rest/v1/**`, async (route) => {
    const url = route.request().url();
    if (url.includes('/user_roles')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ role: 'teacher' }]) });
    } else if (url.includes('/classes')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'class-1', name: 'Kelas 10-A', user_id: 'mock-user-uuid' }]) });
    } else if (url.includes('/students')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: '1', name: 'Budi Santoso', class_id: 'class-1', nis: '12345', nisn: '0012345678', gender: 'L', guardian_name: 'Agus', guardian_phone: '08123456789' },
          { id: '2', name: 'Siti Aminah', class_id: 'class-1', nis: '12346', nisn: '0012345679', gender: 'P', guardian_name: 'Rina', guardian_phone: '08123456790' },
        ]),
      });
    } else if (url.includes('/semesters')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'sem-1', name: 'Ganjil', is_active: true }]) });
    } else if (url.includes('/academic_years')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'ay-1', name: '2025/2026', is_active: true }]) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }
  });

  await page.route(`${supabaseUrl}/auth/v1/user**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUTH_SESSION.user) });
  });
}

async function authenticate(page: Page) {
  await page.addInitScript((session) => {
    window.localStorage.setItem('portal-guru-auth', JSON.stringify(session));
    window.localStorage.setItem('onboarding_completed', 'true');
  }, MOCK_AUTH_SESSION);
  await setupSupabaseMocks(page);
}

test.describe('Back navigation does not blank the screen', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('dashboard <-> students survives back and forward', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('text=Aksi Cepat', { timeout: 15000 });

    // Navigate forward to the students screen.
    await page.goto('/siswa');
    await page.waitForSelector('text=Budi Santoso', { timeout: 15000 });

    // Browser Back -> dashboard must re-render (not a blank screen).
    await page.goBack();
    await page.waitForSelector('text=Aksi Cepat', { timeout: 15000 });
    await expect(page.getByText('Aksi Cepat')).toBeVisible();

    // Body should contain visible content (extra guard against a blank render).
    const bodyText = (await page.locator('body').innerText()).trim();
    expect(bodyText.length).toBeGreaterThan(0);

    // Browser Forward -> students again.
    await page.goForward();
    await page.waitForSelector('text=Budi Santoso', { timeout: 15000 });
    await expect(page.getByText('Budi Santoso')).toBeVisible();
  });

  test('repeated back/forward cycles keep content visible', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('text=Aksi Cepat', { timeout: 15000 });

    for (let i = 0; i < 3; i++) {
      await page.goto('/siswa');
      await page.waitForSelector('text=Budi Santoso', { timeout: 15000 });

      await page.goBack();
      await page.waitForSelector('text=Aksi Cepat', { timeout: 15000 });
      await expect(page.getByText('Aksi Cepat')).toBeVisible();
    }
  });
});
