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
import { getDefaultNationalKaldik } from '../data/defaultKaldikPresets';
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

const LOCAL_STORAGE_PREFIX = 'guru_cerdas_perangkat_ajar';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  // 3. Fallback to official national preset
  const defaultPreset = getDefaultNationalKaldik(academicYear);
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
      return protaId;
    }

    // Delete removed items and upsert existing
    await supabase.from('prota_items').delete().eq('prota_id', protaId);

    if (items.length > 0) {
      const itemsToInsert = items.map((it, idx) => ({
        id: it.id && it.id.length > 20 ? it.id : crypto.randomUUID(),
        prota_id: protaId,
        semester_number: it.semesterNumber,
        element_or_domain: it.elementOrDomain || '',
        learning_objective_code: it.learningObjectiveCode || '',
        learning_objective_text: it.learningObjectiveText || '',
        core_topic: it.coreTopic || '',
        target_jp: it.targetJp || 0,
        order_index: it.orderIndex ?? idx,
      }));

      const { error: itemErr } = await supabase.from('prota_items').insert(itemsToInsert);
      if (itemErr) {
        console.warn('[PerangkatAjarService] Error saving prota items:', itemErr.message);
      }
    }
  } catch (err) {
    console.warn('[PerangkatAjarService] Cloud prota save error (offline):', err);
  }

  return protaId;
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
            await saveProta(cached.header, cached.items || []);
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

    // 3. Delete existing allocations and insert new ones
    await supabase.from('promes_week_allocations').delete().eq('promes_id', promesId);

    const allocatedCells = cells.filter((c) => c.allocatedJp > 0);
    if (allocatedCells.length > 0) {
      // Validate that prota_item_ids exist in prota_items to prevent FK constraint error
      const { data: existingItems } = await supabase
        .from('prota_items')
        .select('id')
        .eq('prota_id', header.protaId);

      const validItemIds = new Set((existingItems || []).map((i) => i.id));

      const records = allocatedCells
        .filter((c) => validItemIds.size === 0 || validItemIds.has(c.rowId))
        .map((c) => ({
          id: crypto.randomUUID(),
          promes_id: promesId,
          prota_item_id: c.rowId,
          month_index: c.monthIndex,
          week_number: c.weekNumber,
          allocated_jp: c.allocatedJp,
        }));

      if (records.length > 0) {
        const { error: allocErr } = await supabase.from('promes_week_allocations').insert(records);
        if (allocErr) {
          console.warn('[PerangkatAjarService] Error saving promes allocations:', allocErr.message);
        }
      }
    }
  } catch (err) {
    console.warn('[PerangkatAjarService] Cloud promes save error (offline):', err);
  }
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
