import { test, expect } from '@playwright/test';

test.describe('Jurnal Mengajar E2E (Stubs)', () => {
  test.skip('should render teaching journals page and sidebar navigation', async ({ page }) => {
    // Navigate to teaching journals page
    await page.goto('/jurnal-mengajar');
    await expect(page.getByText('Jurnal Mengajar')).toBeVisible();
  });

  test.skip('should display today teaching journal status widget on dashboard', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await expect(page.getByText('Status Jurnal Hari Ini')).toBeVisible();
  });

  test.skip('should allow adding a new teaching journal entry via form', async ({ page }) => {
    await page.goto('/jurnal-mengajar');
    await page.getByRole('button', { name: /tambah jurnal/i }).click();

    // Fill form
    await page.locator('select[name="class_id"]').selectOption({ label: 'Class 10-A' });
    await page.locator('input[name="subject"]').fill('Kimia');
    await page.locator('input[name="topic"]').fill('Ikatan Kimia');
    
    // Submit
    await page.getByRole('button', { name: /simpan jurnal/i }).click();

    // Verify success
    await expect(page.getByText('Jurnal mengajar berhasil ditambahkan!')).toBeVisible();
  });

  test.skip('should allow editing an existing teaching journal entry', async ({ page }) => {
    await page.goto('/jurnal-mengajar');
    await page.locator('[aria-label="Edit jurnal"]').first().click();

    // Modify fields
    await page.locator('input[name="topic"]').fill('Ikatan Kimia Kovalen');
    await page.getByRole('button', { name: /simpan jurnal/i }).click();

    // Verify success
    await expect(page.getByText('Jurnal mengajar berhasil diperbarui!')).toBeVisible();
  });

  test.skip('should allow deleting a teaching journal entry', async ({ page }) => {
    await page.goto('/jurnal-mengajar');
    await page.locator('[aria-label="Hapus jurnal"]').first().click();

    // Confirm deletion
    await page.getByRole('button', { name: /hapus/i }).click();

    // Verify success
    await expect(page.getByText('Jurnal mengajar berhasil dihapus!')).toBeVisible();
  });

  test.skip('should allow exporting teaching journals rekap to Excel/PDF', async ({ page }) => {
    await page.goto('/jurnal-mengajar');
    await page.getByRole('button', { name: /ekspor/i }).click();
    await expect(page.getByText('Rekap Jurnal Mengajar')).toBeVisible();
  });
});
