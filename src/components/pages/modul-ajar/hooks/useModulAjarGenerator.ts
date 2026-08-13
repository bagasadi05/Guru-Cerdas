import { useState } from 'react';
import { supabase } from '../../../../services/supabase';
import { modulAjarContentService } from '../../../../services/modulAjarContentService';
import { generateModulAjarAiContent, normalizeSoalEvaluasi } from '../../../../services/modulAjarAiGenerator';
import { resolveLearningSyntax } from '../utils/syntaxResolver';
import { buildHtmlTemplate } from '../utils/template';
import { FormState } from '../types';
import type { Json } from '../../../../services/database.types';

interface GeneratorProps {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
  user: any;
  models: any[];
  t: any;
  isAiEnabled: boolean;
  logoBase64: string;
  fetchHistory: () => void;
  setGeneratedDocument: (doc: string) => void;
  setAiCacheWarning: (warning: string | null) => void;
}

export const useModulAjarGenerator = ({
  formState,
  setFormState,
  user,
  models,
  t,
  isAiEnabled,
  logoBase64,
  fetchHistory,
  setGeneratedDocument,
  setAiCacheWarning,
}: GeneratorProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);

  const generateManualModulAjar = async () => {
    if (!formState.mataPelajaran || !formState.topik) {
      alert(t.lessonPlan.validateSubject);
      return;
    }
    if (!user) {
      alert(t.lessonPlan.validateSubject);
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    setAiCacheWarning(null);

    try {
      let bp = await modulAjarContentService.getBoilerplate(formState.mataPelajaran, formState.topik, formState.fase);

      if (!bp && isAiEnabled) {
        setIsAiGenerating(true);
        try {
          const aiContent = await generateModulAjarAiContent(
            formState.mataPelajaran,
            formState.topik,
            formState.fase,
            formState.modelPembelajaran,
            (msg) => setAiCacheWarning(msg)
          );
          bp = {
            id: '',
            mata_pelajaran: formState.mataPelajaran,
            topik: formState.topik,
            fase: formState.fase,
            tujuan_pembelajaran: aiContent.tujuanPembelajaran,
            pemahaman_bermakna: aiContent.pemahamanBermakna,
            pertanyaan_pemantik: aiContent.pertanyaanPemantik,
            lkpd_tugas: aiContent.lkpdTugas,
            soal_evaluasi: aiContent.soalEvaluasi,
            pengayaan: aiContent.pengayaan,
            remedial: aiContent.remedial,
            daftar_pustaka: aiContent.daftarPustaka,
            is_verified: false,
            sumber_regulasi: null,
          };
        } catch (aiErr: any) {
          console.warn('[AI Fallback] AI generation failed, continuing with template:', aiErr.message);
          setAiCacheWarning('AI gagal menghasilkan konten. Modul dibuat dengan template generik — periksa koneksi/kuota AI lalu coba lagi.');
        } finally {
          setIsAiGenerating(false);
        }
      }

      let modelIdToUse = formState.selectedModelId;
      const selectedModelObj = models.find(m => m.id === modelIdToUse || m.nama_model === formState.modelPembelajaran);
      if (selectedModelObj) {
        modelIdToUse = selectedModelObj.id;
      }

      const sintaksList = modelIdToUse
        ? await modulAjarContentService.getSintaksKegiatan(modelIdToUse, {
            topik: formState.topik,
            mapel: formState.mataPelajaran,
            kelas: formState.kelas
          })
        : [];

      const resolvedSyntax = resolveLearningSyntax(
        sintaksList,
        selectedModelObj?.sintaks_inti,
        formState.modelPembelajaran
      );

      const kegiatanIntiData = resolvedSyntax.steps.map((s: any) => ({
        name: s.name,
        kegiatanGuru: s.teacherActivity,
        kegiatanSiswa: s.studentActivity,
      }));

      let tujuanPembelajaranList: string[] = formState.manualTujuanPembelajaran
        ? formState.manualTujuanPembelajaran.split('\n').filter(line => line.trim() !== '')
        : (bp?.tujuan_pembelajaran && Array.isArray(bp.tujuan_pembelajaran) && bp.tujuan_pembelajaran.length > 0
            ? bp.tujuan_pembelajaran
            : [`Peserta didik dapat memahami dan menguasai materi ${formState.topik || formState.mataPelajaran} dengan baik.`]);

      const pemahamanBermaknaList: string[] = (bp?.pemahaman_bermakna && Array.isArray(bp.pemahaman_bermakna) && bp.pemahaman_bermakna.length > 0)
        ? bp.pemahaman_bermakna
        : [`Peserta didik dapat memahami konsep dasar ${formState.topik || formState.mataPelajaran} dan menerapkannya dalam kehidupan sehari-hari.`];

      const pertanyaanPemantikList: string[] = formState.manualPertanyaanPemantik
        ? formState.manualPertanyaanPemantik.split('\n').filter(line => line.trim() !== '')
        : (bp?.pertanyaan_pemantik && Array.isArray(bp.pertanyaan_pemantik) && bp.pertanyaan_pemantik.length > 0
            ? bp.pertanyaan_pemantik
            : [
                `Bagaimana kita memanfaatkan ${formState.topik || formState.mataPelajaran} dalam kegiatan sehari-hari?`,
                `Mengapa penting bagi kita untuk mempelajari ${formState.topik || formState.mataPelajaran}?`
              ]);

      const lkpdText = formState.manualLkpdTugas || bp?.lkpd_tugas || `Tugas Mandiri/Kelompok: Eksplorasi dan latihan penerapan materi ${formState.topik || formState.mataPelajaran}.`;
      const evaluasiText = formState.manualSoalEvaluasi || bp?.soal_evaluasi || `1. Sebutkan konsep utama dari ${formState.topik || formState.mataPelajaran}!\n2. Berikan contoh penerapan ${formState.topik || formState.mataPelajaran} dalam kehidupan sehari-hari!`;

      if (formState.isKbcIntegrated && formState.materiInsersi) {
        const frasa = formState.materiInsersi.trim();
        tujuanPembelajaranList = tujuanPembelajaranList.map(tp => {
          const cleaned = tp.replace(/\.$/, '');
          return `${cleaned} (${frasa}).`;
        });
      }

      let pendahuluanText = `Guru membuka kelas dengan salam, memeriksa kehadiran, menyampaikan apersepsi, dan tujuan pembelajaran terkait ${formState.topik || formState.mataPelajaran}.`;
      let penutupText = `Guru membimbing refleksi pembelajaran, menyimpulkan materi, dan menutup dengan doa.`;
      let sikapText = 'Observasi sikap peserta didik selama pembelajaran';

      if (formState.isKbcIntegrated) {
        pendahuluanText = `Guru membuka kelas dengan salam ramah, meminta salah seorang peserta didik memimpin doa pembuka (Basmalah & doa menuntut ilmu), memeriksa kehadiran, menyampaikan apersepsi, serta tujuan pembelajaran bernilai cinta.`;
        penutupText = `Guru bersama peserta didik melakukan refleksi atas pembelajaran dan nilai-nilai cinta yang dipelajari, menyimpulkan materi, kemudian menutup kelas dengan doa Hamdalah, doa kaffaratul majelis, dan salam penutup.`;
        sikapText = 'Observasi sikap spiritual (rasa syukur, kecintaan pada ilmu & ciptaan Allah Swt.) dan sikap sosial (kasih sayang, toleransi, empati) selama pembelajaran.';
      }

      const isAiGenerated = bp && bp.id === '';
      const manualData = {
        ...bp,
        tujuanPembelajaran: tujuanPembelajaranList,
        pemahamanBermakna: pemahamanBermaknaList,
        pertanyaanPemantik: pertanyaanPemantikList,
        lkpdTugas: lkpdText,
        soalEvaluasi: evaluasiText,
        kegiatanPendahuluan: pendahuluanText,
        kegiatanInti: kegiatanIntiData,
        kegiatanPenutup: penutupText,
        asesmenSikap: sikapText,
        asesmenKeterampilan: 'Penilaian unjuk kerja/proyek presentasi',
        asesmenPengetahuan: 'Tes tertulis/lisan di akhir materi',
        pengayaan: bp?.pengayaan && Array.isArray(bp.pengayaan) && bp.pengayaan.length > 0 ? bp.pengayaan : [`Pendalaman materi ${formState.topik || formState.mataPelajaran} secara mandiri.`],
        remedial: bp?.remedial && Array.isArray(bp.remedial) && bp.remedial.length > 0 ? bp.remedial : [`Bimbingan individual dan penugasan ulang materi ${formState.topik || formState.mataPelajaran}.`],
        daftarPustaka: bp?.daftar_pustaka && Array.isArray(bp.daftar_pustaka) && bp.daftar_pustaka.length > 0 ? bp.daftar_pustaka : [`Buku Panduan Guru & Siswa ${formState.mataPelajaran} Kelas ${formState.kelas}, Kemendikbudristek.`],
      };

      const totalJP = formState.jumlahPertemuan * formState.jpPerPertemuan;
      const htmlTemplate = buildHtmlTemplate(formState, manualData, totalJP, logoBase64);

      const { error: insertError } = await supabase.from('lesson_plans').insert({
        user_id: user?.id,
        document_type: formState.documentType,
        curriculum_approach: formState.curriculumApproach,
        generation_method: isAiGenerated ? 'AI' : (formState.generationMethod || 'Manual'),
        identity: {
          kelas: formState.kelas,
          fase: formState.fase,
          mapel: formState.mataPelajaran,
          topik: formState.topik,
          tahun: formState.tahunAjaran,
          semester: formState.semester,
          guru: formState.guru
        },
        components: {
          target: formState.targetPeserta,
          cp: formState.capaianPembelajaran,
          kompetensiAwal: formState.kompetensiAwal,
          saranaPrasarana: formState.saranaPrasarana,
          profil: formState.profilPelajar,
          waktu: { pertemuan: formState.jumlahPertemuan, jp: formState.jpPerPertemuan, durasi: formState.durasiPerJp },
          model: formState.modelPembelajaran,
          metode: formState.metodePembelajaran,
          alokasi: { pendahuluan: formState.alokasiPendahuluan, inti: formState.alokasiInti, penutup: formState.alokasiPenutup },
          rubrik: formState.rubrikAsesmen.map(r => ({ ...r })) as unknown as Json[],
          temaKbc: formState.temaKbc,
          materiInsersi: formState.materiInsersi,
          isKbcIntegrated: formState.isKbcIntegrated,
          modelPembelajaranKbc: formState.modelPembelajaranKbc,
          pendekatanPembelajaran: formState.pendekatanPembelajaran,
          teknikPembelajaran: formState.teknikPembelajaran,
          selectedModelId: formState.selectedModelId,
          tujuanPembelajaran: tujuanPembelajaranList,
          pertanyaanPemantik: pertanyaanPemantikList,
          lkpdTugas: lkpdText,
          soalEvaluasi: evaluasiText
        },
        generated_content: htmlTemplate
      });

      if (insertError) {
        console.error('Gagal menyimpan modul ajar ke database:', insertError);
        throw new Error(`Gagal menyimpan ke database: ${insertError.message}`);
      }

      setGeneratedDocument(htmlTemplate);
      setFormState(prev => ({
        ...prev,
        manualTujuanPembelajaran: tujuanPembelajaranList.join('\n'),
        manualPertanyaanPemantik: pertanyaanPemantikList.join('\n'),
        manualLkpdTugas: lkpdText,
        manualSoalEvaluasi: evaluasiText
      }));
      fetchHistory();
      alert(isAiGenerated
        ? '✨ Modul Ajar berhasil disusun oleh AI! Draf tersimpan di Riwayat Anda dan dikirim ke Bank Bersama untuk direview admin.'
        : t.lessonPlan.saveSuccess);

    } catch (err: any) {
      console.error(err);
      alert(t.lessonPlan.saveFailed.replace('{message}', err.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPrivateDraftAiModulAjar = async (aiOutput: any) => {
    if (!user) return;
    const totalJP = formState.jumlahPertemuan * formState.jpPerPertemuan;

    let kegiatanIntiData: any = aiOutput.kegiatanInti || aiOutput.skenarioPembelajaran || [];
    if (!Array.isArray(kegiatanIntiData) || kegiatanIntiData.length === 0) {
      const resolvedSyntax = aiOutput._resolvedSyntax || resolveLearningSyntax([], [], formState.modelPembelajaran);
      kegiatanIntiData = resolvedSyntax.steps.map((s: any) => ({
        name: s.name,
        fase: s.name,
        kegiatanGuru: s.teacherActivity,
        kegiatanSiswa: s.studentActivity,
      }));
    }

    const draftData = {
      tujuanPembelajaran: aiOutput.tujuanPembelajaran || [],
      pemahamanBermakna: aiOutput.pemahamanBermakna || [],
      pertanyaanPemantik: aiOutput.pertanyaanPemantik || [],
      lkpdTugas: aiOutput.lkpdTugas || '',
      soalEvaluasi: normalizeSoalEvaluasi(aiOutput.soalEvaluasi),
      kunciJawaban: Array.isArray(aiOutput.kunciJawaban) ? aiOutput.kunciJawaban : [],
      kegiatanPendahuluan: `Guru membuka kelas dengan salam, apersepsi, dan menyampaikan tujuan pembelajaran terkait ${formState.topik || formState.mataPelajaran}.`,
      kegiatanInti: kegiatanIntiData,
      kegiatanPenutup: `Guru membimbing refleksi pembelajaran dan menutup kelas dengan doa.`,
      capaianPembelajaran: aiOutput.capaianPembelajaran || formState.capaianPembelajaran || '',
      kompetensiAwal: aiOutput.kompetensiAwal || formState.kompetensiAwal || '',
      asesmenSikap: 'Observasi sikap peserta didik selama pembelajaran',
      asesmenKeterampilan: aiOutput.asesmenKeterampilan || 'Penilaian unjuk kerja/proyek presentasi',
      asesmenPengetahuan: aiOutput.asesmenPengetahuan || 'Tes tertulis/lisan di akhir materi',
      pengayaan: aiOutput.pengayaan || [],
      remedial: aiOutput.remedial || [],
      daftarPustaka: aiOutput.daftarPustaka || []
    };

    const htmlTemplate = buildHtmlTemplate(formState, draftData, totalJP, logoBase64);

    const { error: insertError } = await supabase.from('lesson_plans').insert({
      user_id: user?.id,
      document_type: formState.documentType,
      curriculum_approach: formState.curriculumApproach,
      generation_method: 'AI',
      identity: {
        kelas: formState.kelas,
        fase: formState.fase,
        mapel: formState.mataPelajaran,
        topik: formState.topik,
        tahun: formState.tahunAjaran,
        semester: formState.semester,
        guru: formState.guru
      },
      components: {
        target: formState.targetPeserta,
        cp: formState.capaianPembelajaran,
        kompetensiAwal: formState.kompetensiAwal,
        saranaPrasarana: formState.saranaPrasarana,
        profil: formState.profilPelajar,
        waktu: { pertemuan: formState.jumlahPertemuan, jp: formState.jpPerPertemuan, durasi: formState.durasiPerJp },
        model: formState.modelPembelajaran,
        metode: formState.metodePembelajaran,
        alokasi: { pendahuluan: formState.alokasiPendahuluan, inti: formState.alokasiInti, penutup: formState.alokasiPenutup },
        rubrik: formState.rubrikAsesmen.map(r => ({ ...r })) as unknown as Json[],
        temaKbc: formState.temaKbc,
        materiInsersi: formState.materiInsersi,
        isKbcIntegrated: formState.isKbcIntegrated,
        modelPembelajaranKbc: formState.modelPembelajaranKbc,
        pendekatanPembelajaran: formState.pendekatanPembelajaran,
        teknikPembelajaran: formState.teknikPembelajaran,
        selectedModelId: formState.selectedModelId,
        tujuanPembelajaran: Array.isArray(draftData.tujuanPembelajaran) ? draftData.tujuanPembelajaran : (draftData.tujuanPembelajaran || []),
        pertanyaanPemantik: Array.isArray(draftData.pertanyaanPemantik) ? draftData.pertanyaanPemantik : (draftData.pertanyaanPemantik || []),
        lkpdTugas: draftData.lkpdTugas || '',
        soalEvaluasi: draftData.soalEvaluasi || ''
      },
      generated_content: htmlTemplate
    });

    if (insertError) {
      console.error('Gagal menyimpan modul ajar AI ke database:', insertError);
      throw new Error(`Gagal menyimpan ke database: ${insertError.message}`);
    }

    setGeneratedDocument(htmlTemplate);
    setFormState(prev => ({
      ...prev,
      manualTujuanPembelajaran: Array.isArray(draftData.tujuanPembelajaran) ? draftData.tujuanPembelajaran.join('\n') : (draftData.tujuanPembelajaran || ''),
      manualPertanyaanPemantik: Array.isArray(draftData.pertanyaanPemantik) ? draftData.pertanyaanPemantik.join('\n') : (draftData.pertanyaanPemantik || ''),
      manualLkpdTugas: draftData.lkpdTugas || '',
      manualSoalEvaluasi: draftData.soalEvaluasi || ''
    }));
    fetchHistory();
  };

  return {
    generateManualModulAjar,
    renderPrivateDraftAiModulAjar,
    isSubmitting,
    isAiGenerating,
  };
};
