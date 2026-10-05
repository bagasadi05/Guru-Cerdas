/**
 * @fileoverview Data persistence and offline resilience service for Perangkat Ajar
 * (Kalender Pendidikan, Program Tahunan, dan Program Semester).
 *
 * Implements Milestone M5 requirements:
 * - Supabase PostgreSQL cloud sync with user-scoped Row Level Security
 * - Offline-first caching via localStorage for zero-latency UI interactions
 * - Automatic fallback to Indonesian national presets (Permendikbudristek 12/2024)
 * - CRUD adapters for Kaldik, Prota (headers + items), and Promes (headers + allocations)
 *
 * @module services/perangkatAjarService
 */

import { supabase } from './supabase';
import { generateKaldikFromCalendar } from '../utils/kaldikCalendarGenerator';
import type {
  KaldikWeek,
  ProtaHeader,
  ProtaItem,
  PromesHeader,
  MatrixCell,
  WeekType,
  CurriculumType,
  PhaseType,
  DocumentIdentity,
} from '../types/perangkatAjar';
import type { TeachingScheduleEntry } from '../utils/protaSchedulePlanner';

const LOCAL_STORAGE_PREFIX = 'guru_cerdas_perangkat_ajar';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Cloud writes for the same document run one after another. Each save diffs against
// the rows in the database, so two overlapping saves could otherwise delete rows the
// other one just wrote.
const cloudWriteQueues = new Map<string, Promise<unknown>>();

function enqueueCloudWrite<T>(key: string, write: () => Promise<T>): Promise<T> {
  const previous = cloudWriteQueues.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(write);
  cloudWriteQueues.set(key, next);
  const cleanup = () => {
    if (cloudWriteQueues.get(key) === next) cloudWriteQueues.delete(key);
  };
  next.then(cleanup, cleanup);
  return next;
}

// =============================================================================
// 1. KALDIK PERSISTENCE
// =============================================================================

