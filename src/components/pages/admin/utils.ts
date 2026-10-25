export const USER_PAGE_SIZE = 20;
export const LOG_PAGE_SIZE = 25;

export const roleLabelMap: Record<string, string> = {
    admin: 'Admin',
    teacher: 'Guru',
    student: 'Siswa',
    parent: 'Orang Tua',
    user: 'Pengguna',
};

export const getRoleLabel = (value?: string | null): string => {
    if (!value) return roleLabelMap.user;
    return roleLabelMap[value] || value;
};

/**
 * Sanitize search term: strictly whitelist unicode letters, numbers, spaces, and safe punctuation.
 */
export const sanitizeSearchTerm = (value: string): string =>
    value.replace(/[^\p{L}\p{N}\s@._-]/gu, '').trim().slice(0, 100);
