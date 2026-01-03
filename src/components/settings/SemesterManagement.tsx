import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui/Button';
import { Card, CardTitle, CardDescription } from '../ui/Card';
import { PlusIcon, TrashIcon, CheckCircleIcon, LockIcon, CalendarIcon, ChevronDownIcon, ChevronRightIcon, AlertCircleIcon } from 'lucide-react';
import { AcademicYearRow, SemesterRow } from '../../types';

interface AcademicYearWithSemesters extends AcademicYearRow {
    semesters: SemesterRow[];
}

export const SemesterManagement: React.FC = () => {
    const [years, setYears] = useState<AcademicYearWithSemesters[]>([]);
    const [loading, setLoading] = useState(true);
    const [creatingYear, setCreatingYear] = useState(false);
    const [newYearName, setNewYearName] = useState('');
    const [newYearStart, setNewYearStart] = useState('');
    const [newYearEnd, setNewYearEnd] = useState('');

    // Expanded state for accordion
    const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());

    const toast = useToast();
    const { user } = useAuth();

    const fetchData = React.useCallback(async () => {
        setLoading(true);
        try {
            const { data: yearsData, error: yearsError } = await supabase
                .from('academic_years')
                .select('*')
                .order('start_date', { ascending: false });

            if (yearsError) throw yearsError;

            const { data: semestersData, error: semestersError } = await supabase
                .from('semesters')
                .select('*')
                .order('semester_number', { ascending: true });

            if (semestersError) throw semestersError;

            const combined: AcademicYearWithSemesters[] = yearsData.map(year => ({
                ...year,
                semesters: semestersData.filter(s => s.academic_year_id === year.id)
            }));

            setYears(combined);
            // Expand the first one by default if it exists
            if (combined.length > 0) {
                setExpandedYears(new Set([combined[0].id]));
            }
        } catch (error) {
            console.error('Error fetching academic data:', error);
            toast.error('Gagal memuat data akademik.');
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const toggleYearExpand = (yearId: string) => {
        setExpandedYears(prev => {
            const next = new Set(prev);
            if (next.has(yearId)) next.delete(yearId);
            else next.add(yearId);
            return next;
        });
    };

    const handleCreateYear = async () => {
        if (!newYearName || !newYearStart || !newYearEnd) {
            toast.error('Mohon lengkapi semua field.');
            return;
        }

        try {
            const { data, error } = await supabase
                .from('academic_years')
                .insert({
                    name: newYearName,
                    start_date: newYearStart,
                    end_date: newYearEnd,
                    is_active: false,
                    user_id: user?.id
                })
                .select()
                .single();

            if (error) throw error;

            toast.success('Tahun ajaran berhasil dibuat.');
            setCreatingYear(false);
            setNewYearName('');
            setNewYearStart('');
            setNewYearEnd('');

            // Should also create semesters strictly? 1 and 2?
            // Let's create default semesters 1 and 2 for convenience
            if (data) {
                await createDefaultSemesters(data.id, newYearStart);
            }

            fetchData();
        } catch (error) {
            console.error('Error creating year:', error);
            toast.error('Gagal membuat tahun ajaran.');
        }
    };

    const createDefaultSemesters = async (yearId: string, yearStart: string) => {
        const startYear = new Date(yearStart).getFullYear();
        // Simple logic: Sem 1 starts July of startYear, Ends Dec
        // Sem 2 starts Jan of startYear+1, Ends June

        const sem1Start = `${startYear}-07-01`;
        const sem1End = `${startYear}-12-31`;
        const sem2Start = `${startYear + 1}-01-01`;
        const sem2End = `${startYear + 1}-06-30`;

        if (!user?.id) {
            toast.error('User required');
            return;
        }

        const semestersToInsert = [
            {
                academic_year_id: yearId,
                name: 'Ganjil',
                semester_number: 1,
                start_date: sem1Start,
                end_date: sem1End,
                is_active: false,
                is_locked: false,
                user_id: user.id
            },
            {
                academic_year_id: yearId,
                name: 'Genap',
                semester_number: 2,
                start_date: sem2Start,
                end_date: sem2End,
                is_active: false,
                is_locked: false,
                user_id: user.id
            }
        ];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from('semesters').insert(semestersToInsert as any);
    };

    const handleActivateSemester = async (semesterId: string, yearId: string) => {
        try {
            // Transaction-like update:
            // 1. Deactivate all semesters
            // 2. Activate target semester
            // 3. Update academic years active status based on this

            // Supabase doesn't support multi-table transactions easily in client lib without RPC.
            // We'll do it sequentially.

            // Deactivate all semesters
            await supabase.from('semesters').update({ is_active: false }).neq('id', 'placeholder'); // Simple logic usually update all

            // Activate target
            const { error } = await supabase.from('semesters').update({ is_active: true }).eq('id', semesterId);
            if (error) throw error;

            // Update academic years: Activate the one containing this semester, deactivate others
            await supabase.from('academic_years').update({ is_active: false }).neq('id', 'placeholder');
            await supabase.from('academic_years').update({ is_active: true }).eq('id', yearId);

            toast.success('Semester aktif diperbarui.');
            fetchData();
            // Force reload page to update context? Or Context listens to Supabase realtime? 
            // Context polls or needs manual refresh. We'll rely on reload for now or expose refresh in context.
            // Ideally trigger context refresh.
            window.location.reload();
        } catch (error) {
            console.error('Error activating semester:', error);
            toast.error('Gagal mengaktifkan semester.');
        }
    };

    const handleToggleLock = async (semester: SemesterRow) => {
        try {
            const { error } = await supabase
                .from('semesters')
                .update({ is_locked: !semester.is_locked })
                .eq('id', semester.id);

            if (error) throw error;
            toast.success(semester.is_locked ? 'Semester dibuka.' : 'Semester dikunci.');
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error('Gagal mengubah status kunci.');
        }
    };

    const handleDeleteYear = async (yearId: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus tahun ajaran ini beserta semua semesternya?')) return;

        try {
            const { error } = await supabase
                .from('academic_years')
                .delete()
                .eq('id', yearId);

            if (error) throw error;
            toast.success('Tahun ajaran dihapus.');
            fetchData();
        } catch (error) {
            console.error('Error deleting year:', error);
            toast.error('Gagal menghapus tahun ajaran.');
        }
    };

    return (
        <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <CardTitle>Manajemen Semester</CardTitle>
                    <CardDescription>Atur Tahun Ajaran dan Semester Aktif</CardDescription>
                </div>
                <Button onClick={() => setCreatingYear(!creatingYear)}>
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Buat Tahun Ajaran
                </Button>
            </div>

            {creatingYear && (
                <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 animate-fade-in">
                    <h4 className="font-semibold mb-3">Tahun Ajaran Baru</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Nama (contoh: 2024/2025)</label>
                            <input
                                type="text"
                                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800"
                                value={newYearName}
                                onChange={e => setNewYearName(e.target.value)}
                                placeholder="2024/2025"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Mulai</label>
                            <input
                                type="date"
                                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800"
                                value={newYearStart}
                                onChange={e => setNewYearStart(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Selesai</label>
                            <input
                                type="date"
                                className="w-full p-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800"
                                value={newYearEnd}
                                onChange={e => setNewYearEnd(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setCreatingYear(false)}>Batal</Button>
                        <Button onClick={handleCreateYear}>Simpan</Button>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-8 text-gray-400">Memuat data...</div>
                ) : years.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">Belum ada data tahun ajaran.</div>
                ) : (
                    years.map(year => (
                        <div key={year.id} className={`border rounded-xl transition-all ${year.is_active ? 'border-indigo-200 bg-indigo-50/30 dark:border-indigo-900/50 dark:bg-indigo-900/10' : 'border-slate-200 dark:border-slate-700'}`}>
                            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" onClick={() => toggleYearExpand(year.id)}>
                                <div className="flex items-center gap-3">
                                    {expandedYears.has(year.id) ? <ChevronDownIcon className="w-5 h-5 text-gray-400" /> : <ChevronRightIcon className="w-5 h-5 text-gray-400" />}
                                    <div>
                                        <h3 className="font-bold text-lg flex items-center gap-2">
                                            {year.name}
                                            {year.is_active && <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs dark:bg-indigo-900 dark:text-indigo-300">Aktif</span>}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {new Date(year.start_date).toLocaleDateString('id-ID')} - {new Date(year.end_date).toLocaleDateString('id-ID')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                    {!year.is_active && (
                                        <Button variant="ghost" size="sm" onClick={() => handleDeleteYear(year.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                            <TrashIcon className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {expandedYears.has(year.id) && (
                                <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 rounded-b-xl">
                                    <div className="grid gap-3">
                                        {year.semesters.map(sem => (
                                            <div key={sem.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                                <div className="flex items-center gap-3">
                                                    <CalendarIcon className={`w-5 h-5 ${sem.is_active ? 'text-green-500' : 'text-gray-400'}`} />
                                                    <div>
                                                        <p className="font-medium">Semester {sem.semester_number} ({sem.name})</p>
                                                        <p className="text-xs text-gray-500">
                                                            {new Date(sem.start_date).toLocaleDateString('id-ID')} - {new Date(sem.end_date).toLocaleDateString('id-ID')}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {sem.is_locked ? (
                                                        <div className="flex items-center gap-2 text-amber-600 text-sm mr-2 bg-amber-50 px-2 py-1 rounded">
                                                            <LockIcon className="w-3 h-3" /> Terkunci
                                                        </div>
                                                    ) : null}

                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleToggleLock(sem)}
                                                        title={sem.is_locked ? "Buka Kunci" : "Kunci Semester"}
                                                    >
                                                        {sem.is_locked ? <LockIcon className="w-4 h-4 text-amber-500" /> : <LockIcon className="w-4 h-4 text-gray-300" />}
                                                    </Button>

                                                    {sem.is_active ? (
                                                        <span className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium dark:bg-green-900/30 dark:text-green-400">
                                                            <CheckCircleIcon className="w-4 h-4" /> Aktif
                                                        </span>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleActivateSemester(sem.id, year.id)}
                                                        >
                                                            Aktifkan
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-sm text-blue-800 dark:text-blue-300 flex gap-2 items-start">
                <AlertCircleIcon className="w-5 h-5 shrink-0 mt-0.5" />
                <p>
                    <strong>Tips:</strong> Mengaktifkan semester akan otomatis mengubah semester aktif di seluruh aplikasi.
                    Data yang ditampilkan secara default akan mengikuti semester aktif ini.
                    Mengunci semester akan mencegah perubahan data pada semester tersebut.
                </p>
            </div>
        </Card>
    );
};
