import { supabase } from './supabase';
import { getExcelJS } from '../utils/dynamicImports';
import { formatExportDate } from '../utils/exportUtils';
import { logger } from './logger';
import {
    buildAutoClassPromotionMap,
    extractGradeInfo,
    RETAINED_TARGET,
    type PromotionClassItem,
    type DeliberationStudentItem,
    type AutoClassPromotionMapResult,
} from '../utils/gradePromotionEngine';

export interface PromotionStudentRow {
    id: string;
    name: string;
    nis?: string | null;
    nisn?: string | null;
    gender: string;
    class_id: string;
    user_id: string;
    status?: string;
}

export interface PromotionDraftState {
    /** Map of grade 3 studentId -> target grade 4 classId (or 'RETAINED') */
    grade3Allocations: Record<string, string>;
    /** Map of regular grade studentId -> 'RETAINED' or custom target classId */
    regularOverrides: Record<string, string>;
    /** Set of grade 6 studentIds excluded from graduation (retained in grade 6) */
    excludedGraduationStudentIds: string[];
    /** Class-level target overrides: fromClassId -> toClassId */
    classTargetOverrides: Record<string, string>;
    /** Copy teacher_class_assignments to new semester (Decision Q1, default true) */
    copyTeacherAssignments: boolean;
    updatedAt?: string;
}

export interface PromotionBatchRecord {
    id: string;
    from_academic_year_id: string | null;
    to_academic_year_id: string | null;
    from_semester_id: string | null;
    to_semester_id: string | null;
    draft_allocations: PromotionDraftState;
    execution_summary: {
        batch_id?: string;
        graduated_count?: number;
        promoted_count?: number;
        rolled_count?: number;
        retained_count?: number;
        copied_assignments_count?: number;
        executed_at?: string;
    };
    copy_teacher_assignments: boolean;
    status: 'draft' | 'applied' | 'rolled_back';
    updated_at: string;
    executed_at: string | null;
}

export interface GradePromotionWorkspaceData {
    classes: PromotionClassItem[];
    students: PromotionStudentRow[];
    autoMap: AutoClassPromotionMapResult;
    grade3DeliberationStudents: DeliberationStudentItem[];
    activeDraft: PromotionDraftState;
    appliedBatch: PromotionBatchRecord | null;
}

export interface PlannedStudentMove {
    student_id: string;
    student_name: string;
    gender: string;
    from_class_id: string;
    from_class_name: string;
    from_grade: number | null;
    to_class_id: string | null;
    to_class_name: string;
    action_type: 'promoted' | 'rolled' | 'retained' | 'graduated';
}

const LOCAL_DRAFT_STORAGE_KEY = 'portal_guru_grade_promotion_draft_v1';

export const DEFAULT_PROMOTION_DRAFT: PromotionDraftState = {
    grade3Allocations: {},
    regularOverrides: {},
    excludedGraduationStudentIds: [],
    classTargetOverrides: {},
    copyTeacherAssignments: true,
};

function loadLocalDraft(): PromotionDraftState | null {
    try {
        const raw = localStorage.getItem(LOCAL_DRAFT_STORAGE_KEY);
        if (!raw) return null;
        return { ...DEFAULT_PROMOTION_DRAFT, ...JSON.parse(raw) };
    } catch {
        return null;
    }
}

export function saveLocalDraft(draft: PromotionDraftState): void {
    try {
        localStorage.setItem(
            LOCAL_DRAFT_STORAGE_KEY,
            JSON.stringify({ ...draft, updatedAt: new Date().toISOString() })
        );
    } catch (err) {
        logger.warn('Failed to save promotion draft to localStorage', 'GradePromotionService', err);
    }
}

export function clearLocalDraft(): void {
    try {
        localStorage.removeItem(LOCAL_DRAFT_STORAGE_KEY);
    } catch {
        // ignore
    }
}

/**
 * Loads all classes, active students, Grade 3 deliberation metrics (avg score & violation points),
 * and any saved draft or applied promotion batch.
 */
