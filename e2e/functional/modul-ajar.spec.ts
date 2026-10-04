import { readFileSync } from 'node:fs';
import { test, expect, type Page, type Request } from '@playwright/test';

/**
 * Modul Ajar workspace against a mocked Supabase: Riwayat versions, opening a
 * saved document, the student sheet, saving live edits, and delete + undo.
 */

const supabaseUrl = 'https://test.supabase.co';

/** The "Apa yang baru" dialog covers the page until the newest release is marked as seen. */
const LATEST_RELEASE_ID: string = JSON.parse(readFileSync('public/release-notes.json', 'utf8'))[0].id;
const USER_ID = 'a3b17c91-2394-4d87-9759-3fb7072dbcb0';

const SESSION = {
  access_token: 'mock-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  refresh_token: 'mock-refresh-token',
  user: {
    id: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'guru@example.com',
    email_confirmed_at: '2026-06-17T22:00:00Z',
    phone: '',
    confirmed_at: '2026-06-17T22:00:00Z',
    last_sign_in_at: '2026-06-17T22:00:00Z',
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { name: 'Guru Cerdas', school_name: 'MI Contoh' },
    identities: [],
    created_at: '2026-06-17T22:00:00Z',
    updated_at: '2026-06-17T22:00:00Z',
  },
  expires_at: 9999999999,
};

const DOCUMENT_HTML = [
  '<h2>MODUL AJAR IPAS</h2>',
  '<div data-sheet="lkpd" style="border: 2px dashed #000000; padding: 18px;">',
  '<h3>LEMBAR KERJA PESERTA DIDIK (LKPD)</h3>',
  '<div style="border-bottom: 1px dashed #0d6b3e;">Aktivitas 1: Amati gambar</div>',
  '<div style="border: 1.5px dashed #666666;">Kotak jawaban</div>',
  '</div>',
  '<div data-sheet="evaluasi" style="border: 2px dashed #000000; padding: 18px;">',
  '<h3>LEMBAR EVALUASI PENGETAHUAN</h3><p>1. Apa itu evaporasi?</p>',
  '</div>',
  '<p id="penutup">Penutup dokumen</p>',
].join('');

const plan = (id: string, createdAt: string) => ({
  id,
  user_id: USER_ID,
  document_type: 'Modul Ajar',
  curriculum_approach: 'Merdeka',
  generation_method: 'AI',
  identity: { mapel: 'IPAS', topik: 'Siklus Air', kelas: '3', fase: 'B' },
  components: { model: 'Problem Based Learning', paperSize: 'A4' },
  created_at: createdAt,
  updated_at: createdAt,
});

const PLANS = [plan('plan-new', '2026-10-03T08:00:00Z'), plan('plan-old', '2026-10-01T08:00:00Z')];

async function setup(page: Page) {
  await page.addInitScript(
    ({ session, releaseId }) => {
      window.localStorage.setItem('portal-guru-auth', JSON.stringify(session));
      window.localStorage.setItem('onboarding_completed', 'true');
      window.localStorage.setItem('release-notes-last-seen', releaseId);
    },
    { session: SESSION, releaseId: LATEST_RELEASE_ID },
  );

  await page.route(`${supabaseUrl}/auth/v1/user**`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(SESSION.user) }),
  );

  await page.route(`${supabaseUrl}/rest/v1/**`, async (route) => {
    const request = route.request();
    const url = request.url();
    const json = (body: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

    if (url.includes('/user_roles')) return json([{ role: 'teacher' }]);
    if (url.includes('/lesson_plans')) {
      if (request.method() === 'PATCH') return route.fulfill({ status: 204, body: '' });
      if (url.includes('select=generated_content')) {
        // .single() asks for one object.
        return json({ generated_content: DOCUMENT_HTML });
      }
      return json(PLANS);
    }
    return json([]);
  });
}

const isLessonPlanPatch = (request: Request) =>
  request.method() === 'PATCH' && request.url().includes('/lesson_plans');

test.describe('Modul Ajar workspace', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page);
    await page.goto('/perangkat-ajar?mode=modul-ajar');
    await page.getByRole('tab', { name: /Riwayat/ }).click();
  });

  test('groups versions, opens a document and shows both student sheets', async ({ page }) => {
    await expect(page.getByText('1 versi sebelumnya')).toBeVisible();

    await page.getByText('Siklus Air').first().click();
    const preview = page.locator('[contenteditable="true"]');
    await expect(preview.getByText('Penutup dokumen')).toBeVisible();

    await page.getByRole('button', { name: 'Siswa (LKPD)' }).first().click();
    await expect(page.getByText('LEMBAR EVALUASI PENGETAHUAN').first()).toBeVisible();
    await expect(page.getByText('LEMBAR KERJA PESERTA DIDIK (LKPD)').first()).toBeVisible();
  });

  test('saves text typed in the preview to the document', async ({ page }) => {
    await page.getByText('Siklus Air').first().click();
    const closing = page.locator('[contenteditable="true"] #penutup');
    await expect(closing).toBeVisible();

    await closing.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' Catatan guru');

    const saved = page.waitForRequest(isLessonPlanPatch);
    // Leaving the text saves it.
    await page.getByRole('tab', { name: /Pratinjau/ }).focus();
    const request = await saved;
    expect(request.postDataJSON().generated_content).toContain('Catatan guru');
    await expect(page.getByText('Perubahan tersimpan')).toBeVisible();
  });

  test('deletes from Riwayat with Urungkan', async ({ page }) => {
    const deleted = page.waitForRequest(isLessonPlanPatch);
    await page.getByTitle('Hapus dari Riwayat').first().click();
    expect((await deleted).postDataJSON().deleted_at).toEqual(expect.any(String));
    await expect(page.getByText('Modul ajar dihapus dari Riwayat.')).toBeVisible();

    const restored = page.waitForRequest(isLessonPlanPatch);
    await page.getByRole('button', { name: /Urungkan/ }).click();
    expect((await restored).postDataJSON()).toEqual({ deleted_at: null });
    await expect(page.getByText('1 versi sebelumnya')).toBeVisible();
  });
});
