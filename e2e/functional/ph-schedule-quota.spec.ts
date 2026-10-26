import { test, expect, type Page } from '@playwright/test';

const teacherId = 'a3b17c91-2394-4d87-9759-3fb7072dbcb0';
const classes = [
    { id: 'class-A', name: 'Kelas A', user_id: teacherId, wali_kelas_id: null, deleted_at: null, is_archived: false },
    { id: 'class-B', name: 'Kelas B', user_id: teacherId, wali_kelas_id: null, deleted_at: null, is_archived: false }
];
const semester = {
    id: 'semester-a',
    name: 'Ganjil',
    is_active: true,
    is_locked: false,
    start_date: '2026-07-01',
    end_date: '2026-12-31',
    academic_year_id: 'year-a',
    academic_years: { id: 'year-a', name: '2026/2027' }
};

async function setupQuotaTest(page: Page, initialSchedules: Array<{
    id: string;
    class_id: string;
    semester_id: string;
    subject: string;
    date: string;
    period_label: string;
    created_by: string;
    deleted_at: null;
    created_at: string;
    updated_at: string;
}>) {
    // Fix time to Friday, 2026-10-09
    await page.clock.setFixedTime(new Date('2026-10-09T03:00:00Z'));
    const user = {
        id: teacherId,
        aud: 'authenticated',
        role: 'authenticated',
        email: 'guru@example.com',
        user_metadata: { name: 'Guru Uji' }
    };

    await page.addInitScript(({ auth }) => {
        localStorage.setItem('portal-guru-auth', JSON.stringify(auth));
        localStorage.setItem('onboarding_completed', 'true');
        localStorage.setItem(`portal-guru:ph-class:${auth.user.id}`, 'class-A');
    }, {
        auth: {
            user,
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            expires_at: 9999999999,
            token_type: 'bearer',
            expires_in: 3600
        }
    });

    await page.route('**/auth/v1/**', route =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) })
    );

    await page.route('**/rest/v1/**', route => {
        const path = new URL(route.request().url()).pathname;
        const table = path.split('/').at(-1);
        const data = table === 'list_ph_schedule_classes' ? classes
            : table === 'classes' ? classes
            : table === 'semesters' ? [semester]
            : table === 'academic_years' ? [semester.academic_years]
            : table === 'ph_schedules' ? initialSchedules
            : table === 'user_roles' ? [{ role: 'teacher' }]
            : table === 'can_manage_ph_schedule' ? true
            : table === 'can_add_ph_schedule' ? true
            : path.includes('/rpc/can_') ? true : [];
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
}

test.describe('Aturan Bisnis Kuota ASH (Maksimal 2 ASH per Hari)', () => {
    test('mencegah input ASH ke-3 dan mendisable tombol simpan jika kuota harian (2 ASH) sudah penuh', async ({ page }) => {
        const fullDaySchedules = [
            {
                id: 'ph-1',
                class_id: 'class-A',
                semester_id: semester.id,
                subject: 'Matematika',
                date: '2026-10-09',
                period_label: '1-2',
                created_by: teacherId,
                deleted_at: null,
                created_at: '2026-10-01T00:00:00Z',
                updated_at: '2026-10-01T00:00:00Z'
            },
            {
                id: 'ph-2',
                class_id: 'class-A',
                semester_id: semester.id,
                subject: 'Bahasa Indonesia',
                date: '2026-10-09',
                period_label: '3-4',
                created_by: teacherId,
                deleted_at: null,
                created_at: '2026-10-01T00:00:00Z',
                updated_at: '2026-10-01T00:00:00Z'
            }
        ];

        await setupQuotaTest(page, fullDaySchedules);
        await page.goto('/jadwal?tab=ph');

        // Buka modal tambah PH
        await page.getByRole('button', { name: 'Tambah PH', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Tambah Jadwal Penilaian Harian' });
        await expect(dialog).toBeVisible();

        // Pilih mata pelajaran
        await dialog.getByLabel('Mata Pelajaran', { exact: false }).click();
        await dialog.getByRole('button', { name: 'Aqidah Akhlak', exact: true }).click();

        // Verifikasi warning kuota harian muncul
        const quotaWarning = dialog.getByText('Kuota Harian Penuh (Maksimal 2 ASH per Hari)');
        await expect(quotaWarning).toBeVisible();
        await expect(dialog.getByText('Tanggal ini sudah terisi 2 jadwal ASH')).toBeVisible();

        // Verifikasi tombol submit "Tambah PH" ter-disable
        const submitButton = dialog.getByRole('button', { name: 'Tambah PH', exact: true });
        await expect(submitButton).toBeDisabled();

        // Verifikasi tombol saran hari kosong tersedia dan dapat diklik
        const pickAvailableDayButton = dialog.getByRole('button', { name: /Pilih Hari Kosong/i });
        await expect(pickAvailableDayButton).toBeVisible();

        // Klik "Pilih Hari Kosong"
        await pickAvailableDayButton.click();

        // Peringatan kuota penuh harus hilang
        await expect(quotaWarning).not.toBeVisible();

        // Tombol submit harus aktif kembali
        await expect(submitButton).toBeEnabled();
    });

    test('mengizinkan penambahan ASH jika kuota harian masih 1 jadwal tanpa bentrok jam', async ({ page }) => {
        const singleSchedule = [
            {
                id: 'ph-1',
                class_id: 'class-A',
                semester_id: semester.id,
                subject: 'Matematika',
                date: '2026-10-09',
                period_label: '1-2',
                created_by: teacherId,
                deleted_at: null,
                created_at: '2026-10-01T00:00:00Z',
                updated_at: '2026-10-01T00:00:00Z'
            }
        ];

        const savedRequests: unknown[] = [];
        await setupQuotaTest(page, singleSchedule);

        await page.route('**/rest/v1/ph_schedules*', route => {
            if (route.request().method() === 'POST') {
                savedRequests.push(route.request().postDataJSON());
                return route.fulfill({ status: 201, contentType: 'application/json', body: '' });
            }
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(singleSchedule) });
        });

        await page.goto('/jadwal?tab=ph');
        await page.getByRole('button', { name: 'Tambah PH', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Tambah Jadwal Penilaian Harian' });
        await expect(dialog).toBeVisible();

        // Pilih mata pelajaran
        await dialog.getByLabel('Mata Pelajaran', { exact: false }).click();
        await dialog.getByRole('button', { name: 'Bahasa Arab', exact: true }).click();

        // Pilih jam pelajaran yang tidak bentrok (misal 3-4)
        await dialog.getByRole('button', { name: 'Jam 3-4', exact: true }).click();

        // Pastikan tidak ada warning kuota harian
        await expect(dialog.getByText('Kuota Harian Penuh')).not.toBeVisible();

        // Tombol submit harus aktif dan bisa disimpan
        const submitButton = dialog.getByRole('button', { name: 'Tambah PH', exact: true });
        await expect(submitButton).toBeEnabled();
        await submitButton.click();

        await expect(dialog).not.toBeVisible();
        expect(savedRequests.length).toBe(1);
    });
});
