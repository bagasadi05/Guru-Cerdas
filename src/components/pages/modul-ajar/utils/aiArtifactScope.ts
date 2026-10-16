import type { FormState } from '../types';
import { stableJson } from '../../../../services/modulAjarAiCache';
export function aiArtifactScope(form: FormState): string {
  return stableJson({
    mapel: form.mataPelajaran,
    topik: form.topik,
    fase: form.fase,
    kelas: form.kelas,
    cp: form.capaianPembelajaran,
    model: form.modelPembelajaran,
    selectedModel: form.selectedModelId,
    metode: form.metodePembelajaran,
    tujuan: form.manualTujuanPembelajaran,
    profil: form.profilPelajar,
    pertemuan: form.jumlahPertemuan,
    jp: form.jpPerPertemuan,
    durasi: form.durasiPerJp,
    alokasi: [form.alokasiPendahuluan, form.alokasiInti, form.alokasiPenutup],
    kbc: [form.curriculumApproach, form.isKbcIntegrated, form.temaKbc, form.materiInsersi],
  });
}
