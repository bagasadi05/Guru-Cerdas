import { test, expect, type Page } from '@playwright/test';
import ExcelJS from 'exceljs';

const teacherId = 'a3b17c91-2394-4d87-9759-3fb7072dbcb0';
const session = {
  access_token: 'mock-access-token', token_type: 'bearer', expires_in: 3600,
  refresh_token: 'mock-refresh-token', expires_at: 9999999999,
  user: {
    id: teacherId, aud: 'authenticated', role: 'authenticated', email: 'guru@example.com',
    user_metadata: { name: 'Guru Uji', school_name: 'Sekolah Uji' },
  },
};
const classes = [
  { id: 'class-a', name: 'Kelas A', user_id: teacherId, deleted_at: null },
  { id: 'class-b', name: 'Kelas B', user_id: teacherId, deleted_at: null },
];

async function setup(page: Page, failAssignments = false) {
  const students = [
    { id: 'student-a', name: 'Siswa Andi', gender: 'Laki-laki', class_id: 'class-a', access_code: null, deleted_at: null, nisn: '0012345678' },
    { id: 'student-b', name: 'Siswa Budi', gender: 'Laki-laki', class_id: 'class-b', access_code: null, deleted_at: null },
  ];
  let assignmentFailure = failAssignments;
  const updates: Record<string, unknown>[] = [];
  await page.addInitScript((auth) => {
    localStorage.setItem('portal-guru-auth', JSON.stringify(auth));
    localStorage.setItem('onboarding_completed', 'true');
  }, session);
  await page.route('https://test.supabase.co/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    let body: unknown = [];
    if (url.pathname.includes('/auth/v1/user')) body = session.user;
    else if (url.pathname.endsWith('/user_roles')) body = [{ role: 'teacher' }];
    else if (url.pathname.endsWith('/teacher_class_assignments') && assignmentFailure) {
      await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ message: 'Penugasan tidak dapat dimuat' }) });
      return;
    } else if (url.pathname.endsWith('/classes')) body = classes;
    else if (url.pathname.endsWith('/students')) {
      const classFilter = url.searchParams.get('class_id')?.replace(/^eq\./, '');
      const idFilter = url.searchParams.get('id');
      const filtered = students.filter((student) =>
        (!classFilter || student.class_id === classFilter) &&
        (!idFilter || idFilter === `eq.${student.id}` || idFilter.includes(student.id)),
      );
      if (request.method() === 'HEAD') {
        await route.fulfill({ status: 200, headers: {
          'content-range': `*/${filtered.length}`,
          'access-control-expose-headers': 'content-range',
        }, body: '' });
        return;
      }
      if (request.method() === 'PATCH') {
        const patch = request.postDataJSON();
        updates.push(patch);
        filtered.forEach((student) => Object.assign(student, patch));
      }
      body = filtered;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return { updates, recover: () => { assignmentFailure = false; } };
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`student selection and individual code at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const { updates } = await setup(page);
    await page.goto('/siswa');
    await expect(page.getByText('Siswa Andi', { exact: true })).toBeVisible();
    await page.getByRole('checkbox').first().check();
    await expect(page.getByRole('button', { name: 'Batalkan pilihan (Esc)' })).toBeVisible();
    await page.getByRole('tab', { name: 'Kelas B' }).click();
    await expect(page.getByText('Siswa Budi', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Batalkan pilihan (Esc)' })).toBeHidden();
    await page.getByRole('tab', { name: 'Kelas A' }).click();
    await expect(page.getByRole('checkbox').first()).not.toBeChecked();
    await page.getByRole('button', { name: 'Menu aksi siswa Siswa Andi' }).click();
    await page.getByRole('button', { name: /Buat Kode Akses/ }).click();
    await page.getByRole('button', { name: 'Buat Kode', exact: true }).click();
    await expect.poll(() => updates.length).toBe(1);
    expect(updates[0].access_code).toMatch(/^[A-Z0-9]{6}$/);
    await expect(page.getByText(String(updates[0].access_code), { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const avatar = page.getByRole('img', { name: 'Siswa Andi' });
    await expect.poll(() => avatar.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    await page.screenshot({ path: testInfo.outputPath('students.png'), fullPage: true });
  });

  test(`student load error and retry at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const mocks = await setup(page, true);
    await page.goto('/siswa');
    await expect(page.getByText('Gagal Memuat Data Siswa', { exact: true })).toBeVisible();
    await expect(page.getByText('Tidak Ada Data Siswa', { exact: true })).toBeHidden();
    await page.screenshot({ path: testInfo.outputPath('students-error.png'), fullPage: true });
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.getByText('Gagal Memuat Data Siswa', { exact: true })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('students-error-dark.png'), fullPage: true });
    mocks.recover();
    const retry = page.getByRole('button', { name: /Coba Lagi/i });
    await retry.focus();
    await expect(retry).toBeFocused();
    await retry.press('Enter');
    await expect(page.getByText('Siswa Andi', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('student CSV export downloads the selected format', async ({ page }) => {
  await setup(page);
  await page.goto('/siswa');
  await expect(page.getByText('Siswa Andi', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ekspor', exact: true }).click();
  await page.getByRole('button', { name: 'CSV (.csv)', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('dialog', { name: 'Ekspor Data Siswa' }).getByRole('button', { name: 'Ekspor', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('Data_Siswa_Kelas_A.csv');
  const stream = await download.createReadStream();
  expect(stream).not.toBeNull();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const csv = Buffer.concat(chunks).toString('utf8');
  expect(csv).toContain('Siswa Andi');
  expect(csv).toContain('0012345678');
  expect(csv.startsWith('PK')).toBe(false);
});

for (const className of ['Kelas typo', 'Kelas B']) {
  test(`student workbook import into ${className}`, async ({ page }, testInfo) => {
    if (className === 'Kelas typo') await page.setViewportSize({ width: 390, height: 844 });
    await setup(page);
    const inserts: Record<string, unknown>[][] = [];
    page.on('request', (request) => {
      if (request.url().includes('/rest/v1/students') && request.method() === 'POST') {
        inserts.push(request.postDataJSON());
      }
    });
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet('Siswa').addRows([
      ['Nama Siswa', 'Jenis Kelamin', 'Nama Kelas', 'NIS', 'NISN', 'Tanggal Lahir', 'No HP Orang Tua'],
      ['Siswa Impor', 'P', className, '000123', '0012345678', '17/08/2014', '081234567890'],
    ]);
    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    await page.goto('/siswa');
    if (className === 'Kelas typo') {
      await page.getByRole('button', { name: 'Menu tindakan' }).click();
      await page.getByRole('menuitem', { name: 'Impor Excel', exact: true }).click();
    } else {
      await page.getByRole('button', { name: 'Impor data siswa dari berkas Excel' }).click();
    }
    await page.locator('input[type="file"]').setInputFiles({
      name: 'siswa.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer,
    });
    await page.getByRole('button', { name: 'Lanjut ke Pratinjau' }).click();
    await page.getByRole('button', { name: 'Impor 1 Siswa' }).click();
    if (className === 'Kelas typo') {
      await expect(page.getByRole('dialog').getByRole('alert')).toContainText('kelas "Kelas typo" tidak ditemukan');
      expect(inserts).toHaveLength(0);
      await page.screenshot({ path: testInfo.outputPath('students-import-error.png'), fullPage: true });
    } else {
      await expect(page.getByText('Impor Berhasil!', { exact: true })).toBeVisible();
      expect(inserts).toEqual([[expect.objectContaining({
        class_id: 'class-b', nis: '000123', nisn: '0012345678', birth_date: '2014-08-17', parent_phone: '081234567890',
      })]]);
      await page.getByRole('button', { name: 'Selesai', exact: true }).click();
      await page.getByRole('button', { name: 'Impor data siswa dari berkas Excel' }).click();
      await expect(page.getByText('Klik untuk memilih file', { exact: true })).toBeVisible();
    }
  });
}

test('class actions use the chosen class even when another class is active', async ({ page }) => {
  const { updates } = await setup(page);
  await page.goto('/siswa');
  await page.getByRole('button', { name: 'Kelola Kelas', exact: true }).click();
  const classB = page.getByRole('dialog').locator('div.flex.items-center.justify-between').filter({ hasText: 'Kelas B' });
  await classB.getByRole('button', { name: 'Hapus Kelas' }).click();
  await expect(page.getByText('Tidak dapat menghapus kelas "Kelas B" karena masih ada 1 siswa di dalamnya.', { exact: true })).toBeVisible();
  await classB.getByRole('button', { name: 'Buat kode akses massal' }).click();
  await page.getByRole('button', { name: 'Ya, Buat Kode', exact: true }).click();
  await expect.poll(() => updates.length).toBe(1);
  await page.getByRole('tab', { name: 'Kelas B' }).click();
  await expect(page.getByText(String(updates[0].access_code), { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Kelas A' }).click();
  await expect(page.getByText('Butuh Kode', { exact: true })).toBeVisible();
});
