import { test, expect, type Page } from '@playwright/test';

const teacherId = 'a3b17c91-2394-4d87-9759-3fb7072dbcb0';
const classes = ['A', 'B'].map(name => ({ id: `class-${name}`, name: `Kelas ${name}`, user_id: teacherId, wali_kelas_id: null, deleted_at: null, is_archived: false }));
const semester = { id: 'semester-a', name: 'Ganjil', is_active: true, is_locked: false, start_date: '2026-07-01', end_date: '2026-12-31', academic_year_id: 'year-a', academic_years: { id: 'year-a', name: '2026/2027' } };
const schedules = ['Matematika (Pecahan)', 'Aqidah Akhlak', 'Bahasa Arab'].map((subject, index) => ({
    id: `ph-${index}`, class_id: 'class-A', semester_id: semester.id, subject,
    date: `2026-09-${21 + index}`, period_label: '3-4', created_by: teacherId, deleted_at: null,
    created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z',
}));

async function setup(page: Page, remembered?: string, permissions = { manageAll: true, add: true }) {
    await page.clock.setFixedTime(new Date('2026-10-09T03:00:00Z'));
    const user = { id: teacherId, aud: 'authenticated', role: 'authenticated', email: 'guru@example.com', user_metadata: { name: 'Guru Uji' } };
    await page.addInitScript(({ auth, rememberedClass }) => {
        localStorage.setItem('portal-guru-auth', JSON.stringify(auth));
        localStorage.setItem('onboarding_completed', 'true');
        if (rememberedClass) localStorage.setItem(`portal-guru:ph-class:${auth.user.id}`, rememberedClass);
    }, { auth: { user, access_token: 'mock-access-token', refresh_token: 'mock-refresh-token', expires_at: 9999999999, token_type: 'bearer', expires_in: 3600 }, rememberedClass: remembered });
    await page.route('**/auth/v1/**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }));
    await page.route('**/rest/v1/**', route => {
        const path = new URL(route.request().url()).pathname;
        const table = path.split('/').at(-1);
        const data = table === 'list_ph_schedule_classes' ? classes
            : table === 'classes' ? (permissions.manageAll ? classes : []) : table === 'semesters' ? [semester]
            : table === 'academic_years' ? [semester.academic_years] : table === 'ph_schedules' ? schedules
            : table === 'user_roles' ? [{ role: 'teacher' }]
            : table === 'can_manage_ph_schedule' ? permissions.manageAll
            : table === 'can_add_ph_schedule' ? permissions.add
            : path.includes('/rpc/can_') ? true : [];
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
}

for (const width of [390, 768, 1440]) {
    for (const colorScheme of ['light', 'dark'] as const) {
        test(`PH interface at ${width}px in ${colorScheme}`, async ({ page }, testInfo) => {
            await page.setViewportSize({ width, height: 900 });
            await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
            await setup(page);
            await page.goto('/jadwal?tab=ph');
            await expect(page.getByRole('button', { name: 'Pilih kelas PH' })).toContainText('Kelas A');
            await expect(page.getByRole('heading', { name: 'Belum ada jadwal PH minggu ini' })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Tambah PH minggu ini', exact: true })).toHaveCount(1);
            await page.getByRole('heading', { name: 'Belum ada jadwal PH minggu ini' }).scrollIntoViewIfNeeded();
            await page.screenshot({ path: testInfo.outputPath('ph-week.png') });
            await page.getByRole('button', { name: 'Tampilan Tabel', exact: true }).click();
            await page.getByRole('button', { name: 'Lewat 3', exact: true }).click();
            await expect(page.getByRole('button', { name: 'Urutan tanggal: terbaru dahulu' })).toHaveText('Terbaru');
            const table = page.getByRole('table');
            await expect(table.getByRole('row').nth(1)).toContainText('Bahasa Arab');
            await expect(table.getByRole('cell', { name: '3-4', exact: true })).toHaveCount(3);
            await expect(table.getByText('Materi belum diisi', { exact: true })).toHaveCount(2);
            await expect(table.getByText('Pecahan', { exact: true })).toHaveCount(1);
            await expect(table.getByRole('button', { name: 'Nilai', exact: true })).toHaveCount(3);
            await page.screenshot({ path: testInfo.outputPath('ph-table.png') });
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        });
    }
}

test('PH restores a valid remembered class', async ({ page }) => {
    await setup(page, 'class-B');
    await page.goto('/jadwal?tab=ph');
    await expect(page.getByRole('button', { name: 'Pilih kelas PH' })).toContainText('Kelas B');
});

test('PH saves the selected class and restores it after reopening', async ({ page }) => {
    await setup(page);
    await page.goto('/jadwal?tab=ph');
    const picker = page.getByRole('button', { name: 'Pilih kelas PH' });
    await expect(picker).toContainText('Kelas A');
    await picker.click();
    await page.getByRole('option', { name: 'Kelas B', exact: true }).click();
    await expect(picker).toContainText('Kelas B');
    expect(await page.evaluate(id => localStorage.getItem(`portal-guru:ph-class:${id}`), teacherId)).toBe('class-B');
    await page.reload();
    await expect(page.getByRole('button', { name: 'Pilih kelas PH' })).toContainText('Kelas B');
});

test('a non-homeroom teacher can add PH to another class', async ({ page }) => {
    await setup(page, undefined, { manageAll: false, add: true });
    const savedRequests: unknown[] = [];
    await page.route('**/rest/v1/ph_schedules*', route => {
        if (route.request().method() === 'POST') {
            savedRequests.push(route.request().postDataJSON());
            return route.fulfill({ status: 201, contentType: 'application/json', body: '' });
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(schedules) });
    });
    await page.goto('/jadwal?tab=ph');
    const picker = page.getByRole('button', { name: 'Pilih kelas PH' });
    await expect(picker).toContainText('Kelas A');
    await picker.click();
    await page.getByRole('option', { name: 'Kelas B', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Tambah Massal', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Tambah PH', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Tambah Jadwal Penilaian Harian' });
    await expect(dialog).toContainText('Kelas B');
    await dialog.getByLabel('Mata Pelajaran', { exact: false }).click();
    await dialog.getByRole('button', { name: 'Matematika', exact: true }).click();
    await dialog.getByRole('button', { name: 'Tambah PH', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    expect(savedRequests).toEqual([{
        class_id: 'class-B', semester_id: 'semester-a', created_by: teacherId,
        subject: 'Matematika', date: '2026-10-09', period_label: '1-2',
    }]);
});

test('a non-homeroom teacher cannot edit or delete another teacher\'s PH', async ({ page }) => {
    await setup(page, undefined, { manageAll: false, add: true });
    await page.route('**/rest/v1/ph_schedules*', route => route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify(schedules.map((schedule, index) => index === 0 ? schedule : { ...schedule, created_by: 'other-teacher' })),
    }));
    await page.goto('/jadwal?tab=ph');
    await page.getByRole('button', { name: 'Tampilan Tabel', exact: true }).click();
    const table = page.getByRole('table');
    await expect(table.getByRole('button', { name: 'Edit jadwal Matematika (Pecahan)', exact: true })).toBeVisible();
    await expect(table.getByRole('button', { name: 'Hapus jadwal Matematika (Pecahan)', exact: true })).toBeVisible();
    await expect(table.getByRole('button', { name: /^Edit jadwal/ })).toHaveCount(1);
    await expect(table.getByRole('button', { name: /^Hapus jadwal/ })).toHaveCount(1);
});

test('an account denied PH creation does not see add controls', async ({ page }) => {
    await setup(page, undefined, { manageAll: false, add: false });
    await page.goto('/jadwal?tab=ph');
    await expect(page.getByRole('heading', { name: 'Belum ada jadwal PH minggu ini' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Tambah PH|Tambah Massal/ })).toHaveCount(0);
});
