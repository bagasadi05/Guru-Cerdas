import { test, expect, type Page } from '@playwright/test';

const supabaseUrl = 'https://test.supabase.co';

const MOCK_USER_ID = 'a3b17c91-2394-4d87-9759-3fb7072dbcb0';
const MOCK_CLASS_ID = 'c0926bdf-fb35-46bd-8588-e25fa6312a02';
const MOCK_JOURNAL_ID = '827d04eb-843c-4b68-b7eb-fa293c683bdf';
const MOCK_SCHEDULE_ID = '73c0be85-b9d9-482a-a92c-569d4c5c2d33';

const MOCK_AUTH_SESSION = {
  access_token: 'mock-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  refresh_token: 'mock-refresh-token',
  user: {
    id: MOCK_USER_ID,
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
    const method = route.request().method();
    
    if (url.includes('/user_roles')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ role: 'teacher' }]) });
    } else if (url.includes('/classes')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: MOCK_CLASS_ID, name: 'Kelas 10-A', user_id: MOCK_USER_ID }]) });
    } else if (url.includes('/semesters')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'sem-1', name: 'Ganjil', is_active: true }]) });
    } else if (url.includes('/academic_years')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'ay-1', name: '2025/2026', is_active: true }]) });
    } else if (url.includes('/schedules')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: MOCK_SCHEDULE_ID, user_id: MOCK_USER_ID, day: 'Senin', subject: 'Kimia', start_time: '08:00', end_time: '09:30', class_id: MOCK_CLASS_ID }]) });
    } else if (url.includes('/teaching_journals')) {
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: MOCK_JOURNAL_ID,
              user_id: MOCK_USER_ID,
              class_id: MOCK_CLASS_ID,
              subject: 'Kimia',
              topic: 'Ikatan Kimia',
              activities: 'Belajar ikatan ionik dan kovalen',
              date: new Date().toISOString().split('T')[0],
              meeting_number: 1,
              created_at: new Date().toISOString()
            }
          ])
        });
      } else if (method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '827d04eb-843c-4b68-b7eb-fa293c683bd2',
            user_id: MOCK_USER_ID,
            class_id: MOCK_CLASS_ID,
            subject: 'Kimia',
            topic: 'Ikatan Kimia',
            activities: 'Belajar',
            date: new Date().toISOString().split('T')[0]
          })
        });
      } else if (method === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: MOCK_JOURNAL_ID,
            user_id: MOCK_USER_ID,
            class_id: MOCK_CLASS_ID,
            subject: 'Kimia',
            topic: 'Ikatan Kimia Kovalen',
            activities: 'Belajar',
            date: new Date().toISOString().split('T')[0]
          })
        });
      } else if (method === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      }
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

test.describe('Jurnal Mengajar E2E', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('should render teaching journals page and sidebar navigation', async ({ page }) => {
    await page.goto('/jurnal');
    await page.waitForTimeout(1500);
    await expect(page.getByRole('heading', { name: 'Jurnal Mengajar' })).toBeVisible();
    await expect(page.getByText('Catat dan tinjau agenda KBM harian')).toBeVisible();
  });

  test('should display today teaching journal status widget on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForTimeout(1500);
    // The dashboard shows a warning banner when unfilled journals exist
    await expect(page.locator('text=/jurnal/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('should allow adding a new teaching journal entry via form', async ({ page }) => {
    await page.goto('/jurnal');
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /tambah jurnal/i }).click();

    // Form modal should open
    await expect(page.getByText('Tambah Jurnal Mengajar')).toBeVisible();

    // Fill form fields
    await page.locator('select[name="class_id"]').selectOption({ value: MOCK_CLASS_ID });
    await page.locator('input[name="subject"]').fill('Kimia');
    await page.locator('input[name="topic"]').fill('Ikatan Kimia');

    // Submit
    await page.getByRole('button', { name: /simpan jurnal/i }).click();

    // Verify the form closes
    await expect(page.getByText('Tambah Jurnal Mengajar')).toBeHidden({ timeout: 10000 });
  });

  test('should allow editing an existing teaching journal entry', async ({ page }) => {
    await page.goto('/jurnal');
    await page.waitForTimeout(1500);

    // Wait for the journal card to load and click edit button
    await page.waitForSelector('[aria-label="Edit Jurnal"]', { timeout: 10000 });
    await page.waitForTimeout(1000); // Wait for hydration
    await page.locator('[aria-label="Edit Jurnal"]').first().click({ force: true });

    // Form modal should open with edit title
    await expect(page.getByText('Edit Jurnal Mengajar')).toBeVisible();

    // Modify the topic field
    await page.locator('input[name="topic"]').fill('Ikatan Kimia Kovalen');

    // Submit
    await page.getByRole('button', { name: /simpan jurnal/i }).click();

    // Verify the form closes
    await expect(page.getByText('Edit Jurnal Mengajar')).toBeHidden({ timeout: 10000 });
  });

  test('should allow deleting a teaching journal entry', async ({ page }) => {
    await page.goto('/jurnal');
    await page.waitForTimeout(1500);

    // Wait for the delete button and click it
    await page.waitForSelector('[aria-label="Hapus Jurnal"]', { timeout: 10000 });
    await page.waitForTimeout(1000); // Wait for hydration
    await page.locator('[aria-label="Hapus Jurnal"]').first().click({ force: true });

    // Confirmation dialog should appear (not window.confirm)
    await expect(page.getByRole('heading', { name: 'Hapus Jurnal Mengajar' })).toBeVisible();
    await expect(page.getByText('Apakah Anda yakin ingin menghapus jurnal mengajar ini?')).toBeVisible();

    // Confirm deletion
    await page.getByRole('button', { name: /hapus/i }).last().click();

    // Verify success — dialog closes
    await expect(page.getByText('Hapus Jurnal Mengajar')).toBeHidden({ timeout: 10000 });
  });

  test('should allow switching between Jurnal Harian and Rekapitulasi tabs', async ({ page }) => {
    await page.goto('/jurnal');
    await page.waitForTimeout(1500);

    // Default tab is Jurnal Harian (with section name)
    await expect(page.getByRole('region', { name: 'Daftar jurnal mengajar' })).toBeVisible();

    // Switch to Rekapitulasi tab
    await page.getByRole('tab', { name: /rekapitulasi/i }).click();

    // Rekap panel should load
    await expect(page.locator('text=/rekap/i').first()).toBeVisible({ timeout: 10000 });
  });
});
