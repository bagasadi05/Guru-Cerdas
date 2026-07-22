import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import { Loader2, Plus, Edit2, Trash2, Search, X, CheckCircle2, XCircle } from 'lucide-react';

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
  sumber_regulasi: ''
};

export const ModulAjarBankTab: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<BoilerplateFormState>(emptyFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase
        .from('ref_boilerplate_topik')
        .select('*')
        .order('mata_pelajaran', { ascending: true });
      if (error) throw error;
      setData(result || []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormState(emptyFormState);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    setFormState({
      id: item.id,
      mata_pelajaran: item.mata_pelajaran || '',
      topik: item.topik || '',
      fase: item.fase || '',
      tujuan_pembelajaran: Array.isArray(item.tujuan_pembelajaran) ? item.tujuan_pembelajaran.join('\n') : '',
      pemahaman_bermakna: Array.isArray(item.pemahaman_bermakna) ? item.pemahaman_bermakna.join('\n') : '',
      pertanyaan_pemantik: Array.isArray(item.pertanyaan_pemantik) ? item.pertanyaan_pemantik.join('\n') : '',
      lkpd_tugas: item.lkpd_tugas || '',
      soal_evaluasi: item.soal_evaluasi || '',
      pengayaan: Array.isArray(item.pengayaan) ? item.pengayaan.join('\n') : '',
      remedial: Array.isArray(item.remedial) ? item.remedial.join('\n') : '',
      daftar_pustaka: Array.isArray(item.daftar_pustaka) ? item.daftar_pustaka.join('\n') : '',
      is_verified: item.is_verified ?? true,
      sumber_regulasi: item.sumber_regulasi || ''
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setFormError(null);

    // Normalisasi
    const normMapel = formState.mata_pelajaran.toLowerCase().trim();
    const normTopik = formState.topik.toLowerCase().trim();

    // Validasi field wajib
    if (!normMapel) {
      setFormError('Mata Pelajaran wajib diisi.');
      return;
    }
    if (!normTopik) {
      setFormError('Topik wajib diisi.');
      return;
    }
    if (!formState.lkpd_tugas.trim()) {
      setFormError('LKPD & Tugas wajib diisi.');
      return;
    }
    if (!formState.soal_evaluasi.trim()) {
      setFormError('Soal Evaluasi wajib diisi.');
      return;
    }

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
      is_verified: formState.is_verified,
      sumber_regulasi: formState.sumber_regulasi.trim() || null
    };

    setSubmitting(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('ref_boilerplate_topik').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ref_boilerplate_topik').insert([payload]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchData();
    } catch (e: any) {
      setFormError('Gagal menyimpan: ' + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus topik ini?')) return;
    try {
      const { error } = await supabase.from('ref_boilerplate_topik').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (e: any) {
      console.error('Gagal menghapus:', e);
    }
  };

  const filteredData = data.filter(d => 
    (d.mata_pelajaran?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (d.topik?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            Bank Konten Modul Ajar
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Kelola template topik, LKPD, soal evaluasi, dan rekomendasi modul ajar.
          </p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Cari mapel / topik..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-56 focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Tambah Topik
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300">
            <tr>
              <th className="p-3 font-semibold rounded-tl-lg">Mata Pelajaran</th>
              <th className="p-3 font-semibold">Topik</th>
              <th className="p-3 font-semibold">Fase</th>
              <th className="p-3 font-semibold">Status Verifikasi</th>
              <th className="p-3 font-semibold rounded-tr-lg w-28 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></td></tr>
            ) : filteredData.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">Tidak ada data topik.</td></tr>
            ) : (
              filteredData.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
                  <td className="p-3 text-slate-700 dark:text-slate-300 font-medium capitalize">{row.mata_pelajaran}</td>
                  <td className="p-3 text-slate-700 dark:text-slate-300 font-semibold capitalize">{row.topik}</td>
                  <td className="p-3 text-slate-500 dark:text-slate-400">{row.fase ? `Fase ${row.fase}` : 'Semua Fase (NULL)'}</td>
                  <td className="p-3">
                    {row.is_verified ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                        <XCircle className="w-3.5 h-3.5" /> Belum Verifikasi
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleOpenEdit(row)} className="p-1.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg hover:bg-indigo-100"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(row.id)} className="p-1.5 text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Edit / Create */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 my-8">
            <div className="flex items-center justify-between border-b pb-3 mb-4 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                {editingId ? 'Edit Topik Modul Ajar' : 'Tambah Topik Modul Ajar Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs font-semibold text-red-700 dark:text-red-300">
                ⚠️ {formError}
              </div>
            )}

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Mata Pelajaran *</label>
                  <input
                    type="text"
                    placeholder="misal: matematika"
                    value={formState.mata_pelajaran}
                    onChange={e => setFormState({...formState, mata_pelajaran: e.target.value})}
                    className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Topik *</label>
                  <input
                    type="text"
                    placeholder="misal: penjumlahan"
                    value={formState.topik}
                    onChange={e => setFormState({...formState, topik: e.target.value})}
                    className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Fase</label>
                  <select
                    value={formState.fase}
                    onChange={e => setFormState({...formState, fase: e.target.value})}
                    className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  >
                    <option value="">Semua Fase (NULL)</option>
                    <option value="A">Fase A</option>
                    <option value="B">Fase B</option>
                    <option value="C">Fase C</option>
                    <option value="D">Fase D</option>
                    <option value="E">Fase E</option>
                    <option value="F">Fase F</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tujuan Pembelajaran (Satu per baris)</label>
                <textarea
                  rows={3}
                  placeholder="Peserta didik dapat..."
                  value={formState.tujuan_pembelajaran}
                  onChange={e => setFormState({...formState, tujuan_pembelajaran: e.target.value})}
                  className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Pemahaman Bermakna (Satu per baris)</label>
                <textarea
                  rows={2}
                  placeholder="Kemampuan menjumlahkan membantu..."
                  value={formState.pemahaman_bermakna}
                  onChange={e => setFormState({...formState, pemahaman_bermakna: e.target.value})}
                  className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Pertanyaan Pemantik (Satu per baris)</label>
                <textarea
                  rows={2}
                  placeholder="Bagaimana cara..."
                  value={formState.pertanyaan_pemantik}
                  onChange={e => setFormState({...formState, pertanyaan_pemantik: e.target.value})}
                  className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">LKPD & Tugas *</label>
                <textarea
                  rows={3}
                  placeholder="Petunjuk Kerja..."
                  value={formState.lkpd_tugas}
                  onChange={e => setFormState({...formState, lkpd_tugas: e.target.value})}
                  className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Soal Evaluasi *</label>
                <textarea
                  rows={3}
                  placeholder="1. Hitunglah..."
                  value={formState.soal_evaluasi}
                  onChange={e => setFormState({...formState, soal_evaluasi: e.target.value})}
                  className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Pengayaan (Satu per baris)</label>
                  <textarea
                    rows={2}
                    value={formState.pengayaan}
                    onChange={e => setFormState({...formState, pengayaan: e.target.value})}
                    className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Remedial (Satu per baris)</label>
                  <textarea
                    rows={2}
                    value={formState.remedial}
                    onChange={e => setFormState({...formState, remedial: e.target.value})}
                    className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Daftar Pustaka (Satu per baris)</label>
                <textarea
                  rows={2}
                  value={formState.daftar_pustaka}
                  onChange={e => setFormState({...formState, daftar_pustaka: e.target.value})}
                  className="w-full p-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div>
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">Status Terverifikasi</span>
                  <span className="text-[11px] text-slate-500">Topik terverifikasi akan langsung muncul di rekomendasi guru.</span>
                </div>
                <input
                  type="checkbox"
                  checked={formState.is_verified}
                  onChange={e => setFormState({...formState, is_verified: e.target.checked})}
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4 mt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={submitting}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