export async function saveKaldikWeeks(
  academicYear: string,
  weeks: KaldikWeek[]
): Promise<void> {
  const localKey = `${LOCAL_STORAGE_PREFIX}_kaldik_${academicYear}`;
  try {
    localStorage.setItem(localKey, JSON.stringify(weeks));
  } catch (err) {
    console.warn('[PerangkatAjarService] Failed to cache Kaldik locally:', err);
  }

  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    // Upsert into kaldik_entries
    const records = weeks.map((w) => ({
      user_id: userId,
      academic_year: academicYear,
      month: w.month,
      week_number: w.weekNumber,
      week_type: w.type,
      notes: w.label || null,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('kaldik_entries')
      .upsert(records, { onConflict: 'user_id,academic_year,month,week_number' });

    if (error) {
      console.warn('[PerangkatAjarService] Cloud sync kaldik_entries error:', error.message);
    }
  } catch (cloudErr) {
    console.warn('[PerangkatAjarService] Cloud kaldik save skipped (offline):', cloudErr);
  }
}

export async function loadKaldikWeeks(academicYear: string = '2024/2025'): Promise<KaldikWeek[]> {
  const localKey = `${LOCAL_STORAGE_PREFIX}_kaldik_${academicYear}`;

  // 1. Try cloud if authenticated
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (userId) {
      const { data, error } = await supabase
        .from('kaldik_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('academic_year', academicYear);

      if (!error && data && data.length > 0) {
        const weeks: KaldikWeek[] = (data as Array<Record<string, unknown>>).map((d) => ({
          id: String(d.id),
          month: Number(d.month),
          weekNumber: Number(d.week_number),
          type: d.week_type as WeekType,
          label: (d.notes as string) || undefined,
          academicYear: String(d.academic_year),
        }));
        try {
          localStorage.setItem(localKey, JSON.stringify(weeks));
        } catch (_err) {
          void _err;
        }
        return weeks;
      }
    }
  } catch {
    // Ignore and fallback to local
  }

  // 2. Try localStorage
  try {
    const cached = localStorage.getItem(localKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (_err) {
    void _err;
  }

  // 3. The school Kaldik an admin published, when there is one
  const school = await loadSchoolKaldik(academicYear);
  if (school) return school.weeks;

  // 4. Fallback: calendar built from this year's real dates and national holidays
  const defaultPreset = generateKaldikFromCalendar(academicYear).weeks;
  try {
    localStorage.setItem(localKey, JSON.stringify(defaultPreset));
  } catch (_err) {
    void _err;
  }
  return defaultPreset;
}

// =============================================================================
// 2. PROTA PERSISTENCE
// =============================================================================

export async function saveProta(
  header: ProtaHeader,
  items: ProtaItem[]
): Promise<string> {
  const protaId = header.id || crypto.randomUUID();
  const protaHeader: ProtaHeader = { ...header, id: protaId };

  const localKey = `${LOCAL_STORAGE_PREFIX}_prota_${protaId}`;
  try {
    localStorage.setItem(
      localKey,
      JSON.stringify({ header: protaHeader, items, updatedAt: new Date().toISOString() })
    );
    // Also store active prota ID
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}_active_prota_id`, protaId);
  } catch (err) {
    console.warn('[PerangkatAjarService] Failed to cache Prota locally:', err);
  }

  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId || !UUID_REGEX.test(protaId)) return protaId;

    await enqueueCloudWrite(`prota:${protaId}`, () =>
      syncProtaToCloud(protaHeader, items, userId)
    );
  } catch (err) {
    console.warn('[PerangkatAjarService] Cloud prota save error (offline):', err);
  }

  return protaId;
}

/**
 * Writes a Prota header and its items to Supabase. Items are upserted and only rows
 * that are gone from `items` are deleted: promes_week_allocations cascade on
 * prota_items, so replacing every row would wipe both semesters' Promes.
 */
async function syncProtaToCloud(header: ProtaHeader, items: ProtaItem[], userId: string): Promise<void> {
  const protaId = header.id;
  const { error: headerErr } = await supabase.from('prota_headers').upsert({
    id: protaId,
    user_id: userId,
    academic_year: header.academicYear,
    subject: header.subject,
    grade_level: header.gradeLevel,
    phase: header.phase || null,
    curriculum: header.curriculum || 'MERDEKA',
    weekly_jp_quota: header.weeklyJpQuota || 4,
    reserve_jp_sem1: header.reserveJpSem1 || 0,
    reserve_jp_sem2: header.reserveJpSem2 || 0,
    updated_at: new Date().toISOString(),
  });

  if (headerErr) {
    console.warn('[PerangkatAjarService] Error saving prota header:', headerErr.message);
    return;
  }

  const rows = items.map((it, idx) => ({
    id: it.id && UUID_REGEX.test(it.id) ? it.id : crypto.randomUUID(),
    prota_id: protaId,
    semester_number: it.semesterNumber,
    element_or_domain: it.elementOrDomain || '',
    learning_objective_code: it.learningObjectiveCode || '',
    learning_objective_text: it.learningObjectiveText || '',
    core_topic: it.coreTopic || '',
    target_jp: it.targetJp || 0,
    order_index: it.orderIndex ?? idx,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length > 0) {
    const { error: itemErr } = await supabase.from('prota_items').upsert(rows, { onConflict: 'id' });
    if (itemErr) {
      // Keep the existing rows; deleting now could leave the Prota empty.
      console.warn('[PerangkatAjarService] Error saving prota items:', itemErr.message);
      return;
    }
  }

  let staleQuery = supabase.from('prota_items').delete().eq('prota_id', protaId);
  if (rows.length > 0) {
    staleQuery = staleQuery.not('id', 'in', `(${rows.map((r) => r.id).join(',')})`);
  }
  const { error: staleErr } = await staleQuery;
  if (staleErr) {
    console.warn('[PerangkatAjarService] Error removing deleted prota items:', staleErr.message);
  }
}

export async function loadProta(
  protaId?: string
): Promise<{ header: ProtaHeader | null; items: ProtaItem[] }> {
  let targetId = protaId;
  if (!targetId) {
    targetId = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}_active_prota_id`) || undefined;
  }

  // 1. Try cloud
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;

    if (userId) {
      let query = supabase.from('prota_headers').select('*');
      if (targetId && UUID_REGEX.test(targetId)) {
        query = query.eq('id', targetId);
      } else {
        query = query.eq('user_id', userId).order('updated_at', { ascending: false }).limit(1);
      }

      // Use maybeSingle() instead of single() to prevent 406 Not Acceptable when row does not exist
      const { data: headerData, error: headerErr } = await query.maybeSingle();

      if (!headerErr && headerData) {
        targetId = headerData.id;
        const { data: itemsData } = await supabase
          .from('prota_items')
          .select('*')
          .eq('prota_id', targetId)
          .order('order_index', { ascending: true });

        const header: ProtaHeader = {
          id: headerData.id,
          userId: headerData.user_id,
          academicYear: headerData.academic_year,
          subject: headerData.subject,
          gradeLevel: headerData.grade_level,
          phase: (headerData.phase as PhaseType) || undefined,
          curriculum: (headerData.curriculum as CurriculumType) || 'MERDEKA',
          weeklyJpQuota: headerData.weekly_jp_quota,
          reserveJpSem1: headerData.reserve_jp_sem1,
          reserveJpSem2: headerData.reserve_jp_sem2,
        };

        const items: ProtaItem[] = ((itemsData || []) as Array<Record<string, unknown>>).map((it) => ({
          id: String(it.id),
          semesterNumber: (it.semester_number as 1 | 2) || 1,
          elementOrDomain: String(it.element_or_domain || ''),
          learningObjectiveCode: String(it.learning_objective_code || ''),
          learningObjectiveText: String(it.learning_objective_text || ''),
          coreTopic: String(it.core_topic || ''),
          targetJp: Number(it.target_jp || 0),
          orderIndex: Number(it.order_index || 0),
        }));

        try {
          localStorage.setItem(
            `${LOCAL_STORAGE_PREFIX}_prota_${targetId}`,
            JSON.stringify({ header, items })
          );
          localStorage.setItem(`${LOCAL_STORAGE_PREFIX}_active_prota_id`, targetId);
        } catch (_err) {
          void _err;
        }

        return { header, items };
      }
    }
  } catch {
    // offline fallback
  }

  // 2. Try localStorage
  if (targetId) {
    try {
      const cached = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}_prota_${targetId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.header) {
          // Self-heal: If local cache exists but wasn't in Supabase, push it to cloud in background
          void saveProta(parsed.header, parsed.items || []);
          return { header: parsed.header, items: parsed.items || [] };
        }
      }
    } catch (_err) {
      void _err;
    }
  }

  return { header: null, items: [] };
}

