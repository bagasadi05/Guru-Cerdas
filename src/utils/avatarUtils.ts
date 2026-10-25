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

const isUuidLike = (value?: string | null) => {
    if (!value) return false;
    const trimmed = value.trim();
    return (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed) ||
        /^[0-9a-f]{16,}$/i.test(trimmed)
    );
};

const getInitials = (name?: string | null) => {
    const raw = (name || '').trim();
    if (!raw || isUuidLike(raw)) return 'S';

    const words = raw
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
    const gradId = `av_${hashString(seed)}_${isMale ? 'm' : 'f'}`;

    // Modern, vibrant premium gradients
    const palettes = isMale
        ? [
            ['#0d9488', '#059669'], // Teal -> Emerald
            ['#0284c7', '#2563eb'], // Sky -> Blue
            ['#6366f1', '#4f46e5'], // Indigo -> Deep Violet
            ['#0891b2', '#0369a1'], // Cyan -> Marine
        ]
        : [
            ['#f43f5e', '#be123c'], // Rose -> Crimson
            ['#d946ef', '#9333ea'], // Fuchsia -> Violet
            ['#ec4899', '#be185d'], // Pink -> Magenta
            ['#f59e0b', '#e11d48'], // Amber -> Sunset Rose
        ];

    const [color1, color2] = palettes[hashString(seed) % palettes.length];
    const displayName = options.name && !isUuidLike(options.name) ? options.name : null;
    const initials = getInitials(displayName || (isUuidLike(seed) ? null : seed));
    const escapedInitials = initials.replace(/[<>&"']/g, '');

    const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160" role="img" aria-label="${escapedInitials}">
  <defs>
    <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${color1}" />
      <stop offset="100%" stop-color="${color2}" />
    </linearGradient>
  </defs>
  <rect width="160" height="160" rx="80" fill="url(#${gradId})"/>
  <circle cx="126" cy="34" r="30" fill="#ffffff" opacity="0.14"/>
  <circle cx="34" cy="130" r="38" fill="#ffffff" opacity="0.08"/>
  <text x="80" y="98" text-anchor="middle" font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="50" font-weight="700" fill="#ffffff" letter-spacing="1">${escapedInitials}</text>
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
 * Ukuran avatar untuk srcset. Gunakan sesuai konteks tampilan:
 * - 'sm' (96px)  : tabel, grid thumbnail, list, dropdown (avatar kecil)
 * - 'md' (256px) : header profil, detail siswa, kartu (default)
 * - 'lg' (512px) : preview besar, cetak (jarang dipakai)
 *
 * Catatan: sejak proxy weserv.nl dihapus, ukuran tidak lagi mengubah URL yang
 * dihasilkan — parameter dipertahankan demi kompatibilitas pemanggil.
 */
export type AvatarSize = 'sm' | 'md' | 'lg';

/**
 * Resolve URL avatar. Foto disajikan langsung dari R2 (egress $0, gratis),
 * tanpa proxy resize pihak ketiga (weserv.nl). URL dikembalikan apa adanya.
 *
 * @param url - Original image URL
 * @param _size - Dipertahankan untuk kompatibilitas API; tidak lagi digunakan.
 */
const getOptimizedUrl = (url: string, _size?: AvatarSize): string => {
    // Data URI dan semua URL http dikembalikan langsung — R2 egress $0, jadi
    // tidak perlu proxy pihak ketiga untuk menghemat bandwidth.
    return url;
};

/**
 * Get student avatar URL with fallback to gendered default.
 * Supports srcset-style sizing: 'sm' (96px) for lists/tables, 'md' (256px) for headers.
 * @param avatarUrl - Student's custom avatar URL
 * @param gender - Student's gender
 * @param studentId - Student ID for unique default avatar
 * @param studentName - Student name for initials
 * @param size - Ukuran tampilan yang diinginkan; dipertahankan untuk kompatibilitas (tidak lagi mengubah URL).
 * @returns Final avatar URL to display
 */
export const getStudentAvatar = (
    avatarUrl?: string | null,
    gender?: string | null,
    studentId?: string,
    studentName?: string,
    size: AvatarSize = 'md'
): string => {
    if (avatarUrl && GENERATED_AVATAR_HOSTS.some((host) => avatarUrl.includes(host))) {
        return createLocalAvatar({ gender, seed: studentId || studentName, name: studentName || studentId });
    }

    // If has custom avatar and not empty, use it (optimized for data saving)
    if (avatarUrl && avatarUrl.trim() !== '') {
        return getOptimizedUrl(avatarUrl, size);
    }

    // Otherwise use gendered default avatar
    return createLocalAvatar({ gender, seed: studentId, name: studentName || studentId });
};

export default {
    DEFAULT_AVATARS,
    getDefaultAvatar,
    getStudentAvatar,
};
