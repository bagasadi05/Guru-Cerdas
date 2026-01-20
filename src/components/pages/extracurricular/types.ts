/**
 * Shared types for Extracurricular module
 */
import { Database } from '../../../services/database.types';

export type Class = Database['public']['Tables']['classes']['Row'];
export type AttendanceStatus = Database['public']['Tables']['extracurricular_attendance']['Row']['status'];
export type Gender = Database['public']['Enums']['gender_enum'];

export type Extracurricular = Database['public']['Tables']['extracurriculars']['Row'];
export type ExtracurricularInsert = Database['public']['Tables']['extracurriculars']['Insert'];
export type ExtracurricularAttendance = Database['public']['Tables']['extracurricular_attendance']['Row'];
export type ExtracurricularGrade = Database['public']['Tables']['extracurricular_grades']['Row'];
export type Student = Database['public']['Tables']['students']['Row'];
export type ExtracurricularStudent = Database['public']['Tables']['extracurricular_students']['Row'];

export type EnrollmentView = {
    id: string;
    participantId: string;
    participantType: 'student' | 'extracurricular_student';
    name: string;
    className: string | null;
};

export type TabType = 'list' | 'enrollment' | 'attendance' | 'grades' | 'students';

// Tab configuration
export const EKSKUL_TABS: { id: TabType; label: string; iconName: string }[] = [
    { id: 'list', label: 'Daftar Ekskul', iconName: 'Trophy' },
    { id: 'students', label: 'Daftar Siswa', iconName: 'UserCog' },
    { id: 'enrollment', label: 'Pendaftaran', iconName: 'Users' },
    { id: 'attendance', label: 'Presensi', iconName: 'Calendar' },
    { id: 'grades', label: 'Nilai', iconName: 'GraduationCap' },
];

// Category options
export const CATEGORIES = ['Olahraga', 'Seni', 'Akademik', 'Keagamaan', 'Lainnya'];
export const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// Common props for tab components
export interface EkskulTabProps {
    extracurriculars: Extracurricular[];
    selectedExtracurricular: string;
    selectedExtracurricularData: Extracurricular | undefined;
    enrollments: EnrollmentView[];
    activeSemester: { id: string; name: string; semester_number: number } | null;
    searchTerm: string;
    classes: Class[];
}
