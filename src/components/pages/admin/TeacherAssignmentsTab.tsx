import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Loader2, Plus, Trash2, UserCheck, UserPlus, Users } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { useToast } from '../../../hooks/useToast';
import { normalizeSubjectName, TeacherClassAssignmentRow } from '../../../services/teacherAssignments';

type TeacherOption = {
    user_id: string;
    full_name: string | null;
    email: string | null;
    role: string | null;
};

type ClassOption = {
    id: string;
    name: string;
    user_id: string;
};

type SemesterOption = {
    id: string;
    name: string;
    semester_number: number | null;
    start_date: string | null;
    academic_years?: { name: string } | null;
};

type AssignmentRole = 'homeroom' | 'subject_teacher';

const DEFAULT_SUBJECT_OPTIONS = [
    'Matematika',
    'Bahasa Indonesia',
    'Bahasa Inggris',
    'IPA',
    'IPS',
    'PKN',
    'Seni Budaya',
    'PJOK',
    'Informatika',
    'Agama',
];

const getRoleLabel = (role: AssignmentRole) => role === 'homeroom' ? 'Wali Kelas' : 'Guru Mapel';

const getSemesterLabel = (semester: SemesterOption | undefined) => {
    if (!semester) return 'Semester tidak ditemukan';
    const academicYearName = semester.academic_years?.name || 'Tahun ajaran';
    const semesterName = semester.semester_number === 1 ? 'Ganjil' : semester.semester_number === 2 ? 'Genap' : semester.name;
    return `${academicYearName} • ${semesterName}`;
};

interface TeacherAssignmentsTabProps {
    currentUserId?: string;
    onLogAction?: (
        tableName: string,
        action: string,
        recordId: string,
        oldData?: unknown,
        newData?: unknown,
    ) => Promise<void> | void;
}

