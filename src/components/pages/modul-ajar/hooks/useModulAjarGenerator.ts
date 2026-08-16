import { useState } from 'react';
import { supabase } from '../../../../services/supabase';
import { modulAjarContentService } from '../../../../services/modulAjarContentService';
import { resolveModelId } from '../../../../services/modelIdResolver';
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

      let aiGeneratedData: any = null;

      if (!bp && isAiEnabled) {
        setIsAiGenerating(true);
        try {
          const aiContent = await generateModulAjarAiContent(
            formState.mataPelajaran,
            formState.topik,
            formState.fase,
            formState.modelPembelajaran,
            formState.metodePembelajaran,
            (msg) => setAiCacheWarning(msg)
          );
          aiGeneratedData = aiContent;
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
            konten_json: aiContent,
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
      } else {
        // Slug fallback (static catalog id seperti 'pbl') — resolve ke UUID DB.
        modelIdToUse = (await resolveModelId(modelIdToUse)) || modelIdToUse;
      }

      const sintaksList = modelIdToUse
        ? await modulAjarContentService.getSintaksKegiatan(modelIdToUse, {
            topik: formState.topik,
            mapel: formState.mataPelajaran,
            kelas: formState.kelas
          })
        : [];

      let kegiatanIntiData: any[] = [];
      const aiSteps = aiGeneratedData?.skenarioPembelajaran || bp?.konten_json?.skenarioPembelajaran;

      if (aiSteps && Array.isArray(aiSteps) && aiSteps.length > 0) {
        kegiatanIntiData = aiSteps.map((s: any, idx: number) => ({
          name: s.name || s.fase || `Langkah ${idx + 1}`,
          fase: s.name || s.fase || `Langkah ${idx + 1}`,
          kegiatanGuru: s.guru || s.kegiatanGuru || s.kegiatan_guru || '',
          kegiatanSiswa: s.siswa || s.kegiatanSiswa || s.kegiatan_siswa || '',
        }));
      } else {
        const resolvedSyntax = resolveLearningSyntax(
          sintaksList,
          selectedModelObj?.sintaks_inti,
          formState.modelPembelajaran,
          formState.metodePembelajaran,
          formState.topik,
          formState.mataPelajaran
        );

        kegiatanIntiData = resolvedSyntax.steps.map((s: any) => ({
          name: s.name,
          fase: s.name,
          kegiatanGuru: s.teacherActivity,
          kegiatanSiswa: s.studentActivity,
        }));
      }

      let tujuanPembelajaranList: string[] = formState.manualTujuanPembelajaran
        ? formState.manualTujuanPembelajaran.split('\n').filter(line => line.trim() !== '')
        : (bp?.tujuan_pembelajaran && Array.isArray(bp.tujuan_pembelajaran) && bp.tujuan_pembelajaran.length > 0
            ? bp.tujuan_pembelajaran
            : [`Peserta didik dapat memahami dan menguasai materi ${formState.topik || formState.mataPelajaran} secara kontekstual dan bermakna.`]);

      const pemahamanBermaknaList: string[] = (bp?.pemahaman_bermakna && Array.isArray(bp.pemahaman_bermakna) && bp.pemahaman_bermakna.length > 0)
        ? bp.pemahaman_bermakna
        : [`Peserta didik memahami konsep dasar ${formState.topik || formState.mataPelajaran} dan mampu menerapkannya dalam memecahkan permasalahan sehari-hari.`];

      const pertanyaanPemantikList: string[] = formState.manualPertanyaanPemantik
        ? formState.manualPertanyaanPemantik.split('\n').filter(line => line.trim() !== '')
        : (bp?.pertanyaan_pemantik && Array.isArray(bp.pertanyaan_pemantik) && bp.pertanyaan_pemantik.length > 0
            ? bp.pertanyaan_pemantik
            : [
                `Bagaimana kita memanfaatkan ${formState.topik || formState.mataPelajaran} dalam kegiatan kita sehari-hari?`,
                `Mengapa penting bagi kita untuk mempelajari konsep ${formState.topik || formState.mataPelajaran}?`
              ]);

      const hasEksperimen = (formState.metodePembelajaran || []).includes('Eksperimen');
      const normModelName = (formState.modelPembelajaran || '').toLowerCase();

      const defaultLkpdText = `### LKPD: Lembar Kerja Eksplorasi ${formState.topik || formState.mataPelajaran}
**Petunjuk Belajar:**
1. Berdoalah bersama kelompokmu sebelum memulai kegiatan.
2. Bacalah setiap langkah kegiatan dengan cermat dan bagi peran kerja secara adil.
3. Gunakan alat/bahan yang telah disiapkan untuk memecahkan persoalan secara kolaboratif.
4. Tuliskan hasil pengamatan, diskusi, dan kesimpulan kelompok pada lembar yang disediakan.

**Alat dan Bahan:**
* Lembar Kerja Peserta Didik (LKPD) dan alat tulis
* Media peraga / alat konkret pendukung materi ${formState.topik || formState.mataPelajaran}
* Sumber belajar atau bahan bacaan tematik

**Aktivitas 1: ${
        normModelName.includes('problem')
          ? 'Orientasi Masalah & Pengamatan Nyata'
          : normModelName.includes('project')
          ? 'Perancangan Sketsa Produk & Pembagian Tugas'
          : hasEksperimen
          ? 'Eksperimen & Uji Coba Alat Peraga'
          : 'Eksplorasi Konsep & Identifikasi Informasi'
      }**
${
        normModelName.includes('problem')
          ? `Amatilah fenomena atau kasus nyata terkait ${formState.topik || formState.mataPelajaran}. Diskusikan bersama kelompok: apa pokok permasalahan yang ditemukan dan bagaimana kemungkinan solusinya?`
          : normModelName.includes('project')
          ? `Rancanglah sebuah produk/karya kreatif yang berkaitan dengan ${formState.topik || formState.mataPelajaran}. Buatlah sketsa desain sederhana dan tuliskan peran tiap anggota kelompok!`
          : hasEksperimen
          ? `Lakukan manipulasi/uji coba alat peraga terkait konsep ${formState.topik || formState.mataPelajaran}. Catat setiap data dan fakta yang kalian temukan selama kegiatan berlangsung!`
          : `Cermatilah contoh ilustrasi dan penjelasan materi ${formState.topik || formState.mataPelajaran} yang disajikan. Tuliskan fakta dan bagian-bagian penting yang kalian temukan!`
      }

[Kotak untuk Menggambar Bagan / Menuliskan Hasil Pengamatan Awal]

**Aktivitas 2: Diskusi Kelompok & Perumusan Solusi**
Diskusikan pertanyaan penuntun berikut bersama teman sekelompok:
1. Mengapa pemahaman tentang ${formState.topik || formState.mataPelajaran} sangat penting dalam kehidupan sehari-hari?
2. Apa langkah-langkah yang dilakukan kelompokmu untuk menyelesaikan persoalan pada materi ini?
3. Tuliskan kesimpulan akhir yang disepakati bersama oleh kelompok!

[Kotak untuk Menuliskan Hasil Diskusi dan Kesimpulan Kelompok]`;

      const defaultEvaluasiText = `1. Manakah dari pernyataan di bawah ini yang paling tepat menggambarkan konsep dasar dari ${formState.topik || formState.mataPelajaran}?
A. Konsep penting yang bermanfaat untuk menyelesaikan permasalahan kontekstual di sekitar kita.
B. Aturan hafalan yang tidak memiliki kegunaan nyata di kehidupan sehari-hari.
C. Materi yang hanya dipelajari di sekolah tanpa ada keterkaitan dengan lingkungan.
D. Gagasan yang tidak memerlukan pembuktian atau penalaran logis.

2. Mengapa kita perlu mempelajari dan memahami materi ${formState.topik || formState.mataPelajaran}?
A. Agar tugas cepat selesai tanpa perlu memahami konsep dasarnya.
B. Agar mampu memecahkan persoalan praktis secara mandiri, kritis, dan logis.
C. Hanya untuk memenuhi nilai ujian tanpa dipraktikkan.
D. Untuk mempersulit proses kerja sama dalam kelompok belajar.

3. Dalam menyelesaikan permasalahan terkait ${formState.topik || formState.mataPelajaran}, langkah awal yang paling tepat adalah...
A. Mengidentifikasi informasi penting dan merencanakan langkah penyelesaian secara terstruktur.
B. Langsung menebak jawaban tanpa membaca petunjuk soal.
C. Mengabaikan data dan fakta yang telah ditemukan selama eksplorasi.
D. Menyerahkan seluruh pekerjaan kepada teman sekelompok.

4. Jelaskan dengan kalimatmu sendiri, apa pengertian dan manfaat utama dari mempelajari ${formState.topik || formState.mataPelajaran}!
5. Berikan satu contoh kasus nyata di lingkungan rumah atau sekolah yang berkaitan dengan ${formState.topik || formState.mataPelajaran}, serta uraikan bagaimana cara menyelesaikannya!`;

      const lkpdText = formState.manualLkpdTugas || bp?.lkpd_tugas || defaultLkpdText;
      const evaluasiText = formState.manualSoalEvaluasi || bp?.soal_evaluasi || defaultEvaluasiText;

      if (formState.isKbcIntegrated && formState.materiInsersi) {
        const frasa = formState.materiInsersi.trim();
        tujuanPembelajaranList = tujuanPembelajaranList.map(tp => {
          const cleaned = tp.replace(/\.$/, '');
          return `${cleaned} (${frasa}).`;
        });
      }

      // Build rich structured Pendahuluan & Penutup
      let pendahuluanData: any = aiGeneratedData?.kegiatanPendahuluan || bp?.konten_json?.kegiatanPendahuluan;
      if (!pendahuluanData || (Array.isArray(pendahuluanData) && pendahuluanData.length === 0)) {
        if (formState.isKbcIntegrated || formState.curriculumApproach === 'Berbasis Cinta') {
          pendahuluanData = [
            `Orientasi Kasih Sayang & Kondisi Belajar: Guru membuka pembelajaran dengan mengucapkan salam yang santun dan penuh kehangatan, menyapa kabar peserta didik, mengajak salah satu siswa memimpin doa pembuka (Basmalah & doa menuntut ilmu), memeriksa presensi kehadiran, serta mengajak peserta didik melakukan latihan hening kesadaran (Mindful Breathing) sejenak untuk menata hati dan menghadirkan rasa cinta pada ilmu pengetahuan.`,
            `Apersepsi Kontekstual & Nilai Kebaikan: Guru mengaitkan materi sebelumnya dengan topik ${formState.topik || formState.mataPelajaran}, menggali pengalaman nyata siswa yang mencerminkan rasa syukur, tolong-menolong, dan kepedulian terhadap sesama di lingkungan sekitar.`,
            `Motivasi & Nilai Keberkahan: Guru memberikan dorongan motivasi bahwa belajar ${formState.topik || formState.mataPelajaran} adalah bentuk ikhtiar menuntut ilmu yang membawa manfaat besar bagi kebaikan diri, keluarga, dan lingkungan ciptaan Allah Swt.`,
            `Pemberian Acuan, Tujuan Pembelajaran & Alur Belajar: Guru menyampaikan Tujuan Pembelajaran yang ingin dicapai dengan bahasa yang ramah anak, menjelaskan alur aktivitas eksplorasi kelompok dengan semangat gotong royong, serta aturan belajar yang berlandaskan saling menghargai.`,
            `Pertanyaan Pemantik Berbasis Cinta: Guru mengajukan pertanyaan pemantik kontekstual yang menyentuh hati dan memantik nalar kritis peserta didik terhadap permasalahan di sekitar yang berkaitan dengan ${formState.topik || formState.mataPelajaran}.`
          ];
        } else {
          pendahuluanData = [
            `Orientasi & Penyiapan Kondisi Belajar: Guru mengawali pembelajaran dengan salam pembuka yang ramah, menyapa kabar peserta didik, meminta ketua kelas atau perwakilan siswa memimpin doa bersama secara khidmat, mengecek kehadiran serta kerapian ruang kelas, dan memandu aktivitas penyegaran singkat (Ice Breaking / Tepuk Semangat) untuk meningkatkan konsentrasi dan antusiasme belajar.`,
            `Apersepsi & Penggalian Pengetahuan Awal: Guru mengaitkan materi pertemuan sebelumnya dengan materi hari ini melalui sesi tanya jawab interaktif, memperlihatkan contoh konkret atau fenomena sederhana di lingkungan sekitar yang berkaitan langsung dengan topik ${formState.topik || formState.mataPelajaran}, dan mengecek kesiapan konsep prasyarat siswa.`,
            `Motivasi & Kebermaknaan Belajar: Guru menyampaikan motivasi kontekstual mengenai pentingnya memahami materi ${formState.topik || formState.mataPelajaran} serta bagaimana konsep ini sangat berguna untuk memecahkan persoalan praktis dalam kehidupan sehari-hari.`,
            `Pemberian Acuan, Tujuan & Mekanisme Pembelajaran: Guru memaparkan Capaian dan Tujuan Pembelajaran yang ditargetkan pada pertemuan hari ini, menginformasikan mekanisme kegiatan belajar (pembagian kelompok heterogen, pengerjaan LKPD kolaboratif, dan presentasi kelas), serta menyampaikan kriteria penilaian yang akan dilakukan.`,
            `Pengajuan Pertanyaan Pemantik: Guru melontarkan pertanyaan pemantik terbuka yang menantang rasa ingin tahu dan mengarahkan fokus pemikiran seluruh peserta didik ke inti materi pembelajaran.`
          ];
        }
      }

      let penutupData: any = aiGeneratedData?.kegiatanPenutup || bp?.konten_json?.kegiatanPenutup;
      if (!penutupData || (Array.isArray(penutupData) && penutupData.length === 0)) {
        if (formState.isKbcIntegrated || formState.curriculumApproach === 'Berbasis Cinta') {
          penutupData = [
            `Simpulan Bersama & Penguatan Kasih Sayang: Guru bersama peserta didik merangkum intisari materi ${formState.topik || formState.mataPelajaran}, menyimpulkan pesan hikmah, dan menegaskan nilai-nilai cinta yang dipelajari hari ini.`,
            `Refleksi Diri & Ungkapan Syukur: Peserta didik menyampaikan refleksi perasaannya selama mengikuti kegiatan belajar dan mengungkapkan rasa syukur atas ilmu bermanfaat yang telah diperoleh.`,
            `Asesmen Formatif & Apresiasi Karakter: Guru melakukan cek pemahaman formatif kilat serta memberikan apresiasi hangat atas sikap saling menghargai dan kerja sama antarkelompok.`,
            `Tindak Lanjut & Rencana Pembelajaran Berikutnya: Guru memberikan arahan tindak lanjut (program pengayaan/remedial) serta memberikan gambaran topik inspiratif untuk pertemuan selanjutnya.`,
            `Doa & Salam Penutup Penuh Cinta: Pembelajaran ditutup dengan membaca Hamdalah, doa kaffaratul majelis bersama secara khidmat, dan salam penutup yang hangat.`
          ];
        } else {
          penutupData = [
            `Simpulan Bersama & Konfirmasi Konsep: Guru membimbing peserta didik merangkum poin-poin utama materi ${formState.topik || formState.mataPelajaran}, meluruskan kesalahpahaman, dan menyimpulkan konsep esensial secara menyeluruh.`,
            `Refleksi Pembelajaran (Mindful Reflection): Peserta didik mengemukakan refleksi belajar mengenai pengalaman baru yang diperoleh, bagian aktivitas yang paling menyenangkan, dan hal yang masih perlu dipelajari lebih lanjut.`,
            `Asesmen Formatif & Umpan Balik: Guru memberikan umpan balik apresiatif atas keterlibatan aktif peserta didik dan melakukan evaluasi formatif singkat untuk mengukur ketercapaian tujuan pembelajaran.`,
            `Tindak Lanjut & Arahan Pertemuan Berikutnya: Guru memberikan arahan tindak lanjut (tugas mandiri, pengayaan bagi siswa yang tuntas, dan remedial bagi yang membutuhkan bimbingan) serta menginformasikan materi yang akan dipelajari pada pertemuan berikutnya.`,
            `Penutupan, Rasa Syukur & Doa Bersama: Guru mengajak seluruh peserta didik bersyukur atas kelancaran proses belajar dan menutup kelas dengan doa bersama yang dipimpin oleh ketua kelas serta salam penutup.`
          ];
        }
      }

      const topicLabel = formState.topik || formState.mataPelajaran || 'Materi Pembelajaran';
      const isKbc = formState.isKbcIntegrated || formState.curriculumApproach === 'Berbasis Cinta';
      const normModel = (formState.modelPembelajaran || '').toLowerCase();

      const sikapText = isKbc
        ? `Teknik Asesmen: Observasi Sikap & Lembar Jurnal Kasih Sayang. Aspek yang dinilai mencakup pengamalan Panca Cinta: Cinta kepada Allah Swt., Cinta Rasulullah, Cinta Diri & Sesama (empati, santun, tolong-menolong), Cinta Lingkungan, serta Cinta Ilmu Pengetahuan pada saat mengeksplorasi materi ${topicLabel}.`
        : `Teknik Asesmen: Observasi Sikap & Jurnal Refleksi Profil Pelajar Pancasila. Aspek yang dinilai: Beriman & Bertakwa, Bernalar Kritis dalam menelaah persoalan ${topicLabel}, Gotong Royong dalam kerja sama kelompok, serta Mandiri dan Bertanggung Jawab dalam menyelesaikan tugas.`;

      const keterampilanText = `Teknik Asesmen: Unjuk Kerja / Kinerja Praktik, Diskusi Kelompok, dan Presentasi Karya. Aspek yang dinilai mencakup keterampilan ${
        normModel.includes('project')
          ? `merancang dan menghasilkan karya proyek ${topicLabel}`
          : normModel.includes('problem')
          ? `mengidentifikasi masalah dan merumuskan solusi alternatif ${topicLabel}`
          : normModel.includes('discovery') || normModel.includes('inquiry')
          ? `melakukan observasi, manipulasi alat peraga, dan pengolahan data ${topicLabel}`
          : `mengerjakan tahapan eksplorasi di LKPD ${topicLabel}`
      }, keaktifan komunikasi lisan, serta kerja sama tim.`;

      const pengetahuanText = `Teknik Asesmen: Tes Formatif Tertulis dan Lisan melalui Lembar Kerja Peserta Didik (LKPD) serta 5 butir Soal Evaluasi Mandiri (Pilihan Ganda & Uraian Analitis). Aspek yang dinilai mencakup penguasaan konsep esensial materi ${topicLabel} dan kemampuan nalar tingkat tinggi (HOTS).`;

      // Generate contextual rubrik if not provided
      if (!formState.rubrikAsesmen || formState.rubrikAsesmen.length === 0) {
        formState.rubrikAsesmen = [
          {
            kriteria: `1. Penguasaan Konsep & Nalar Kritis (${topicLabel})`,
            sangatBaik: `Mampu menjelaskan konsep esensial ${topicLabel} secara komprehensif, logis, dan menghubungkannya dengan contoh konkret kehidupan nyata secara mandiri.`,
            baik: `Mampu menjelaskan konsep dasar ${topicLabel} dengan benar dan memberikan contoh relevan dengan sedikit bimbingan guru.`,
            cukup: `Memahami sebagian konsep ${topicLabel}, namun masih memerlukan arahan saat menyelesaikan latihan pemecahan masalah.`,
            perluBimbingan: `Belum menguasai konsep dasar ${topicLabel} dan memerlukan bimbingan intensif serta scaffolding berkelanjutan.`
          },
          {
            kriteria: normModel.includes('project')
              ? `2. Kreativitas & Kualitas Produk Proyek`
              : normModel.includes('problem')
              ? `2. Kemampuan Pemecahan Masalah & Penyelidikan`
              : normModel.includes('discovery') || normModel.includes('inquiry')
              ? `2. Keterampilan Observasi & Pengolahan Data`
              : `2. Keterampilan Eksplorasi & Pengerjaan LKPD`,
            sangatBaik: normModel.includes('project')
              ? `Menghasilkan karya/produk ${topicLabel} yang sangat rapi, kreatif, solutif, dan selesai tepat waktu sesuai jadwal perancangan.`
              : `Mampu merumuskan alternatif pemecahan masalah ${topicLabel} secara sistematis, mendalam, dan logis pada lembar kerja.`,
            baik: normModel.includes('project')
              ? `Menghasilkan produk ${topicLabel} yang baik, rapi, dan sesuai dengan kriteria yang ditentukan bersama kelompok.`
              : `Mampu mengidentifikasi dan menyelesaikan masalah ${topicLabel} pada LKPD dengan langkah-langkah yang tepat.`,
            cukup: normModel.includes('project')
              ? `Menghasilkan produk ${topicLabel} namun masih membutuhkan penyempurnaan pada aspek kerapian atau fungsi.`
              : `Mampu menyelesaikan sebagian masalah ${topicLabel} pada LKPD dengan arahan bertahap dari guru.`,
            perluBimbingan: normModel.includes('project')
              ? `Produk ${topicLabel} belum selesai atau belum memenuhi kriteria minimal, memerlukan pendampingan teknis penuh.`
              : `Kesulitan menyelesaikan langkah pemecahan masalah ${topicLabel} di LKPD dan memerlukan bimbingan langsung.`
          },
          {
            kriteria: (formState.metodePembelajaran || []).includes('Eksperimen')
              ? `3. Keterampilan Praktik / Eksperimen Alat Peraga`
              : (formState.metodePembelajaran || []).includes('Role Playing')
              ? `3. Penghayatan Peran & Komunikasi Ekspresif`
              : `3. Keaktifan Kolaborasi & Presentasi Kelompok`,
            sangatBaik: (formState.metodePembelajaran || []).includes('Eksperimen')
              ? `Sangat terampil memanipulasi alat peraga ${topicLabel}, mematuhi prosedur kerja dengan disiplin, dan mencatat data secara akurat.`
              : `Sangat aktif berdiskusi, menghargai pendapat rekan kelompok, dan menyampaikan hasil karya ${topicLabel} dengan percaya diri dan komunikatif.`,
            baik: (formState.metodePembelajaran || []).includes('Eksperimen')
              ? `Mampu menggunakan alat peraga ${topicLabel} sesuai prosedur keselamatan dan mencatat data pengamatan dengan baik.`
              : `Aktif bekerja sama dalam kelompok dan mampu mempresentasikan hasil diskusi ${topicLabel} dengan jelas dan santun.`,
            cukup: (formState.metodePembelajaran || []).includes('Eksperimen')
              ? `Dapat menggunakan alat peraga ${topicLabel} namun masih ragu dalam prosedur pengamatan.`
              : `Cukup terlibat dalam kerja kelompok, namun masih pasif saat sesi berbagi dan presentasi di depan kelas.`,
            perluBimbingan: (formState.metodePembelajaran || []).includes('Eksperimen')
              ? `Belum mampu mengoperasikan alat peraga ${topicLabel} secara mandiri dan membutuhkan bimbingan langsung guru.`
              : `Kurang berpartisipasi dalam diskusi kelompok dan membutuhkan dorongan motivasi berkelanjutan.`
          },
          {
            kriteria: isKbc
              ? `4. Karakter Kasih Sayang & Akhlak Mulia (Panca Cinta)`
              : `4. Sikap Gotong Royong & Mandiri (Profil Pelajar Pancasila)`,
            sangatBaik: isKbc
              ? `Selalu menunjukkan sikap saling mengasihi, peduli, tolong-menolong, dan bertutur kata santun kepada sesama teman serta guru selama proses belajar.`
              : `Selalu menunjukkan inisiatif mandiri, bekerja sama dengan tulus tanpa membeda-bedakan teman, dan bertanggung jawab penuh atas tugasnya.`,
            baik: isKbc
              ? `Menunjukkan sikap ramah, peduli, dan bekerja sama dengan baik bersama rekan sekelompok.`
              : `Mampu bekerja sama dengan baik dan menyelesaikan tanggung jawab tugas yang diberikan dengan tertib.`,
            cukup: isKbc
              ? `Cukup peduli terhadap teman, namun sesekali masih perlu diingatkan untuk menjaga sikap saling menghormati di kelas.`
              : `Cukup bekerja sama, namun terkadang masih bergantung pada inisiatif anggota kelompok lain.`,
            perluBimbingan: isKbc
              ? `Perlu pembiasaan intensif dalam menumbuhkan empati, keikhlasan, dan kasih sayang di lingkungan belajar.`
              : `Belum menunjukkan sikap kerja sama aktif dan memerlukan pendampingan pembiasaan karakter berkelanjutan.`
          }
        ];
      }

      const isAiGenerated = bp && bp.id === '';
      const manualData = {
        ...bp,
        tujuanPembelajaran: tujuanPembelajaranList,
        pemahamanBermakna: pemahamanBermaknaList,
        pertanyaanPemantik: pertanyaanPemantikList,
        lkpdTugas: lkpdText,
        soalEvaluasi: evaluasiText,
        kunciJawaban: aiGeneratedData?.kunciJawaban || (bp as any)?.konten_json?.kunciJawaban || [],
        kegiatanPendahuluan: pendahuluanData,
        kegiatanInti: kegiatanIntiData,
        kegiatanPenutup: penutupData,
        capaianPembelajaran: formState.capaianPembelajaran || (bp as any)?.capaian_pembelajaran || '',
        kompetensiAwal: formState.kompetensiAwal || (bp as any)?.kompetensi_awal || '',
        asesmenSikap: sikapText,
        asesmenKeterampilan: keterampilanText,
        asesmenPengetahuan: pengetahuanText,
        pengayaan: bp?.pengayaan && Array.isArray(bp.pengayaan) && bp.pengayaan.length > 0 ? bp.pengayaan : [`Pendalaman materi ${formState.topik || formState.mataPelajaran} dengan tantangan pemecahan masalah tingkat lanjut.`],
        remedial: bp?.remedial && Array.isArray(bp.remedial) && bp.remedial.length > 0 ? bp.remedial : [`Bimbingan individual terstruktur dan penugasan bertahap pada konsep esensial materi ${formState.topik || formState.mataPelajaran}.`],
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

    let kegiatanIntiData: any[] = [];
    const sourceSteps = aiOutput.skenarioPembelajaran || aiOutput.kegiatanInti || aiOutput.konteksSintaks;
    
    if (Array.isArray(sourceSteps) && sourceSteps.length > 0) {
      kegiatanIntiData = sourceSteps.map((s: any, idx: number) => ({
        name: s.name || s.fase || (s.urutan ? `Langkah ${s.urutan}` : `Langkah ${idx + 1}`),
        fase: s.name || s.fase || (s.urutan ? `Langkah ${s.urutan}` : `Langkah ${idx + 1}`),
        kegiatanGuru: s.guru || s.kegiatanGuru || s.kegiatan_guru || '',
        kegiatanSiswa: s.siswa || s.kegiatanSiswa || s.kegiatan_siswa || '',
      }));
    } else {
      const resolvedSyntax = aiOutput._resolvedSyntax || resolveLearningSyntax([], [], formState.modelPembelajaran);
      kegiatanIntiData = resolvedSyntax.steps.map((s: any) => ({
        name: s.name,
        fase: s.name,
        kegiatanGuru: s.teacherActivity,
        kegiatanSiswa: s.studentActivity,
      }));
    }

    const pendahuluanData = aiOutput.kegiatanPendahuluan || [
      `Orientasi: Guru membuka kelas dengan salam hangat, meminta salah seorang siswa memimpin doa, mengecek kehadiran, dan menyiapkan kesiapan belajar siswa melalui apersepsi yang menyenangkan.`,
      `Apersepsi: Guru mengaitkan pengetahuan prasyarat atau peristiwa sehari-hari dengan topik ${formState.topik || formState.mataPelajaran}.`,
      `Motivasi & Tujuan: Guru menyampaikan tujuan pembelajaran, manfaat materi dalam kehidupan sehari-hari, serta alur kegiatan belajar dan bentuk penilaian.`,
      `Pemberian Acuan / Pemantik: Guru mengajukan pertanyaan pemantik kontekstual tentang ${formState.topik || formState.mataPelajaran} untuk memicu rasa ingin tahu siswa.`
    ];

    const penutupData = aiOutput.kegiatanPenutup || [
      `Refleksi & Simpulan: Guru memandu siswa menyimpulkan poin inti topik ${formState.topik || formState.mataPelajaran}. Siswa merefleksikan pengalaman belajarnya secara terbuka.`,
      `Asesmen Formatif & Umpan Balik: Guru memberikan umpan balik apresiatif atas kerja sama siswa dan melakukan pengecekan pemahaman formatif singkat.`,
      `Tindak Lanjut: Guru menyampaikan tindak lanjut tugas pengayaan/remedial dan menginformasikan rencana materi pertemuan berikutnya.`,
      `Doa & Salam: Kelas ditutup dengan doa bersama dipimpin oleh salah satu siswa dan salam penutup.`
    ];

    const draftData = {
      tujuanPembelajaran: aiOutput.tujuanPembelajaran || [],
      pemahamanBermakna: aiOutput.pemahamanBermakna || [],
      pertanyaanPemantik: aiOutput.pertanyaanPemantik || [],
      lkpdTugas: aiOutput.lkpdTugas || '',
      soalEvaluasi: normalizeSoalEvaluasi(aiOutput.soalEvaluasi),
      kunciJawaban: Array.isArray(aiOutput.kunciJawaban) ? aiOutput.kunciJawaban : [],
      kegiatanPendahuluan: pendahuluanData,
      kegiatanInti: kegiatanIntiData,
      kegiatanPenutup: penutupData,
      capaianPembelajaran: aiOutput.capaianPembelajaran || formState.capaianPembelajaran || '',
      kompetensiAwal: aiOutput.kompetensiAwal || formState.kompetensiAwal || '',
      asesmenSikap: formState.isKbcIntegrated
        ? 'Observasi sikap spiritual (rasa syukur, kecintaan pada ilmu) dan sikap sosial (kasih sayang, empati, kerja sama)'
        : 'Observasi sikap profil pelajar Pancasila (beriman, bernalar kritis, gotong royong, mandiri)',
      asesmenKeterampilan: aiOutput.asesmenKeterampilan || 'Penilaian unjuk kerja/proyek presentasi dan performa diskusi',
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
