import type { ModulAjarPromptContext } from '../../../../services/modulAjarAiGenerator';
import type { FormState } from '../types';

/**
 * What the teacher already decided, sent with the full-document AI request so
 * the result fits this class instead of a generic lesson.
 *
 * @param teacherTujuan objectives the teacher owns ('' when the AI should write them)
 */
export const buildAiPromptContext = (form: FormState, teacherTujuan: string): ModulAjarPromptContext => ({
  kelas: form.kelas,
  capaianPembelajaran: form.capaianPembelajaran,
  tujuanPembelajaran: teacherTujuan,
  profilPelajar: form.profilPelajar,
  alokasiWaktu: `${form.jumlahPertemuan} pertemuan × ${form.jpPerPertemuan} JP × ${form.durasiPerJp} menit`,
  kbc:
    form.isKbcIntegrated || form.curriculumApproach === 'Berbasis Cinta'
      ? { tema: form.temaKbc, materiInsersi: form.materiInsersi }
      : undefined,
});
