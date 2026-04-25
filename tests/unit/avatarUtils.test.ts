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

    it('keeps uploaded custom avatar URLs', () => {
        const uploadedUrl = 'https://fddvcyqbfqydvsfujcxd.supabase.co/storage/v1/object/public/avatars/student.png';

        expect(getStudentAvatar(uploadedUrl, 'Perempuan', 'student-2', 'Aisyah')).toBe(uploadedUrl);
    });
});
