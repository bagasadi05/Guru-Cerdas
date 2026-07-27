import { test, expect, type Page } from '@playwright/test';

const supabaseUrl = 'https://test.supabase.co';
const MOCK_USER_ID = 'a3b17c91-2394-4d87-9759-3fb7072dbcb0';
const MOCK_CLASS_ID = 'c0926bdf-fb35-46bd-8588-e25fa6312a02';

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
    user_metadata: { name: 'Guru Cerdas', school_name: 'SMA Unggul Bangsa' },
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
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'sem-1', name: 'Ganjil', is_active: true, start_date: '2026-01-01', end_date: '2026-06-30' }]) });
    } else if (url.includes('/students')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 'student-1', name: 'Budi Santoso', class_id: MOCK_CLASS_ID, gender: 'L' },
        { id: 'student-2', name: 'Siti Aminah', class_id: MOCK_CLASS_ID, gender: 'P' },
      ]) });
    } else if (url.includes('/attendance')) {
      if (method === 'GET') {
        // Return 1 record so that it doesn't trigger auto-fill, leaving student-2 unmarked.
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
          { id: 'att-1', student_id: 'student-1', status: 'Hadir', date: new Date().toISOString().split('T')[0] }
        ]) });
      } else if (method === 'POST' || method === 'PATCH') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
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

test.describe('Absensi E2E', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  test('should load attendance page and display students', async ({ page }) => {
    await page.goto('/absensi');
    await page.waitForTimeout(1500); 
    
    // Verify directory header and student name
    await expect(page.getByText('Direktori Peserta Didik')).toBeVisible();
    await expect(page.getByText('Budi Santoso')).toBeVisible();
    await expect(page.getByText('Siti Aminah')).toBeVisible();
  });

  test('should allow marking a student status and handling unmarked save confirmation', async ({ page }) => {
    await page.goto('/absensi');
    await page.waitForTimeout(1500);

    // Budi Santoso -> Sakit
    const firstStudentCard = page.locator('.attendance-student-card').filter({ hasText: 'Budi Santoso' });
    await firstStudentCard.getByRole('button', { name: 'Sakit', exact: true }).click();
    
    // Save attendance
    await page.getByRole('button', { name: 'Simpan Perubahan Absensi' }).click();

    // Since Siti is unmarked, the confirmation modal should appear
    await expect(page.getByText('Siswa Belum Diabsen')).toBeVisible();
    
    // Click 'Simpan & Tandai Hadir'
    await page.getByRole('button', { name: /Simpan & Tandai Hadir/i }).click();
    
    // Modal should close
    await expect(page.getByText('Siswa Belum Diabsen')).toBeHidden({ timeout: 5000 });
  });

  test('should open export modal when Ekspor Data button is clicked', async ({ page }) => {
    await page.goto('/absensi');
    await page.waitForTimeout(1500);

    // Find export button
    await page.getByRole('button', { name: /Ekspor Data/i }).first().click();

    // Export Modal should appear
    await expect(page.getByRole('heading', { name: /Laporan Absensi/i })).toBeVisible();
    
    // Excel and PDF options
    await expect(page.getByRole('button', { name: /Excel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /PDF/i })).toBeVisible();
  });
});
