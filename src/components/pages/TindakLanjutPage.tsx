import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { AlertCircle, ShieldCheck, Search, Loader2, CheckCircle2 } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { Input } from '../ui/Input';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';

type ViolationWithStudent = {
  id: string;
  student_id: string;
  date: string;
  description: string;
  points: number;
  severity: string;
  follow_up_status: string;
  follow_up_notes: string | null;
  students: {
    name: string;
    classes: {
      name: string;
    } | null;
  } | null;
};

export const TindakLanjutPage: React.FC = () => {
  const { userRole } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedViolation, setSelectedViolation] = useState<ViolationWithStudent | null>(null);
  const [notes, setNotes] = useState('');

  // Fetch violations that need follow-up
  const { data: violations = [], isLoading, error } = useQuery({
    queryKey: ['violations', 'tindak-lanjut'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('violations')
        .select(`
          id, student_id, date, description, points, severity, follow_up_status, follow_up_notes,
          students (
            name,
            classes ( name )
          )
        `)
        .in('follow_up_status', ['pending', 'in_progress'])
        .is('deleted_at', null)
        .order('date', { ascending: false });

      if (error) throw error;
      return (data as unknown) as ViolationWithStudent[];
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from('violations')
        .update({
          follow_up_status: 'resolved',
          follow_up_notes: notes,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Tindak lanjut berhasil disimpan.');
      queryClient.invalidateQueries({ queryKey: ['violations'] });
      setSelectedViolation(null);
      setNotes('');
    },
    onError: (error: Error) => {
      toast.error(`Gagal menyimpan: ${error.message}`);
    },
  });

  const handleResolve = () => {
    if (selectedViolation) {
      resolveMutation.mutate({ id: selectedViolation.id, notes });
    }
  };

  const filteredViolations = violations.filter(v => 
    v.students?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (userRole !== 'waka_kesiswaan' && userRole !== 'kepala_madrasah' && userRole !== 'admin') {
    return (
      <div className="p-8 text-center max-w-7xl mx-auto">
        <div className="bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 p-6 rounded-2xl border border-rose-200 dark:border-rose-900 flex flex-col items-center">
          <ShieldCheck className="w-12 h-12 mb-4" />
          <h2 className="text-xl font-bold">Akses Ditolak</h2>
          <p className="mt-2 text-sm">Halaman ini hanya dapat diakses oleh Pimpinan Madrasah.</p>
        </div>
      </div>
    );
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'ringan': return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">Ringan</span>;
      case 'sedang': return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">Sedang</span>;
      case 'berat': return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">Berat</span>;
      default: return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border border-slate-200 text-slate-800">{severity}</span>;
    }
  };

  return (
    <div className="w-full min-h-full p-4 md:p-6 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          Tindak Lanjut Pelanggaran
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Pantau dan kelola pelanggaran siswa yang memerlukan tindak lanjut khusus.
        </p>
      </header>

      <Card className="rounded-2xl shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
        <CardHeader className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <span className="text-lg">Menunggu Tindak Lanjut ({filteredViolations.length})</span>
          </div>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input 
              placeholder="Cari siswa atau pelanggaran..." 
              className="pl-9 bg-white dark:bg-slate-950"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : error ? (
            <div className="p-8 text-center text-rose-500">
              Gagal memuat data: {error.message}
            </div>
          ) : filteredViolations.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white">Semua Tuntas</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                Tidak ada pelanggaran yang menunggu tindak lanjut saat ini. Kerja bagus!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-slate-900 dark:text-slate-300">Tanggal</th>
                    <th className="px-6 py-3 font-semibold text-slate-900 dark:text-slate-300">Siswa</th>
                    <th className="px-6 py-3 font-semibold text-slate-900 dark:text-slate-300">Kelas</th>
                    <th className="px-6 py-3 font-semibold text-slate-900 dark:text-slate-300">Pelanggaran</th>
                    <th className="px-6 py-3 font-semibold text-slate-900 dark:text-slate-300 text-center">Status</th>
                    <th className="px-6 py-3 font-semibold text-slate-900 dark:text-slate-300 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredViolations.map((v, index) => (
                    <motion.tr 
                      key={v.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        {new Date(v.date).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                        {v.students?.name}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        {v.students?.classes?.name || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-slate-800 dark:text-slate-200 truncate max-w-[200px]" title={v.description}>
                            {v.description}
                          </span>
                          <div className="flex items-center gap-2">
                            {getSeverityBadge(v.severity)}
                            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">+{v.points} Poin</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                          {v.follow_up_status === 'in_progress' ? 'Diproses' : 'Menunggu'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button 
                          size="sm" 
                          onClick={() => setSelectedViolation(v)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm rounded-xl"
                        >
                          Tindak Lanjuti
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal / Dialog Tindak Lanjut */}
      <ConfirmationDialog
        isOpen={!!selectedViolation}
        onClose={() => {
          setSelectedViolation(null);
          setNotes('');
        }}
        onConfirm={handleResolve}
        title="Selesaikan Tindak Lanjut"
        message={
          <div className="space-y-4 mt-4 text-left">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Menyelesaikan pelanggaran atas nama <span className="font-semibold text-slate-900 dark:text-white">{selectedViolation?.students?.name}</span>.
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Catatan Tindak Lanjut (Opsional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Misal: Sudah dipanggil bersama orang tua..."
                className="w-full min-h-[100px] p-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow resize-y"
              />
            </div>
          </div>
        }
        confirmText={resolveMutation.isPending ? "Menyimpan..." : "Tandai Selesai"}
        cancelText="Batal"
        variant="info"
      />
    </div>
  );
};

export default TindakLanjutPage;
