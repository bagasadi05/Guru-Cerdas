import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../services/supabase';
import { useSemester } from '../../../contexts/SemesterContext';
import { Card, CardContent } from '../../ui/Card';
import { ChevronDown, ChevronUp, Trophy, AlertTriangle } from 'lucide-react';
interface ClassRow {
    classId: string;
    className: string;
    homeroom: string;
    students: number;
    violations: number;
    avgScore: number | null;
    attendanceRate: number | null;
}

type SortKey = 'className' | 'students' | 'violations' | 'avgScore' | 'attendanceRate';

const ClassComparisonTab: React.FC = () => {
    const { activeSemester } = useSemester();
    const semesterId = activeSemester?.id ?? null;
    const [sortKey, setSortKey] = useState<SortKey>('violations');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
    const [expanded, setExpanded] = useState<string | null>(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['class_comparison', semesterId],
        enabled: !!semesterId,
        queryFn: async () => {
            const [clsRes, stuRes, rolesRes, vioRes, attRes, acaRes] = await Promise.all([
                supabase.from('classes').select('id, name, user_id').is('deleted_at', null).eq('is_archived', false),
                supabase.from('students').select('id, name, class_id').is('deleted_at', null),
                supabase.from('user_roles').select('user_id, full_name'),
                supabase.from('violations').select('student_id, points').is('deleted_at', null).eq('semester_id', semesterId as string),
                supabase.from('attendance').select('student_id, status').is('deleted_at', null).eq('semester_id', semesterId as string),
                supabase.from('academic_records').select('student_id, score').is('deleted_at', null).eq('semester_id', semesterId as string),
            ]);
            const err = clsRes.error || stuRes.error || rolesRes.error || vioRes.error || attRes.error || acaRes.error;
            if (err) throw err;
            const classes = clsRes.data || [];
            const students = stuRes.data || [];
            const roles = rolesRes.data || [];
            const violations = vioRes.data || [];
            const attendance = attRes.data || [];
            const academics = acaRes.data || [];

            const roleMap = new Map<string, string>(roles.map((r: any) => [r.user_id, r.full_name]));
            const studentClass = new Map<string, string>(students.map((s: any) => [s.id, s.class_id]));
            const studentName = new Map<string, string>(students.map((s: any) => [s.id, s.name]));

            const rows: ClassRow[] = classes.map((c: any) => {
                const classStudents = students.filter((s: any) => s.class_id === c.id);
                const aForClass = attendance.filter((a: any) => studentClass.get(a.student_id) === c.id);
                const acForClass = academics.filter((a: any) => studentClass.get(a.student_id) === c.id);
                const vForClass = violations.filter((v: any) => studentClass.get(v.student_id) === c.id);
                const present = aForClass.filter((a: any) => a.status === 'Hadir').length;
                const counted = aForClass.filter((a: any) => a.status !== 'Libur').length;
                const scoreSum = acForClass.reduce((sum: number, a: any) => sum + (Number(a.score) || 0), 0);
                return {
                    classId: c.id,
                    className: c.name,
                    homeroom: roleMap.get(c.user_id) || '-',
                    students: classStudents.length,
                    violations: vForClass.length,
                    avgScore: acForClass.length ? Math.round((scoreSum / acForClass.length) * 10) / 10 : null,
                    attendanceRate: counted ? Math.round((present / counted) * 1000) / 10 : null,
                };
            });

            const violatorsByClass: Record<string, { name: string; count: number }[]> = {};
            classes.forEach((c: any) => {
                const counts: Record<string, number> = {};
                violations.forEach((v: any) => {
                    if (studentClass.get(v.student_id) === c.id) {
                        counts[v.student_id] = (counts[v.student_id] || 0) + 1;
                    }
                });
                violatorsByClass[c.id] = Object.entries(counts)
                    .map(([sid, count]) => ({ name: studentName.get(sid) || 'Siswa', count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5);
            });

            return { rows, violatorsByClass };
        },
    });

    const sortedRows = useMemo(() => {
        const rows = data?.rows ? [...data.rows] : [];
        rows.sort((a, b) => {
            const av = a[sortKey];
            const bv = b[sortKey];
            if (av === null) return 1;
            if (bv === null) return -1;
            if (typeof av === 'string' && typeof bv === 'string') {
                return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
            }
            return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
        });
        return rows;
    }, [data, sortKey, sortDir]);

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir(key === 'className' ? 'asc' : 'desc');
        }
    };

    const headerCell = (key: SortKey, label: string, align: string = 'text-right') => (
        <th
            className={`px-3 py-2 ${align} text-xs font-semibold text-gray-500 dark:text-gray-400 cursor-pointer select-none whitespace-nowrap`}
            onClick={() => toggleSort(key)}
        >
            <span className="inline-flex items-center gap-1">
                {label}
                {sortKey === key && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
            </span>
        </th>
    );

    if (!semesterId) {
        return (
            <Card>
                <CardContent className="py-10 text-center text-gray-500 dark:text-gray-400">
                    Pilih semester aktif untuk melihat perbandingan kelas.
                </CardContent>
            </Card>
        );
    }

    if (isLoading) {
        return (
            <Card>
                <CardContent className="py-10 text-center text-gray-500 dark:text-gray-400">
                    Memuat perbandingan kelas...
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent className="py-10 text-center text-red-500">
                    Gagal memuat data perbandingan kelas.
                </CardContent>
            </Card>
        );
    }

    const maxViolations = Math.max(1, ...sortedRows.map(r => r.violations));

    return (
        <Card>
            <CardContent className="p-0 overflow-x-auto">
                <div className="px-4 pt-4 pb-2">
                    <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Perbandingan Kelas</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Ranking seluruh kelas madrasah untuk semester aktif. Klik judul kolom untuk mengurutkan, klik baris untuk rincian.
                    </p>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">#</th>
                            {headerCell('className', 'Kelas', 'text-left')}
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">Wali Kelas</th>
                            {headerCell('students', 'Siswa')}
                            {headerCell('attendanceRate', 'Kehadiran')}
                            {headerCell('avgScore', 'Rata Nilai')}
                            {headerCell('violations', 'Pelanggaran')}
                            <th className="px-3 py-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedRows.map((row, idx) => {
                            const isOpen = expanded === row.classId;
                            const violators = data?.violatorsByClass?.[row.classId] || [];
                            return (
                                <React.Fragment key={row.classId}>
                                    <tr
                                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 cursor-pointer"
                                        onClick={() => setExpanded(isOpen ? null : row.classId)}
                                    >
                                        <td className="px-3 py-2 text-gray-400">
                                            {idx === 0 && sortKey === 'violations' && sortDir === 'desc'
                                                ? <AlertTriangle className="w-4 h-4 text-amber-500" />
                                                : idx === 0 && sortKey === 'avgScore' && sortDir === 'desc'
                                                    ? <Trophy className="w-4 h-4 text-yellow-500" />
                                                    : idx + 1}
                                        </td>
                                        <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-100">{row.className}</td>
                                        <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">{row.homeroom}</td>
                                        <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200">{row.students}</td>
                                        <td className="px-3 py-2 text-right">
                                            {row.attendanceRate === null
                                                ? <span className="text-gray-400">-</span>
                                                : <span className={row.attendanceRate >= 90 ? 'text-green-600 dark:text-green-400' : row.attendanceRate >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}>{row.attendanceRate}%</span>}
                                        </td>
                                        <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-200">{row.avgScore === null ? <span className="text-gray-400">-</span> : row.avgScore}</td>
                                        <td className="px-3 py-2 text-right">
                                            <span className="inline-flex items-center gap-2">
                                                <span className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden hidden sm:inline-block">
                                                    <span className="block h-full bg-red-400" style={{ width: `${Math.round((row.violations / maxViolations) * 100)}%` }} />
                                                </span>
                                                <span className={row.violations > 0 ? 'font-semibold text-red-600 dark:text-red-400' : 'text-gray-400'}>{row.violations}</span>
                                            </span>
                                        </td>
                                        <td className="px-3 py-2 text-right text-gray-400">
                                            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </td>
                                    </tr>
                                    {isOpen && (
                                        <tr className="bg-gray-50 dark:bg-gray-800/30">
                                            <td colSpan={8} className="px-6 py-3">
                                                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Siswa dengan pelanggaran terbanyak di {row.className}</p>
                                                {violators.length === 0 ? (
                                                    <p className="text-xs text-gray-400">Tidak ada pelanggaran tercatat untuk kelas ini.</p>
                                                ) : (
                                                    <ul className="space-y-1">
                                                        {violators.map((vio, i) => (
                                                            <li key={i} className="flex items-center justify-between text-xs text-gray-700 dark:text-gray-200 max-w-md">
                                                                <span>{i + 1}. {vio.name}</span>
                                                                <span className="font-semibold text-red-600 dark:text-red-400">{vio.count} pelanggaran</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {sortedRows.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-3 py-10 text-center text-gray-500 dark:text-gray-400">Belum ada kelas untuk dibandingkan.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    );
};

export default ClassComparisonTab;
