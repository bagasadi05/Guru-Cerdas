import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import { Loader2, Plus, Edit2, Trash2, Search, X, CheckCircle2, XCircle, Sparkles, Activity, RefreshCw } from 'lucide-react';

interface BoilerplateFormState {
  id?: string;
  mata_pelajaran: string;
  topik: string;
  fase: string;
  tujuan_pembelajaran: string; // multiline
  pemahaman_bermakna: string; // multiline
  pertanyaan_pemantik: string; // multiline
  lkpd_tugas: string;
  soal_evaluasi: string;
  pengayaan: string; // multiline
  remedial: string; // multiline
  daftar_pustaka: string; // multiline
  is_verified: boolean;
  content_status?: string;
  sumber_regulasi: string;
}

const emptyFormState: BoilerplateFormState = {
  mata_pelajaran: '',
  topik: '',
  fase: '',
  tujuan_pembelajaran: '',
  pemahaman_bermakna: '',
  pertanyaan_pemantik: '',
  lkpd_tugas: '',
  soal_evaluasi: '',
  pengayaan: '',
  remedial: '',
  daftar_pustaka: '',
  is_verified: true,
  content_status: 'verified',
  sumber_regulasi: ''
};

export const ModulAjarBankTab: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'semua' | 'verified' | 'draft_ai' | 'draft_manual'>('semua');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<BoilerplateFormState>(emptyFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [editingItemMetadata, setEditingItemMetadata] = useState<any>(null);

  // AI Queue State
  const [aiJobs, setAiJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  useEffect(() => {
    fetchData();
    fetchAiJobs();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('ref_boilerplate_topik')
        .select('*')
        .order('mata_pelajaran', { ascending: true });
      
      if (!error && result) {
        setData(result);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAiJobs = async () => {
    setLoadingJobs(true);
    try {
      const { data: jobs, error } = await supabase
        .from('ai_content_jobs')
        .select(`
          id, status, request_fingerprint, attempt_count, 
          created_at, error_detail, provider
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!error && jobs) {
        setAiJobs(jobs);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormState(emptyFormState);
    setFormError(null);
    setEditingItemMetadata(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    
    // Map AI JSON if it's a draft_ai and it has raw JSON that hasn't been flattened yet
    let draft = { ...item };
    if (item.content_status === 'draft_ai' && item.konten_json) {
      const ai = item.konten_json;
      draft.tujuan_pembelajaran = ai.tujuanPembelajaran || [];
      draft.pemahaman_bermakna = ai.pemahamanBermakna || [];
      draft.pertanyaan_pemantik = ai.pertanyaanPemantik || [];
      draft.lkpd_tugas = ai.lkpdTugas || '';
      draft.soal_evaluasi = ai.soalEvaluasi || '';
      draft.pengayaan = ai.pengayaan || [];
      draft.remedial = ai.remedial || [];
    }

    setEditingItemMetadata({
      provider: item.generated_by_provider,
      latency: item.generation_metadata?.latency_ms,
      tokens: item.generation_metadata?.output_tokens,
      version: item.prompt_version,
      rawJson: item.konten_json
    });

    setFormState({
      id: item.id,
      mata_pelajaran: draft.mata_pelajaran || '',
      topik: draft.topik || '',
      fase: draft.fase || '',
      tujuan_pembelajaran: Array.isArray(draft.tujuan_pembelajaran) ? draft.tujuan_pembelajaran.join('\n') : (draft.tujuan_pembelajaran || ''),
      pemahaman_bermakna: Array.isArray(draft.pemahaman_bermakna) ? draft.pemahaman_bermakna.join('\n') : (draft.pemahaman_bermakna || ''),
      pertanyaan_pemantik: Array.isArray(draft.pertanyaan_pemantik) ? draft.pertanyaan_pemantik.join('\n') : (draft.pertanyaan_pemantik || ''),
      lkpd_tugas: draft.lkpd_tugas || '',
      soal_evaluasi: draft.soal_evaluasi || '',
      pengayaan: Array.isArray(draft.pengayaan) ? draft.pengayaan.join('\n') : (draft.pengayaan || ''),
      remedial: Array.isArray(draft.remedial) ? draft.remedial.join('\n') : (draft.remedial || ''),
      daftar_pustaka: Array.isArray(draft.daftar_pustaka) ? draft.daftar_pustaka.join('\n') : (draft.daftar_pustaka || ''),
      is_verified: draft.is_verified ?? true,
      content_status: draft.content_status || 'draft_manual',
      sumber_regulasi: draft.sumber_regulasi || ''
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const executeSave = async (forcePublish: boolean = false) => {
    setFormError(null);

    const normMapel = formState.mata_pelajaran.toLowerCase().trim();
    const normTopik = formState.topik.toLowerCase().trim();

    if (!normMapel) { setFormError('Mata Pelajaran wajib diisi.'); return; }
    if (!normTopik) { setFormError('Topik wajib diisi.'); return; }
    if (!formState.lkpd_tugas.trim()) { setFormError('LKPD & Tugas wajib diisi.'); return; }
    if (!formState.soal_evaluasi.trim()) { setFormError('Soal Evaluasi wajib diisi.'); return; }

    const isVerified = forcePublish || formState.is_verified;
    const newStatus = forcePublish ? 'verified' : formState.content_status;

    // Strict Publication Validation for Admin
    if (forcePublish) {
      const fullText = `${formState.tujuan_pembelajaran} ${formState.lkpd_tugas} ${formState.soal_evaluasi}`;
      if (/\[|\{|\}|\]|todo|tbd|placeholder|isi di sini|nama sekolah/i.test(fullText)) {
        setFormError('Gagal mempublikasikan: Konten masih mengandung placeholder atau simbol kurung [ / { / TODO.');
        return;
      }
    }

    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      mata_pelajaran: normMapel,
      topik: normTopik,
      fase: formState.fase ? formState.fase.toUpperCase().trim() : null,
      tujuan_pembelajaran: formState.tujuan_pembelajaran.split('\n').filter(s => s.trim()),
      pemahaman_bermakna: formState.pemahaman_bermakna.split('\n').filter(s => s.trim()),
      pertanyaan_pemantik: formState.pertanyaan_pemantik.split('\n').filter(s => s.trim()),
      lkpd_tugas: formState.lkpd_tugas.trim(),
      soal_evaluasi: formState.soal_evaluasi.trim(),
      pengayaan: formState.pengayaan.split('\n').filter(s => s.trim()),
      remedial: formState.remedial.split('\n').filter(s => s.trim()),
      daftar_pustaka: formState.daftar_pustaka.split('\n').filter(s => s.trim()),
      is_verified: isVerified,
      content_status: newStatus,
      sumber_regulasi: formState.sumber_regulasi.trim() || null,
      reviewed_by: user?.id || null,
      reviewed_at: new Date().toISOString()
    };

    setSubmitting(true);
    if (forcePublish) setIsPublishing(true);

    try {
      if (editingId) {
        await supabase.from('ref_boilerplate_topik').update(payload).eq('id', editingId);
        setData(prev => prev.map(item => item.id === editingId ? { ...item, ...payload } : item));
      } else {
        const { data: inserted, error } = await supabase.from('ref_boilerplate_topik').insert([payload]).select('*').single();
        if (inserted) {
          setData(prev => [inserted, ...prev]);
        }
      }
      setIsModalOpen(false);
    } catch (e: any) {
      console.error('Gagal menyimpan ke server:', e);
      setFormError(e.message || 'Gagal menyimpan data.');
    } finally {
      setSubmitting(false);
      setIsPublishing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus topik ini?')) return;
    try {
      await supabase.from('ref_boilerplate_topik').delete().eq('id', id);
    } catch (e: any) {
      console.error('Gagal menghapus dari server:', e);
    } finally {
      setData(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleCancelAiJob = async (jobId: string) => {
    if (!window.confirm('Batalkan job AI ini?')) return;
    try {
      await supabase.rpc('cancel_modul_ajar_ai_job' as any, { p_job_id: jobId });
      fetchAiJobs();
    } catch (e: any) {
      console.error('Failed to cancel job:', e);
    }
  };

  const handleRetryAiJob = async (jobId: string) => {
    if (!window.confirm('Ulangi pemrosesan job AI ini?')) return;
    try {
      await supabase.rpc('retry_modul_ajar_ai_job' as any, { p_job_id: jobId });
      fetchAiJobs();
    } catch (e: any) {
      console.error('Failed to retry job:', e);
    }
  };

  let filteredData = data;
  if (statusFilter !== 'semua') {
    filteredData = filteredData.filter(d => d.content_status === statusFilter || (statusFilter === 'verified' && d.is_verified));
  }
  if (searchTerm) {
    filteredData = filteredData.filter(d => 
      (d.mata_pelajaran?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
      (d.topik?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }

  return (
    <div className="space-y-6 pb-20">
      
      {/* Table Topik & Templates */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Bank Konten Modul Ajar
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Kelola dan tinjau (review) draf Modul Ajar AI.
            </p>
          </div>
          
          <div className="flex gap-2 items-center flex-wrap">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              {[
                { id: 'semua', label: 'Semua' },
                { id: 'verified', label: 'Terverifikasi' },
                { id: 'draft_ai', label: 'Draft AI' },
                { id: 'draft_manual', label: 'Draft Manual' },
                { id: 'in_review', label: 'In Review' },
                { id: 'rejected', label: 'Ditolak' },
                { id: 'deprecated', label: 'Deprecated' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id as any)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    statusFilter === f.id 
                    ? 'bg-white text-indigo-600 dark:bg-slate-700 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Cari mapel / topik..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-48 focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Manual
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300">
              <tr>
                <th className="p-3 font-semibold rounded-tl-lg">Topik & Mapel</th>
                <th className="p-3 font-semibold">Fase</th>
                <th className="p-3 font-semibold">Status Konten</th>
                <th className="p-3 font-semibold rounded-tr-lg w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {loading ? (
                <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-500">Tidak ada data.</td></tr>
              ) : (
                filteredData.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-800 dark:text-slate-100 capitalize">{row.topik}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium capitalize mt-0.5">{row.mata_pelajaran}</div>
                    </td>
                    <td className="p-3 text-slate-600 dark:text-slate-300 font-semibold">{row.fase ? `Fase ${row.fase}` : 'Semua'}</td>
                    <td className="p-3">
                      {row.content_status === 'verified' || row.is_verified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi
                        </span>
                      ) : row.content_status === 'draft_ai' ? (
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                            <Sparkles className="w-3 h-3" /> Review AI
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium ml-1">
                            {row.generated_by_provider || 'Auto'} • {row.generation_metadata?.latency_ms ? `${(row.generation_metadata.latency_ms/1000).toFixed(1)}s` : '-'}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          <XCircle className="w-3.5 h-3.5" /> Draf Manual
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleOpenEdit(row)} className="p-1.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 font-bold text-xs px-3 transition-colors">
                          {row.content_status === 'draft_ai' ? 'Review & Terbitkan' : 'Edit'}
                        </button>
                        <button onClick={() => handleDelete(row.id)} className="p-1.5 text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-100 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Queue Monitor Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            AI Background Jobs (Monitor)
          </h3>
          <button onClick={fetchAiJobs} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loadingJobs ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="p-2">Fingerprint (Topik)</th>
                <th className="p-2">Status</th>
                <th className="p-2">Provider</th>
                <th className="p-2">Error Detail</th>
                <th className="p-2">Dibuat</th>
                <th className="p-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {aiJobs.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-center text-slate-500">Antrian kosong.</td></tr>
              ) : (
                aiJobs.map(job => (
                  <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                    <td className="p-2 font-mono text-[10px] text-slate-600 dark:text-slate-400 max-w-[150px] truncate" title={job.request_fingerprint}>
                      {job.request_fingerprint}
                    </td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded-full font-bold ${
                        job.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        job.status === 'failed' ? 'bg-red-100 text-red-700' :
                        job.status === 'cancelled' ? 'bg-slate-200 text-slate-600' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="p-2 font-semibold text-slate-700 dark:text-slate-300">{job.provider || '-'}</td>
                    <td className="p-2 text-red-500 max-w-[150px] truncate" title={job.error_detail}>{job.error_detail || '-'}</td>
                    <td className="p-2 text-slate-500">{new Date(job.created_at).toLocaleTimeString()}</td>
                    <td className="p-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {['pending', 'processing', 'retry_wait'].includes(job.status) && (
                          <button onClick={() => handleCancelAiJob(job.id)} className="text-red-500 hover:text-red-700 font-bold">Batal</button>
                        )}
                        {['failed', 'cancelled'].includes(job.status) && (
                          <button onClick={() => handleRetryAiJob(job.id)} className="text-indigo-500 hover:text-indigo-700 font-bold">Coba Lagi</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edit / Create / Review */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
            <div className="flex items-center justify-between border-b pb-4 mb-4 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  {formState.content_status === 'draft_ai' ? (
                    <><Sparkles className="w-5 h-5 text-amber-500" /> Tinjau & Verifikasi Draft AI</>
                  ) : editingId ? (
                    'Edit Topik Modul Ajar'
                  ) : (
                    'Tambah Topik Modul Ajar Baru'
                  )}
                </h3>
                {editingItemMetadata && formState.content_status === 'draft_ai' && (
                  <p className="text-xs text-slate-500 mt-1 font-medium flex gap-3">
                    <span>Provider: <strong className="text-indigo-500">{editingItemMetadata.provider}</strong></span>
                    <span>Waktu Proses: <strong>{editingItemMetadata.latency ? (editingItemMetadata.latency/1000).toFixed(2)+'s' : '-'}</strong></span>
                  </p>
                )}
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs font-semibold text-red-700 dark:text-red-300">
                ⚠️ {formError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 max-h-[65vh] overflow-y-auto pr-2 text-sm pb-4 custom-scrollbar">
              
              {/* Kolom Kiri: Indentitas & Capaian */}
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Mata Pelajaran *</label>
                    <input
                      type="text"
                      value={formState.mata_pelajaran}
                      onChange={e => setFormState({...formState, mata_pelajaran: e.target.value})}
                      className="w-full p-2.5 border border-slate-200 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Fase</label>
                    <input
                      type="text"
                      value={formState.fase}
                      onChange={e => setFormState({...formState, fase: e.target.value})}
                      className="w-full p-2.5 border border-slate-200 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white uppercase font-bold text-center"
                      maxLength={1}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 uppercase tracking-wider">Topik *</label>
                  <input
                    type="text"
                    value={formState.topik}
                    onChange={e => setFormState({...formState, topik: e.target.value})}
                    className="w-full p-2.5 border border-slate-200 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-indigo-700 dark:text-indigo-300 mb-1 flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/30 p-1.5 rounded-t-lg border-b border-indigo-100 dark:border-indigo-900/50">
                    Tujuan Pembelajaran (1 Baris per TP)
                  </label>
                  <textarea
                    rows={4}
                    value={formState.tujuan_pembelajaran}
                    onChange={e => setFormState({...formState, tujuan_pembelajaran: e.target.value})}
                    className="w-full p-2.5 border border-slate-200 rounded-b-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Pemahaman Bermakna</label>
                  <textarea
                    rows={3}
                    value={formState.pemahaman_bermakna}
                    onChange={e => setFormState({...formState, pemahaman_bermakna: e.target.value})}
                    className="w-full p-2.5 border border-slate-200 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Pertanyaan Pemantik</label>
                  <textarea
                    rows={3}
                    value={formState.pertanyaan_pemantik}
                    onChange={e => setFormState({...formState, pertanyaan_pemantik: e.target.value})}
                    className="w-full p-2.5 border border-slate-200 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Kolom Kanan: Tugas, Evaluasi, Tindak Lanjut */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-300 mb-1 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 p-1.5 rounded-t-lg border-b border-emerald-100 dark:border-emerald-900/50">
                    LKPD / Tugas Praktik *
                  </label>
                  <textarea
                    rows={4}
                    value={formState.lkpd_tugas}
                    onChange={e => setFormState({...formState, lkpd_tugas: e.target.value})}
                    className="w-full p-2.5 border border-slate-200 rounded-b-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-300 mb-1 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/30 p-1.5 rounded-t-lg border-b border-emerald-100 dark:border-emerald-900/50">
                    Soal Evaluasi *
                  </label>
                  <textarea
                    rows={4}
                    value={formState.soal_evaluasi}
                    onChange={e => setFormState({...formState, soal_evaluasi: e.target.value})}
                    className="w-full p-2.5 border border-slate-200 rounded-b-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Pengayaan</label>
                    <textarea
                      rows={3}
                      value={formState.pengayaan}
                      onChange={e => setFormState({...formState, pengayaan: e.target.value})}
                      className="w-full p-2.5 border border-slate-200 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Remedial</label>
                    <textarea
                      rows={3}
                      value={formState.remedial}
                      onChange={e => setFormState({...formState, remedial: e.target.value})}
                      className="w-full p-2.5 border border-slate-200 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Sumber / Regulasi</label>
                  <input
                    type="text"
                    value={formState.sumber_regulasi}
                    onChange={e => setFormState({...formState, sumber_regulasi: e.target.value})}
                    className="w-full p-2.5 border border-slate-200 rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white text-xs"
                    placeholder="Contoh: Kemenag 2025"
                  />
                </div>
              </div>

            </div>

            <div className="flex justify-between items-center border-t pt-5 mt-2 dark:border-slate-800">
              <div className="flex items-center gap-3">
                {formState.content_status === 'draft_ai' && (
                   <span className="text-xs text-slate-500 font-medium">Draft ini membutuhkan verifikasi sebelum diterbitkan.</span>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>
                
                {formState.content_status !== 'verified' && (
                  <button
                    type="button"
                    onClick={() => executeSave(false)}
                    disabled={submitting || isPublishing}
                    className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    {(submitting && !isPublishing) ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Simpan (Draft)
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => executeSave(true)}
                  disabled={submitting || isPublishing}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-sm shadow-emerald-500/20 transition-all flex items-center gap-2"
                >
                  {(isPublishing) ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Verifikasi & Terbitkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
