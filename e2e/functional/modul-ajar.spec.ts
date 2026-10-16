import { readFileSync } from 'node:fs';
import { test, expect, type Page, type Request } from '@playwright/test';
import { validLesson, validReview } from '../../tests/fixtures/modulAjarAiContent';

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

  test('reuses a private AI result after page reload and refreshes only on request', async ({ page }) => {
    let aiCalls = 0;
    let storedCache: Record<string, unknown> | undefined;
    let saved: Record<string, unknown> = { ...PLANS[0], components: { cp: 'CP sekolah', profil: ['Mandiri'], model: 'Problem Based Learning', selectedModelId: 'pbl', daftarPustaka: ['Sumber guru'] }, generated_content: DOCUMENT_HTML };
    await page.route(`${supabaseUrl}/rest/v1/**`, async route => {
      const request = route.request();
      const url = new URL(request.url());
      const table = url.pathname.split('/').at(-1);
      const json = (body: unknown) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      if (table === 'ref_model_pembelajaran') return json([{ id: 'pbl', nama_model: 'Problem Based Learning', sintaks_inti: ['Amati', 'Simpulkan'] }]);
      if (table === 'modul_ajar_ai_cache') {
        if (request.method() === 'POST') { storedCache = request.postDataJSON(); return route.fulfill({ status: 204, body: '' }); }
        return json(storedCache && url.searchParams.get('request_fingerprint') === `eq.${storedCache.request_fingerprint}` ? storedCache : null);
      }
      if (table === 'modul_ajar_ai_usage') return route.fulfill({ status: 204, body: '' });
      if (table === 'lesson_plans') {
        if (request.method() === 'POST') {
          saved = { ...request.postDataJSON(), id: 'plan-generated', created_at: '2026-10-05T08:00:00Z', updated_at: '2026-10-05T08:00:00Z' };
          return json({ id: saved.id });
        }
        if (url.searchParams.get('select') === 'generated_content') return json({ generated_content: saved.generated_content });
        return json([saved]);
      }
      return route.fallback();
    });
    await page.route('**/api/gemini', async route => {
      aiCalls++;
      const prompt = route.request().postDataJSON().contents[0].parts[0].text as string;
      const lesson = { ...validLesson, modelPembelajaran: 'Problem Based Learning', skenarioPembelajaran: validLesson.skenarioPembelajaran.map(step => ({ ...step, durasiMenit: 25 })) };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ modelVersion: 'gemini-2.5-flash', candidates: [{ content: { parts: [{ text: JSON.stringify(prompt.includes('Periksa modul akhir') ? validReview : lesson) }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 400, thoughtsTokenCount: 30, totalTokenCount: 530 } }) });
    });
    const openDraft = async () => {
      await page.reload();
      await page.getByRole('tab', { name: /Riwayat/ }).click();
      await page.getByText('Siklus Air').first().click();
      await page.getByRole('button', { name: /Langkah 5:/ }).click();
    };
    await openDraft();
    await page.getByRole('button', { name: 'Susun dokumen', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: '2 panggilan AI' })).toBeVisible();
    expect(aiCalls).toBe(2);
    await openDraft();
    await page.getByRole('button', { name: 'Susun dokumen', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: '0 panggilan AI' })).toBeVisible();
    expect(aiCalls).toBe(2);
    await page.getByRole('button', { name: 'Buat versi AI baru', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: '2 panggilan AI' })).toBeVisible();
    expect(aiCalls).toBe(4);
  });

  test('AI actions fit mobile and desktop in light and dark mode and support keyboard use', async ({ page }, testInfo) => {
    await page.getByRole('tab', { name: /Pratinjau/ }).click();
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      if (width < 1024) await page.getByRole('button', { name: '1. Formulir Modul' }).click();
      await page.getByRole('button', { name: /Langkah 3:/ }).click();
      await page.getByPlaceholder('Tuliskan pengetahuan atau keterampilan dasar yang perlu dikuasai siswa sebelum mempelajari materi ini.').fill('Siswa mengenal air.');
      for (const dark of [false, true]) {
        await page.evaluate(enabled => document.documentElement.classList.toggle('dark', enabled), dark);
        const fresh = page.getByRole('button', { name: 'Buat versi AI baru untuk kompetensi awal' });
        await expect(fresh).toBeVisible();
        await fresh.focus();
        await expect(fresh).toBeFocused();
        const box = await fresh.boundingBox();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(width);
        await page.getByRole('button', { name: /Langkah 5:/ }).click();
        const generate = page.getByRole('button', { name: 'Susun dokumen', exact: true });
        const refresh = page.getByRole('button', { name: 'Buat versi AI baru', exact: true });
        await expect(generate).toBeVisible(); await expect(refresh).toBeVisible();
        await expect(page.getByRole('heading', { name: /Langkah 5: Model Pembelajaran/ }).locator('xpath=ancestor::div[@style][1]')).toHaveCSS('opacity', '1');
        await refresh.scrollIntoViewIfNeeded();
        await expect(refresh).toBeInViewport();
        await page.screenshot({ path: testInfo.outputPath(`ai-actions-${width}-${dark ? 'dark' : 'light'}.png`), fullPage: true });
        const buttonBox = await refresh.boundingBox();
        expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(width);
        await page.getByRole('button', { name: /Langkah 3:/ }).click();
      }
    }
  });
});
