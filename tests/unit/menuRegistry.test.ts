import { describe, it, expect } from 'vitest';
import {
    getDashboardNavSections,
    getDashboardMoreMenuItems,
} from '../../src/components/navigation/dashboardMenuConfig';
import { getMobileNavItems } from '../../src/components/mobile/mobileNavConfig';
import { EASY_MODE_PATHS, MENU_ENTRIES } from '../../src/components/navigation/menuRegistry';

const TEACHER = { isAdmin: false, role: null };
const ADMIN = { isAdmin: true, role: 'admin' };
const KEPALA = { isAdmin: false, role: 'kepala_madrasah' };
const WAKA = { isAdmin: false, role: 'waka_kesiswaan' };

/** Flattens sections to "sectionId:href" so ordering is asserted, not just membership. */
const flatten = (sections: ReturnType<typeof getDashboardNavSections>) =>
    sections.flatMap((section) => section.items.map((item) => `${section.id}:${item.href}`));

describe('menu registry', () => {
    // These lists are the pre-refactor hardcoded menus, transcribed verbatim.
    // They are the contract: unifying four arrays into one registry must not
    // change a single thing a classroom teacher sees.
    describe('teacher sidebar is unchanged by the unification', () => {
        it('renders the exact sections, items, and order', () => {
            expect(flatten(getDashboardNavSections(TEACHER))).toEqual([
                'primary:/dashboard',
                'primary:/input-massal',
                'primary:/siswa',
                'primary:/absensi',
                'primary:/bintang',
                'academic:/jadwal',
                'academic:/modul-ajar',
                'academic:/tugas',
                'academic:/brankas',
                'insights:/analytics',
                'insights:/ekstrakurikuler',
                'system:/pemulihan',
                'system:/pengaturan',
            ]);
        });

        it('keeps the original section headings', () => {
            expect(getDashboardNavSections(TEACHER).map((s) => s.label)).toEqual([
                'Menu Utama',
                'Akademik',
                'Analitik & Kegiatan',
                'Sistem & Maintenance',
            ]);
        });

        it('keeps the original labels', () => {
            const labels = getDashboardNavSections(TEACHER).flatMap((s) => s.items.map((i) => i.label));
            expect(labels).toEqual([
                'Beranda',
                'Input Penilaian',
                'Data Siswa',
                'Absensi',
                'Program Bintang',
                'Jadwal & Jurnal',
                'Modul Ajar',
                'Penugasan',
                'Arsip Kelas',
                'Analitik Akademik',
                'Ekstrakurikuler',
                'Pemulihan & Audit',
                'Pengaturan Sistem',
            ]);
        });

        it('hides the admin panel', () => {
            expect(flatten(getDashboardNavSections(TEACHER))).not.toContain('system:/admin');
        });
    });

    describe('more menu is unchanged', () => {
        it('keeps its own distinct ordering', () => {
            expect(getDashboardMoreMenuItems(TEACHER).map((i) => i.href)).toEqual([
                '/siswa',
                '/bintang',
                '/jadwal',
                '/modul-ajar',
                '/tugas',
                '/brankas',
                '/input-massal',
                '/ekstrakurikuler',
                '/analytics',
                '/pemulihan',
                '/pengaturan',
            ]);
        });

        it('appends the admin panel last for admins', () => {
            const hrefs = getDashboardMoreMenuItems(ADMIN).map((i) => i.href);
            expect(hrefs[hrefs.length - 1]).toBe('/admin');
        });

        it('omits destinations that already live in the bottom bar', () => {
            const hrefs = getDashboardMoreMenuItems(TEACHER).map((i) => i.href);
            expect(hrefs).not.toContain('/dashboard');
            expect(hrefs).not.toContain('/absensi');
        });
    });

    describe('mobile bottom bar is unchanged', () => {
        it('gives teachers grading in slot two', () => {
            expect(getMobileNavItems(null)).toMatchObject([
                { href: '/dashboard', label: 'Beranda' },
                { href: '/input-massal', label: 'Penilaian' },
                { href: '/siswa', label: 'Siswa' },
                { href: '/absensi', label: 'Absensi' },
            ]);
        });

        it('gives leadership analytics instead', () => {
            for (const role of ['kepala_madrasah', 'waka_kesiswaan']) {
                expect(getMobileNavItems(role)).toMatchObject([
                    { href: '/dashboard', label: 'Beranda' },
                    { href: '/siswa', label: 'Siswa' },
                    { href: '/absensi', label: 'Absensi' },
                    { href: '/analytics', label: 'Analitik' },
                ]);
            }
        });

        it('never exceeds four slots', () => {
            expect(getMobileNavItems(null)).toHaveLength(4);
            expect(getMobileNavItems('kepala_madrasah')).toHaveLength(4);
        });
    });

    describe('admin', () => {
        it('sees the admin panel in the system section', () => {
            expect(flatten(getDashboardNavSections(ADMIN))).toContain('system:/admin');
        });

        it('sees it appended after the existing system items', () => {
            const system = getDashboardNavSections(ADMIN).find((s) => s.id === 'system');
            expect(system?.items.map((i) => i.href)).toEqual(['/pemulihan', '/pengaturan', '/admin']);
        });
    });

    describe('leadership sidebar now matches the bottom bar', () => {
        it('promotes analytics into the primary section', () => {
            for (const audience of [KEPALA, WAKA]) {
                const primary = getDashboardNavSections(audience).find((s) => s.id === 'primary');
                expect(primary?.items.map((i) => i.href)).toContain('/analytics');
            }
        });

        it('still reaches every destination a teacher can reach', () => {
            const teacherHrefs = getDashboardNavSections(TEACHER)
                .flatMap((s) => s.items.map((i) => i.href))
                .sort();
            const kepalaHrefs = getDashboardNavSections(KEPALA)
                .flatMap((s) => s.items.map((i) => i.href))
                .sort();
            // Promotion reorders, it must never remove.
            expect(kepalaHrefs).toEqual(teacherHrefs);
        });

        it('leaves no empty section heading behind', () => {
            for (const section of getDashboardNavSections(KEPALA)) {
                expect(section.items.length).toBeGreaterThan(0);
            }
        });
    });

    describe('registry integrity', () => {
        it('has no duplicate hrefs', () => {
            const hrefs = MENU_ENTRIES.map((e) => e.href);
            expect(new Set(hrefs).size).toBe(hrefs.length);
        });

        it('has no duplicate positions in the more menu', () => {
            const orders = MENU_ENTRIES.map((e) => e.moreOrder).filter((o) => o !== undefined);
            expect(new Set(orders).size).toBe(orders.length);
        });

        it('exposes the same Easy Mode paths the sidebar used to hardcode', () => {
            expect([...EASY_MODE_PATHS].sort()).toEqual(
                ['/absensi', '/bintang', '/dashboard', '/input-massal', '/siswa'].sort(),
            );
        });

        it('keeps every Easy Mode path reachable from the sidebar', () => {
            const hrefs = new Set(getDashboardNavSections(TEACHER).flatMap((s) => s.items.map((i) => i.href)));
            for (const path of EASY_MODE_PATHS) {
                expect(hrefs.has(path)).toBe(true);
            }
        });
    });
});