export interface ProtaSummary {
  id: string;
  subject: string;
  gradeLevel: string;
  academicYear: string;
  updatedAt?: string;
}

/**
 * Lists the teacher's Prota documents, newest first. Cloud rows win over local copies;
 * local-only documents (created offline) are still listed.
 */
export async function listProta(): Promise<ProtaSummary[]> {
  const byId = new Map<string, ProtaSummary>();

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(`${LOCAL_STORAGE_PREFIX}_prota_`)) continue;
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      const header = parsed?.header as ProtaHeader | undefined;
      if (!header?.id) continue;
      byId.set(header.id, {
        id: header.id,
        subject: header.subject,
        gradeLevel: header.gradeLevel,
        academicYear: header.academicYear,
        updatedAt: parsed.updatedAt,
      });
    }
  } catch (_err) {
    void _err;
  }

  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (userId) {
      const { data, error } = await supabase
        .from('prota_headers')
        .select('id, subject, grade_level, academic_year, updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      if (!error && data) {
        for (const row of data as Array<Record<string, unknown>>) {
          byId.set(String(row.id), {
            id: String(row.id),
            subject: String(row.subject || ''),
            gradeLevel: String(row.grade_level || ''),
            academicYear: String(row.academic_year || ''),
            updatedAt: (row.updated_at as string) || undefined,
          });
        }
      }
    }
  } catch (_err) {
    void _err;
  }

  return [...byId.values()].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
}

/**
 * The signed-in teacher's weekly timetable with class names and grades, for generating
 * Prota documents per subject and grade. Empty when offline or signed out.
 */
