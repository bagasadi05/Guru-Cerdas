import { test, expect, type Page } from '@playwright/test';

/**
 * Regression: tapping the rightmost class pill in the attendance class
 * selector must scroll ONLY the pill strip. It used to call scrollIntoView(),
 * which also scrolled body (its decorative cosmic-bg orb created hidden
 * horizontal slack on mobile), shifting the whole page and pushing header
 * buttons out of reach with no way to swipe back.
 */

const supabaseUrl = 'https://test.supabase.co';
const MOCK_USER_ID = 'a3b17c91-2394-4d87-9759-3fb7072dbcb0';

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

const MANY_CLASSES = Array.from({ length: 12 }, (_, i) => ({
  id: `class-${i + 1}`,
  name: `Kelas ${10 + Math.floor(i / 3)}-${String.fromCharCode(65 + (i % 3))}`,
  user_id: MOCK_USER_ID,
}));

async function setupSupabaseMocks(page: Page) {
  await page.route(`${supabaseUrl}/rest/v1/**`, async (route) => {
    const url = route.request().url();
    if (url.includes('/user_roles')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ role: 'teacher' }]) });
    } else if (url.includes('/classes')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MANY_CLASSES) });
    } else if (url.includes('/semesters')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'sem-1', name: 'Ganjil', is_active: true, start_date: '2026-01-01', end_date: '2026-06-30' }]) });
    } else if (url.includes('/students')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 'student-1', name: 'Budi Santoso', class_id: 'class-1', gender: 'L' },
      ]) });
    } else if (url.includes('/attendance') && route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    } else {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }
  });
  await page.route(`${supabaseUrl}/auth/v1/user**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_AUTH_SESSION.user) });
  });
}

test('rightmost class pill tap scrolls only the strip, never the page or body', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript((session) => {
    window.localStorage.setItem('portal-guru-auth', JSON.stringify(session));
    window.localStorage.setItem('onboarding_completed', 'true');
  }, MOCK_AUTH_SESSION);
  await setupSupabaseMocks(page);

  await page.goto('/absensi');
  await page.getByText('Direktori Peserta Didik').waitFor();

  const readScrollState = () =>
    page.evaluate(() => {
      const main = document.getElementById('main-content');
      const strip = document.querySelector<HTMLElement>('[data-tutorial="class-selector"] > div:nth-child(2)');
      const exportBtn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Ekspor Data'));
      return {
        windowScrollX: window.scrollX,
        bodyScrollLeft: document.body.scrollLeft,
        docScrollLeft: document.documentElement.scrollLeft,
        mainScrollLeft: main?.scrollLeft ?? null,
        stripScrollLeft: strip?.scrollLeft ?? null,
        exportBtnX: exportBtn ? Math.round(exportBtn.getBoundingClientRect().x) : null,
      };
    });

  const before = await readScrollState();

  const pills = page.locator('[data-class-id]');
  await pills.last().click();
  await page.waitForTimeout(1500); // let smooth scrolling fully settle

  const after = await readScrollState();

  // The pill strip itself is expected to scroll — centering the last pill is its job.
  expect(after.stripScrollLeft ?? -1).toBeGreaterThan(before.stripScrollLeft ?? -1);

  // Every page-level scroller must stay put.
  expect(after.windowScrollX).toBe(0);
  expect(after.docScrollLeft).toBe(0);
  expect(after.bodyScrollLeft).toBe(0);
  expect(after.mainScrollLeft).toBe(0);

  // Header controls stay exactly where they were — still reachable by thumb.
  expect(after.exportBtnX).toBe(before.exportBtnX);
});
