/**
 * Default Avatar Utility
 * 
 * Provides default animated/illustrated avatars based on gender.
 * Uses DiceBear for consistent, high-quality illustrated avatars.
 */

// Default illustrated avatars for male and female students
// Using illustrated style avatars from various free sources
export const DEFAULT_AVATARS = {
    // Animated illustrated avatars using DiceBear Adventurer style
    male: 'https://api.dicebear.com/7.x/adventurer/svg?seed=felix&backgroundColor=b6e3f4&flip=true',
    female: 'https://api.dicebear.com/7.x/adventurer/svg?seed=aneka&backgroundColor=ffd5dc&flip=true',

    // Alternative cute cartoon style
    maleCute: 'https://api.dicebear.com/7.x/avataaars/svg?seed=boy1&backgroundColor=b6e3f4&accessories=prescription01&clothingColor=3c4f5c&eyebrows=default&eyes=default&facialHair=none&hairColor=2c1b18&mouth=smile&top=shortFlat',
    femaleCute: 'https://api.dicebear.com/7.x/avataaars/svg?seed=girl1&backgroundColor=ffd5dc&accessories=none&clothingColor=e8b2b2&eyebrows=default&eyes=default&facialHairProbability=0&hairColor=4a312c&mouth=smile&top=longHair12',
};

/**
 * Get default avatar URL based on gender
 * @param gender - 'Laki-laki' or 'Perempuan'
 * @param studentId - Optional student ID for unique avatar variation
 * @returns Avatar URL
 */
export const getDefaultAvatar = (gender?: string | null, studentId?: string): string => {
    const isMale = gender === 'Laki-laki' || gender === 'L';

    // Use DiceBear with student ID as seed for unique but consistent avatars
    if (studentId) {
        const seed = studentId.slice(0, 8);
        const bgColor = isMale ? 'b6e3f4' : 'ffd5dc';
        return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&backgroundColor=${bgColor}`;
    }

    return isMale ? DEFAULT_AVATARS.male : DEFAULT_AVATARS.female;
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
    studentId?: string
): string => {
    // If has custom avatar and not empty, use it
    if (avatarUrl && avatarUrl.trim() !== '') {
        return avatarUrl;
    }

    // Otherwise use gendered default avatar
    return getDefaultAvatar(gender, studentId);
};

export default {
    DEFAULT_AVATARS,
    getDefaultAvatar,
    getStudentAvatar,
};