export async function fetchGradePromotionWorkspace(
    semesterId?: string | null,
    toAcademicYearId?: string | null
): Promise<GradePromotionWorkspaceData> {
    const [classesRes, studentsRes] = await Promise.all([
        supabase
            .from('classes')
            .select('id, name, grade_level, wali_kelas_id, user_id')
            .is('deleted_at', null)
            .eq('is_archived', false)
            .order('name'),
        supabase
            .from('students')
            .select('id, name, nis, nisn, gender, class_id, user_id')
            .is('deleted_at', null)
            .not('class_id', 'is', null)
            .order('name'),
    ]);

    if (classesRes.error) throw new Error(classesRes.error.message);
    if (studentsRes.error) throw new Error(studentsRes.error.message);

    const classes = (classesRes.data || []) as PromotionClassItem[];
    const students = (studentsRes.data || []).filter(s => Boolean(s.class_id)) as PromotionStudentRow[];

    const autoMap = buildAutoClassPromotionMap(classes);
    const classById = new Map(classes.map(c => [c.id, c]));

    const grade3ClassIds = new Set(autoMap.grade3SourceClasses.map(c => c.id));
    const grade3RawStudents = students.filter(s => grade3ClassIds.has(s.class_id));
    const grade3StudentIds = grade3RawStudents.map(s => s.id);

    const scoreMap = new Map<string, { sum: number; count: number }>();
    const violationMap = new Map<string, number>();

    if (grade3StudentIds.length > 0) {
        let academicQuery = supabase
            .from('academic_records')
            .select('student_id, score')
            .in('student_id', grade3StudentIds)
            .is('deleted_at', null);

        let violationQuery = supabase
            .from('violations')
            .select('student_id, points')
            .in('student_id', grade3StudentIds)
            .is('deleted_at', null);

        if (semesterId) {
            academicQuery = academicQuery.eq('semester_id', semesterId);
            violationQuery = violationQuery.eq('semester_id', semesterId);
        }

        const [academicRes, violationRes] = await Promise.all([academicQuery, violationQuery]);

        (academicRes.data || []).forEach(row => {
            if (typeof row.score === 'number') {
                const current = scoreMap.get(row.student_id) || { sum: 0, count: 0 };
                current.sum += row.score;
                current.count += 1;
                scoreMap.set(row.student_id, current);
            }
        });

        (violationRes.data || []).forEach(row => {
            if (typeof row.points === 'number') {
                violationMap.set(row.student_id, (violationMap.get(row.student_id) || 0) + row.points);
            }
        });
    }

    const grade3DeliberationStudents: DeliberationStudentItem[] = grade3RawStudents.map(student => {
        const scoreEntry = scoreMap.get(student.id);
        const avgScore =
            scoreEntry && scoreEntry.count > 0
                ? Math.round((scoreEntry.sum / scoreEntry.count) * 10) / 10
                : null;
        const fromClass = classById.get(student.class_id);

        return {
            id: student.id,
            name: student.name,
            nis: student.nis,
            gender: student.gender || 'Laki-laki',
            fromClassId: student.class_id,
            fromClassName: fromClass?.name || '-',
            avgScore,
            violationPoints: violationMap.get(student.id) || 0,
        };
    });

    // Try loading draft or applied batch from database (gracefully falls back if table not yet migrated)
    let activeDraft: PromotionDraftState = loadLocalDraft() || { ...DEFAULT_PROMOTION_DRAFT };
    let appliedBatch: PromotionBatchRecord | null = null;

    try {
        let batchQuery = (supabase.from as any)('grade_promotion_batches')
            .select('*')
            .in('status', ['draft', 'applied'])
            .order('updated_at', { ascending: false })
            .limit(5);

        if (toAcademicYearId) {
            batchQuery = batchQuery.eq('to_academic_year_id', toAcademicYearId);
        }

        const { data: batchRows, error: batchError } = await batchQuery;
        if (!batchError && Array.isArray(batchRows)) {
            const applied = batchRows.find((b: any) => b.status === 'applied');
            if (applied) {
                appliedBatch = applied as PromotionBatchRecord;
            }
            const dbDraft = batchRows.find((b: any) => b.status === 'draft');
            if (dbDraft && dbDraft.draft_allocations) {
                activeDraft = {
                    ...DEFAULT_PROMOTION_DRAFT,
                    ...dbDraft.draft_allocations,
                    copyTeacherAssignments: dbDraft.copy_teacher_assignments ?? true,
                    updatedAt: dbDraft.updated_at,
                };
            }
        }
    } catch {
        // Fallback to local draft silently
    }

    return {
        classes,
        students,
        autoMap,
        grade3DeliberationStudents,
        activeDraft,
        appliedBatch,
    };
}

