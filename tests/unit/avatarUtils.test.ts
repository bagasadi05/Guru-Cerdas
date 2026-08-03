import { describe, expect, it } from 'vitest';
import { getStudentAvatar } from '../../src/utils/avatarUtils';

describe('avatarUtils', () => {
    it.each([
        'https://avatar.iran.liara.run/public/boy?username=ABDULLAH',
        'https://api.dicebear.com/8.x/adventurer/svg?seed=student-1',
        'https://ui-avatars.com/api/?name=Siswa',
        'https://i.pravatar.cc/150?u=teacher',
    ])('replaces generated external avatar URL with a local data URL: %s', (avatarUrl) => {
        const resolved = getStudentAvatar(avatarUrl, 'Laki-laki', 'student-1', 'Abdullah Azzam');

        expect(resolved).toMatch(/^data:image\/svg\+xml;charset=UTF-8,/);
        expect(resolved).not.toContain('avatar.iran.liara.run');
        expect(resolved).not.toContain('api.dicebear.com');
        expect(resolved).not.toContain('ui-avatars.com');
        expect(resolved).not.toContain('i.pravatar.cc');
    });

    it.each(['sm', 'md', 'lg'])('returns original URL directly without proxy for size=%s', (size) => {
        const uploadedUrl = 'https://example.com/avatar.jpg';
        // R2 egress $0 — no third-party proxy; URL is returned as-is for all sizes.
        expect(getStudentAvatar(uploadedUrl, 'Perempuan', 'student-2', 'Aisyah', size as any)).toBe(uploadedUrl);
    });

    it('returns original URL directly when no size is passed', () => {
        const uploadedUrl = 'https://example.com/avatar.jpg';
        expect(getStudentAvatar(uploadedUrl)).toBe(uploadedUrl);
    });

    it('returns original URL for R2 / internal storage domains (no proxy)', () => {
        const r2Url = 'https://pub-56e5bb83497b4de198d9ee6ad82fc35b.r2.dev/avatars/student-1.jpg';
        expect(getStudentAvatar(r2Url, 'Laki-laki', 'student-1')).toBe(r2Url);
    });

    it('returns original URL for non-http strings (data URIs)', () => {
        const dataUri = 'data:image/svg+xml;charset=UTF-8,...';
        expect(getStudentAvatar(dataUri)).toBe(dataUri);
    });
});
