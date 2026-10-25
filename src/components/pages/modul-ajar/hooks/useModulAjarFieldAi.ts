import { useState, useRef, useEffect, useCallback } from 'react';
import type { FormState } from '../types';
import type { RefModelPembelajaran } from '../../../../services/modulAjarContentService';
import type { ModulAiOptions, ModulAiUsage } from '../../../../services/modulAjarAiCache';
import { useToast } from '../../../../hooks/useToast';
import { CONTENT_FIELDS, type ContentField } from './useModulAjarForm';
import {
  generateTujuanPembelajaran,
  generatePemahamanBermakna,
  generatePertanyaanPemantik,
  generateMateriAjar,
  generateLkpdTugas,
  generateSoalEvaluasi,
  generatePengayaan,
  generateRemedial,
  generateGlosarium,
  generateDaftarPustaka,
  generateKompetensiAwal,
  generateCapaianPembelajaran,
} from '../../../../services/modulAjarAiFieldGenerator';

const isContentField = (field: string): field is ContentField =>
  (CONTENT_FIELDS as readonly string[]).includes(field);

const FIELD_LABELS: Record<string, string> = {
  manualTujuanPembelajaran: 'Tujuan Pembelajaran',
  manualPemahamanBermakna: 'Pemahaman Bermakna',
  manualPertanyaanPemantik: 'Pertanyaan Pemantik',
  manualMateriAjar: 'Ringkasan Materi Ajar',
  manualLkpdTugas: 'Lembar Kerja Peserta Didik (LKPD)',
  manualSoalEvaluasi: 'Soal Evaluasi & Penskoran',
  manualPengayaan: 'Aktivitas Pengayaan',
  manualRemedial: 'Aktivitas Remedial',
  manualGlosarium: 'Glosarium',
  manualDaftarPustaka: 'Daftar Pustaka',
  kompetensiAwal: 'Kompetensi Awal',
  capaianPembelajaran: 'Capaian Pembelajaran',
};

interface UseModulAjarFieldAiParams {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
  models: RefModelPembelajaran[];
  isSubmittingQueue: boolean;
  handleInputChange: (field: keyof FormState, value: any) => void;
  setFieldFromAi: (field: ContentField, content: string) => void;
  saveFieldArtifact: (field: ContentField, content: string, artifact: Record<string, unknown>) => void;
  setAiUsage: (usage: ModulAiUsage | null) => void;
  setAiCacheWarning: (warning: string | null) => void;
}

