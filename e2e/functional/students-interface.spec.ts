import { test, expect, type Locator, type Page } from '@playwright/test';

const teacherId = 'a3b17c91-2394-4d87-9759-3fb7072dbcb0';
const longName = 'Muhammad Abdurrahman Putra Pratama Wijaya';
const classes = Array.from({ length: 12 }, (_, index) => ({
  id: `class-${index + 1}`,
  name: `Kelas ${index + 1} Semester Ganjil`,
  user_id: teacherId,
  deleted_at: null,
}));
const students = Array.from({ length: 32 }, (_, index) => ({
  id: `student-${index + 1}`,
  class_id: 'class-1',
  user_id: teacherId,
  deleted_at: null,
  name: index === 0 ? longName : `Siswa Contoh ${String(index + 1).padStart(2, '0')}`,
  gender: index % 2 ? 'Perempuan' : 'Laki-laki',
  access_code: index % 2 ? null : 'ABC123',
  avatar_url: null,
  nis: '000123',
  nisn: '0012345678',
  parent_name: null,
  parent_phone: null,
  birth_date: null,
}));

async function setup(page: Page) {
  const user = {
    id: teacherId,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'guru@example.com',
    user_metadata: { name: 'Guru Uji' },
  };
  await page.addInitScript(
    (auth) => {
      localStorage.setItem('portal-guru-auth', JSON.stringify(auth));
      localStorage.setItem('onboarding_completed', 'true');
    },
    {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      token_type: 'bearer',
      expires_at: 9999999999,
      expires_in: 3600,
      user,
    },
  );
  await page.route('**/auth/v1/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }),
  );
  await page.route('**/rest/v1/**', (route) => {
    const table = new URL(route.request().url()).pathname.split('/').at(-1);
    const rows =
      table === 'classes'
        ? classes
        : table === 'students'
          ? students
          : table === 'user_roles'
            ? [{ role: 'teacher' }]
            : [];
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(rows),
    });
  });
  await page.goto('/siswa');
  await expect(page.getByRole('heading', { name: longName, exact: true })).toBeVisible();
}

async function expectInViewport(locator: Locator, width: number, height: number) {
  await expect(locator).toBeInViewport({ ratio: 1 });
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width + 1);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(height + 1);
}

async function contrast(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const luminance = (color: string) => {
      const values = color
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number)
        .map((channel) => {
          const value = channel / 255;
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
      return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
    };
    const foreground = luminance(style.color);
    const background = luminance(style.backgroundColor);
    return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
  });
}

for (const width of [320, 390, 768, 1024, 1440]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`student interface fits ${width}px in ${colorScheme}`, async ({ page }, testInfo) => {
      const height = width < 600 ? 844 : 900;
      await page.setViewportSize({ width, height });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await setup(page);
      if (colorScheme === 'dark') await expect(page.locator('html')).toHaveClass(/dark/);
      else await expect(page.locator('html')).not.toHaveClass(/dark/);
      expect(await contrast(page.getByRole('tab', { name: classes[0].name, exact: true }))).toBeGreaterThanOrEqual(4.5);
      expect(
        await contrast(page.getByRole('button', { name: 'Siswa Baru', exact: true })),
      ).toBeGreaterThanOrEqual(4.5);
      const firstDetail = page.getByRole('link', { name: `Lihat detail siswa ${longName}` });
      const secondDetail = page.getByRole('link', { name: 'Lihat detail siswa Siswa Contoh 02' });
      expect(
        Math.abs((await firstDetail.boundingBox())!.y - (await secondDetail.boundingBox())!.y),
      ).toBeLessThan(1);
      const avatar = page.getByRole('img', { name: longName, exact: true });
      await expect
        .poll(() => avatar.evaluate((element: HTMLImageElement) => element.naturalWidth))
        .toBeGreaterThan(0);
      await page.screenshot({ path: testInfo.outputPath('students-grid.png') });

      await page.getByRole('checkbox', { name: `Pilih siswa ${longName}`, exact: true }).check();
      const toolbar = page.getByRole('toolbar', { name: 'Tindakan untuk pilihan' });
      await expectInViewport(toolbar, width, height);
      const cancel = toolbar.getByRole('button', { name: 'Batalkan pilihan (Esc)' });
      await expectInViewport(cancel, width, height);
      await toolbar.getByRole('button', { name: 'Hapus', exact: true }).focus();
      await expectInViewport(
        toolbar.getByRole('button', { name: 'Hapus', exact: true }),
        width,
        height,
      );
      await page.screenshot({ path: testInfo.outputPath('students-selection.png') });
      await cancel.click();
      await expect(toolbar).toBeHidden();

      await page.getByRole('button', { name: 'Tampilan List', exact: true }).click();
      await expect(
        page
          .getByText('NIS: 000123 / NISN: 0012345678', { exact: true })
          .filter({ visible: true })
          .first(),
      ).toBeVisible();
      if (width >= 1024) {
        const sort = page.getByRole('button', { name: 'Urutkan berdasarkan jenis kelamin' });
        await sort.focus();
        await sort.press('Enter');
        await expect(
          page.getByRole('columnheader', { name: 'Jenis Kelamin', exact: true }),
        ).toHaveAttribute('aria-sort', 'ascending');
      } else {
        await page.getByRole('combobox', { name: 'Urutkan siswa' }).selectOption('gender');
        await expect(page.getByRole('combobox', { name: 'Urutkan siswa' })).toHaveValue('gender');
      }
      await page.screenshot({ path: testInfo.outputPath('students-list.png') });

      if (width < 640) {
        await page.getByRole('button', { name: 'Menu tindakan' }).click();
        await page.getByRole('menuitem', { name: 'Ekspor', exact: true }).click();
      } else await page.getByRole('button', { name: 'Ekspor', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Ekspor Data Siswa' });
      await expectInViewport(dialog.locator('#modal-container'), width, height);
      const close = dialog.getByRole('button', { name: 'Tutup dialog' });
      await expect(close).toBeFocused();
      await expect(dialog.getByRole('button', { name: 'PDF (.pdf)' })).toHaveCount(0);
      await expect(dialog.getByRole('button', { name: 'JSON (.json)' })).toHaveCount(0);
      await expect(dialog.getByRole('cell', { name: classes[0].name, exact: true })).toHaveCount(5);
      await expect(dialog.getByRole('cell', { name: 'class-1', exact: true })).toHaveCount(0);
      const submit = dialog.getByRole('button', { name: 'Ekspor', exact: true });
      await expectInViewport(submit, width, height);
      expect(await contrast(submit)).toBeGreaterThanOrEqual(4.5);
      await submit.focus();
      await page.keyboard.press('Tab');
      await expect(close).toBeFocused();
      await page.keyboard.press('Shift+Tab');
      await expect(submit).toBeFocused();
      await page.screenshot({ path: testInfo.outputPath('students-export.png') });
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(page.getByRole('button', { name: width < 640 ? 'Menu tindakan' : 'Ekspor', exact: true })).toBeFocused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    });
  }
}

test('student export panel stays visible with motion enabled and a long list', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await setup(page);
  await page.getByRole('button', { name: 'Tampilan List', exact: true }).click();
  await page.getByRole('button', { name: 'Menu tindakan' }).click();
  await page.getByRole('menuitem', { name: 'Ekspor', exact: true }).click();
  const close = page.getByRole('dialog').getByRole('button', { name: 'Tutup dialog' });
  await expect(close).toBeFocused();
  await expectInViewport(close, 390, 844);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});
