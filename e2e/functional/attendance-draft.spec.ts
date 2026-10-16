import { test, expect, type Page } from '@playwright/test';

const uid = 'a3b17c91-2394-4d87-9759-3fb7072dbcb0';
const longName = 'Muhammad Rizky Pratama Putra';
const session = {
  access_token: 'mock-token', refresh_token: 'mock-refresh', token_type: 'bearer',
  expires_in: 3600, expires_at: 9999999999,
  user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'guru@example.com', user_metadata: { name: 'Guru Uji' } },
};
type SavedRow = { student_id: string; date: string; status: string; notes?: string; semester_id?: string };

async function attendanceFixture(page: Page) {
  const writes: SavedRow[][] = [];
  const historicalWrites: Record<string, unknown>[] = [];
  const records = new Map<string, SavedRow>();
  let failSave = false;
  let releaseSave: (() => void) | undefined;
  let waitForRelease: Promise<void> | undefined;
  await page.clock.setFixedTime(new Date('2026-10-10T03:00:00Z'));
  await page.addInitScript(s => {
    localStorage.setItem('portal-guru-auth', JSON.stringify(s));
    localStorage.setItem('onboarding_completed', 'true');
  }, session);
  await page.route('**/*', route => route.request().resourceType() === 'image' ? route.abort() : route.fallback());
  await page.route('**/release-notes.json*', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route('**/rest/v1/**', async route => {
    const request = route.request(), url = new URL(request.url());
    const table = url.pathname.split('/').at(-1);
    const classId = (url.searchParams.get('class_id') || 'eq.class-1').replace(/^eq\./, '');
    let data: unknown = [];
    if (table === 'user_roles') data = [{ role: 'teacher' }];
    if (table === 'classes') data = Array.from({ length: 12 }, (_, i) => ({ id: `class-${i + 1}`, name: `${1 + Math.floor(i / 3)}${String.fromCharCode(65 + i % 3)}`, user_id: uid }));
    if (table === 'semesters') data = [
      { id: 'sem-1', name: 'Ganjil', is_active: true, start_date: '2026-07-01', end_date: '2026-12-31', academic_years: { name: '2026/2027' } },
      { id: 'sem-2', name: 'Genap', is_active: false, start_date: '2026-01-01', end_date: '2026-06-30', academic_years: { name: '2025/2026' } },
    ];
    if (table === 'students') data = Array.from({ length: 30 }, (_, i) => ({ id: `${classId}-student-${i + 1}`, name: i === 0 ? longName : `Siswa Uji ${i + 1}`, class_id: classId, user_id: uid, gender: 'L' }));
    if (table === 'attendance' && request.method() === 'GET') {
      const date = url.searchParams.get('date')?.replace(/^eq\./, '');
      const ids = url.searchParams.get('student_id') || '';
      data = date ? Array.from(records.values()).filter(row => row.date === date && ids.includes(row.student_id)) : [];
      if (date && (data as SavedRow[]).length === 0) {
        const firstId = ids.match(/class-\d+-student-1(?:,|\))/)?.[0].replace(/[,)]$/, '') || 'class-1-student-1';
        data = [{ id: `att-${firstId}`, student_id: firstId, status: 'Hadir', date }];
      }
    }
    if (table === 'attendance' && request.method() === 'POST') {
      const rows = request.postDataJSON() as SavedRow[];
      writes.push(rows);
      if (waitForRelease) await waitForRelease;
      if (failSave) { await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ message: 'Simpan ditolak untuk uji', code: '23514' }) }); return; }
      rows.forEach(row => records.set(`${row.student_id}:${row.date}`, row));
    }
    if (table === 'auto_fill_weekly_missing_attendance') {
      historicalWrites.push(request.postDataJSON());
      data = { success: true, total_inserted: 150 };
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await page.route('**/auth/v1/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session.user) }));
  await page.route('**/functions/v1/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.goto('/absensi', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.attendance-student-card')).toHaveCount(30);
  await expect(page.locator('.attendance-student-card').first().getByRole('button', { name: 'Hadir', exact: true })).toHaveAttribute('aria-pressed', 'true');
  return {
    writes, historicalWrites,
    fail: (value: boolean) => { failSave = value; },
    hold: () => { waitForRelease = new Promise(resolve => { releaseSave = resolve; }); },
    release: () => { releaseSave?.(); waitForRelease = undefined; },
  };
}
const firstCard = (page: Page) => page.locator('.attendance-student-card').first();
const classPill = (page: Page, id: string) => page.locator(`[data-class-id="${id}"]`);
const guardModal = (page: Page) => page.getByRole('dialog', { name: 'Simpan perubahan sebelum pindah?' });