/**
 * Saves collaborative deliberation draft to both localStorage and Supabase RPC.
 */
export async function saveDeliberationDraft(params: {
    fromAcademicYearId?: string | null;
    toAcademicYearId?: string | null;
    fromSemesterId?: string | null;
    toSemesterId?: string | null;
    draft: PromotionDraftState;
}): Promise<void> {
    saveLocalDraft(params.draft);

    try {
        const { error } = await (supabase.rpc as any)('save_grade_promotion_draft', {
            p_from_academic_year_id: params.fromAcademicYearId || null,
            p_to_academic_year_id: params.toAcademicYearId || null,
            p_from_semester_id: params.fromSemesterId || null,
            p_to_semester_id: params.toSemesterId || null,
            p_draft_allocations: params.draft,
            p_copy_teacher_assignments: params.draft.copyTeacherAssignments,
        });

        if (error) {
            logger.warn('Database draft save warning (saved locally)', 'GradePromotionService', error);
        }
    } catch (err) {
        logger.warn('Fallback to local draft storage', 'GradePromotionService', err);
    }
}

/**
 * Compiles the full Top-Down Cascade plan (Grade 6 down to Grade 1) from current state and draft.
 */
export function buildPlannedStudentMoves(
    classes: PromotionClassItem[],
    students: PromotionStudentRow[],
    autoMap: AutoClassPromotionMapResult,
    draft: PromotionDraftState
): PlannedStudentMove[] {
    const classById = new Map(classes.map(c => [c.id, c]));
    const excludedGradSet = new Set(draft.excludedGraduationStudentIds || []);
    const moves: PlannedStudentMove[] = [];

    for (const student of students) {
        const fromClass = classById.get(student.class_id);
        if (!fromClass) continue;

        const rule = autoMap.classMapping[student.class_id];
        const grade = rule?.grade ?? extractGradeInfo(fromClass.name, fromClass.grade_level).grade;

        // 1. Grade 6 -> Graduation (unless excluded/retained)
        if (grade === 6) {
            if (excludedGradSet.has(student.id)) {
                moves.push({
                    student_id: student.id,
                    student_name: student.name,
                    gender: student.gender,
                    from_class_id: fromClass.id,
                    from_class_name: fromClass.name,
                    from_grade: 6,
                    to_class_id: fromClass.id,
                    to_class_name: fromClass.name,
                    action_type: 'retained',
                });
            } else {
                moves.push({
                    student_id: student.id,
                    student_name: student.name,
                    gender: student.gender,
                    from_class_id: fromClass.id,
                    from_class_name: fromClass.name,
                    from_grade: 6,
                    to_class_id: null,
                    to_class_name: 'Lulus / Alumni',
                    action_type: 'graduated',
                });
            }
            continue;
        }

        // 2. Grade 3 -> Rolling Deliberation into Grade 4
        if (grade === 3) {
            const targetId = draft.grade3Allocations[student.id];
            if (!targetId) continue;

            if (targetId === RETAINED_TARGET) {
                moves.push({
                    student_id: student.id,
                    student_name: student.name,
                    gender: student.gender,
                    from_class_id: fromClass.id,
                    from_class_name: fromClass.name,
                    from_grade: 3,
                    to_class_id: fromClass.id,
                    to_class_name: fromClass.name,
                    action_type: 'retained',
                });
            } else {
                const targetClass = classById.get(targetId);
                if (targetClass) {
                    moves.push({
                        student_id: student.id,
                        student_name: student.name,
                        gender: student.gender,
                        from_class_id: fromClass.id,
                        from_class_name: fromClass.name,
                        from_grade: 3,
                        to_class_id: targetClass.id,
                        to_class_name: targetClass.name,
                        action_type: 'rolled',
                    });
                }
            }
            continue;
        }

        // 3. Regular Grades (1, 2, 4, 5)
        if (grade === 1 || grade === 2 || grade === 4 || grade === 5) {
            const studentOverride = draft.regularOverrides[student.id];
            if (studentOverride === RETAINED_TARGET) {
                moves.push({
                    student_id: student.id,
                    student_name: student.name,
                    gender: student.gender,
                    from_class_id: fromClass.id,
                    from_class_name: fromClass.name,
                    from_grade: grade,
                    to_class_id: fromClass.id,
                    to_class_name: fromClass.name,
                    action_type: 'retained',
                });
                continue;
            }

            const effectiveTargetClassId =
                studentOverride ||
                draft.classTargetOverrides[fromClass.id] ||
                rule?.toClassId ||
                null;

            if (effectiveTargetClassId) {
                const targetClass = classById.get(effectiveTargetClassId);
                if (targetClass) {
                    moves.push({
                        student_id: student.id,
                        student_name: student.name,
                        gender: student.gender,
                        from_class_id: fromClass.id,
                        from_class_name: fromClass.name,
                        from_grade: grade,
                        to_class_id: targetClass.id,
                        to_class_name: targetClass.name,
                        action_type: 'promoted',
                    });
                }
            }
        }
    }

    // Sort strictly Top-Down (Grade 6 -> 5 -> 4 -> 3 -> 2 -> 1)
    moves.sort((a, b) => (b.from_grade ?? 0) - (a.from_grade ?? 0));
    return moves;
}

