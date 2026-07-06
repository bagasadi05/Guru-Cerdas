import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../services/supabase';
import { useSemester } from '../../../contexts/SemesterContext';
import { AlertTriangle, CalendarX, UserX, TrendingDown, CheckCircle2, Sparkles } from 'lucide-react';
interface InsightCardData {
    id: string;
    severity: 'high' | 'warning' | 'info' | 'good';
    icon: any;
    title: string;
    detail: string;
    cta?: { label: string; onClick: () => void };
    items?: { label: string; meta: string; onClick?: () => void }[];
}

const SEV: Record<string, { ring: string; bg: string; text: string; iconText: string }> = {
    high: { ring: 'border-red-200 dark:border-red-900/50', bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-300', iconText: 'text-red-500' },
    warning: { ring: 'border-amber-200 dark:border-amber-900/50', bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300', iconText: 'text-amber-500' },
    info: { ring: 'border-blue-200 dark:border-blue-900/50', bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-300', iconText: 'text-blue-500' },
    good: { ring: 'border-green-200 dark:border-green-900/50', bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-300', iconText: 'text-green-500' },
};

const SmartInsightsPanel: React.FC = () => {
    const navigate = useNavigate();
    const { activeSemester } = useSemester();
    const semesterId = activeSemester?.id ?? null;

    const { data, isLoading } = useQuery({
        queryKey: ['smart_insights', semesterId],
        queryFn: async () => {
            const applySem = (q: any) => semesterId ? q.eq('semester_id', semesterId) : q;
            const [clsRes, stuRes, vioRes, attRes, acaRes] = await Promise.all([
                supabase.from('classes').select('id, name').is('deleted_at', null).eq('is_archived', false),
                supabase.from('students').select('id, name, class_id').is('deleted_at', null),
                applySem(supabase.from('violations').select('student_id').is('deleted_at', null)),
                applySem(supabase.from('attendance').select('student_id, status').is('deleted_at', null)),
                applySem(supabase.from('academic_records').select('student_id, score').is('deleted_at', null)),
            ]);
            const err = clsRes.error || stuRes.error || vioRes.error || attRes.error || acaRes.error;
            if (err) throw err;
            return {
                classes: clsRes.data || [],
                students: stuRes.data || [],
                violations: vioRes.data || [],
                attendance: attRes.data || [],
                academics: acaRes.data || [],
            };
        },
    });

    const insights = useMemo<InsightCardData[]>(() => {
        if (!data) return [];
        const { classes, students, violations, attendance, academics } = data;
        const studentClass = new Map<string, string>(students.map((s: any) => [s.id, s.class_id]));
        const studentName = new Map<string, string>(students.map((s: any) => [s.id, s.name]));
        const className = new Map<string, string>(classes.map((c: any) => [c.id, c.name]));
        const result: InsightCardData[] = [];

        // 1. Lonjakan pelanggaran per kelas
        const vioByClass: Record<string, number> = {};
        violations.forEach((v: any) => {
            const cid = studentClass.get(v.student_id);
            if (cid) vioByClass[cid] = (vioByClass[cid] || 0) + 1;
        });
        const classCount = classes.length || 1;
        const totalVio = violations.length;
        const avgVio = totalVio / classCount;
        const sortedVioClasses = Object.entries(vioByClass).sort((a, b) => b[1] - a[1]);
        if (sortedVioClasses.length > 0 && sortedVioClasses[0][1] > 0) {
            const [topCid, topCount] = sortedVioClasses[0];
            const spike = avgVio > 0 && topCount >= 2 * avgVio;
            result.push({
                id: 'vio-spike',
                severity: spike ? 'high' : 'warning',
                icon: AlertTriangle,
                title: spike ? `Lonjakan pelanggaran di ${className.get(topCid)}` : `Pelanggaran tertinggi: ${className.get(topCid)}`,
                detail: `${topCount} pelanggaran (rata-rata sekolah ${avgVio.toFixed(1)} per kelas).${spike ? ' Jauh di atas normal — perlu tindak lanjut.' : ''}`,
                cta: { label: 'Lihat perbandingan kelas', onClick: () => navigate('/analytics') },
            });
        }

        // 2. Kehadiran rendah per kelas
        const attAgg: Record<string, { present: number; counted: number }> = {};
        attendance.forEach((a: any) => {
            const cid = studentClass.get(a.student_id);
            if (!cid || a.status === 'Libur') return;
            if (!attAgg[cid]) attAgg[cid] = { present: 0, counted: 0 };
            attAgg[cid].counted += 1;
            if (a.status === 'Hadir') attAgg[cid].present += 1;
        });
        const lowAtt = Object.entries(attAgg)
            .filter(([, v]) => v.counted >= 10)
            .map(([cid, v]) => ({ cid, rate: (v.present / v.counted) * 100 }))
            .filter(v => v.rate < 85)
            .sort((a, b) => a.rate - b.rate);
        if (lowAtt.length > 0) {
            result.push({
                id: 'low-att',
                severity: lowAtt[0].rate < 75 ? 'high' : 'warning',
                icon: CalendarX,
                title: `Kehadiran rendah di ${lowAtt.length} kelas`,
                detail: `Terendah: ${className.get(lowAtt[0].cid)} (${lowAtt[0].rate.toFixed(1)}%). Ambang sehat >= 85%.`,
                items: lowAtt.slice(0, 4).map(v => ({ label: className.get(v.cid) || 'Kelas', meta: `${v.rate.toFixed(1)}%` })),
                cta: { label: 'Buka absensi', onClick: () => navigate('/absensi') },
            });
        }

        // 3. Siswa perlu perhatian (pelanggaran terbanyak)
        const vioByStudent: Record<string, number> = {};
        violations.forEach((v: any) => { vioByStudent[v.student_id] = (vioByStudent[v.student_id] || 0) + 1; });
        const atRisk = Object.entries(vioByStudent)
            .map(([sid, count]) => ({ sid, count }))
            .filter(s => s.count >= 3)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
        if (atRisk.length > 0) {
            result.push({
                id: 'at-risk',
                severity: 'high',
                icon: UserX,
                title: `${atRisk.length} siswa perlu perhatian`,
                detail: 'Siswa dengan >= 3 pelanggaran pada periode ini.',
                items: atRisk.map(s => ({
                    label: `${studentName.get(s.sid) || 'Siswa'} (${className.get(studentClass.get(s.sid) || '') || '-'})`,
                    meta: `${s.count} pelanggaran`,
                    onClick: () => navigate(`/siswa/${s.sid}`),
                })),
            });
        }

        // 4. Kelas dengan rata nilai di bawah rata-rata sekolah
        const acaAgg: Record<string, { sum: number; n: number }> = {};
        academics.forEach((a: any) => {
            const cid = studentClass.get(a.student_id);
            if (!cid) return;
            if (!acaAgg[cid]) acaAgg[cid] = { sum: 0, n: 0 };
            acaAgg[cid].sum += Number(a.score) || 0;
            acaAgg[cid].n += 1;
        });
        const classAvgs = Object.entries(acaAgg).filter(([, v]) => v.n >= 5).map(([cid, v]) => ({ cid, avg: v.sum / v.n }));
        if (classAvgs.length > 1) {
            const schoolAvg = classAvgs.reduce((s, c) => s + c.avg, 0) / classAvgs.length;
            const below = classAvgs.filter(c => c.avg < schoolAvg - 5).sort((a, b) => a.avg - b.avg);
            if (below.length > 0) {
                result.push({
                    id: 'low-score',
                    severity: 'warning',
                    icon: TrendingDown,
                    title: `Rata nilai di bawah sekolah: ${below.length} kelas`,
                    detail: `Rata sekolah ${schoolAvg.toFixed(1)}. Terendah: ${className.get(below[0].cid)} (${below[0].avg.toFixed(1)}).`,
                    items: below.slice(0, 4).map(c => ({ label: className.get(c.cid) || 'Kelas', meta: c.avg.toFixed(1) })),
                });
            }
        }

        if (result.length === 0) {
            result.push({
                id: 'all-good',
                severity: 'good',
                icon: CheckCircle2,
                title: 'Tidak ada anomali signifikan',
                detail: 'Semua kelas dalam batas normal untuk periode ini. Kerja bagus!',
            });
        }
        return result;
    }, [data, navigate]);

    if (isLoading) {
        return (
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 mb-6 animate-pulse text-sm text-gray-400">
                Menganalisis data madrasah...
            </div>
        );
    }

    return (
        <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">Insight & Peringatan Cerdas</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.map((ins) => {
                    const sev = SEV[ins.severity];
                    const Icon = ins.icon;
                    return (
                        <div key={ins.id} className={`rounded-2xl border ${sev.ring} ${sev.bg} p-4`}>
                            <div className="flex items-start gap-3">
                                <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${sev.iconText}`} />
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold ${sev.text}`}>{ins.title}</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{ins.detail}</p>
                                    {ins.items && (
                                        <ul className="mt-2 space-y-1">
                                            {ins.items.map((it, i) => (
                                                <li key={i} className={`flex items-center justify-between text-xs ${it.onClick ? 'cursor-pointer hover:underline' : ''}`} onClick={it.onClick}>
                                                    <span className="text-gray-700 dark:text-gray-200 truncate flex-1 min-w-0 pr-2">{it.label}</span>
                                                    <span className={`font-semibold ml-2 shrink-0 ${sev.iconText}`}>{it.meta}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {ins.cta && (
                                        <button onClick={ins.cta.onClick} className={`mt-2 text-xs font-semibold ${sev.text} hover:underline inline-flex items-center gap-1`}>
                                            {ins.cta.label} &rarr;
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SmartInsightsPanel;