export async function loadTeachingSchedule(): Promise<TeachingScheduleEntry[]> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return [];

  const { data: schedules, error } = await supabase
    .from('schedules')
    .select('subject, class_id, start_time, end_time')
    .eq('user_id', userId)
    .is('deleted_at', null);
  if (error) throw error;
  if (!schedules?.length) return [];

  const classIds = [...new Set(schedules.map((s) => s.class_id))];
  const { data: classes, error: classErr } = await supabase
    .from('classes')
    .select('id, name, grade_level')
    .in('id', classIds);
  if (classErr) throw classErr;

  const classById = new Map((classes ?? []).map((c) => [c.id, c]));
  return schedules.map((s) => {
    const cls = classById.get(s.class_id);
    return {
      subject: s.subject,
      classId: s.class_id,
      className: cls?.name ?? '',
      gradeNumber: cls?.grade_level ?? null,
      startTime: s.start_time,
      endTime: s.end_time,
    };
  });
}

// =============================================================================
// 3. PROMES PERSISTENCE
// =============================================================================

export async function savePromes(
  header: PromesHeader,
  cells: MatrixCell[]
): Promise<void> {
  const localKey = `${LOCAL_STORAGE_PREFIX}_promes_${header.protaId}_${header.semesterNumber}`;
  try {
    localStorage.setItem(localKey, JSON.stringify({ header, cells }));
  } catch (err) {
    console.warn('[PerangkatAjarService] Failed to cache Promes locally:', err);
  }

  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    if (!header.protaId || !UUID_REGEX.test(header.protaId)) {
      console.warn('[PerangkatAjarService] Skipping cloud promes save: protaId is not a valid UUID:', header.protaId);
      return;
    }

    // Same queue as the parent Prota, so allocations are written after its items exist.
    await enqueueCloudWrite(`prota:${header.protaId}`, () =>
      syncPromesToCloud(header, cells, userId)
    );
  } catch (err) {
    console.warn('[PerangkatAjarService] Cloud promes save error (offline):', err);
  }
}