export const useModulAjarFieldAi = ({
  formState,
  setFormState,
  models,
  isSubmittingQueue,
  handleInputChange,
  setFieldFromAi,
  saveFieldArtifact,
  setAiUsage,
  setAiCacheWarning,
}: UseModulAjarFieldAiParams) => {
  const toast = useToast();
  const [fieldLoading, setFieldLoading] = useState<Record<string, boolean>>({});
  const fieldControllers = useRef(new Map<string, AbortController>());

  const cancelFieldControllers = useCallback(() => {
    fieldControllers.current.forEach((controller) => controller.abort());
    fieldControllers.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      cancelFieldControllers();
    };
  }, [cancelFieldControllers]);

  const handleAiFillField = async (field: string, refresh = false) => {
    if (fieldControllers.current.has(field) || isSubmittingQueue) return;
    if (!formState.mataPelajaran?.trim() || !formState.topik?.trim()) {
      toast.error('Silakan isi Mata Pelajaran dan Topik terlebih dahulu sebelum menggunakan AI.');
      return;
    }

    const label = FIELD_LABELS[field] || 'konten';
    const controller = new AbortController();
    fieldControllers.current.set(field, controller);
    let artifact: Record<string, unknown> | undefined;
    const options: ModulAiOptions = {
      cachePolicy: refresh ? 'refresh' : 'reuse',
      signal: controller.signal,
      onUsage: setAiUsage,
      onWarning: setAiCacheWarning,
      onArtifact: (value) => {
        artifact = value;
      },
    };
    setFieldLoading((prev) => ({ ...prev, [field]: true }));
    try {
      const ctx = {
        mapel: formState.mataPelajaran.trim(),
        topik: formState.topik.trim(),
        fase: formState.fase || 'A',
        kelas: formState.kelas,
        capaianPembelajaran: formState.capaianPembelajaran,
        daftarPustaka: (formState.manualDaftarPustaka || '').split('\n').filter(Boolean),
        tujuanPembelajaran: formState.manualTujuanPembelajaran,
        materiAjar: formState.manualMateriAjar,
        lkpdTugas: formState.manualLkpdTugas,
        modelPembelajaran: formState.modelPembelajaran,
        cpSource: formState.aiCpSource,
        sintaks: models.find(
          (model) =>
            model.id === formState.selectedModelId || model.nama_model === formState.modelPembelajaran
        )?.sintaks_inti,
        metodePembelajaran: formState.metodePembelajaran,
        jumlahPertemuan: formState.jumlahPertemuan,
        alokasi: {
          pendahuluan: formState.alokasiPendahuluan,
          inti: formState.alokasiInti,
          penutup: formState.alokasiPenutup,
        },
        teacherContent: Object.fromEntries(
          CONTENT_FIELDS.map((key) => [key, String(formState[key] ?? '')])
        ),
        alokasiWaktu: `${formState.jumlahPertemuan} pertemuan × ${formState.jpPerPertemuan} JP × ${formState.durasiPerJp} menit`,
        profilPelajarPancasila: formState.profilPelajar,
        temaKbc: formState.temaKbc,
        materiInsersi: formState.materiInsersi,
        isKbcIntegrated:
          formState.isKbcIntegrated || formState.curriculumApproach === 'Berbasis Cinta',
      };
      let content = '';

      switch (field) {
        case 'manualTujuanPembelajaran':
          content = await generateTujuanPembelajaran(ctx, options);
          break;
        case 'manualPemahamanBermakna':
          content = await generatePemahamanBermakna(ctx, options);
          break;
        case 'manualPertanyaanPemantik':
          content = await generatePertanyaanPemantik(ctx, options);
          break;
        case 'manualMateriAjar':
          content = await generateMateriAjar(ctx, options);
          break;
        case 'manualLkpdTugas':
          content = await generateLkpdTugas(ctx, options);
          break;
        case 'manualSoalEvaluasi':
          content = await generateSoalEvaluasi(
            ctx,
            (assessment) => handleInputChange('generatedAssessment', assessment),
            options
          );
          break;
        case 'manualPengayaan':
          content = await generatePengayaan(ctx, options);
          break;
        case 'manualRemedial':
          content = await generateRemedial(ctx, options);
          break;
        case 'manualGlosarium':
          content = await generateGlosarium(ctx, options);
          break;
        case 'manualDaftarPustaka':
          content = await generateDaftarPustaka(ctx);
          break;
        case 'kompetensiAwal':
          content = await generateKompetensiAwal(ctx, options);
          break;
        case 'capaianPembelajaran':
          content = await generateCapaianPembelajaran(ctx);
          break;
        default:
          return;
      }

      if (controller.signal.aborted) return;
      if (content) {
        if (isContentField(field)) {
          setFieldFromAi(field, content);
          if (artifact) saveFieldArtifact(field, content, artifact);
        } else {
          handleInputChange(field as keyof FormState, content);
          if (field === 'capaianPembelajaran') {
            setFormState((prev) => ({ ...prev, aiCpSource: 'bank_verified' }));
          }
        }
        toast.success(
          field === 'capaianPembelajaran'
            ? 'CP berhasil dimuat dari bank terverifikasi.'
            : field === 'manualDaftarPustaka'
              ? 'Sumber referensi berhasil dimuat.'
              : `✨ ${label} berhasil disusun oleh AI!`
        );
      } else {
        toast.error(`Gagal menghasilkan ${label}. Silakan coba lagi.`);
      }
    } catch (err: any) {
      if (controller.signal.aborted) return;
      console.error(`[AI Field] ${field} generation failed:`, err);
      toast.error(err.message || `Gagal menyusun ${label} dengan AI. Silakan coba lagi.`);
    } finally {
      if (fieldControllers.current.get(field) === controller) {
        fieldControllers.current.delete(field);
      }
      setFieldLoading((prev) => ({ ...prev, [field]: false }));
    }
  };

  return {
    fieldLoading,
    handleAiFillField,
    cancelFieldControllers,
  };
};
