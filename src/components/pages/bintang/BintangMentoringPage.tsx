import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { CustomDropdown } from '../../ui/CustomDropdown';
import { useAuth } from '../../../hooks/useAuth';
import { bintangService } from '../../../services/bintangService';
import { supabase } from '../../../services/supabase';
import { PlusCircle, Search } from 'lucide-react';
import { Modal } from '../../ui/Modal';
import { useToast } from '../../../hooks/useToast';

export const BintangMentoringPage: React.FC = () => {
    const { user } = useAuth();
    const toast = useToast();
    
    const [logs, setLogs] = useState<any[]>([]);
    const [classes, setClasses] = useState<Array<{id: string; name: string}>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Form state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedClass, setSelectedClass] = useState('');
    const [targetType, setTargetType] = useState<'all' | 'specific'>('all');
    const [studentsInClass, setStudentsInClass] = useState<Array<{id: string; name: string}>>([]);
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
    const [mentorRole, setMentorRole] = useState('WALAS');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchClasses = async () => {
            const { data } = await supabase.from('classes').select('id, name').is('deleted_at', null).eq('is_archived', false);
            if (data) setClasses(data);
        };
        fetchClasses();
        fetchLogs();
    }, []);

    useEffect(() => {
        if (selectedClass) {
            const fetchStudents = async () => {
                const { data } = await supabase
                    .from('students')
                    .select('id, name')
                    .eq('class_id', selectedClass)
                    .is('deleted_at', null)
                    .order('name');
                setStudentsInClass(data || []);
                setSelectedStudents([]); // reset selection
            };
            fetchStudents();
        } else {
            setStudentsInClass([]);
            setSelectedStudents([]);
        }
    }, [selectedClass]);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const data = await bintangService.getMentoringLogs();
            setLogs(data || []);
        } catch (error) {
            console.error('Failed to fetch logs', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClass || !notes) return;
        if (targetType === 'specific' && selectedStudents.length === 0) {
            toast.error('Pilih minimal satu siswa untuk pembinaan');
            return;
        }
        
        setIsSubmitting(true);
        try {
            let targetStudentIds = selectedStudents;
            
            if (targetType === 'all') {
                targetStudentIds = studentsInClass.map(s => s.id);
            }
                
            if (targetStudentIds.length === 0) {
                toast.error('Tidak ada siswa aktif di kelas ini');
                setIsSubmitting(false);
                return;
            }

            // Create log entries for selected students
            const newLogs = targetStudentIds.map(id => ({
                student_id: id,
                mentor_role: mentorRole,
                mentor_id: user?.id || '',
                date: date,
                notes: notes
            }));

            await bintangService.bulkInsertMentoringLogs(newLogs);
            toast.success('Jurnal pembinaan berhasil disimpan');
            setIsModalOpen(false);
            setNotes('');
            fetchLogs();
        } catch (error) {
            console.error(error);
            toast.error('Gagal menyimpan jurnal pembinaan');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Filter logs by search query
    const filteredLogs = useMemo(() => {
        if (!searchQuery.trim()) return logs;
        const query = searchQuery.toLowerCase();
        return logs.filter((log: any) => {
            const studentName = ((log.students as any)?.name || '').toLowerCase();
            const logNotes = (log.notes || '').toLowerCase();
            return studentName.includes(query) || logNotes.includes(query);
        });
    }, [logs, searchQuery]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex-1 w-full max-w-sm">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                        <Input
                            placeholder="Cari siswa atau catatan..."
                            className="pl-10 w-full"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 min-h-[44px] sm:min-h-0">
                    <PlusCircle size={20} />
                    Catat Pembinaan
                </Button>
            </div>

            <div className="p-0">
                {isLoading ? (
                    <div className="text-center py-10 text-slate-500">Memuat data...</div>
                ) : filteredLogs.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">
                        {searchQuery.trim() ? 'Tidak ada catatan yang cocok dengan pencarian.' : 'Belum ada catatan pembinaan.'}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                    <th className="py-3 px-4 font-semibold text-sm text-slate-600 dark:text-slate-300">Tanggal</th>
                                    <th className="py-3 px-4 font-semibold text-sm text-slate-600 dark:text-slate-300">Siswa</th>
                                    <th className="py-3 px-4 font-semibold text-sm text-slate-600 dark:text-slate-300">Peran Mentor</th>
                                    <th className="py-3 px-4 font-semibold text-sm text-slate-600 dark:text-slate-300">Catatan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">
                                            {new Date(log.date).toLocaleDateString('id-ID')}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300">
                                            {(log.students as any)?.name}
                                        </td>
                                        <td className="py-3 px-4 text-sm">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                                                {log.mentor_role}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-slate-700 dark:text-slate-300 max-w-md truncate">
                                            {log.notes}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Input Jurnal Pembinaan"
            >
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tanggal</label>
                        <Input 
                            type="date" 
                            value={date} 
                            onChange={(e) => setDate(e.target.value)} 
                            required 
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Peran Mentor</label>
                        <CustomDropdown
                            value={mentorRole}
                            onChange={setMentorRole}
                            options={[
                                { value: 'WALAS', label: 'Wali Kelas' },
                                { value: 'KESISWAAN', label: 'Kesiswaan' },
                                { value: 'KEPSEK', label: 'Kepala Sekolah' },
                            ]}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sasaran (Kelas)</label>
                        <CustomDropdown
                            value={selectedClass}
                            onChange={setSelectedClass}
                            placeholder="Pilih Kelas"
                            options={classes.map(c => ({ value: c.id, label: c.name }))}
                        />
                    </div>

                    {selectedClass && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipe Sasaran</label>
                            <div className="flex gap-4 mt-2 mb-3">
                                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="targetType" 
                                        value="all" 
                                        checked={targetType === 'all'} 
                                        onChange={() => setTargetType('all')} 
                                        className="text-indigo-600 focus:ring-indigo-500"
                                    />
                                    Seluruh Siswa di Kelas
                                </label>
                                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="targetType" 
                                        value="specific" 
                                        checked={targetType === 'specific'} 
                                        onChange={() => setTargetType('specific')} 
                                        className="text-indigo-600 focus:ring-indigo-500"
                                    />
                                    Siswa Tertentu
                                </label>
                            </div>
                            
                            {targetType === 'all' && (
                                <p className="text-xs text-slate-500">Pembinaan akan dicatat untuk seluruh {studentsInClass.length} siswa di kelas ini.</p>
                            )}
                            
                            {targetType === 'specific' && (
                                <div className="mt-2 max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-800/50">
                                    {studentsInClass.length === 0 ? (
                                        <p className="text-sm text-slate-500 p-2">Tidak ada siswa.</p>
                                    ) : (
                                        <div className="space-y-1">
                                            {studentsInClass.map(student => (
                                                <label key={student.id} className="flex items-center gap-3 p-2 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded cursor-pointer transition-colors">
                                                    <input 
                                                        type="checkbox"
                                                        checked={selectedStudents.includes(student.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedStudents([...selectedStudents, student.id]);
                                                            } else {
                                                                setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                                                            }
                                                        }}
                                                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                                    />
                                                    <span className="text-sm text-slate-700 dark:text-slate-300">{student.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Materi / Catatan Pembinaan</label>
                        <textarea 
                            className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            rows={4}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Tuliskan catatan atau materi pembinaan..."
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
                        <Button type="submit" disabled={isSubmitting || !selectedClass || !notes}>
                            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default BintangMentoringPage;
