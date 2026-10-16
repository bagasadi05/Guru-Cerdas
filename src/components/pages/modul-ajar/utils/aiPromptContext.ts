import type { ModulAjarPromptContext } from '../../../../services/modulAjarAiGenerator';
import type { FormState } from '../types';
import { resolveLearningSyntax } from './syntaxResolver';
import type { ContentField } from '../hooks/useModulAjarForm';
import { aiArtifactScope } from './aiArtifactScope';

/**
 * What the teacher already decided, sent with the full-document AI request so
 * the result fits this class instead of a generic lesson.
 *
 * @param teacherTujuan objectives the teacher owns ('' when the AI should write them)
 */
export const buildAiPromptContext = (
  form: FormState,
  teacherTujuan: string,
  modelSyntax?: string[],
  isOwned?: (field: ContentField) => boolean,
): ModulAjarPromptContext => {
  const resolved = resolveLearningSyntax(
    [],
    modelSyntax,
    form.modelPembelajaran.replace(/-/g, ' '),
  );
  const syntax = modelSyntax?.length
    ? modelSyntax
    : resolved.source !== 'generic_fallback'
      ? resolved.steps.map((step) => step.name)
      : [];
  const own = (field: ContentField) => (isOwned?.(field) ? String(form[field] ?? '').trim() : '');
  const artifact = form.aiArtifacts?.scope === aiArtifactScope(form) ? form.aiArtifacts : undefined;
  const reusable = { ...artifact?.content };
  const componentFields = {
    tujuanPembelajaran: 'manualTujuanPembelajaran',
    pemahamanBermakna: 'manualPemahamanBermakna',
    pertanyaanPemantik: 'manualPertanyaanPemantik',
    materiAjar: 'manualMateriAjar',
    glosarium: 'manualGlosarium',
    kompetensiAwal: 'kompetensiAwal',
    pengayaan: 'manualPengayaan',
    remedial: 'manualRemedial',
    evaluasi: 'manualSoalEvaluasi',
    lkpd: 'manualLkpdTugas',
  } as const;
  for (const [component, field] of Object.entries(componentFields)) {
    if (artifact && artifact.values[field] !== String(form[field as ContentField] ?? ''))
      delete reusable[component as keyof typeof reusable];
  }
  return {
    kelas: form.kelas,
    capaianPembelajaran: form.capaianPembelajaran,
    cpSource: form.aiCpSource ?? 'guru',
    tujuanPembelajaran: teacherTujuan,
    profilPelajar: form.profilPelajar,
    alokasiWaktu: `${form.jumlahPertemuan} pertemuan × ${form.jpPerPertemuan} JP × ${form.durasiPerJp} menit`,
    sintaks: syntax,
    jumlahPertemuan: form.jumlahPertemuan,
    menitPerPertemuan: form.jpPerPertemuan * form.durasiPerJp,
    alokasi: {
      pendahuluan: form.alokasiPendahuluan,
      inti: form.alokasiInti,
      penutup: form.alokasiPenutup,
    },
    daftarPustaka: (form.manualDaftarPustaka ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    teacherContent: {
      materiAjar: own('manualMateriAjar'),
      lkpdTugas: own('manualLkpdTugas'),
      soalEvaluasi: own('manualSoalEvaluasi'),
      glosarium: own('manualGlosarium'),
      pemahamanBermakna: own('manualPemahamanBermakna'),
      pertanyaanPemantik: own('manualPertanyaanPemantik'),
      kompetensiAwal: own('kompetensiAwal'),
      pengayaan: own('manualPengayaan'),
      remedial: own('manualRemedial'),
    },
    reusableContent: reusable,
    kbc:
      form.isKbcIntegrated || form.curriculumApproach === 'Berbasis Cinta'
        ? {
            tema: form.temaKbc,
            materiInsersi: form.materiInsersi,
            appendToObjectives: form.isKbcIntegrated,
          }
        : undefined,
  };
};
