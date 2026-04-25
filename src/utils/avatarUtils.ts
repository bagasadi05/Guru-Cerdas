/**
 * Default Avatar Utility
 *
 * Provides local default avatars based on gender/name. Generated avatars are
 * inline SVG data URLs so student lists do not depend on external image services.
 */

const GENERATED_AVATAR_HOSTS = [
    'avatar.iran.liara.run',
    'api.dicebear.com',
    'ui-avatars.com',
    'i.pravatar.cc',
];

const hashString = (value: string) => {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
    }
    return Math.abs(hash);
};

const getInitials = (name?: string | null) => {
    const words = (name || 'Siswa')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (words.length === 0) return 'S';
    return words.slice(0, 2).map((word) => word[0]?.toUpperCase()).join('');
};

const createLocalAvatar = (options: {
    gender?: string | null;
    seed?: string | null;
    name?: string | null;
}) => {
    const isMale = options.gender === 'Laki-laki' || options.gender === 'L';
    const seed = options.seed || options.name || 'student';
    const palettes = isMale
        ? [
            ['#dbeafe', '#2563eb', '#0f172a'],
            ['#dcfce7', '#16a34a', '#052e16'],
            ['#e0f2fe', '#0284c7', '#082f49'],
        ]
        : [
            ['#fce7f3', '#db2777', '#500724'],
            ['#fae8ff', '#a21caf', '#581c87'],
            ['#ffe4e6', '#e11d48', '#4c0519'],
        ];
    const [background, accent, text] = palettes[hashString(seed) % palettes.length];
    const initials = getInitials(options.name || seed);
    const escapedInitials = initials.replace(/[<>&"']/g, '');
    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160" role="img" aria-label="${escapedInitials}">
  <rect width="160" height="160" rx="80" fill="${background}"/>
  <circle cx="122" cy="36" r="24" fill="${accent}" opacity="0.18"/>
  <circle cx="38" cy="126" r="32" fill="${accent}" opacity="0.14"/>
  <circle cx="80" cy="62" r="30" fill="${accent}" opacity="0.22"/>
  <path d="M35 132c8-28 27-44 45-44s37 16 45 44" fill="${accent}" opacity="0.25"/>
  <text x="80" y="94" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="44" font-weight="800" fill="${text}">${escapedInitials}</text>
</svg>`.trim();

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const DEFAULT_AVATARS = {
    male: createLocalAvatar({ gender: 'Laki-laki', seed: 'male-default', name: 'Siswa' }),
    female: createLocalAvatar({ gender: 'Perempuan', seed: 'female-default', name: 'Siswa' }),
    maleCute: createLocalAvatar({ gender: 'Laki-laki', seed: 'male-cute', name: 'Siswa' }),
    femaleCute: createLocalAvatar({ gender: 'Perempuan', seed: 'female-cute', name: 'Siswa' }),
};

/**
 * Get default avatar URL based on gender
 * @param gender - 'Laki-laki' or 'Perempuan'
 * @param studentId - Optional student ID for unique avatar variation
 * @returns Avatar URL
 */
export const getDefaultAvatar = (gender?: string | null, studentId?: string): string => {
    return createLocalAvatar({ gender, seed: studentId || undefined, name: studentId || 'Siswa' });
};

/**
 * Get student avatar URL with fallback to gendered default
 * @param avatarUrl - Student's custom avatar URL
 * @param gender - Student's gender
 * @param studentId - Student ID for unique default avatar
 * @returns Final avatar URL to display
 */
export const getStudentAvatar = (
    avatarUrl?: string | null,
    gender?: string | null,
    studentId?: string,
    studentName?: string
): string => {
    if (avatarUrl && GENERATED_AVATAR_HOSTS.some((host) => avatarUrl.includes(host))) {
        return createLocalAvatar({ gender, seed: studentId || studentName, name: studentName || studentId });
    }

    // If has custom avatar and not empty, use it
    if (avatarUrl && avatarUrl.trim() !== '') {
        return avatarUrl;
    }

    // Otherwise use gendered default avatar
    return createLocalAvatar({ gender, seed: studentId, name: studentName || studentId });
};

export default {
    DEFAULT_AVATARS,
    getDefaultAvatar,
    getStudentAvatar,
};
