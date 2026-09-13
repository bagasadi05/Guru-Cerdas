/**
 * Export Formatting Utilities
 * 
 * Lightweight helpers for export filenames and timestamps.
 * Intentionally decoupled from heavy Excel/PDF libraries to prevent
 * accidental bundle bloat on pages that only format dates.
 * 
 * @module exportFormatUtils
 */

/**
 * Format tanggal export: DD-MM-YYYY (konsisten di semua export).
 */
export function formatExportDate(d: Date = new Date()): string {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}-${month}-${d.getFullYear()}`;
}

/**
 * Bangun nama file export dengan pola: {Konteks}_{Kelas}_{Periode}_{TanggalExport}
 * @param parts - bagian nama file (tanpa ekstensi), mis. ['Kelas_5A', 'Agustus_2026']
 * @param includeDate - apakah menambahkan tanggal export otomatis (default true)
 */
export function buildExportFileName(parts: string[], includeDate = true): string {
    const cleanParts = parts
        .filter(Boolean)
        .map(p => p.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, ''))
        .filter(Boolean);
    if (includeDate) cleanParts.push(formatExportDate());
    return cleanParts.join('_') || 'Laporan';
}