export const TeacherAssignmentsTab: React.FC<TeacherAssignmentsTabProps> = ({ currentUserId, onLogAction }) => {
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [teachers, setTeachers] = useState<TeacherOption[]>([]);
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [semesters, setSemesters] = useState<SemesterOption[]>([]);
    const [assignments, setAssignments] = useState<TeacherClassAssignmentRow[]>([]);

    const [filterClassId, setFilterClassId] = useState('');
    const [filterSemesterId, setFilterSemesterId] = useState('');

    const [teacherUserId, setTeacherUserId] = useState('');
    const [classId, setClassId] = useState('');
    const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
    const [semesterId, setSemesterId] = useState('');
    const [assignmentRole, setAssignmentRole] = useState<AssignmentRole>('homeroom');
    const [subjectName, setSubjectName] = useState('');
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
    const [notes, setNotes] = useState('');
    const formPanelRef = useRef<HTMLDivElement>(null);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [teachersRes, classesRes, semestersRes, assignmentsRes] = await Promise.all([
                supabase
                    .from('user_roles')
                    .select('user_id, full_name, email, role')
                    .in('role', ['admin', 'teacher'])
                    .is('deleted_at', null)
                    .order('full_name'),
                supabase
                    .from('classes')
                    .select('id, name, user_id')
                    .is('deleted_at', null)
                    .order('name'),
                supabase
                    .from('semesters')
                    .select('id, name, semester_number, start_date, academic_years(name)')
                    .order('start_date', { ascending: false }),
                supabase
                    .from('teacher_class_assignments')
                    .select('id, teacher_user_id, class_id, semester_id, assignment_role, subject_name, notes, created_by, created_at, updated_at, deleted_at')
                    .is('deleted_at', null)
                    .order('created_at', { ascending: false }),
            ]);

            if (teachersRes.error) throw teachersRes.error;
            if (classesRes.error) throw classesRes.error;
            if (semestersRes.error) throw semestersRes.error;
            if (assignmentsRes.error) throw assignmentsRes.error;

            setTeachers((teachersRes.data || []) as TeacherOption[]);
            setClasses((classesRes.data || []) as ClassOption[]);
            setSemesters((semestersRes.data || []) as SemesterOption[]);
            setAssignments((assignmentsRes.data || []) as TeacherClassAssignmentRow[]);

            if (!semesterId && semestersRes.data && semestersRes.data.length > 0) {
                setSemesterId(semestersRes.data[0].id);
            }
            if (!filterSemesterId && semestersRes.data && semestersRes.data.length > 0) {
                setFilterSemesterId(semestersRes.data[0].id);
            }
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Gagal memuat data penugasan.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const teacherMap = useMemo(
        () => new Map(teachers.map((teacher) => [teacher.user_id, teacher])),
        [teachers],
    );
    const classMap = useMemo(
        () => new Map(classes.map((classItem) => [classItem.id, classItem])),
        [classes],
    );
    const semesterMap = useMemo(
        () => new Map(semesters.map((semester) => [semester.id, semester])),
        [semesters],
    );

    const filteredAssignments = useMemo(() => assignments.filter((assignment) => {
        if (filterClassId && assignment.class_id !== filterClassId) return false;
        if (filterSemesterId && assignment.semester_id !== filterSemesterId) return false;
        return true;
    }), [assignments, filterClassId, filterSemesterId]);

    const unassignedTeachers = useMemo(() => {
        const assignedTeacherIds = new Set(assignments.map((assignment) => assignment.teacher_user_id));
        return teachers.filter((teacher) => teacher.role === 'teacher' && !assignedTeacherIds.has(teacher.user_id));
    }, [assignments, teachers]);

    const stats = useMemo(() => ({
        totalAssignments: assignments.length,
        homeroomCount: assignments.filter((assignment) => assignment.assignment_role === 'homeroom').length,
        subjectTeacherCount: assignments.filter((assignment) => assignment.assignment_role === 'subject_teacher').length,
        totalTeachers: new Set(assignments.map((assignment) => assignment.teacher_user_id)).size,
        unassignedTeacherCount: unassignedTeachers.length,
    }), [assignments, unassignedTeachers.length]);

    const resetForm = () => {
        setTeacherUserId('');
        setClassId('');
        setSelectedClassIds([]);
        setSubjectName('');
        setSelectedSubjects([]);
        setNotes('');
        setAssignmentRole('homeroom');
    };

    const handleQuickAssignTeacher = (teacher: TeacherOption) => {
        setTeacherUserId(teacher.user_id);
        if (!semesterId && semesters.length > 0) {
            setSemesterId(semesters[0].id);
        }
        formPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleSubjectToggle = (subject: string) => {
        setSelectedSubjects((current) => (
            current.includes(subject)
                ? current.filter((item) => item !== subject)
                : [...current, subject]
        ));
    };

    const handleClassToggle = (targetClassId: string) => {
        setSelectedClassIds((current) => (
            current.includes(targetClassId)
                ? current.filter((item) => item !== targetClassId)
                : [...current, targetClassId]
        ));
    };

    const handleRoleChange = (role: AssignmentRole) => {
        setAssignmentRole(role);
        setClassId('');
        setSelectedClassIds([]);
        setSubjectName('');
        setSelectedSubjects([]);
    };

    const hasDuplicateAssignment = (targetClassId: string, role: AssignmentRole, subject?: string | null) => {
        const normalizedSubject = normalizeSubjectName(subject);
        return assignments.some((assignment) => {
            if (assignment.deleted_at) return false;
            if (assignment.teacher_user_id !== teacherUserId) return false;
            if (assignment.class_id !== targetClassId) return false;
            if (assignment.semester_id !== semesterId) return false;
            if (assignment.assignment_role !== role) return false;
            if (role === 'homeroom') return true;
            return normalizeSubjectName(assignment.subject_name) === normalizedSubject;
        });
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const targetClassIds = assignmentRole === 'subject_teacher'
            ? Array.from(new Set([classId, ...selectedClassIds].filter(Boolean)))
            : classId ? [classId] : [];

        if (!teacherUserId || targetClassIds.length === 0 || !semesterId) {
            toast.warning('Guru, kelas, dan semester wajib dipilih.');
            return;
        }

        const trimmedSubject = subjectName.trim();
        const subjectNames = Array.from(new Map(
            [...selectedSubjects, trimmedSubject]
                .map((subject) => subject.trim())
                .filter(Boolean)
                .map((subject) => [normalizeSubjectName(subject), subject])
        ).values());

        if (assignmentRole === 'subject_teacher' && subjectNames.length === 0) {
            toast.warning('Pilih atau isi minimal satu mata pelajaran untuk guru mapel.');
            return;
        }

        const payloads = assignmentRole === 'homeroom'
            ? [{
                teacher_user_id: teacherUserId,
                class_id: targetClassIds[0],
                semester_id: semesterId,
                assignment_role: assignmentRole,
                subject_name: null,
                notes: notes.trim() || null,
                created_by: currentUserId || null,
            }]
            : targetClassIds.flatMap((targetClassId) => subjectNames.map((subject) => ({
                    teacher_user_id: teacherUserId,
                    class_id: targetClassId,
                    semester_id: semesterId,
                    assignment_role: assignmentRole,
                    subject_name: subject,
                    notes: notes.trim() || null,
                    created_by: currentUserId || null,
                })));

        const newPayloads = payloads.filter((payload) => !hasDuplicateAssignment(
            payload.class_id,
            payload.assignment_role as AssignmentRole,
            payload.subject_name,
        ));

        if (newPayloads.length === 0) {
            toast.warning('Penugasan tersebut sudah ada untuk guru, kelas, dan semester yang dipilih.');
            return;
        }

        setIsSubmitting(true);
        try {
            const { data, error } = await supabase
                .from('teacher_class_assignments')
                .insert(newPayloads)
                .select('id, teacher_user_id, class_id, semester_id, assignment_role, subject_name, notes, created_by, created_at, updated_at, deleted_at')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const insertedRows = (data || []) as TeacherClassAssignmentRow[];
            setAssignments((current) => [...insertedRows, ...current]);
            await Promise.all(insertedRows.map((row) => onLogAction?.('teacher_class_assignments', 'INSERT', row.id, null, row)));
            toast.success(`${insertedRows.length} penugasan guru berhasil ditambahkan.`);
            resetForm();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Gagal menyimpan penugasan guru.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (assignment: TeacherClassAssignmentRow) => {
        if (!confirm('Nonaktifkan penugasan ini?')) return;

        setIsDeletingId(assignment.id);
        try {
            const deletedAt = new Date().toISOString();
            const { error } = await supabase
                .from('teacher_class_assignments')
                .update({ deleted_at: deletedAt })
                .eq('id', assignment.id);
            if (error) throw error;

            setAssignments((current) => current.filter((item) => item.id !== assignment.id));
            await onLogAction?.(
                'teacher_class_assignments',
                'SOFT_DELETE',
                assignment.id,
                assignment,
                { ...assignment, deleted_at: deletedAt },
            );
            toast.success('Penugasan berhasil dinonaktifkan.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Gagal menghapus penugasan.');
        } finally {
            setIsDeletingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Penugasan</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.totalAssignments}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Wali Kelas</p>
                    <p className="mt-2 text-3xl font-bold text-emerald-600">{stats.homeroomCount}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Guru Mapel</p>
                    <p className="mt-2 text-3xl font-bold text-indigo-600">{stats.subjectTeacherCount}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Belum Ditugaskan</p>
                    <p className="mt-2 text-3xl font-bold text-amber-600">{stats.unassignedTeacherCount}</p>
                </div>
            </div>

            {unassignedTeachers.length > 0 ? (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 p-5 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 text-xs font-bold uppercase tracking-wider">
                                <UserPlus className="w-4 h-4" />
                                Perlu ditindaklanjuti
                            </div>
                            <h3 className="mt-3 text-lg font-bold text-gray-900 dark:text-white">Guru baru belum punya akses kelas</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                Pilih guru di bawah ini untuk langsung mengisi form penugasan. Setelah disimpan, guru bisa melihat kelas/siswa sesuai perannya.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 lg:justify-end">
                            {unassignedTeachers.slice(0, 6).map((teacher) => (
                                <button
                                    key={teacher.user_id}
                                    type="button"
                                    onClick={() => handleQuickAssignTeacher(teacher)}
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 hover:bg-white dark:bg-gray-900/60 dark:hover:bg-gray-900 border border-amber-200 dark:border-amber-900/50 text-sm font-medium text-gray-800 dark:text-gray-100 shadow-sm"
                                >
                                    <UserPlus className="w-4 h-4 text-amber-500" />
                                    {teacher.full_name || teacher.email || 'Guru baru'}
                                </button>
                            ))}
                            {unassignedTeachers.length > 6 ? (
                                <span className="inline-flex items-center px-3 py-2 rounded-xl text-sm text-amber-700 dark:text-amber-300">
                                    +{unassignedTeachers.length - 6} guru lain
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="grid grid-cols-1 xl:grid-cols-[360px,1fr] gap-6">
                <div ref={formPanelRef} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 scroll-mt-6">
                    <div className="flex items-center gap-2 mb-5">
                        <Plus className="w-5 h-5 text-indigo-500" />
                        <h3 className="text-lg font-bold">Tambah Penugasan</h3>
                    </div>

                    <form className="space-y-4" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Guru</label>
                            <select
                                value={teacherUserId}
                                onChange={(event) => setTeacherUserId(event.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm"
                            >
                                <option value="">Pilih guru</option>
                                {teachers.map((teacher) => (
                                    <option key={teacher.user_id} value={teacher.user_id}>
                                        {teacher.full_name || teacher.email || teacher.user_id}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1.5">Semester</label>
                            <select
                                value={semesterId}
                                onChange={(event) => setSemesterId(event.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm"
                            >
                                <option value="">Pilih semester</option>
                                {semesters.map((semester) => (
                                    <option key={semester.id} value={semester.id}>
                                        {getSemesterLabel(semester)}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1.5">Peran</label>
                            <select
                                value={assignmentRole}
                                onChange={(event) => handleRoleChange(event.target.value as AssignmentRole)}
                                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm"
                            >
                                <option value="homeroom">Wali Kelas</option>
                                <option value="subject_teacher">Guru Mapel</option>
                            </select>
                        </div>

                        {assignmentRole === 'homeroom' ? (
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Kelas</label>
                                <select
                                    value={classId}
                                    onChange={(event) => setClassId(event.target.value)}
                                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm"
                                >
                                    <option value="">Pilih kelas</option>
                                    {classes.map((classItem) => (
                                        <option key={classItem.id} value={classItem.id}>{classItem.name}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Kelas yang Diampu</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {classes.map((classItem) => {
                                        const isSelected = selectedClassIds.includes(classItem.id);
                                        return (
                                            <button
                                                key={classItem.id}
                                                type="button"
                                                onClick={() => handleClassToggle(classItem.id)}
                                                className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${isSelected
                                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                                    : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-emerald-300'
                                                    }`}
                                            >
                                                {classItem.name}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Pilih beberapa kelas jika guru mengampu mapel yang sama di kelas berbeda.</p>
                            </div>
                        )}

                        {assignmentRole === 'subject_teacher' ? (
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Mata Pelajaran</label>
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    {DEFAULT_SUBJECT_OPTIONS.map((subject) => {
                                        const isSelected = selectedSubjects.includes(subject);
                                        return (
                                            <button
                                                key={subject}
                                                type="button"
                                                onClick={() => handleSubjectToggle(subject)}
                                                className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${isSelected
                                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                                    : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-indigo-300'
                                                }`}
                                            >
                                                {subject}
                                            </button>
                                        );
                                    })}
                                </div>
                                <input
                                    list="teacher-assignment-subjects"
                                    value={subjectName}
                                    onChange={(event) => setSubjectName(event.target.value)}
                                    placeholder="Mapel lain, opsional"
                                    className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm"
                                />
                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Bisa pilih beberapa mapel sekaligus, lalu simpan satu kali.</p>
                                <datalist id="teacher-assignment-subjects">
                                    {DEFAULT_SUBJECT_OPTIONS.map((subject) => (
                                        <option key={subject} value={subject} />
                                    ))}
                                </datalist>
                            </div>
                        ) : null}

                        <div>
                            <label className="block text-sm font-medium mb-1.5">Catatan</label>
                            <textarea
                                value={notes}
                                onChange={(event) => setNotes(event.target.value)}
                                rows={3}
                                placeholder="Opsional: keterangan tambahan penugasan"
                                className="w-full px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm resize-none"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-lg shadow-indigo-500/20 disabled:opacity-60"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            Simpan Penugasan
                        </button>
                    </form>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Users className="w-5 h-5 text-indigo-500" />
                                Penugasan Aktif
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Wali kelas dapat melihat semua nilai kelasnya. Guru mapel hanya menginput mapel yang ditugaskan.</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                            <select
                                value={filterClassId}
                                onChange={(event) => setFilterClassId(event.target.value)}
                                className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm"
                            >
                                <option value="">Semua kelas</option>
                                {classes.map((classItem) => (
                                    <option key={classItem.id} value={classItem.id}>{classItem.name}</option>
                                ))}
                            </select>
                            <select
                                value={filterSemesterId}
                                onChange={(event) => setFilterSemesterId(event.target.value)}
                                className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm"
                            >
                                <option value="">Semua semester</option>
                                {semesters.map((semester) => (
                                    <option key={semester.id} value={semester.id}>{getSemesterLabel(semester)}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="px-6 py-16 flex justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        </div>
                    ) : filteredAssignments.length === 0 ? (
                        <div className="px-6 py-16 text-center">
                            <UserCheck className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                            <h4 className="font-semibold text-gray-900 dark:text-white">Belum ada penugasan sesuai filter</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tambahkan wali kelas atau guru mapel untuk mulai berbagi akses data.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredAssignments.map((assignment) => {
                                const teacher = teacherMap.get(assignment.teacher_user_id);
                                const classItem = classMap.get(assignment.class_id);
                                const semester = semesterMap.get(assignment.semester_id);
                                const roleLabel = getRoleLabel(assignment.assignment_role as AssignmentRole);

                                return (
                                    <div key={assignment.id} className="px-6 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                                        <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${assignment.assignment_role === 'homeroom'
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                                                    : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400'
                                                    }`}>
                                                    {assignment.assignment_role === 'homeroom' ? <UserCheck className="w-3.5 h-3.5" /> : <BookOpen className="w-3.5 h-3.5" />}
                                                    {roleLabel}
                                                </span>
                                                <span className="text-sm font-semibold text-gray-900 dark:text-white">{classItem?.name || 'Kelas tidak ditemukan'}</span>
                                                {assignment.subject_name ? (
                                                    <span className="text-sm text-indigo-600 dark:text-indigo-400">• {assignment.subject_name}</span>
                                                ) : null}
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                                {teacher?.full_name || teacher?.email || assignment.teacher_user_id}
                                            </p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{getSemesterLabel(semester)}</p>
                                            {assignment.notes ? (
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{assignment.notes}</p>
                                            ) : null}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleDelete(assignment)}
                                            disabled={isDeletingId === assignment.id}
                                            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:hover:bg-red-900/20 disabled:opacity-60"
                                        >
                                            {isDeletingId === assignment.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            Nonaktifkan
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
