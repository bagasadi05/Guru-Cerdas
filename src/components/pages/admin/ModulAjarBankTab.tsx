import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase';
import { Loader2, Plus, Edit2, Trash2, Search, Save, X } from 'lucide-react';

export const ModulAjarBankTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'topik'>('topik');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeSubTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let query = supabase.from('ref_boilerplate_topik').select('*');
      const { data: result, error } = await query.order('mata_pelajaran', { ascending: true });
      if (error) throw error;
      setData(result || []);
    } catch (e: any) {
      console.error(e);
      alert('Gagal memuat data: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (id?: string) => {
    try {
      if (id) {
        const { error } = await supabase.from('ref_boilerplate_topik').update(editForm).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ref_boilerplate_topik').insert([editForm]);
        if (error) throw error;
      }
      setIsEditing(null);
      setIsCreating(false);
      setEditForm({});
      fetchData();
    } catch (e: any) {
      alert('Gagal menyimpan: ' + e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Yakin ingin menghapus?')) return;
    try {
      const { error } = await supabase.from('ref_boilerplate_topik').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (e: any) {
      alert('Gagal menghapus: ' + e.message);
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
            Kelola template topik, capaian pembelajaran, dan sintaks model.
          </p>
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Cari..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-48 focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          <button
            onClick={() => { setIsCreating(true); setEditForm({}); }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Tambah Data
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300">
            <tr>
              <th className="p-3 font-semibold rounded-tl-lg">Mapel</th>
              <th className="p-3 font-semibold">Topik</th>
              <th className="p-3 font-semibold">Fase</th>
              <th className="p-3 font-semibold rounded-tr-lg w-24 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {isCreating && (
              <tr className="bg-indigo-50/50 dark:bg-indigo-900/20">
                <td className="p-2"><input type="text" className="w-full p-1 text-sm border rounded" placeholder="Mapel..." value={editForm.mata_pelajaran || ''} onChange={e => setEditForm({...editForm, mata_pelajaran: e.target.value})} /></td>
                <td className="p-2"><input type="text" className="w-full p-1 text-sm border rounded" placeholder="Topik..." value={editForm.topik || ''} onChange={e => setEditForm({...editForm, topik: e.target.value})} /></td>
                <td className="p-2"><input type="text" className="w-full p-1 text-sm border rounded" placeholder="Fase..." value={editForm.fase || ''} onChange={e => setEditForm({...editForm, fase: e.target.value})} /></td>
                <td className="p-2 text-center flex justify-center gap-1">
                  <button onClick={() => handleSave()} className="p-1.5 text-green-600 bg-green-50 rounded hover:bg-green-100"><Save className="w-4 h-4" /></button>
                  <button onClick={() => setIsCreating(false)} className="p-1.5 text-slate-500 bg-slate-100 rounded hover:bg-slate-200"><X className="w-4 h-4" /></button>
                </td>
              </tr>
            )}
            
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></td></tr>
            ) : filteredData.length === 0 && !isCreating ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-500">Tidak ada data.</td></tr>
            ) : (
              filteredData.map((row) => (
                isEditing === row.id ? (
                  <tr key={row.id} className="bg-indigo-50/50 dark:bg-indigo-900/20">
                    <td className="p-2"><input type="text" className="w-full p-1 text-sm border rounded" value={editForm.mata_pelajaran || ''} onChange={e => setEditForm({...editForm, mata_pelajaran: e.target.value})} /></td>
                    <td className="p-2"><input type="text" className="w-full p-1 text-sm border rounded" value={editForm.topik || ''} onChange={e => setEditForm({...editForm, topik: e.target.value})} /></td>
                    <td className="p-2"><input type="text" className="w-full p-1 text-sm border rounded" value={editForm.fase || ''} onChange={e => setEditForm({...editForm, fase: e.target.value})} /></td>
                    <td className="p-2 text-center flex justify-center gap-1">
                      <button onClick={() => handleSave(row.id)} className="p-1.5 text-green-600 bg-green-50 rounded hover:bg-green-100"><Save className="w-4 h-4" /></button>
                      <button onClick={() => setIsEditing(null)} className="p-1.5 text-slate-500 bg-slate-100 rounded hover:bg-slate-200"><X className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group">
                    <td className="p-3 text-slate-700 dark:text-slate-300">{row.mata_pelajaran}</td>
                    <td className="p-3 text-slate-700 dark:text-slate-300 font-medium">{row.topik}</td>
                    <td className="p-3 text-slate-500 dark:text-slate-400">{row.fase || '-'}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setIsEditing(row.id); setEditForm(row); }} className="p-1.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-lg hover:bg-indigo-100"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(row.id)} className="p-1.5 text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 rounded-lg hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                )
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