/**
 * Executes the atomic grade promotion via PostgreSQL RPC.
 */
export async function executeGradePromotion(params: {
    fromAcademicYearId?: string | null;
    toAcademicYearId?: string | null;
    fromSemesterId?: string | null;
    toSemesterId?: string | null;
    graduationYear: string;
    moves: PlannedStudentMove[];
    copyTeacherAssignments: boolean;
}): Promise<{
    batch_id?: string;
    graduated_count: number;
    promoted_count: number;
    rolled_count: number;
    retained_count: number;
    copied_assignments_count: number;
}> {
    const { data, error } = await (supabase.rpc as any)('execute_grade_promotion', {
        p_from_academic_year_id: params.fromAcademicYearId || null,
        p_to_academic_year_id: params.toAcademicYearId || null,
        p_from_semester_id: params.fromSemesterId || null,
        p_to_semester_id: params.toSemesterId || null,
        p_graduation_year: params.graduationYear,
        p_moves: params.moves,
        p_copy_teacher_assignments: params.copyTeacherAssignments,
    });

    if (error) {
        throw new Error(error.message || 'Gagal mengeksekusi kenaikan kelas.');
    }

    clearLocalDraft();
    return data;
}

/**
 * Rolls back a previously applied grade promotion batch (Admin 1-Click Undo).
 */
export async function rollbackGradePromotion(batchId: string): Promise<{
    batch_id: string;
    restored_count: number;
}> {
    const { data, error } = await (supabase.rpc as any)('rollback_grade_promotion', {
        p_batch_id: batchId,
    });

    if (error) {
        throw new Error(error.message || 'Gagal membatalkan kenaikan kelas.');
    }

    return data;
}

/**
 * Fetches historical class name for a student in a specific academic year (for accurate past Report Cards).
 */