test('class switch keeps or discards a draft explicitly and restores persisted attendance', async ({ page }) => {
  const fixture = await attendanceFixture(page);
  await firstCard(page).getByRole('button', { name: 'Sakit', exact: true }).click();
  await classPill(page, 'class-2').click();
  await expect(guardModal(page)).toBeVisible();
  await expect(classPill(page, 'class-1')).toHaveAttribute('aria-pressed', 'true');
  await guardModal(page).getByRole('button', { name: 'Tetap mengisi' }).click();
  await expect(firstCard(page).getByRole('button', { name: 'Sakit', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await classPill(page, 'class-2').click();
  await guardModal(page).getByRole('button', { name: 'Buang perubahan & pindah' }).click();
  await expect(classPill(page, 'class-2')).toHaveAttribute('aria-pressed', 'true');
  await classPill(page, 'class-1').click();
  await expect(firstCard(page).getByRole('button', { name: 'Hadir', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(fixture.writes).toHaveLength(0);
});

test('save and switch waits for unmarked confirmation and persistence of the old context', async ({ page }) => {
  const fixture = await attendanceFixture(page);
  await firstCard(page).getByRole('button', { name: 'Sakit', exact: true }).click();
  await classPill(page, 'class-2').click();
  await guardModal(page).getByRole('button', { name: 'Simpan & pindah' }).click();
  const confirmation = page.getByRole('dialog', { name: 'Konfirmasi Simpan' });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Batal', exact: true }).click();
  await expect(classPill(page, 'class-1')).toHaveAttribute('aria-pressed', 'true');
  expect(fixture.writes).toHaveLength(0);
  await classPill(page, 'class-2').click();
  await guardModal(page).getByRole('button', { name: 'Simpan & pindah' }).click();
  fixture.hold();
  await confirmation.getByRole('button', { name: 'Simpan & Tandai Hadir' }).click();
  await expect.poll(() => fixture.writes.length).toBe(1);
  await expect(classPill(page, 'class-1')).toHaveAttribute('aria-pressed', 'true');
  expect(fixture.writes[0]).toHaveLength(30);
  expect(fixture.writes[0].every(row => row.student_id.startsWith('class-1-') && row.date === '2026-10-10' && row.semester_id === 'sem-1')).toBe(true);
  expect(fixture.writes[0][0].status).toBe('Sakit');
  fixture.release();
  await expect(classPill(page, 'class-2')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Perubahan belum disimpan', { exact: true })).toBeHidden();
});

test('a failed save retains current class and draft, and retry can switch', async ({ page }) => {
  const fixture = await attendanceFixture(page);
  await page.getByRole('button', { name: 'Semua Hadir', exact: true }).click();
  await firstCard(page).getByRole('button', { name: 'Alpha', exact: true }).click();
  fixture.fail(true);
  await classPill(page, 'class-2').click();
  await guardModal(page).getByRole('button', { name: 'Simpan & pindah' }).click();
  await expect(page.getByText(/Gagal menyimpan: Simpan ditolak/)).toBeVisible();
  await expect(classPill(page, 'class-1')).toHaveAttribute('aria-pressed', 'true');
  await expect(firstCard(page).getByRole('button', { name: 'Alpha', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Perubahan belum disimpan', { exact: true })).toBeVisible();
  fixture.fail(false);
  await classPill(page, 'class-2').click();
  await guardModal(page).getByRole('button', { name: 'Simpan & pindah' }).click();
  await expect(classPill(page, 'class-2')).toHaveAttribute('aria-pressed', 'true');
  expect(fixture.writes).toHaveLength(2);
});

test('offline save commits the old context to IndexedDB before switching', async ({ page }) => {
  const fixture = await attendanceFixture(page);
  await page.getByRole('button', { name: 'Semua Hadir', exact: true }).click();
  await page.context().setOffline(true);
  await expect(page.getByRole('status').getByRole('button', { name: 'Simpan Offline', exact: true })).toBeVisible();
  await classPill(page, 'class-2').click();
  await guardModal(page).getByRole('button', { name: 'Simpan & pindah' }).click();
  await expect(classPill(page, 'class-2')).toHaveAttribute('aria-pressed', 'true');
  const queued = await page.evaluate(async () => new Promise<{ table: string; payload: SavedRow[]; onConflict: string; userId: string }[]>((resolve, reject) => {
    const request = indexedDB.open('PortalGuruOfflineDB');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const rows = database.transaction('offlineQueue', 'readonly').objectStore('offlineQueue').getAll();
      rows.onsuccess = () => { resolve(rows.result); database.close(); };
      rows.onerror = () => reject(rows.error);
    };
  }));
  const attendance = queued.filter(row => row.table === 'attendance');
  expect(attendance).toHaveLength(1);
  expect(attendance[0].onConflict).toBe('student_id,date');
  expect(attendance[0].userId).toBe(uid);
  expect(attendance[0].payload).toHaveLength(30);
  expect(attendance[0].payload.every(row => row.date === '2026-10-10' && row.student_id.startsWith('class-1-'))).toBe(true);
  expect(fixture.writes).toHaveLength(0);
});

test('date and semester switches resolve drafts before changing context', async ({ page }) => {
  const fixture = await attendanceFixture(page);
  await page.getByRole('button', { name: 'Semua Hadir', exact: true }).click();
  await page.getByRole('button', { name: 'Pilih tanggal absensi' }).click();
  await page.getByRole('button', { name: 'Kemarin', exact: true }).click();
  await expect(guardModal(page)).toBeVisible();
  await guardModal(page).getByRole('button', { name: 'Simpan & pindah' }).click();
  await expect(page.getByRole('heading', { name: 'Jumat, 9 Oktober 2026' })).toBeVisible();
  expect(fixture.writes[0].every(row => row.date === '2026-10-10')).toBe(true);
  await page.getByRole('button', { name: 'Semua Libur', exact: true }).click();
  await page.locator('button[aria-haspopup="listbox"]').click();
  await page.getByRole('option', { name: /Genap/ }).click();
  await expect(guardModal(page)).toBeVisible();
  await guardModal(page).getByRole('button', { name: 'Tetap mengisi' }).click();
  await expect(page.getByRole('heading', { name: 'Jumat, 9 Oktober 2026' })).toBeVisible();
  await page.locator('button[aria-haspopup="listbox"]').click();
  await page.getByRole('option', { name: /Genap/ }).click();
  await guardModal(page).getByRole('button', { name: 'Buang perubahan & pindah' }).click();
  await expect(page.getByRole('heading', { name: 'Kamis, 1 Januari 2026' })).toBeVisible();
  expect(fixture.writes).toHaveLength(1);
});

test('unavailable offline storage keeps the draft and current class', async ({ page }) => {
  await attendanceFixture(page);
  await page.getByRole('button', { name: 'Semua Hadir', exact: true }).click();
  await page.context().setOffline(true);
  await expect(page.getByRole('status').getByRole('button', { name: 'Simpan Offline', exact: true })).toBeVisible();
  await page.evaluate(() => Object.defineProperty(window, 'indexedDB', { configurable: true, value: undefined }));
  await classPill(page, 'class-2').click();
  await guardModal(page).getByRole('button', { name: 'Simpan & pindah' }).click();
  await expect(page.getByText(/Gagal menyimpan: IndexedDB/)).toBeVisible();
  await expect(classPill(page, 'class-1')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Perubahan belum disimpan', { exact: true })).toBeVisible();
});

test('notes and quick actions remain drafts until Save', async ({ page }) => {
  const fixture = await attendanceFixture(page);
  await page.getByRole('button', { name: /Tandai Sisa Hadir/ }).click();
  await firstCard(page).getByRole('button', { name: 'Tambah catatan siswa' }).click();
  await page.getByRole('textbox', { name: 'Catatan absensi siswa' }).fill('Pulang cepat');
  await page.getByRole('button', { name: 'Terapkan catatan' }).click();
  await expect(page.getByText('Catatan diterapkan. Tekan Simpan untuk menyimpannya bersama absensi.')).toBeVisible();
  await page.getByRole('button', { name: 'Semua Libur', exact: true }).click();
  await expect(firstCard(page).getByRole('button', { name: 'Libur', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(fixture.writes).toHaveLength(0);
  await page.locator('[data-tutorial="attendance-save"]').click();
  await expect.poll(() => fixture.writes.length).toBe(1);
  expect(fixture.writes[0][0]).toMatchObject({ notes: 'Pulang cepat', status: 'Libur' });
});

test('historical fill has an explicit confirmation and never saves the active date draft', async ({ page }) => {
  const fixture = await attendanceFixture(page);
  await firstCard(page).getByRole('button', { name: 'Sakit', exact: true }).click();
  await page.getByRole('button', { name: /5 hari belum diabsen/ }).click();
  await page.getByRole('button', { name: 'Isi 5 hari terlewat', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Isi absensi hari terlewat?' });
  await expect(modal).toContainText('2026-10-05 — 2026-10-09');
  await modal.getByRole('button', { name: 'Batal', exact: true }).click();
  expect(fixture.historicalWrites).toHaveLength(0);
  await page.getByRole('button', { name: 'Isi 5 hari terlewat', exact: true }).click();
  await modal.getByRole('button', { name: 'Isi & simpan hari terlewat' }).click();
  await expect.poll(() => fixture.historicalWrites.length).toBe(1);
  expect(fixture.historicalWrites[0]).toMatchObject({ p_class_id: 'class-1', p_target_date: '2026-10-09' });
  expect(fixture.writes).toHaveLength(0);
  await expect(firstCard(page).getByRole('button', { name: 'Sakit', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Perubahan belum disimpan', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pilih tanggal absensi' }).click();
  await page.getByRole('button', { name: 'Kemarin', exact: true }).click();
  await guardModal(page).getByRole('button', { name: 'Buang perubahan & pindah' }).click();
  await page.getByRole('button', { name: /4 hari belum diabsen/ }).click();
  await page.getByRole('button', { name: 'Isi 4 hari terlewat', exact: true }).click();
  await expect(modal).toContainText('2026-10-05 — 2026-10-08');
  await modal.getByRole('button', { name: 'Isi & simpan hari terlewat' }).click();
  await expect.poll(() => fixture.historicalWrites.length).toBe(2);
  expect(fixture.historicalWrites[1]).toMatchObject({ p_target_date: '2026-10-08' });
});

test('keyboard can open the menu and dismiss a switch without losing draft', async ({ page }) => {
  await attendanceFixture(page);
  const trigger = page.getByRole('button', { name: 'Pilihan lain absensi' });
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitem').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await firstCard(page).getByRole('button', { name: 'Sakit', exact: true }).click();
  const target = classPill(page, 'class-2');
  await target.focus();
  await page.keyboard.press('Enter');
  await expect(guardModal(page)).toBeVisible();
  await expect(guardModal(page).getByRole('button', { name: 'Tutup dialog' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(guardModal(page).getByRole('button', { name: 'Simpan & pindah' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(guardModal(page)).toBeHidden();
  await expect(target).toBeFocused();
  await expect(firstCard(page).getByRole('button', { name: 'Sakit', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

for (const width of [320, 390, 1440]) for (const theme of ['light', 'dark'] as const) {
  test(`layout ${width}px ${theme} keeps names, date, status and Save readable`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await attendanceFixture(page);
    await page.evaluate(mode => document.documentElement.classList.toggle('dark', mode === 'dark'), theme);
    await expect(page.getByRole('button', { name: /5 hari belum diabsen/ })).toHaveAttribute('aria-expanded', 'false');
    const box = await firstCard(page).boundingBox();
    expect(box!.y).toBeLessThan(900);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({ path: testInfo.outputPath('initial.png') });
    await firstCard(page).scrollIntoViewIfNeeded();
    const name = firstCard(page).getByText(longName, { exact: true });
    await expect(name).toBeVisible();
    expect(await name.evaluate(element => element.scrollHeight <= element.clientHeight && getComputedStyle(element).webkitLineClamp === 'none')).toBe(true);
    for (const status of ['Hadir', 'Sakit', 'Izin', 'Alpha', 'Libur']) {
      const button = firstCard(page).getByRole('button', { name: status, exact: true });
      const bounds = await button.boundingBox();
      expect(bounds!.width).toBeGreaterThanOrEqual(44);
      expect(bounds!.height).toBeGreaterThanOrEqual(44);
      expect(await button.locator('span').last().evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    }
    await firstCard(page).getByRole('button', { name: 'Sakit', exact: true }).click();
    const save = page.getByRole('status').getByRole('button', { name: 'Simpan Sekarang', exact: true });
    await expect(save).toBeVisible();
    expect(await save.evaluate(element => element.scrollWidth <= element.clientWidth && element.getBoundingClientRect().right <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('edited.png') });
  });
}
