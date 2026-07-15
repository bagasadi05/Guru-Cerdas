import React, { useState, useEffect, useMemo } from 'react';
import { Select } from '../../ui/Select';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { CustomDropdown } from '../../ui/CustomDropdown';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../hooks/useToast';
import { bintangService, calculateAspectPoints, BINTANG_THRESHOLDS } from '../../../services/bintangService';
import { supabase } from '../../../services/supabase';
import { AlertTriangle, Shield, Sparkles, TrendingDown, PlusCircle } from 'lucide-react';

/** Per-aspek badge color helpers */
const gradeColors: Record<string, string> = {
    A: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    B: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    C: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    D: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
};

const aspectIcons: Record<string, React.ReactNode> = {
    ADAB: <Shield size={16} className="text-indigo-500" />,
    KEDISIPLINAN: <AlertTriangle size={16} className="text-amber-500" />,
    KERAPIAN: <Sparkles size={16} className="text-teal-500" />,
};

const aspectLabels: Record<string, string> = {
    ADAB: 'Adab',
    KEDISIPLINAN: 'Kedisiplinan',
    KERAPIAN: 'Kerapian',
};

export const BintangDailyObservationPage: React.FC = () => {
    const { user } = useAuth();
    const toast = useToast();
    
    const [classes, setClasses] = useState<Array<{id: string; name: string}>>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const currentMonth = new Date().toISOString().slice(0, 7);
    const [selectedMonth, setSelectedMonth] = useState(currentMonth);

    const [violations, setViolations] = useState<Array<{
        id: string; student_id: string; description: string; points: number;
        date: string; severity: string | null; students: {name: string} | null;
    }>>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Modal states
    const [isObservationModalOpen, setIsObservationModalOpen] = useState(false);
    const [obsStudentId, setObsStudentId] = useState('');
    const [obsAspect, setObsAspect] = useState('ADAB');
    const [obsIsPositive, setObsIsPositive] = useState(true);
    const [obsNotes, setObsNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [studentsInClass, setStudentsInClass] = useState<Array<{id: string; name: string}>>([]);

    useEffect(() => {
        const fetchClasses = async () => {
            const { data } = await supabase.from('classes').select('id, name').is('deleted_at', null).eq('is_archived', false);
            if (data) setClasses(data);
        };
        fetchClasses();
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
            };
            fetchStudents();
        } else {
            setStudentsInClass([]);
        }

        if (selectedClass && selectedMonth) {
            fetchViolations();
        } else {
            setViolations([]);
        }
    }, [selectedClass, selectedMonth]);

    const fetchViolations = async () => {
        setIsLoading(true);
        try {
            const data = await bintangService.getViolationsForClass(selectedClass, selectedMonth);
            setViolations(data || []);
        } catch (error) {
            console.error('Failed to fetch violations', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleObservationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!obsStudentId || !obsNotes) return;
        
        setIsSubmitting(true);
        try {
            await bintangService.insertDailyObservation({
                student_id: obsStudentId,
                teacher_id: user?.id || '',
                date: new Date().toISOString().split('T')[0],
                aspect: obsAspect,
                is_positive: obsIsPositive,
                observation: obsNotes
            });
            toast.success('Observasi harian berhasil disimpan');
            setIsObservationModalOpen(false);
            setObsNotes('');
        } catch (error) {
            console.error(error);
            toast.error('Gagal menyimpan observasi harian');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Group violations by student
    const studentViolationMap = useMemo(() => {
        const map = new Map<string, { name: string; violations: Array<{ description: string; points: number; date: string; severity: string | null }> }>();
        for (const v of violations) {
            const sid = v.student_id;
            const name = (v.students as any)?.name || 'Unknown';
            if (!map.has(sid)) {
                map.set(sid, { name, violations: [] });
            }
            map.get(sid)!.violations.push({ description: v.description, points: v.points, date: v.date, severity: v.severity });
        }
        return map;
    }, [violations]);

    // Calculate overall class summary
    const classSummary = useMemo(() => {
        return calculateAspectPoints(violations.map(v => ({ description: v.description, points: v.points })));
    }, [violations]);

    // Sort students alphabetically
    const sortedStudents = useMemo(() => {
        return Array.from(studentViolationMap.entries()).sort(([, a], [, b]) => a.name.localeCompare(b.name));
    }, [studentViolationMap]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800">
                <div className="flex flex-1 gap-3 max-w-xl w-full">
                    <div className="flex-1 max-w-xs">
                        <Select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                            <option value="">Pilih Kelas</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </Select>
                    </div>
                    <div className="flex-1 max-w-xs">
                        <Select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                            {Array.from({length: 6}).map((_, i) => {
                                const d = new Date();
                                d.setMonth(d.getMonth() - i);
                                const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                                const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                                return <option key={val} value={val}>{label}</option>
                            })}
                        </Select>
                    </div>
                </div>
                {selectedClass && (
                    <Button onClick={() => setIsObservationModalOpen(true)} className="flex items-center gap-2 min-h-[44px] sm:min-h-0">
                        <PlusCircle size={20} />
                        <span className="hidden sm:inline">Observasi Harian</span>
                    </Button>
                )}
            </div>

            {!selectedClass ? (
                <div className="text-center py-16 text-slate-500 dark:text-slate-400">
                    <TrendingDown size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                    <p className="text-lg font-medium">Pilih kelas untuk melihat rekap poin</p>
                    <p className="text-sm mt-1">Data dikelompokkan berdasarkan aspek BINTANG</p>
                </div>
            ) : isLoading ? (
                <div className="text-center py-10 text-slate-500">Memuat data pelanggaran...</div>
            ) : (
                <>
                    {/* Class-wide Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4 sm:px-6">
                        {(['ADAB', 'KEDISIPLINAN', 'KERAPIAN'] as const).map(aspect => {
                            const data = classSummary[aspect];
                            return (
                                <div key={aspect} className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        {aspectIcons[aspect]}
                                        <span className="font-semibold text-sm text-slate-700 dark:text-slate-200">
                                            {aspectLabels[aspect]}
                                        </span>
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <p className="text-2xl font-bold text-slate-900 dark:text-white">{data.points} <span className="text-sm font-normal text-slate-500">poin</span></p>
                                            <p className="text-xs text-slate-500 mt-1">{data.count} pelanggaran total kelas</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Per-Student Violation Table */}
                    {sortedStudents.length === 0 ? (
                        <div className="text-center py-10 px-4">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-medium">
                                <Sparkles size={16} />
                                Tidak ada pelanggaran tercatat bulan ini — Luar biasa! 🎉
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto px-0">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                                        <th className="py-3 px-4 font-semibold text-sm text-slate-600 dark:text-slate-300">Nama Siswa</th>
                                        <th className="py-3 px-4 font-semibold text-sm text-slate-600 dark:text-slate-300 text-center">
                                            <div className="flex items-center justify-center gap-1">{aspectIcons.ADAB} Adab</div>
                                        </th>
                                        <th className="py-3 px-4 font-semibold text-sm text-slate-600 dark:text-slate-300 text-center">
                                            <div className="flex items-center justify-center gap-1">{aspectIcons.KEDISIPLINAN} Kedisiplinan</div>
                                        </th>
                                        <th className="py-3 px-4 font-semibold text-sm text-slate-600 dark:text-slate-300 text-center">
                                            <div className="flex items-center justify-center gap-1">{aspectIcons.KERAPIAN} Kerapian</div>
                                        </th>
                                        <th className="py-3 px-4 font-semibold text-sm text-slate-600 dark:text-slate-300 text-center">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedStudents.map(([studentId, { name, violations: vList }]) => {
                                        const aspect = calculateAspectPoints(vList);
                                        const totalPoints = vList.reduce((s, v) => s + v.points, 0);
                                        return (
                                            <tr key={studentId} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">{name}</td>
                                                {(['ADAB', 'KEDISIPLINAN', 'KERAPIAN'] as const).map(asp => {
                                                    const d = aspect[asp];
                                                    return (
                                                        <td key={asp} className="py-3 px-4 text-center">
                                                            {d.count > 0 ? (
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${gradeColors[d.grade]}`}>
                                                                        {d.grade}
                                                                    </span>
                                                                    <span className="text-xs text-slate-500">{d.points}p / {d.count}x</span>
                                                                </div>
                                                            ) : (
                                                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${gradeColors.A}`}>A</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td className="py-3 px-4 text-center">
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{totalPoints} <span className="font-normal text-xs text-slate-400">poin</span></span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Legend */}
                    <div className="px-4 sm:px-6 pb-4">
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-medium text-slate-700 dark:text-slate-300">Keterangan Nilai:</span>
                            {BINTANG_THRESHOLDS.map(t => (
                                <span key={t.grade} className="flex items-center gap-1">
                                    <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-bold ${gradeColors[t.grade]}`}>{t.grade}</span>
                                    {t.grade === 'A' ? '0 poin' : t.grade === 'B' ? '1-10 poin' : t.grade === 'C' ? '11-20 poin' : '>20 poin'}
                                    ({t.label})
                                </span>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Modal Observasi Harian */}
            <Modal
                isOpen={isObservationModalOpen}
                onClose={() => setIsObservationModalOpen(false)}
                title="Input Observasi Harian"
            >
                <form onSubmit={handleObservationSubmit} className="space-y-4 pt-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Siswa</label>
                        <CustomDropdown
                            value={obsStudentId}
                            onChange={setObsStudentId}
                            placeholder="Pilih Siswa"
                            options={studentsInClass.map(s => ({ value: s.id, label: s.name }))}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Aspek BINTANG</label>
                        <CustomDropdown
                            value={obsAspect}
                            onChange={setObsAspect}
                            options={[
                                { value: 'ADAB', label: 'Adab' },
                                { value: 'KEDISIPLINAN', label: 'Kedisiplinan' },
                                { value: 'KERAPIAN', label: 'Kerapian' },
                            ]}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipe Observasi</label>
                        <div className="flex gap-4 mt-2 mb-2">
                            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="obsIsPositive" 
                                    checked={obsIsPositive === true} 
                                    onChange={() => setObsIsPositive(true)} 
                                    className="text-emerald-600 focus:ring-emerald-500"
                                />
                                <span className="text-emerald-600 font-medium">Positif (Pujian)</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                <input 
                                    type="radio" 
                                    name="obsIsPositive" 
                                    checked={obsIsPositive === false} 
                                    onChange={() => setObsIsPositive(false)} 
                                    className="text-rose-600 focus:ring-rose-500"
                                />
                                <span className="text-rose-600 font-medium">Netral / Negatif</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Catatan Observasi</label>
                        <textarea 
                            className="w-full p-2 border border-slate-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            rows={3}
                            value={obsNotes}
                            onChange={(e) => setObsNotes(e.target.value)}
                            placeholder="Tuliskan catatan observasi harian..."
                            required
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button type="button" variant="outline" onClick={() => setIsObservationModalOpen(false)}>Batal</Button>
                        <Button type="submit" disabled={isSubmitting || !obsStudentId || !obsNotes}>
                            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default BintangDailyObservationPage;