export async function resolveHistoricalClassName(
    studentId: string,
    academicYearId?: string | null,
    fallbackClassName?: string | null
): Promise<string> {
    if (!academicYearId) return fallbackClassName || '-';

    try {
        const { data, error } = await (supabase.from as any)('student_class_histories')
            .select('from_class_name')
            .eq('student_id', studentId)
            .eq('academic_year_id', academicYearId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (!error && data?.from_class_name) {
            return data.from_class_name;
        }
    } catch {
        // Fallback silently if table not queried
    }

    return fallbackClassName || '-';
}

/**
 * Exports the new class allocation / SK Pembagian Kelas to an official school-standard Excel file.
 */
export async function exportClassPromotionToExcel(params: {
    academicYearName: string;
    moves: PlannedStudentMove[];
    grade3Students: DeliberationStudentItem[];
    grade3Allocations: Record<string, string>;
    grade4Classes: PromotionClassItem[];
}): Promise<void> {
    const ExcelJS = await getExcelJS();
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Portal Guru';
    wb.created = new Date();

    const borderThin = {
        top: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
    };

    // Sheet 1: Hasil Musyawarah Rolling Kelas 3 -> 4
    const wsRolling = wb.addWorksheet('Hasil Rolling Kelas 4', {
        views: [{ state: 'frozen', ySplit: 6 }],
    });

    wsRolling.mergeCells('A2:F2');
    const titleCell = wsRolling.getCell('A2');
    titleCell.value = `DAFTAR PEMBAGIAN ROMBEL KELAS 4 (HASIL MUSYAWARAH)`;
    titleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF0F172A' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    wsRolling.mergeCells('A3:F3');
    const subCell = wsRolling.getCell('A3');
    subCell.value = `Tahun Ajaran: ${params.academicYearName || '-'} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`;
    subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };

    const headerRow = wsRolling.getRow(6);
    headerRow.values = ['No', 'Nama Siswa', 'L/P', 'Kelas Asal (Kelas 3)', 'Rata-rata Nilai', 'Kelas Tujuan (Kelas 4)'];
    headerRow.height = 22;
    headerRow.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } };
        cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = borderThin;
    });

    const classById = new Map(params.grade4Classes.map(c => [c.id, c.name]));
    const sortedGrade3 = [...params.grade3Students].sort((a, b) => {
        const targetA = classById.get(params.grade3Allocations[a.id] || '') || 'ZZZ';
        const targetB = classById.get(params.grade3Allocations[b.id] || '') || 'ZZZ';
        if (targetA !== targetB) return targetA.localeCompare(targetB, 'id');
        return a.name.localeCompare(b.name, 'id');
    });

    sortedGrade3.forEach((student, idx) => {
        const row = wsRolling.getRow(7 + idx);
        const rawTarget = params.grade3Allocations[student.id];
        const targetName =
            rawTarget === RETAINED_TARGET
                ? `Tinggal di ${student.fromClassName}`
                : classById.get(rawTarget || '') || 'Belum Ditempatkan';

        row.values = [
            idx + 1,
            student.name,
            student.gender === 'Laki-laki' ? 'L' : 'P',
            student.fromClassName,
            student.avgScore ?? '-',
            targetName,
        ];

        const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.font = { name: 'Calibri', size: 10.5, bold: colNumber === 6 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            cell.border = borderThin;
            cell.alignment = {
                horizontal: colNumber === 2 ? 'left' : 'center',
                vertical: 'middle',
            };
        });
    });

    wsRolling.columns = [
        { width: 6 },
        { width: 32 },
        { width: 8 },
        { width: 20 },
        { width: 16 },
        { width: 24 },
    ];

    // Sheet 2: Rekap Seluruh Pergerakan Siswa (Kelas 1 s/d 6)
    const wsAll = wb.addWorksheet('Rekap Kenaikan Seluruh Kelas', {
        views: [{ state: 'frozen', ySplit: 5 }],
    });

    wsAll.mergeCells('A2:F2');
    const allTitle = wsAll.getCell('A2');
    allTitle.value = `REKAPITULASI KENAIKAN KELAS & KELULUSAN SISWA (${params.academicYearName || '-'})`;
    allTitle.font = { name: 'Calibri', size: 13, bold: true };
    allTitle.alignment = { horizontal: 'center', vertical: 'middle' };

    const allHeader = wsAll.getRow(5);
    allHeader.values = ['No', 'Nama Siswa', 'L/P', 'Kelas Lama', 'Kelas Baru / Status', 'Keterangan'];
    allHeader.height = 22;
    allHeader.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
        cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = borderThin;
    });

    const actionLabelMap: Record<PlannedStudentMove['action_type'], string> = {
        promoted: 'Naik Kelas Reguler',
        rolled: 'Rolling Musyawarah Kelas 4',
        retained: 'Tinggal Kelas',
        graduated: 'Lulus / Alumni',
    };

    const sortedMoves = [...params.moves].sort((a, b) => {
        if (a.to_class_name !== b.to_class_name) {
            return a.to_class_name.localeCompare(b.to_class_name, 'id');
        }
        return a.student_name.localeCompare(b.student_name, 'id');
    });

    sortedMoves.forEach((move, idx) => {
        const row = wsAll.getRow(6 + idx);
        row.values = [
            idx + 1,
            move.student_name,
            move.gender === 'Laki-laki' ? 'L' : 'P',
            move.from_class_name,
            move.to_class_name,
            actionLabelMap[move.action_type],
        ];
        const bg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC';
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            cell.font = { name: 'Calibri', size: 10 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
            cell.border = borderThin;
            cell.alignment = {
                horizontal: colNumber === 2 ? 'left' : 'center',
                vertical: 'middle',
            };
        });
    });

    wsAll.columns = [
        { width: 6 },
        { width: 32 },
        { width: 8 },
        { width: 18 },
        { width: 22 },
        { width: 26 },
    ];

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Pembagian_Kelas_Baru_${formatExportDate()}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