async function syncPromesToCloud(
  header: PromesHeader,
  cells: MatrixCell[],
  userId: string
): Promise<void> {
  // 1. Ensure parent prota_header exists in Supabase to avoid 409 Foreign Key Violation
  const { data: parentProta } = await supabase
    .from('prota_headers')
    .select('id')
    .eq('id', header.protaId)
    .maybeSingle();

  if (!parentProta) {
    // Check if we have cached prota in localStorage to persist it
    const cachedProtaRaw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}_prota_${header.protaId}`);
    let parentSaved = false;
    if (cachedProtaRaw) {
      try {
        const cached = JSON.parse(cachedProtaRaw);
        if (cached?.header) {
          await syncProtaToCloud(
            { ...cached.header, id: header.protaId },
            cached.items || [],
            userId
          );
          parentSaved = true;
        }
      } catch (e) {
        console.warn('[PerangkatAjarService] Failed to auto-sync cached prota:', e);
      }
    }

    if (!parentSaved) {
      // Create baseline prota_header so foreign key is satisfied
      const { error: stubErr } = await supabase.from('prota_headers').upsert({
        id: header.protaId,
        user_id: userId,
        academic_year: '2024/2025',
        subject: 'Bahasa Indonesia',
        grade_level: 'Kelas 4',
        curriculum: 'MERDEKA',
        weekly_jp_quota: header.weeklyJpLimit || 4,
        updated_at: new Date().toISOString(),
      });
      if (stubErr) {
        console.warn('[PerangkatAjarService] Failed to create parent prota stub:', stubErr.message);
        return;
      }
    }
  }

  // 2. Fetch existing promes_header id to reuse existing PK and prevent FK conflicts
  const { data: existingPromes } = await supabase
    .from('promes_headers')
    .select('id')
    .eq('prota_id', header.protaId)
    .eq('semester_number', header.semesterNumber)
    .maybeSingle();

  const promesId = existingPromes?.id || (header.id && UUID_REGEX.test(header.id) ? header.id : crypto.randomUUID());

  const { error: headerErr } = await supabase.from('promes_headers').upsert(
    {
      id: promesId,
      prota_id: header.protaId,
      user_id: userId,
      semester_number: header.semesterNumber,
      weekly_jp_limit: header.weeklyJpLimit || 4,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'prota_id,semester_number' }
  );

  if (headerErr) {
    console.warn('[PerangkatAjarService] Error saving promes header:', headerErr.message);
    return;
  }

  // 3. Upsert the current cells, then remove only the rows that are gone. Deleting first
  // would leave the Promes empty in the cloud if the insert failed.
  // Manual cells are kept even at 0 JP: "no hours this week" is the teacher's choice.
  const keptCells = cells.filter((c) => c.allocatedJp > 0 || c.isManual);
  // is_manual is not in the generated types until the migration is applied.
  type AllocationRow = {
    promes_id: string;
    prota_item_id: string;
    month_index: number;
    week_number: number;
    allocated_jp: number;
    is_manual?: boolean;
  };
  let records: AllocationRow[] = [];
  if (keptCells.length > 0) {
    // Validate that prota_item_ids exist in prota_items to prevent FK constraint error
    const { data: existingItems } = await supabase
      .from('prota_items')
      .select('id')
      .eq('prota_id', header.protaId);

    const validItemIds = new Set((existingItems || []).map((i) => i.id));

    records = keptCells
      .filter((c) => validItemIds.size === 0 || validItemIds.has(c.rowId))
      .map((c) => ({
        promes_id: promesId,
        prota_item_id: c.rowId,
        month_index: c.monthIndex,
        week_number: c.weekNumber,
        allocated_jp: c.allocatedJp,
        is_manual: Boolean(c.isManual),
      }));
  }

  if (records.length > 0) {
    const upsert = (rows: AllocationRow[]) =>
      supabase
        .from('promes_week_allocations')
        .upsert(rows as never, { onConflict: 'promes_id,prota_item_id,month_index,week_number' });
    let { error: allocErr } = await upsert(records);
    if (allocErr && isMissingColumnError(allocErr, 'is_manual')) {
      // Database not migrated yet: save the hours without the manual flag.
      ({ error: allocErr } = await upsert(records.map(({ is_manual: _manual, ...rest }) => rest)));
    }
    if (allocErr) {
      console.warn('[PerangkatAjarService] Error saving promes allocations:', allocErr.message);
      return;
    }
  }

  const keep = new Set(records.map((r) => `${r.prota_item_id}|${r.month_index}|${r.week_number}`));
  const { data: savedRows } = await supabase
    .from('promes_week_allocations')
    .select('id, prota_item_id, month_index, week_number')
    .eq('promes_id', promesId);
  const staleIds = ((savedRows ?? []) as Array<Record<string, unknown>>)
    .filter((row) => !keep.has(`${row.prota_item_id}|${row.month_index}|${row.week_number}`))
    .map((row) => String(row.id));
  if (staleIds.length > 0) {
    const { error: staleErr } = await supabase.from('promes_week_allocations').delete().in('id', staleIds);
    if (staleErr) {
      console.warn('[PerangkatAjarService] Error removing old promes allocations:', staleErr.message);
    }
  }
}

function isMissingColumnError(error: { code?: string; message?: string }, column: string): boolean {
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    Boolean(error.message?.includes(column))
  );
}

export async function loadPromes(
  protaId: string,
  semester: 1 | 2
): Promise<{ header: PromesHeader | null; cells: MatrixCell[] }> {
  const localKey = `${LOCAL_STORAGE_PREFIX}_promes_${protaId}_${semester}`;

  // 1. Cloud
  try {
    if (protaId && UUID_REGEX.test(protaId)) {
      // Use maybeSingle() instead of single() to avoid 406 Not Acceptable when row does not exist
      const { data: headerData, error: headerErr } = await supabase
        .from('promes_headers')
        .select('*')
        .eq('prota_id', protaId)
        .eq('semester_number', semester)
        .maybeSingle();

      if (!headerErr && headerData) {
        const { data: allocData } = await supabase
          .from('promes_week_allocations')
          .select('*')
          .eq('promes_id', headerData.id);

        const header: PromesHeader = {
          id: headerData.id,
          protaId: headerData.prota_id,
          userId: headerData.user_id,
          semesterNumber: (headerData.semester_number as 1 | 2) || 1,
          weeklyJpLimit: headerData.weekly_jp_limit,
        };

        const cells: MatrixCell[] = ((allocData || []) as Array<Record<string, unknown>>).map((a) => ({
          rowId: String(a.prota_item_id),
          monthIndex: Number(a.month_index),
          weekNumber: Number(a.week_number),
          allocatedJp: Number(a.allocated_jp),
          isLocked: false,
          ...(a.is_manual ? { isManual: true } : {}),
        }));

        try {
          localStorage.setItem(localKey, JSON.stringify({ header, cells }));
        } catch (_err) {
          void _err;
        }

        return { header, cells };
      }
    }
  } catch (_err) {
    void _err;
  }

  // 2. LocalStorage fallback
  try {
    const cached = localStorage.getItem(localKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      return { header: parsed.header || null, cells: parsed.cells || [] };
    }
  } catch (_err) {
    void _err;
  }

  return { header: null, cells: [] };
}

/**
 * Deletes a Prota with both Promes, locally and in the cloud (rows cascade from
 * prota_headers). The caller keeps a copy for undo.
 */
export async function deleteProta(protaId: string): Promise<void> {
  try {
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}_prota_${protaId}`);
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}_promes_${protaId}_1`);
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}_promes_${protaId}_2`);
    if (localStorage.getItem(`${LOCAL_STORAGE_PREFIX}_active_prota_id`) === protaId) {
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}_active_prota_id`);
    }
  } catch (_err) {
    void _err;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id || !UUID_REGEX.test(protaId)) return;
  await enqueueCloudWrite(`prota:${protaId}`, async () => {
    const { error } = await supabase.from('prota_headers').delete().eq('id', protaId);
    if (error) throw new Error(error.message);
  });
}

// =============================================================================
// 3b. SCHOOL KALDIK (published once by an admin, used by every teacher)
// =============================================================================

export interface SchoolKaldik {
  weeks: KaldikWeek[];
  updatedAt: string | null;
}

/** The school-wide Kaldik for a year, or null when none is published or the table is missing. */
export async function loadSchoolKaldik(academicYear: string): Promise<SchoolKaldik | null> {
  try {
    const { data, error } = await supabase
      .from('school_kaldik_entries' as never)
      .select('month, week_number, week_type, notes, updated_at')
      .eq('academic_year', academicYear);
    if (error || !data || (data as unknown[]).length === 0) return null;
    const rows = data as Array<Record<string, unknown>>;
    return {
      weeks: rows.map((row) => ({
        month: Number(row.month),
        weekNumber: Number(row.week_number),
        type: row.week_type as WeekType,
        label: (row.notes as string) || undefined,
        academicYear,
      })),
      updatedAt: rows.reduce<string | null>(
        (latest, row) => (String(row.updated_at) > (latest ?? '') ? String(row.updated_at) : latest),
        null
      ),
    };
  } catch {
    return null;
  }
}

/** Publishes a Kaldik for the whole school. Only admins pass the database policy. */
export async function publishSchoolKaldik(academicYear: string, weeks: KaldikWeek[]): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error('Masuk terlebih dahulu untuk menerbitkan Kaldik sekolah.');

  const now = new Date().toISOString();
  const { error } = await supabase.from('school_kaldik_entries' as never).upsert(
    weeks.map((w) => ({
      academic_year: academicYear,
      month: w.month,
      week_number: w.weekNumber,
      week_type: w.type,
      notes: w.label || null,
      updated_by: userId,
      updated_at: now,
    })) as never,
    { onConflict: 'academic_year,month,week_number' }
  );
  if (error) {
    throw new Error(
      error.code === '42P01' || error.message?.includes('school_kaldik_entries')
        ? 'Fitur Kaldik sekolah belum aktif di database.'
        : 'Gagal menerbitkan Kaldik sekolah. Pastikan Anda admin lalu coba lagi.'
    );
  }
}

// =============================================================================
// 4. DOCUMENT IDENTITY PERSISTENCE
// =============================================================================

export function saveDocumentIdentity(identity: DocumentIdentity): void {
  const localKey = `${LOCAL_STORAGE_PREFIX}_identity`;
  try {
    localStorage.setItem(localKey, JSON.stringify(identity));
  } catch (err) {
    console.warn('[PerangkatAjarService] Failed to cache DocumentIdentity locally:', err);
  }
}

export function loadDocumentIdentity(): Partial<DocumentIdentity> | null {
  const localKey = `${LOCAL_STORAGE_PREFIX}_identity`;
  try {
    const cached = localStorage.getItem(localKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (err) {
    console.warn('[PerangkatAjarService] Failed to read cached DocumentIdentity:', err);
  }
  return null;
}
