import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Sparkles, Printer, Download, Copy, Save, CheckCircle2, ChevronRight, Check, FileText } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '../../../services/supabase';
import { generateOpenRouterContent } from '../../../services/openRouterService';

type DocumentType = 'Modul Ajar' | 'RPP';
type CurriculumApproach = 'Merdeka' | 'Berbasis Cinta' | 'Hybrid';

interface FormState {
  documentType: DocumentType;
  curriculumApproach: CurriculumApproach;
  satuanPendidikan: string;
  jenjang: string;
  kelas: string;
  fase: string;
  mataPelajaran: string;
  topik: string;
  tahunAjaran: string;
  semester: string;
  guru: string;
  
  targetPeserta: string;
  kompetensiAwal: string;
  saranaPrasarana: string;
  capaianPembelajaran: string;
  profilPelajar: string[];
  
  jumlahPertemuan: number;
  jpPerPertemuan: number;
  durasiPerJp: number;
  
  modelPembelajaran: string;
  metodePembelajaran: string[];
}

const ModulAjarCreatorPage: React.FC = () => {
  const { user } = useAuth();
  const [formState, setFormState] = useState<FormState>({
    documentType: 'Modul Ajar',
    curriculumApproach: 'Merdeka',
    satuanPendidikan: 'MI Al Irsyad',
    jenjang: 'SD/MI',
    kelas: '1',
    fase: 'A',
    mataPelajaran: '',
    topik: '',
    tahunAjaran: '2023/2024',
    semester: 'Ganjil',
    guru: user?.name || '',
    targetPeserta: 'Reguler/Tipikal',
    kompetensiAwal: '',
    saranaPrasarana: '',
    capaianPembelajaran: '',
    profilPelajar: [],
    jumlahPertemuan: 1,
    jpPerPertemuan: 2,
    durasiPerJp: 35,
    modelPembelajaran: 'Tatap Muka',
    metodePembelajaran: [],
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingCP, setIsGeneratingCP] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState<string>('');
  const [activeStep, setActiveStep] = useState(1);
  
  const [models, setModels] = useState<any[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  useEffect(() => {
    const fetchModels = async () => {
      setIsLoadingModels(true);
      try {
        const { data, error } = await supabase.from('ref_model_pembelajaran').select('*');
        if (data && !error) {
          setModels(data);
          // Set default model if data is not empty
          if (data.length > 0) {
            setFormState(prev => ({ ...prev, modelPembelajaran: data[0].nama_model }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch models:', err);
      } finally {
        setIsLoadingModels(false);
      }
    };
    fetchModels();
  }, []);

  const previewRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (field: keyof FormState, value: any) => {
    setFormState(prev => {
      const newState = { ...prev, [field]: value };
      // Auto-update Fase based on Kelas
      if (field === 'kelas') {
        const k = parseInt(value);
        if (k <= 2) newState.fase = 'A';
        else if (k <= 4) newState.fase = 'B';
        else if (k <= 6) newState.fase = 'C';
      }
      return newState;
    });
  };

  const handleProfilToggle = (profil: string) => {
    setFormState(prev => {
      const exists = prev.profilPelajar.includes(profil);
      if (exists) {
        return { ...prev, profilPelajar: prev.profilPelajar.filter(p => p !== profil) };
      }
      return { ...prev, profilPelajar: [...prev.profilPelajar, profil] };
    });
  };

  const handleMetodeToggle = (metode: string) => {
    setFormState(prev => {
      const exists = prev.metodePembelajaran.includes(metode);
      if (exists) {
        return { ...prev, metodePembelajaran: prev.metodePembelajaran.filter(m => m !== metode) };
      }
      return { ...prev, metodePembelajaran: [...prev.metodePembelajaran, metode] };
    });
  };

  const generateCP = async () => {
    if (!formState.mataPelajaran) {
      alert('Mohon isi Mata Pelajaran terlebih dahulu.');
      return;
    }
    
    setIsGeneratingCP(true);
    try {
      // Cari CP di database berdasarkan Mapel dan Fase
      const { data, error } = await supabase
        .from('ref_capaian_pembelajaran')
        .select('deskripsi_cp')
        .eq('fase', formState.fase)
        .ilike('mata_pelajaran', `%${formState.mataPelajaran}%`)
        .limit(1)
        .maybeSingle();

      if (data && data.deskripsi_cp) {
        handleInputChange('capaianPembelajaran', data.deskripsi_cp);
      } else {
        // Fallback jika tidak ditemukan di DB
        const standardCP = `Peserta didik mampu memahami dan menerapkan konsep dasar ${formState.mataPelajaran} pada tingkat Fase ${formState.fase} sesuai dengan pedoman Kurikulum ${formState.curriculumApproach}. Peserta didik juga diharapkan dapat memecahkan masalah sederhana terkait ${formState.topik} dalam kehidupan sehari-hari.`;
        handleInputChange('capaianPembelajaran', standardCP);
      }
    } catch (err) {
      console.error('Gagal mengambil CP:', err);
    } finally {
      setIsGeneratingCP(false);
    }
  };

  const generateModulAjar = async () => {
    setIsGenerating(true);
    
    // Simulasi loading sejenak agar terlihat natural
    setTimeout(async () => {
      try {
        const totalJP = formState.jumlahPertemuan * formState.jpPerPertemuan;
        
        // Cari sintaks dari model yang dipilih
        const selectedModel = models.find(m => m.nama_model === formState.modelPembelajaran);        
        // Helper function to expand brief syntax phases into detailed teacher-student activities
        const getDetailedSintaks = (sintaksText: string, topik: string) => {
          const lower = sintaksText.toLowerCase();
          let details = '';
          
          if (lower.includes('orientasi') || lower.includes('pertanyaan mendasar')) {
            details = `<ul style="margin: 5px 0 10px 0; padding-left: 20px; list-style-type: disc;">
              <li><strong>Kegiatan Guru:</strong> Menyajikan masalah nyata, stimulus, atau pertanyaan pemantik terkait <strong>${topik}</strong> untuk memancing rasa ingin tahu.</li>
              <li><strong>Kegiatan Siswa:</strong> Mengamati, memahami masalah, dan memikirkan alternatif solusi berdasarkan bahan bacaan atau pengamatan.</li>
            </ul>`;
          } else if (lower.includes('mengorganisasikan') || lower.includes('mendesain') || lower.includes('merencanakan')) {
            details = `<ul style="margin: 5px 0 10px 0; padding-left: 20px; list-style-type: disc;">
              <li><strong>Kegiatan Guru:</strong> Memastikan setiap anggota kelompok memahami tugas dan tanggung jawab masing-masing.</li>
              <li><strong>Kegiatan Siswa:</strong> Berdiskusi, membagi peran, dan merencanakan langkah-langkah pencarian data/alat yang diperlukan untuk penyelesaian tugas.</li>
            </ul>`;
          } else if (lower.includes('membimbing') || lower.includes('menyusun jadwal') || lower.includes('penyelidikan')) {
            details = `<ul style="margin: 5px 0 10px 0; padding-left: 20px; list-style-type: disc;">
              <li><strong>Kegiatan Guru:</strong> Memantau keterlibatan, membimbing, dan memfasilitasi kendala yang dihadapi peserta didik selama proses eksplorasi.</li>
              <li><strong>Kegiatan Siswa:</strong> Melakukan penyelidikan mandiri/kelompok, mencari referensi yang akurat, dan merumuskan bahan diskusi.</li>
            </ul>`;
          } else if (lower.includes('menyajikan') || lower.includes('memonitor') || lower.includes('mengembangkan')) {
            details = `<ul style="margin: 5px 0 10px 0; padding-left: 20px; list-style-type: disc;">
              <li><strong>Kegiatan Guru:</strong> Memantau diskusi, memberikan umpan balik awal, dan membimbing pembuatan laporan/karya final.</li>
              <li><strong>Kegiatan Siswa:</strong> Berdiskusi untuk menyusun solusi final dan menyiapkan bahan presentasi (karya/laporan tertulis) di depan kelas.</li>
            </ul>`;
          } else if (lower.includes('menganalisis') || lower.includes('mengevaluasi') || lower.includes('menguji')) {
            details = `<ul style="margin: 5px 0 10px 0; padding-left: 20px; list-style-type: disc;">
              <li><strong>Kegiatan Guru:</strong> Membimbing jalannya presentasi, mendorong apresiasi, dan memberikan penguatan/klarifikasi materi di akhir sesi.</li>
              <li><strong>Kegiatan Siswa:</strong> Mempresentasikan hasil karya, kelompok lain menanggapi secara kritis, dan merangkum kesimpulan akhir bersama.</li>
            </ul>`;
          } else {
            details = `<ul style="margin: 5px 0 10px 0; padding-left: 20px; list-style-type: disc;">
              <li><strong>Kegiatan Guru:</strong> Memberikan arahan spesifik dan fasilitasi terkait langkah pembelajaran ini.</li>
              <li><strong>Kegiatan Siswa:</strong> Secara aktif melaksanakan aktivitas sesuai panduan dan mendokumentasikan hasilnya.</li>
            </ul>`;
          }

          return `<div style="margin-bottom: 5px;"><strong>${sintaksText.replace(/\*\*(.*?)\*\*/g, '<em>$1</em>')}</strong></div>${details}`;
        };

        // Template Dokumen Persis Sesuai Referensi PDF (Table Based dengan warna Hijau & Kuning)
        const htmlTemplate = `
          <div style="font-family: 'Times New Roman', Times, serif; line-height: 1.5; color: #000; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #ffffff;">

            <!-- COVER PAGE -->
            <div style="text-align: center; margin-bottom: 50px; min-height: 900px; display: flex; flex-direction: column; justify-content: space-between;">
              <div style="margin-top: 50px;">
                <h1 style="font-size: 16pt; margin: 0; font-weight: bold;">PERANGKAT PEMBELAJARAN KURIKULUM MERDEKA</h1>
                <h2 style="font-size: 14pt; margin: 15px 0; font-weight: bold; text-transform: uppercase;">${formState.mataPelajaran} KELAS ${formState.kelas} ${formState.jenjang}</h2>
              </div>
              
              <div style="margin: 40px auto;">
                <div style="width: 250px; height: 250px; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
                  <img src="${window.location.origin}/logo_sekolah.png" alt="Logo Sekolah" style="width: 100%; height: 100%; object-fit: contain;" />
                </div>
              </div>
              
              <div style="margin: 40px 0; font-size: 12pt;">
                <p style="margin-bottom: 20px;">Disusun Oleh :</p>
                <table style="margin: 0 auto; text-align: left; font-size: 12pt;">
                  <tr><td style="padding: 5px 20px;">Nama</td><td style="padding: 5px;">: ${formState.guru}</td></tr>
                  <tr><td style="padding: 5px 20px;">NIP/NIM</td><td style="padding: 5px;">: ...........................</td></tr>
                </table>
              </div>

              <div style="margin-bottom: 50px;">
                <h2 style="font-size: 14pt; margin: 5px 0; font-weight: bold; text-transform: uppercase;">${formState.satuanPendidikan}</h2>
                <h3 style="font-size: 12pt; margin: 5px 0; font-weight: bold;">${formState.tahunAjaran}</h3>
              </div>
            </div>

            <!-- HALAMAN BARU (CONTENT) -->
            <div style="page-break-before: always; text-align: center; margin-bottom: 20px; padding-top: 20px;">
              <h1 style="font-size: 14pt; margin: 0; font-weight: bold;">MODUL AJAR KURIKULUM MERDEKA</h1>
              <h2 style="font-size: 12pt; margin: 8px 0 0 0; font-weight: bold; text-transform: uppercase;">${formState.mataPelajaran} FASE ${formState.fase} ${formState.jenjang} KELAS ${formState.kelas}</h2>
            </div>

            <table style="width: 100%; border-collapse: collapse; border: 1px solid #000; font-size: 11pt;">
              
              <!-- INFORMASI UMUM -->
              <tr>
                <td style="background-color: #00b050; color: #000; padding: 8px; font-weight: bold; border: 1px solid #000;">INFORMASI UMUM</td>
              </tr>
              
              <tr>
                <td style="background-color: #ffff00; color: #000; padding: 8px; font-weight: bold; border: 1px solid #000;">A. IDENTITAS MODUL</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #000;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="width: 30%; padding: 4px;"><strong>Penyusun</strong></td><td style="width: 5%; padding: 4px;">:</td><td style="padding: 4px;"><strong>${formState.guru}</strong></td></tr>
                    <tr><td style="padding: 4px;"><strong>Instansi</strong></td><td style="padding: 4px;">:</td><td style="padding: 4px;">${formState.satuanPendidikan}</td></tr>
                    <tr><td style="padding: 4px;"><strong>Tahun Penyusunan</strong></td><td style="padding: 4px;">:</td><td style="padding: 4px;">Tahun ${formState.tahunAjaran}</td></tr>
                    <tr><td style="padding: 4px;"><strong>Jenjang Sekolah</strong></td><td style="padding: 4px;">:</td><td style="padding: 4px;">${formState.jenjang}</td></tr>
                    <tr><td style="padding: 4px;"><strong>Mata Pelajaran</strong></td><td style="padding: 4px;">:</td><td style="padding: 4px;">${formState.mataPelajaran}</td></tr>
                    <tr><td style="padding: 4px;"><strong>Fase / Kelas / Semester</strong></td><td style="padding: 4px;">:</td><td style="padding: 4px;">${formState.fase} / ${formState.kelas} / ${formState.semester}</td></tr>
                    <tr><td style="padding: 4px;"><strong>Topik / Unit</strong></td><td style="padding: 4px;">:</td><td style="padding: 4px;">${formState.topik}</td></tr>
                    <tr><td style="padding: 4px;"><strong>Alokasi Waktu</strong></td><td style="padding: 4px;">:</td><td style="padding: 4px;">${totalJP} JP (${formState.jumlahPertemuan} Pertemuan x ${formState.durasiPerJp} menit)</td></tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="background-color: #ffff00; color: #000; padding: 8px; font-weight: bold; border: 1px solid #000;">B. KOMPETENSI AWAL</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #000;">
                  <strong>Capaian Pembelajaran Fase (${formState.fase})</strong><br/>
                  <p style="margin: 5px 0 0 0; text-align: justify;">${formState.capaianPembelajaran || '<em>Belum diisi</em>'}</p>
                </td>
              </tr>

              <tr>
                <td style="background-color: #ffff00; color: #000; padding: 8px; font-weight: bold; border: 1px solid #000;">C. PROFIL PELAJAR PANCASILA</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #000;">
                  <ol style="margin: 5px 0 15px 5px; text-align: justify;">
                    <strong>❖ Kompetensi Awal (Prasyarat)</strong>
                    <div style="margin: 5px 0 15px 5px; text-align: justify;">
                      ${formState.kompetensiAwal || 'Peserta didik sudah memiliki pemahaman dasar terkait materi yang akan dipelajari.'}
                    </div>

                    <strong>❖ Profil Pelajar Pancasila</strong>
                    <ul style="margin: 5px 0 15px 0; padding-left: 20px;">
                      ${formState.profilPelajar.length ? formState.profilPelajar.map(p => `<li>${p}</li>`).join('') : '<li>Beriman, bertakwa kepada Tuhan YME, dan berakhlak mulia</li><li>Bergotong royong</li><li>Bernalar kritis</li>'}
                    </ul>

                    <strong>❖ Sarana dan Prasarana</strong>
                    <div style="margin: 5px 0 15px 5px; text-align: justify;">
                      ${formState.saranaPrasarana || 'Ruang kelas, Papan Tulis, Spidol, Proyektor (opsional), Lembar Kerja Peserta Didik (LKPD), dan Buku Paket.'}
                    </div>

                    <strong>❖ Target Peserta Didik</strong>
                    <div style="margin: 5px 0 0 5px;">
                      ${formState.targetPeserta}
                    </div>
                  </ol>
                </td>
              </tr>

              <tr>
                <td style="background-color: #ffff00; color: #000; padding: 8px; font-weight: bold; border: 1px solid #000;">D. SARANA DAN PRASARANA</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #000;">
                  <ul style="margin: 0; padding-left: 20px;">
                    <li>Sumber Belajar: Buku Panduan Guru dan Buku Siswa ${formState.mataPelajaran} untuk Kelas ${formState.kelas}.</li>
                    <li>Alat Pembelajaran: Alat peraga, Komputer / Laptop, Jaringan Internet, Proyektor.</li>
                    <li>Lembar Kerja Peserta Didik (LKPD).</li>
                  </ul>
                </td>
              </tr>

              <tr>
                <td style="background-color: #ffff00; color: #000; padding: 8px; font-weight: bold; border: 1px solid #000;">E. TARGET PESERTA DIDIK</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #000;">
                  <ul style="margin: 0; padding-left: 20px;">
                    <li>${formState.targetPeserta}</li>
                  </ul>
                </td>
              </tr>

              <tr>
                <td style="background-color: #ffff00; color: #000; padding: 8px; font-weight: bold; border: 1px solid #000;">F. JUMLAH PESERTA DIDIK</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #000;">
                  <ul style="margin: 0; padding-left: 20px;">
                    <li>25-30 peserta didik (disesuaikan dengan kondisi sekolah sesungguhnya).</li>
                  </ul>
                </td>
              </tr>

              <tr>
                <td style="background-color: #ffff00; color: #000; padding: 8px; font-weight: bold; border: 1px solid #000;">G. MODEL PEMBELAJARAN</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #000;">
                  <ul style="margin: 0; padding-left: 20px;">
                    <li>Model pembelajaran <strong>${formState.modelPembelajaran}</strong></li>
                    <li>Pendekatan <strong>${formState.curriculumApproach}</strong></li>
                    <li>Metode <strong>${formState.metodePembelajaran.length > 0 ? formState.metodePembelajaran.join(', ') : '-'}</strong></li>
                  </ul>
                </td>
              </tr>

              <!-- KOMPONEN INTI -->
              <tr>
                <td style="background-color: #00b050; color: #000; padding: 8px; font-weight: bold; border: 1px solid #000;">KOMPONEN INTI</td>
              </tr>

              <tr>
                <td style="background-color: #ffff00; color: #000; padding: 8px; font-weight: bold; border: 1px solid #000;">A. TUJUAN KEGIATAN PEMBELAJARAN</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #000;">
                  <ul style="margin: 0; padding-left: 20px; text-align: justify;">
                    <li>Melalui kegiatan pembelajaran dengan model ${formState.modelPembelajaran}, peserta didik mampu mengidentifikasi konsep terkait materi ${formState.topik} dengan benar.</li>
                    <li>Peserta didik mampu menerapkan dan menyajikan hasil pekerjaannya di depan kelas dengan percaya diri.</li>
                  </ul>
                </td>
              </tr>

              <tr>
                <td style="background-color: #ffff00; color: #000; padding: 8px; font-weight: bold; border: 1px solid #000;">B. PEMAHAMAN BERMAKNA</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #000;">
                  <ul style="margin: 0; padding-left: 20px;">
                    <li>Peserta didik mampu memahami relevansi topik ${formState.topik} dalam kehidupan mereka.</li>
                  </ul>
                </td>
              </tr>

              <tr>
                <td style="background-color: #ffff00; color: #000; padding: 8px; font-weight: bold; border: 1px solid #000;">C. PERTANYAAN PEMANTIK</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #000;">
                  <ul style="margin: 0; padding-left: 20px;">
                    <li>Coba perhatikan gambar / situasi ini! Apa yang kalian lihat?</li>
                    <li>Tahukah kalian bagaimana konsep ini bekerja di sekeliling kita?</li>
                  </ul>
                </td>
              </tr>

              <tr>
                <td style="background-color: #ffff00; color: #000; padding: 8px; font-weight: bold; border: 1px solid #000;">D. KEGIATAN PEMBELAJARAN</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #000;">
                  <strong>❖ Kegiatan Pendahuluan (15 Menit)</strong>
                  <ol style="margin: 5px 0 15px 0; padding-left: 20px; text-align: justify;">
                    <li><strong>Orientasi:</strong> Guru membuka pertemuan dengan salam pembuka, berdoa bersama, dan memeriksa kehadiran peserta didik.</li>
                    <li><strong>Apersepsi:</strong> Guru mengaitkan materi/tema/kegiatan pembelajaran yang akan dilakukan dengan pengalaman peserta didik sebelumnya.</li>
                    <li><strong>Motivasi:</strong> Guru memberikan gambaran tentang manfaat mempelajari materi <strong>${formState.topik}</strong> dalam kehidupan sehari-hari (Pertanyaan Pemantik).</li>
                    <li><strong>Pemberian Acuan:</strong> Guru menyampaikan tujuan pembelajaran, cakupan materi, dan mekanisme pelaksanaan kegiatan (pembagian kelompok, tata cara penilaian).</li>
                  </ol>

                  <strong>❖ Kegiatan Inti (70 Menit)</strong>
                  <div style="margin-left: 5px; margin-bottom: 15px;">
                    <strong><em>Pendekatan/Model: ${formState.modelPembelajaran}</em></strong>
                  </div>
                  <div style="margin: 5px 0 15px 5px; text-align: justify;">
                    ${selectedModel?.sintaks_inti?.length
                      ? selectedModel.sintaks_inti.map((s: string) => `<div style="margin-bottom: 10px;">${getDetailedSintaks(s, formState.topik)}</div>`).join('')
                      : `<div style="margin-bottom: 10px;">${getDetailedSintaks("Fase 1: Orientasi peserta didik pada masalah", formState.topik)}</div>
                         <div style="margin-bottom: 10px;">${getDetailedSintaks("Fase 2: Mengorganisasikan peserta didik untuk belajar", formState.topik)}</div>
                         <div style="margin-bottom: 10px;">${getDetailedSintaks("Fase 3: Membimbing penyelidikan mandiri dan kelompok", formState.topik)}</div>
                         <div style="margin-bottom: 10px;">${getDetailedSintaks("Fase 4: Mengembangkan dan menyajikan hasil karya", formState.topik)}</div>
                         <div style="margin-bottom: 10px;">${getDetailedSintaks("Fase 5: Menganalisis dan mengevaluasi proses pemecahan masalah", formState.topik)}</div>`
                    }
                  </div>

                  <strong>❖ Kegiatan Penutup (15 Menit)</strong>
                  <ol style="margin: 5px 0 0 0; padding-left: 20px; text-align: justify;">
                    <li><strong>Evaluasi & Kesimpulan:</strong> Peserta didik bersama guru menyimpulkan materi pembelajaran dan hal-hal penting yang telah dipelajari.</li>
                    <li><strong>Refleksi:</strong> Guru memberikan penguatan, serta menanyakan kembali bagian mana yang paling disukai dan paling menantang dari materi hari ini.</li>
                    <li><strong>Tindak Lanjut & Penugasan:</strong> Guru memberikan asesmen formatif (LKPD/Kuis) atau tugas pengayaan untuk dikerjakan di rumah.</li>
                    <li><strong>Salam Penutup:</strong> Guru menginformasikan rencana kegiatan pembelajaran untuk pertemuan berikutnya, ditutup dengan doa dan salam.</li>
                  </ol>
                </td>
              </tr>

              <tr>
                <td style="background-color: #ffff00; color: #000; padding: 8px; font-weight: bold; border: 1px solid #000;">E. ASESMEN</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #000;">
                  <p style="margin: 0 0 5px 0;"><strong>A. Penilaian Sikap</strong></p>
                  <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10pt;">
                    <tr>
                      <th rowspan="2" style="border: 1px solid #000; padding: 4px; text-align: center;">No</th>
                      <th rowspan="2" style="border: 1px solid #000; padding: 4px; text-align: center;">Nama Peserta Didik</th>
                      <th colspan="3" style="border: 1px solid #000; padding: 4px; text-align: center;">Profil Pelajar Pancasila</th>
                    </tr>
                    <tr>
                      <td style="border: 1px solid #000; padding: 4px; text-align: center;">Mandiri</td>
                      <td style="border: 1px solid #000; padding: 4px; text-align: center;">Bernalar Kritis</td>
                      <td style="border: 1px solid #000; padding: 4px; text-align: center;">Gotong Royong</td>
                    </tr>
                    <tr><td style="border: 1px solid #000; padding: 4px; text-align: center;">1</td><td style="border: 1px solid #000; padding: 4px;">. . . . . . . . . . . . . . . . . . . .</td><td style="border: 1px solid #000; padding: 4px;"></td><td style="border: 1px solid #000; padding: 4px;"></td><td style="border: 1px solid #000; padding: 4px;"></td></tr>
                    <tr><td style="border: 1px solid #000; padding: 4px; text-align: center;">2</td><td style="border: 1px solid #000; padding: 4px;">. . . . . . . . . . . . . . . . . . . .</td><td style="border: 1px solid #000; padding: 4px;"></td><td style="border: 1px solid #000; padding: 4px;"></td><td style="border: 1px solid #000; padding: 4px;"></td></tr>
                  </table>
                  
                  <p style="margin: 0 0 5px 0;"><strong>B. Penilaian Keterampilan</strong></p>
                  <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10pt;">
                    <tr>
                      <th rowspan="2" style="border: 1px solid #000; padding: 4px; text-align: center; width: 5%;">No</th>
                      <th rowspan="2" style="border: 1px solid #000; padding: 4px; text-align: center; width: 35%;">Nama</th>
                      <th colspan="3" style="border: 1px solid #000; padding: 4px; text-align: center; width: 45%;">Aspek Penilaian</th>
                      <th rowspan="2" style="border: 1px solid #000; padding: 4px; text-align: center; width: 15%;">Rata-rata</th>
                    </tr>
                    <tr>
                      <td style="border: 1px solid #000; padding: 4px; text-align: center;">Ketepatan (1-3)</td>
                      <td style="border: 1px solid #000; padding: 4px; text-align: center;">Kerapihan (1-3)</td>
                      <td style="border: 1px solid #000; padding: 4px; text-align: center;">Presentasi (1-3)</td>
                    </tr>
                    <tr><td style="border: 1px solid #000; padding: 4px; text-align: center;">1</td><td style="border: 1px solid #000; padding: 4px;">. . . . . . . . . . . . . . . . . . . .</td><td style="border: 1px solid #000; padding: 4px;"></td><td style="border: 1px solid #000; padding: 4px;"></td><td style="border: 1px solid #000; padding: 4px;"></td><td style="border: 1px solid #000; padding: 4px;"></td></tr>
                    <tr><td style="border: 1px solid #000; padding: 4px; text-align: center;">2</td><td style="border: 1px solid #000; padding: 4px;">. . . . . . . . . . . . . . . . . . . .</td><td style="border: 1px solid #000; padding: 4px;"></td><td style="border: 1px solid #000; padding: 4px;"></td><td style="border: 1px solid #000; padding: 4px;"></td><td style="border: 1px solid #000; padding: 4px;"></td></tr>
                  </table>
                  <p style="margin: 0 0 20px 0; font-size: 10pt;"><em>Keterangan: 1 (Kurang), 2 (Cukup), 3 (Baik).</em></p>

                  <p style="margin: 0 0 5px 0;"><strong>C. Penilaian Pengetahuan</strong></p>
                  <p style="margin: 0 0 5px 0; font-size: 10pt;">Instrumen: Lembar Evaluasi (Pilihan Ganda & Isian Singkat)</p>
                  <div style="background-color: #f8fafc; border: 1px solid #ccc; padding: 10px; font-size: 10pt;">
                    <strong>Teknik Penilaian:</strong><br/>
                    - Pilihan Ganda: Soal benar = 1. Jumlah soal = 5. (Maks = 5)<br/>
                    - Isian Singkat: Soal benar = 2. Jumlah soal = 5. (Maks = 10)<br/>
                    <em>Nilai Akhir = (Total Skor / 15) x 100</em>
                  </div>
                </td>
              </tr>

              <tr>
                <td style="background-color: #ffff00; color: #000; padding: 8px; font-weight: bold; border: 1px solid #000;">F. REFLEKSI</td>
              </tr>
              <tr>
                <td style="padding: 8px; border: 1px solid #000;">
                  <strong>Refleksi Guru:</strong>
                  <ol style="margin: 5px 0 15px 0; padding-left: 20px;">
                    <li>Bagaimanakah reaksi peserta didik mengikuti pembelajaran pada materi ini?</li>
                    <li>Apakah yang menjadi kendala selama pembelajaran berlangsung?</li>
                    <li>Apa poin penting yang menjadi catatan dalam menyelesaikan permasalahan ini?</li>
                  </ol>

                  <strong>Refleksi Peserta Didik:</strong>
                  <table style="width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 10pt; text-align: center;">
                    <tr>
                      <th style="border: 1px solid #000; padding: 8px; background-color: #f1f5f9; text-align: left;">Pernyataan</th>
                      <th style="border: 1px solid #000; padding: 8px; background-color: #f1f5f9;">🙁<br/>Tidak Paham</th>
                      <th style="border: 1px solid #000; padding: 8px; background-color: #f1f5f9;">😐<br/>Cukup Paham</th>
                      <th style="border: 1px solid #000; padding: 8px; background-color: #f1f5f9;">😃<br/>Sangat Paham</th>
                    </tr>
                    <tr>
                      <td style="border: 1px solid #000; padding: 8px; text-align: left;">Saya senang dengan pembelajaran hari ini.</td>
                      <td style="border: 1px solid #000; padding: 8px;"></td>
                      <td style="border: 1px solid #000; padding: 8px;"></td>
                      <td style="border: 1px solid #000; padding: 8px;"></td>
                    </tr>
                    <tr>
                      <td style="border: 1px solid #000; padding: 8px; text-align: left;">Saya dapat memahami materi <strong>${formState.topik}</strong>.</td>
                      <td style="border: 1px solid #000; padding: 8px;"></td>
                      <td style="border: 1px solid #000; padding: 8px;"></td>
                      <td style="border: 1px solid #000; padding: 8px;"></td>
                    </tr>
                    <tr>
                      <td style="border: 1px solid #000; padding: 8px; text-align: left;">Saya dapat mengerjakan tugas dengan baik.</td>
                      <td style="border: 1px solid #000; padding: 8px;"></td>
                      <td style="border: 1px solid #000; padding: 8px;"></td>
                      <td style="border: 1px solid #000; padding: 8px;"></td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="background-color: #ffff00; color: #000; padding: 8px; font-weight: bold; border: 1px solid #000;">G. KEGIATAN PENGAYAAN DAN REMEDIAL</td>
              </tr>
              <tr>
                <td style="padding: 15px; border: 1px solid #000; font-size: 11pt;">
                  <div style="margin-bottom: 15px;">
                    <strong>1. Pengayaan</strong><br/>
                    Diberikan kepada peserta didik yang telah mencapai ketuntasan/tujuan pembelajaran (Pencapaian Tinggi/CIBI). Peserta didik diminta untuk:
                    <ul style="margin: 5px 0 0 0; padding-left: 20px;">
                      <li>Mengeksplorasi materi lanjutan terkait <strong>${formState.topik}</strong>.</li>
                      <li>Menjadi tutor sebaya bagi teman yang membutuhkan bantuan.</li>
                    </ul>
                  </div>
                  <div>
                    <strong>2. Remedial</strong><br/>
                    Diberikan kepada peserta didik yang belum mencapai ketuntasan. Guru melakukan:
                    <ul style="margin: 5px 0 0 0; padding-left: 20px;">
                      <li>Bimbingan individu atau kelompok kecil untuk materi dasar yang belum dipahami.</li>
                      <li>Pemberian tugas dengan tingkat kesulitan yang disesuaikan (<em>scaffolding</em>).</li>
                    </ul>
                  </div>
                </td>
              </tr>

              <!-- LAMPIRAN -->
              <tr>
                <td style="background-color: #00b050; color: #000; padding: 8px; font-weight: bold; border: 1px solid #000;">LAMPIRAN</td>
              </tr>
              <tr>
                <td style="background-color: #ffff00; color: #000; padding: 8px; font-weight: bold; border: 1px solid #000;">A. LEMBAR KERJA PESERTA DIDIK (LKPD) & LEMBAR EVALUASI</td>
              </tr>
              <tr>
                <td style="padding: 20px; border: 1px solid #000;">
                  
                  <div style="border: 2px dashed #000; padding: 15px; margin-bottom: 20px; border-radius: 8px;">
                    <h3 style="text-align: center; margin: 0 0 15px 0;">LEMBAR KERJA PESERTA DIDIK (LKPD)</h3>
                    <table style="width: 100%; font-size: 11pt; margin-bottom: 15px;">
                      <tr><td style="width: 15%;">Nama Kelompok</td><td style="width: 2%;">:</td><td>....................................................................</td></tr>
                      <tr><td>Kelas</td><td>:</td><td>....................................................................</td></tr>
                    </table>
                    <strong>Petunjuk:</strong>
                    <ol style="margin: 5px 0 15px 0; padding-left: 20px;">
                      <li>Diskusikan bersama teman kelompokmu!</li>
                      <li>Perhatikan instruksi guru dengan seksama.</li>
                      <li>Tuliskan hasil diskusi pada kolom di bawah ini.</li>
                    </ol>
                    <div style="width: 100%; height: 150px; border: 1px solid #ccc; background: #fafafa;"></div>
                  </div>

                  <div style="border: 2px dashed #000; padding: 15px; border-radius: 8px;">
                    <table style="width: 100%; font-size: 11pt; margin-bottom: 15px;">
                      <tr>
                        <td style="width: 50%;">
                          <table style="width: 100%;">
                            <tr><td style="width: 20%;">Nama</td><td style="width: 2%;">:</td><td>................................................</td></tr>
                            <tr><td>No Absen</td><td>:</td><td>................................................</td></tr>
                          </table>
                        </td>
                        <td style="width: 50%; text-align: right;">
                          <div style="display: inline-block; border: 1px solid #000; padding: 10px 20px;"><strong>NILAI:</strong></div>
                        </td>
                      </tr>
                    </table>
                    
                    <strong>LEMBAR EVALUASI PENGETAHUAN</strong><br/>
                    <em>A. Pilihan Ganda</em><br/>
                    Pilihlah salah satu jawaban yang paling tepat (a, b, c, atau d)!<br/>
                    1. ....................................................................................<br/>
                       a. ......... b. ......... c. ......... d. .........<br/><br/>
                    2. ....................................................................................<br/>
                       a. ......... b. ......... c. ......... d. .........<br/><br/>

                    <em>B. Isian Singkat</em><br/>
                    Jawablah pertanyaan di bawah ini dengan tepat!<br/>
                    1. ....................................................................................<br/><br/>
                    2. ....................................................................................
                  </div>

                </td>
              </tr>
              <tr>
              <tr>
                <td style="background-color: #ffff00; color: #000; padding: 8px; font-weight: bold; border: 1px solid #000;">D. DAFTAR PUSTAKA</td>
              </tr>
              <tr>
                <td style="padding: 15px; border: 1px solid #000; font-size: 11pt;">
                  <ul style="margin: 0; padding-left: 20px;">
                    <li>Kementerian Pendidikan, Kebudayaan, Riset, Dan Teknologi Republik Indonesia. 2021. Buku Panduan Guru dan Buku Siswa Kurikulum Merdeka. Jakarta.</li>
                    <li>Badan Standar, Kurikulum, dan Asesmen Pendidikan (BSKAP). 2024. Capaian Pembelajaran Kurikulum Merdeka. Jakarta.</li>
                  </ul>
                </td>
              </tr>

            </table>

            <!-- TANDA TANGAN -->
            <table style="width: 100%; margin-top: 50px; font-size: 11pt; border: none; page-break-inside: avoid;">
              <tr>
                <td style="width: 50%; text-align: center; border: none; padding: 10px;">
                  Mengetahui,<br/>
                  Kepala ${formState.satuanPendidikan}<br/><br/><br/><br/><br/>
                  <strong><u>(..........................................)</u></strong><br/>
                  NIP. .....................................
                </td>
                <td style="width: 50%; text-align: center; border: none; padding: 10px;">
                  ........................, ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}<br/>
                  Guru Kelas / Mata Pelajaran<br/><br/><br/><br/><br/>
                  <strong><u>${formState.guru}</u></strong><br/>
                  NIP/NIM. .....................................
                </td>
              </tr>
            </table>

          </div>
        `;

        setGeneratedDocument(htmlTemplate);
        
        // Save to Supabase (opsional)
        try {
          await supabase.from('lesson_plans').insert({
            user_id: user?.id,
            document_type: formState.documentType,
            curriculum_approach: formState.curriculumApproach,
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
              profil: formState.profilPelajar,
              waktu: { pertemuan: formState.jumlahPertemuan, jp: formState.jpPerPertemuan, durasi: formState.durasiPerJp },
              model: formState.modelPembelajaran,
              metode: formState.metodePembelajaran
            },
            generated_content: htmlTemplate
          });
        } catch(e) { console.error('Error saving:', e) }
        
      } catch (error) {
        console.error(error);
      } finally {
        setIsGenerating(false);
      }
    }, 800); // 800ms loading effect
  };

  const handleCopy = () => {
    if (!previewRef.current) return;
    navigator.clipboard.writeText(previewRef.current.innerText);
    alert('Teks berhasil disalin!');
  };

  const handlePrint = () => {
    const printContent = previewRef.current?.innerHTML;
    if (!printContent) return;
    
    const printWindow = window.open('', '', 'height=600,width=800');
    if (!printWindow) return;
    
    printWindow.document.write('<html><head><title>Cetak Modul Ajar</title>');
    printWindow.document.write('<style>body{font-family:sans-serif;line-height:1.6;padding:20px;} h1,h2,h3{color:#333;} table{width:100%;border-collapse:collapse;margin-bottom:1rem;} th,td{border:1px solid #ddd;padding:8px;text-align:left;}</style>');
    printWindow.document.write('</head><body >');
    printWindow.document.write(printContent);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    // Use setTimeout to ensure styles are loaded
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleExportWord = () => {
    const printContent = previewRef.current?.innerHTML;
    if (!printContent) return;

    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML To Doc</title></head><body>";
    const footer = "</body></html>";
    const sourceHTML = header + printContent + footer;
    
    // Gunakan Blob untuk kompatibilitas lebih baik
    const blob = new Blob(['\\ufeff', sourceHTML], {
      type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${formState.documentType}_${formState.mataPelajaran}_Kelas${formState.kelas}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const PROFIL_OPTIONS = ['Beriman & Bertakwa', 'Berkebinekaan Global', 'Bergotong Royong', 'Mandiri', 'Bernalar Kritis', 'Kreatif'];
  const METODE_OPTIONS = ['Ceramah', 'Diskusi', 'Tanya Jawab', 'Demonstrasi', 'Eksperimen', 'Proyek', 'Role Playing', 'Penugasan'];

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 pb-20 lg:pb-0">
      {/* Kolom Kiri: Form */}
      <div className="w-full lg:w-[45%] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col h-[calc(100vh-6rem)] lg:h-[calc(100vh-8rem)] overflow-hidden">
        <div className="p-4 lg:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 shrink-0">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500" />
            Modul Ajar Creator
          </h1>
          <p className="text-sm text-slate-500 mt-1">Isi parameter untuk menghasilkan dokumen otomatis menggunakan AI.</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-8 scrollbar-hide">
          
          {/* Step 1: Jenis */}
          <section>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">1</span> Jenis Dokumen</h3>
            <div className="grid grid-cols-2 gap-3">
              {['Modul Ajar', 'RPP'].map(type => (
                <button
                  key={type}
                  onClick={() => handleInputChange('documentType', type)}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    formState.documentType === type 
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' 
                    : 'border-slate-200 text-slate-600 hover:border-indigo-200 dark:border-slate-700 dark:text-slate-400'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </section>

          {/* Step 2: Kurikulum */}
          <section>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">2</span> Pendekatan Kurikulum</h3>
            <div className="grid grid-cols-3 gap-3">
              {['Merdeka', 'Berbasis Cinta', 'Hybrid'].map(type => (
                <button
                  key={type}
                  onClick={() => handleInputChange('curriculumApproach', type)}
                  className={`p-2 lg:p-3 rounded-xl border-2 text-[10px] lg:text-xs font-medium transition-all text-center ${
                    formState.curriculumApproach === type 
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' 
                    : 'border-slate-200 text-slate-600 hover:border-emerald-200 dark:border-slate-700 dark:text-slate-400'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </section>

          {/* Step 3: Identitas */}
          <section>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">3</span> Identitas Modul</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Kelas</label>
                  <select 
                    value={formState.kelas}
                    onChange={(e) => handleInputChange('kelas', e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  >
                    {[1,2,3,4,5,6].map(k => <option key={k} value={k}>Kelas {k}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Fase</label>
                  <input 
                    type="text" 
                    value={formState.fase} 
                    readOnly
                    className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-100 text-sm text-slate-500 cursor-not-allowed dark:bg-slate-800/50 dark:border-slate-700"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Mata Pelajaran <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formState.mataPelajaran}
                  onChange={(e) => handleInputChange('mataPelajaran', e.target.value)}
                  placeholder="Contoh: Matematika"
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Topik / Materi Pokok <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formState.topik}
                  onChange={(e) => handleInputChange('topik', e.target.value)}
                  placeholder="Contoh: Penjumlahan Bilangan Cacah"
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
            </div>
          </section>

          {/* Step 4: Informasi Umum Tambahan */}
          <section>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">4</span> Informasi Umum (Opsional)</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Target Peserta Didik</label>
                <select 
                  value={formState.targetPeserta}
                  onChange={(e) => handleInputChange('targetPeserta', e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                >
                  <option value="Reguler/Tipikal (Peserta didik umum, tidak ada kesulitan belajar)">Reguler/Tipikal</option>
                  <option value="Peserta Didik dengan Kesulitan Belajar (Memiliki gaya belajar terbatas, misal: visual/audio)">Siswa Kesulitan Belajar</option>
                  <option value="Peserta Didik Cerdas Istimewa/Bakat Istimewa (CIBI) (Dapat mencerna materi dengan cepat)">Cerdas Istimewa (CIBI)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Kompetensi Awal (Prasyarat)</label>
                <textarea 
                  value={formState.kompetensiAwal}
                  onChange={(e) => handleInputChange('kompetensiAwal', e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Pengetahuan yg wajib dimiliki sblm belajar ini. Kosongkan untuk pakai default."
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Sarana, Prasarana & Media</label>
                <textarea 
                  value={formState.saranaPrasarana}
                  onChange={(e) => handleInputChange('saranaPrasarana', e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Alat/bahan ajar yg dipakai (Proyektor, LKPD, dll). Kosongkan untuk pakai default."
                />
              </div>
            </div>
          </section>

          {/* Step 5: Komponen Pembelajaran */}
          <section>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">5</span> Komponen Inti</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-end mb-1">
                  <label className="block text-xs text-slate-500 dark:text-slate-400">Capaian Pembelajaran</label>
                  <button 
                    onClick={generateCP}
                    disabled={isGeneratingCP || !formState.mataPelajaran}
                    className="text-[10px] lg:text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md transition-colors disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3" />
                    {isGeneratingCP ? 'Mencari CP...' : '✨ Ambil CP dari Database'}
                  </button>
                </div>
                <textarea 
                  value={formState.capaianPembelajaran}
                  onChange={(e) => handleInputChange('capaianPembelajaran', e.target.value)}
                  rows={4}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white resize-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Ketik capaian pembelajaran atau gunakan fitur auto generate (AI akan menyesuaikan dengan mapel & fase)."
                />
              </div>

              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2">Profil Pelajar Pancasila</label>
                <div className="flex flex-wrap gap-2">
                  {PROFIL_OPTIONS.map(profil => (
                    <button
                      key={profil}
                      onClick={() => handleProfilToggle(profil)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        formState.profilPelajar.includes(profil)
                        ? 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/40 dark:border-amber-700/60 dark:text-amber-200 scale-105 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                      }`}
                    >
                      {profil}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Step 6: Alokasi Waktu */}
          <section>
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">6</span> Alokasi Waktu</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Pertemuan</label>
                <input 
                  type="number" 
                  value={formState.jumlahPertemuan}
                  onChange={(e) => handleInputChange('jumlahPertemuan', parseInt(e.target.value) || 1)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-sm text-center dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">JP / Pertemuan</label>
                <input 
                  type="number" 
                  value={formState.jpPerPertemuan}
                  onChange={(e) => handleInputChange('jpPerPertemuan', parseInt(e.target.value) || 1)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-sm text-center dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Total JP</label>
                <input 
                  type="text" 
                  readOnly
                  value={`${formState.jumlahPertemuan * formState.jpPerPertemuan} JP`}
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 text-sm text-center font-bold dark:bg-slate-800/50 dark:border-slate-700"
                />
              </div>
            </div>
          </section>

          {/* Step 7: Metode */}
          <section className="pb-4">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">7</span> Model & Metode</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Model Pembelajaran</label>
                <select 
                  value={formState.modelPembelajaran}
                  onChange={(e) => handleInputChange('modelPembelajaran', e.target.value)}
                  disabled={isLoadingModels}
                  className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:opacity-50"
                >
                  {models.length > 0 ? (
                    models.map(m => (
                      <option key={m.id} value={m.nama_model}>{m.nama_model}</option>
                    ))
                  ) : (
                    <option value="Tatap Muka">Tatap Muka</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-2">Metode Pembelajaran</label>
                <div className="flex flex-wrap gap-2">
                  {METODE_OPTIONS.map(metode => (
                    <button
                      key={metode}
                      onClick={() => handleMetodeToggle(metode)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        formState.metodePembelajaran.includes(metode)
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-700/60 dark:text-emerald-200 scale-105 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                      }`}
                    >
                      {metode}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

        </div>
        
        {/* Submit Button */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <button
            onClick={generateModulAjar}
            disabled={isGenerating || !formState.mataPelajaran || !formState.topik}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-emerald-500 hover:from-indigo-600 hover:to-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Dokumen Sedang Disusun...
              </span>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                ✨ Buat {formState.documentType}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Kolom Kanan: Preview */}
      <div className="flex-1 bg-slate-100 dark:bg-slate-950/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden flex flex-col h-[calc(100vh-6rem)] lg:h-[calc(100vh-8rem)]">
        {/* Header Preview */}
        <div className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium text-sm">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            Pratinjau Dokumen
          </div>
          
          <div className="flex items-center gap-1">
            <button onClick={handleCopy} disabled={!generatedDocument} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors disabled:opacity-50" title="Salin Teks">
              <Copy className="w-4 h-4" />
            </button>
            <button onClick={handlePrint} disabled={!generatedDocument} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium" title="Cetak / Simpan sebagai PDF">
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">PDF</span>
            </button>
            <button onClick={handleExportWord} disabled={!generatedDocument} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 transition-colors disabled:opacity-50 flex items-center gap-1.5 text-xs font-medium" title="Download Format Ms. Word (.doc)">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Word</span>
            </button>
          </div>
        </div>

        {/* Content Preview */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex justify-center bg-slate-200/50 dark:bg-slate-950/50">
          {generatedDocument ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              ref={previewRef}
              className="w-full max-w-4xl bg-white p-8 md:p-12 lg:p-16 shadow-xl rounded-lg border border-slate-200 dark:border-slate-800 min-h-full text-black focus:outline-none"
              style={{
                fontFamily: "'Times New Roman', Times, serif"
              }}
              contentEditable
              suppressContentEditableWarning
              dangerouslySetInnerHTML={{ __html: generatedDocument }}
            />
          ) : (
            <div className="w-full max-w-4xl bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-lg min-h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 p-8 text-center space-y-4">
              <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-2 animate-pulse">
                <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400">Siap Membuat Dokumen</h3>
              <p className="text-sm max-w-sm">
                Isi parameter di sebelah kiri lalu klik tombol <strong>✨ Buat {formState.documentType}</strong> untuk melihat hasilnya di sini.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModulAjarCreatorPage;
