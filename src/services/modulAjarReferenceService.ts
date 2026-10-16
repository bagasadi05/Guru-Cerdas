import { supabase } from './supabase';

/** Reads reviewed, source-attributed CP rows. Model-generated prose is never an official CP fallback. */
export async function getVerifiedLessonCp(mapel: string, fase: string): Promise<{ cp: string; sources: string[] }> {
  const subject = mapel.trim().replace(/[\\%_]/g, '\\$&');
  const { data, error } = await supabase.from('ref_capaian_pembelajaran')
    .select('deskripsi_cp, elemen, sumber_regulasi')
    .eq('fase', fase).eq('is_verified', true).ilike('mata_pelajaran', subject);
  if (error) throw new Error('Bank CP tidak dapat dibaca. Isi CP dari sumber yang digunakan sekolah atau coba lagi.');
  const rows = (data ?? []).filter(row => row.deskripsi_cp?.trim() && row.sumber_regulasi?.trim());
  if (!rows.length) throw new Error('CP terverifikasi belum tersedia untuk mapel dan fase ini. Isi CP dari dokumen sumber sekolah terlebih dahulu.');
  return {
    cp: rows.map(row => `${row.elemen ? `${row.elemen}:\n` : ''}${row.deskripsi_cp}`).join('\n\n'),
    sources: [...new Set(rows.map(row => row.sumber_regulasi!.trim()))],
  };
}
