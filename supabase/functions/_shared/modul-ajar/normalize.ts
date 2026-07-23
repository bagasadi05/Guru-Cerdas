/**
 * Normalize string for deterministic fingerprinting (Deno backend)
 */
export function normalizeString(input: string | undefined | null): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u00C0-\u024F]/g, '') // Remove most punctuation but keep alphanumeric and spaces
    .replace(/\s+/g, ' '); // Compress multiple whitespaces to single space
}

export interface FingerprintParams {
  mapel: string;
  fase: string;
  topik: string;
  modelUuid: string;
  curriculumVersion?: string;
  promptVersion?: string;
}

/**
 * Generate fingerprint for AI Job deduplication
 * Format: normalize(mapel)|fase|normalize(topik)|model_uuid|curriculum_version|prompt_version
 */
export function generateAiFingerprint({
  mapel,
  fase,
  topik,
  modelUuid,
  curriculumVersion = 'v1',
  promptVersion = 'v1'
}: FingerprintParams): string {
  const normMapel = normalizeString(mapel);
  const normTopik = normalizeString(topik);
  return `${normMapel}|${fase}|${normTopik}|${modelUuid}|${curriculumVersion}|${promptVersion}`;
}
