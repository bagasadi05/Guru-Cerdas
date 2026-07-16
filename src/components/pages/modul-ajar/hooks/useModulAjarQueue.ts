import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../../../services/supabase';
import { generateOpenRouterJson } from '../../../../services/openRouterService';
import { buildHtmlTemplate } from '../utils/template';
import { FormState } from '../types';

export const useModulAjarQueue = (
  formState: FormState,
  user: any,
  setGeneratedDocument: (doc: string) => void,
  onCompleted: () => void,
  logoBase64: string
) => {
  const [queueJobId, setQueueJobId] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<'idle' | 'pending' | 'processing' | 'completed' | 'failed'>('idle');
  const [queuePosition, setQueuePosition] = useState<number>(0);
  const [activeQueueUser, setActiveQueueUser] = useState<string>('');

  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      cleanupQueue();
    };
  }, []);

  const startQueueAndGenerate = async () => {
    if (!formState.mataPelajaran || !formState.topik) {
      alert('Mata Pelajaran dan Topik/Materi wajib diisi.');
      return;
    }

    setQueueStatus('pending');
    setQueuePosition(0);
    setActiveQueueUser('');

    try {
      const { data: job, error: insertError } = await supabase
        .from('ai_generation_queue')
        .insert({
          user_id: user?.id || '',
          user_name: user?.name || 'Guru Cerdas',
          job_type: 'modul_ajar',
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) throw insertError;
      if (!job) throw new Error('Gagal mendaftarkan antrian.');

      setQueueJobId(job.id);

      const channel = supabase
        .channel(`ai_queue_${job.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ai_generation_queue' },
          async () => {
            await checkQueuePosition(job.id);
          }
        )
        .subscribe();

      subscriptionRef.current = channel;
      await checkQueuePosition(job.id);

    } catch (err: any) {
      console.error(err);
      setQueueStatus('failed');
      alert(`Gagal memulai antrian: ${err.message}`);
    }
  };

  const checkQueuePosition = async (currentJobId: string) => {
    try {
      const timeoutThreshold = new Date(Date.now() - 90000).toISOString();
      await supabase
        .from('ai_generation_queue')
        .update({ status: 'failed', error_message: 'Timeout processing' })
        .eq('status', 'processing')
        .lt('updated_at', timeoutThreshold);

      const { data: activeJobs, error } = await supabase
        .from('ai_generation_queue')
        .select('id, user_name, status, created_at')
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!activeJobs) return;

      const ourIndex = activeJobs.findIndex(j => j.id === currentJobId);

      if (ourIndex === -1) {
        const { data: finalJob } = await supabase
          .from('ai_generation_queue')
          .select('status, result_content, error_message')
          .eq('id', currentJobId)
          .maybeSingle();

        if (finalJob) {
          if (finalJob.status === 'completed' && finalJob.result_content) {
            setGeneratedDocument(finalJob.result_content);
            setQueueStatus('completed');
            cleanupQueue();
            onCompleted();
          } else if (finalJob.status === 'failed') {
            setQueueStatus('failed');
            alert(`Penyusunan modul ajar gagal: ${finalJob.error_message}`);
            cleanupQueue();
          }
        }
        return;
      }

      setQueuePosition(ourIndex + 1);

      const processingJob = activeJobs.find(j => j.status === 'processing');

      if (processingJob) {
        setActiveQueueUser(processingJob.user_name);
        if (processingJob.id === currentJobId) {
          setQueueStatus('processing');
        } else {
          setQueueStatus('pending');
        }
      } else {
        setActiveQueueUser('');
        if (ourIndex === 0) {
          setQueueStatus('processing');
          const { error: lockError } = await supabase
            .from('ai_generation_queue')
            .update({ status: 'processing', updated_at: new Date().toISOString() })
            .eq('id', currentJobId);

          if (!lockError) {
            await executeAIGeneration(currentJobId);
          }
        }
      }
    } catch (err) {
      console.error('Error checking queue position:', err);
    }
  };

  const executeAIGeneration = async (currentJobId: string) => {
    try {
      const prompt = `Buatkan konten lengkap Modul Ajar Kurikulum Merdeka untuk parameter berikut:
- Mata Pelajaran: ${formState.mataPelajaran}
- Kelas: ${formState.kelas} (Fase ${formState.fase})
- Kurikulum: ${formState.curriculumApproach}
- Topik/Materi Pokok: ${formState.topik}
- Model Pembelajaran: ${formState.modelPembelajaran}
- Metode Pembelajaran: ${formState.metodePembelajaran.join(', ') || 'Tanya Jawab, Diskusi'}
- Profil Pelajar Pancasila: ${formState.profilPelajar.join(', ') || 'Mandiri, Bernalar Kritis'}
- Kompetensi Awal (Prasyarat): ${formState.kompetensiAwal || 'Peserta didik sudah memiliki pemahaman dasar terkait materi ini.'}
- Sarana & Prasarana: ${formState.saranaPrasarana || 'Ruang kelas, Papan Tulis, LKPD, Buku Paket.'}
- Capaian Pembelajaran: ${formState.capaianPembelajaran || 'Peserta didik mampu memahami materi ini.'}
- Alokasi Waktu: ${formState.jumlahPertemuan} Pertemuan x ${formState.jpPerPertemuan} JP

Hasilkan respon dalam bentuk JSON terstruktur dengan kunci-kunci berikut (gunakan Bahasa Indonesia, berikan penjelasan rinci dan akademis untuk setiap bagian):
{
  "tujuanPembelajaran": string[],
  "pemahamanBermakna": string[],
  "pertanyaanPemantik": string[],
  "kegiatanPendahuluan": string[],
  "kegiatanInti": Array<{ fase: string, kegiatanGuru: string, kegiatanSiswa: string }>,
  "kegiatanPenutup": string[],
  "asesmenSikap": string[],
  "asesmenKeterampilan": string[],
  "asesmenPengetahuan": string,
  "pengayaan": string[],
  "remedial": string[],
  "lkpdTugas": string,
  "soalEvaluasi": string,
  "daftarPustaka": string[]
}
`;

      const systemInstruction = `Anda adalah asisten guru AI yang cerdas dan ahli dalam merancang perangkat pembelajaran kurikulum merdeka di sekolah dasar/madrasah ibtidaiyah. Buat rancangan yang rinci dan terstruktur sesuai standar pendidikan nasional.`;

      const result = await generateOpenRouterJson<any>(prompt, systemInstruction);
      const totalJP = formState.jumlahPertemuan * formState.jpPerPertemuan;
      const htmlTemplate = buildHtmlTemplate(formState, result, totalJP, logoBase64);

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
          metode: formState.metodePembelajaran,
          alokasi: { pendahuluan: formState.alokasiPendahuluan, inti: formState.alokasiInti, penutup: formState.alokasiPenutup },
          rubrik: formState.rubrikAsesmen as any
        },
        generated_content: htmlTemplate
      });

      await supabase
        .from('ai_generation_queue')
        .update({ 
          status: 'completed', 
          result_content: htmlTemplate,
          updated_at: new Date().toISOString() 
        })
        .eq('id', currentJobId);

      setGeneratedDocument(htmlTemplate);
      setQueueStatus('completed');
      cleanupQueue();
      onCompleted();

    } catch (err: any) {
      console.error('AI Generation error:', err);
      await supabase
        .from('ai_generation_queue')
        .update({ 
          status: 'failed', 
          error_message: err.message || 'Unknown AI error',
          updated_at: new Date().toISOString()
        })
        .eq('id', currentJobId);
      
      setQueueStatus('failed');
      alert(`Gagal membuat modul ajar: ${err.message}`);
      cleanupQueue();
    }
  };

  const cleanupQueue = () => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    setQueueJobId(null);
  };

  return {
    queueStatus,
    queuePosition,
    activeQueueUser,
    startQueueAndGenerate,
    cleanupQueue
  };
};
