import { supabase } from './supabase';

/**
 * Resolve a model id (slug like 'pbl' OR uuid) to the real UUID primary key
 * of `ref_model_pembelajaran`.
 *
 * The UI's model picker historically used short slug ids (e.g. 'pbl',
 * 'case_method') from the static LEARNING_MODELS catalog, while the database
 * uses uuid PKs and its own naming (e.g. "Problem Based Learning (PBL)").
 * Passing a slug to PostgREST as a uuid column produces:
 *   invalid input syntax for type uuid: "pbl"  (HTTP 400)
 *
 * This resolver:
 *   1. Short-circuits when the value is already a valid uuid.
 *   2. Otherwise normalizes the slug/name and matches it against
 *      ref_model_pembelajaran.nama_model (and a small alias map for
 *      legacy slugs), caching results per session.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Map legacy UI slugs to the canonical nama_model used in the database. */
export const MODEL_SLUG_ALIASES: Record<string, string> = {
  pbl: 'Problem Based Learning (PBL)',
  case_method: 'Case Method (Studi Kasus)',
  pjbl: 'Project Based Learning (PjBL)',
  discovery: 'Discovery Learning',
  inquiry_terbimbing: 'Inquiry Terbimbing (Guided Inquiry)',
  stad: 'STAD (Student Teams Achievement Divisions)',
  jigsaw: 'Jigsaw',
  tps: 'Think-Pair-Share (TPS)',
  pjbl_fids: 'Project Based Learning (PjBL - FIDS)',
  arka: 'Experiential Learning (ARKA)',
  deep_learning_mmj: 'Deep Learning (Mindful-Meaningful-Joyful)',
};

export function isUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Fuzzy match: "Problem Based Learning (PBL)" == "problem based learning pbl" */
function namesMatch(a: string, b: string): boolean {
  return normalize(a) === normalize(b);
}

let cachedModels: Array<{ id: string; nama_model: string | null }> | null = null;

async function loadModels(): Promise<Array<{ id: string; nama_model: string | null }>> {
  if (cachedModels) return cachedModels;
  const { data, error } = await supabase
    .from('ref_model_pembelajaran')
    .select('id, nama_model');
  if (error || !data) return [];
  cachedModels = data as Array<{ id: string; nama_model: string | null }>;
  return cachedModels;
}

/** Best-effort resolution. Falls back to the raw value when it cannot be
 *  resolved (uuid passthrough or unknown slug), preserving prior behavior. */
export async function resolveModelId(value: string | null | undefined): Promise<string | null> {
  if (!value) return null;
  const trimmed = value.trim();
  if (isUuid(trimmed)) return trimmed;

  // Prefer exact alias -> nama_model match
  const aliasTarget = MODEL_SLUG_ALIASES[trimmed.toLowerCase()];
  const models = await loadModels();

  if (aliasTarget) {
    const byName = models.find((m) => m.nama_model && namesMatch(m.nama_model, aliasTarget));
    if (byName) return byName.id;
  }

  // Fuzzy match the raw value against every nama_model
  const fuzzy = models.find((m) => m.nama_model && namesMatch(m.nama_model, trimmed));
  return fuzzy?.id ?? trimmed;
}

/** Query a single model row by resolved id (uuid). Returns null on miss. */
export async function findModelByValue(value: string | null | undefined): Promise<{ id: string; nama_model: string | null } | null> {
  const id = await resolveModelId(value);
  if (!id) return null;
  const models = await loadModels();
  return models.find((m) => m.id === id) ?? null;
}
