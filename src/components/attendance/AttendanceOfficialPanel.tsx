import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { AttendanceStatus, AttendanceRecord, StudentRow } from '../../types';
import { statusOptions } from '../../constants';
import { ShieldCheckIcon } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  students: StudentRow[];
  attendanceRecords: Record<string, AttendanceRecord>;
  selectedDate: string;
  isHomeroom: boolean;
}

export const AttendanceOfficialPanel: React.FC<Props> = ({ students, attendanceRecords, selectedDate: _selectedDate, isHomeroom }) => {
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [localOverrides, setLocalOverrides] = useState<Record<string, AttendanceStatus | ''>>({});

  const filteredStudents = useMemo(() => {
    return students.filter(s => attendanceRecords[s.id]);
  }, [students, attendanceRecords]);

  const getDisplayStatus = (studentId: string): AttendanceStatus | null => {
    if (localOverrides[studentId]) return localOverrides[studentId] as AttendanceStatus;
    const rec = attendanceRecords[studentId];
    if (rec?.official_status) return rec.official_status;
    return null;
  };

  const { mutate: setOfficial, isPending } = useMutation({
    mutationFn: async (updates: { student_id: string; official_status: AttendanceStatus }[]) => {
      const ids = updates.map(u => attendanceRecords[u.student_id]?.id).filter(Boolean) as string[];
      if (ids.length === 0) return;

      const { error } = await (supabase.from('attendance') as any)
        .update({
          official_status: updates[0].official_status,
          official_by: user?.id,
          official_at: new Date().toISOString(),
        })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceData', user?.id] });
      toast.success('Status resmi disimpan!');
      setLocalOverrides({});
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleBulkSet = (status: AttendanceStatus) => {
    const updates = filteredStudents
      .filter(s => !getDisplayStatus(s.id))
      .map(s => ({ student_id: s.id, official_status: status }));
    if (updates.length) setOfficial(updates);
  };

  if (!isHomeroom) return null;

  return (
    <div className="border border-indigo-200 dark:border-indigo-800 rounded-xl p-4 bg-indigo-50/50 dark:bg-indigo-900/10">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheckIcon className="w-5 h-5 text-indigo-600" />
        <h3 className="font-bold text-indigo-800 dark:text-indigo-300">Panel Wali Kelas — Status Resmi</h3>
      </div>
      <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mb-3">
        Tetapkan status resmi untuk rekap harian. Menggantikan status dari guru mapel jika ada.
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {statusOptions.map(opt => (
          <Button key={opt.value} size="sm" variant="outline"
            onClick={() => handleBulkSet(opt.value as AttendanceStatus)}
            disabled={isPending}
          >
            {opt.label} Semua
          </Button>
        ))}
      </div>

      <div className="space-y-1 max-h-60 overflow-y-auto">
        {filteredStudents.map(s => {
          const current = getDisplayStatus(s.id);
          return (
            <div key={s.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-white/50 dark:hover:bg-white/5">
              <span className="text-sm font-medium">{s.name}</span>
              <div className="flex gap-1">
                {statusOptions.map(opt => {
                  const val = opt.value as AttendanceStatus;
                  const active = current === val;
                  return (
                    <button type="button"
                      key={val}
                      onClick={() => {
                        const updates = [{ student_id: s.id, official_status: val }];
                        setOfficial(updates);
                      }}
                      disabled={isPending}
                      className={`px-2 py-0.5 rounded text-xs font-bold transition-all ${
                        active
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
