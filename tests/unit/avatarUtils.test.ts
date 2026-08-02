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

    it.each([
        ['sm', 96, 80],
        ['md', 256, 80],
        ['lg', 512, 85],
    ])('proxy URL uses size=%s → w=%d q=%d', (size, w, q) => {
        const uploadedUrl = 'https://example.com/avatar.jpg';
        const expected = `https://images.weserv.nl/?url=${encodeURIComponent(uploadedUrl)}&w=${w}&h=${w}&fit=cover&q=${q}`;
        expect(getStudentAvatar(uploadedUrl, 'Perempuan', 'student-2', 'Aisyah', size as any)).toBe(expected);
    });

    it('defaults to md (256px) when no size is passed', () => {
        const uploadedUrl = 'https://example.com/avatar.jpg';
        const expected = `https://images.weserv.nl/?url=${encodeURIComponent(uploadedUrl)}&w=256&h=256&fit=cover&q=80`;
        expect(getStudentAvatar(uploadedUrl)).toBe(expected);
    });

    it('returns original URL for non-http strings (data URIs)', () => {
        const dataUri = 'data:image/svg+xml;charset=UTF-8,...';
        expect(getStudentAvatar(dataUri)).toBe(dataUri);
    });
});
