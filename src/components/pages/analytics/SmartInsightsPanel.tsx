import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../services/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { useSemester } from '../../../contexts/SemesterContext';
import { createWhatsAppLink, generateStudentConcernMessage } from '../../../utils/whatsappUtils';
import {
    AlertTriangle,
    CalendarX,
    UserX,
    TrendingDown,
    CheckCircle2,
    Sparkles,
    ChevronRight,
    ArrowRight,
    RotateCw,
    MessageCircle,
} from 'lucide-react';

interface StudentRiskItem {
    id: string;
    name: string;
    className: string;
    count: number;
    parentPhone?: string | null;
    parentName?: string | null;
    onClick?: () => void;
}

interface ScoreAnomalyItem {
    classId: string;
    className: string;
    score: number;
    diff: number;
    onClick?: () => void;
}

interface AttendanceAnomalyItem {
    classId: string;
    className: string;
    rate: number;
    diff: number;
    onClick?: () => void;
}

interface ViolationSpikeData {
    className: string;
    count: number;
    schoolAvg: number;
    pctAboveAvg: number;
    spike: boolean;
}

interface InsightCardData {
    id: string;
    severity: 'high' | 'warning' | 'info' | 'good';
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    subtitle: string;
    detail: string;
    badgeLabel: string;
    cta?: { label: string; onClick: () => void };
    spikeData?: ViolationSpikeData;
    riskStudents?: StudentRiskItem[];
    scoreAnomalies?: { schoolAvg: number; classes: ScoreAnomalyItem[] };
    attendanceAnomalies?: { threshold: number; classes: AttendanceAnomalyItem[] };
    items?: { label: string; meta: string; onClick?: () => void }[];
}

const SEV: Record<
    string,
    {
        ring: string;
        bg: string;
        hover: string;
        title: string;
        iconBox: string;
        badge: string;
        btn: string;
    }
> = {
    high: {
        ring: 'border-rose-200/80 dark:border-rose-800/40',
        bg: 'bg-gradient-to-br from-rose-50/80 via-white to-rose-50/30 dark:from-rose-950/20 dark:via-slate-900/80 dark:to-rose-950/10',
        hover: 'hover:border-rose-300 dark:hover:border-rose-700/60',
        title: 'text-rose-950 dark:text-rose-100',
        iconBox: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20',
        badge: 'bg-rose-100/90 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40',
        btn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/20',
    },
    warning: {
        ring: 'border-amber-200/80 dark:border-amber-800/40',
        bg: 'bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30 dark:from-amber-950/20 dark:via-slate-900/80 dark:to-amber-950/10',
        hover: 'hover:border-amber-300 dark:hover:border-amber-700/60',
        title: 'text-amber-950 dark:text-amber-100',
        iconBox: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20',
        badge: 'bg-amber-100/90 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40',
        btn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm shadow-amber-600/20',
    },
    info: {
        ring: 'border-sky-200/80 dark:border-sky-800/40',
        bg: 'bg-gradient-to-br from-sky-50/80 via-white to-sky-50/30 dark:from-sky-950/20 dark:via-slate-900/80 dark:to-sky-950/10',
        hover: 'hover:border-sky-300 dark:hover:border-sky-700/60',
        title: 'text-sky-950 dark:text-sky-100',
        iconBox: 'bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/20',
        badge: 'bg-sky-100/90 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40',
        btn: 'bg-sky-600 hover:bg-sky-700 text-white shadow-sm shadow-sky-600/20',
    },
    good: {
        ring: 'border-emerald-200/80 dark:border-emerald-800/40',
        bg: 'bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/30 dark:from-emerald-950/20 dark:via-slate-900/80 dark:to-emerald-950/10',
        hover: 'hover:border-emerald-300 dark:hover:border-emerald-700/60',
        title: 'text-emerald-950 dark:text-emerald-100',
        iconBox: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
        badge: 'bg-emerald-100/90 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40',
        btn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20',
    },
};

const toTitleCase = (str: string): string => {
    if (!str) return '';
    return str
        .toLowerCase()
        .split(' ')
        .filter(Boolean)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const getInitials = (name: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

interface RawClassItem {
    id: string;
    name: string;
}

interface RawStudentItem {
    id: string;
    name: string;
    class_id: string | null;
    parent_phone?: string | null;
    parent_name?: string | null;
}

interface RawViolationItem {
    student_id: string;
}

interface RawAttendanceItem {
    student_id: string;
    status: string;
}

interface RawAcademicItem {
    student_id: string;
    score: number;
}

export const SmartInsightsPanel: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { activeSemester } = useSemester();
    const semesterId = activeSemester?.id ?? null;

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ['smart_insights', user?.id, semesterId],
        enabled: !!user,
        queryFn: async () => {
            const [clsRes, stuRes, vioRes, attRes, acaRes] = await Promise.all([
                supabase.from('classes').select('id, name').is('deleted_at', null).eq('is_archived', false),
                supabase.from('students').select('id, name, class_id, parent_phone, parent_name').is('deleted_at', null),
                semesterId
                    ? supabase.from('violations').select('student_id').is('deleted_at', null).eq('semester_id', semesterId)
                    : supabase.from('violations').select('student_id').is('deleted_at', null),
                semesterId
                    ? supabase.from('attendance').select('student_id, status').is('deleted_at', null).eq('semester_id', semesterId)
                    : supabase.from('attendance').select('student_id, status').is('deleted_at', null),
                semesterId
                    ? supabase.from('academic_records').select('student_id, score').is('deleted_at', null).eq('semester_id', semesterId)
                    : supabase.from('academic_records').select('student_id, score').is('deleted_at', null),
            ]);
            const err = clsRes.error || stuRes.error || vioRes.error || attRes.error || acaRes.error;
            if (err) throw err;
            return {
                classes: (clsRes.data || []) as RawClassItem[],
                students: (stuRes.data || []) as RawStudentItem[],
                violations: (vioRes.data || []) as RawViolationItem[],
                attendance: (attRes.data || []) as RawAttendanceItem[],
                academics: (acaRes.data || []) as RawAcademicItem[],
            };
        },
    });

    const insights = useMemo<InsightCardData[]>(() => {
        if (!data) return [];
        const { classes, students, violations, attendance, academics } = data;
        const studentClass = new Map<string, string>(students.map((s: RawStudentItem) => [s.id, s.class_id || '']));
        const studentName = new Map<string, string>(students.map((s: RawStudentItem) => [s.id, s.name]));
        const studentParentPhone = new Map<string, string | null>(students.map((s: RawStudentItem) => [s.id, s.parent_phone ?? null]));
        const studentParentName = new Map<string, string | null>(students.map((s: RawStudentItem) => [s.id, s.parent_name ?? null]));
        const className = new Map<string, string>(classes.map((c: RawClassItem) => [c.id, c.name]));
        const result: InsightCardData[] = [];

        // 1. Lonjakan pelanggaran per kelas
        const vioByClass: Record<string, number> = {};
        violations.forEach((v: RawViolationItem) => {
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
            const topClsName = className.get(topCid) || 'Kelas';
            const pctAbove = avgVio > 0 ? Math.round(((topCount - avgVio) / avgVio) * 100) : 0;

            result.push({
                id: 'vio-spike',
                severity: spike ? 'high' : 'warning',
                icon: AlertTriangle,
                title: spike ? `Lonjakan Pelanggaran di ${topClsName}` : `Pelanggaran Tertinggi: ${topClsName}`,
                subtitle: spike ? 'Jauh di atas rata-rata sekolah' : 'Perlu perhatian wali kelas',
                detail: `${topCount} pelanggaran tercatat (rata-rata madrasah ${avgVio.toFixed(1)} per kelas). Perlu evaluasi dan pendampingan.`,
                badgeLabel: spike ? 'Perlu Tindak Lanjut' : 'Perhatian',
                spikeData: {
                    className: topClsName,
                    count: topCount,
                    schoolAvg: Number(avgVio.toFixed(1)),
                    pctAboveAvg: pctAbove,
                    spike,
                },
                cta: { label: 'Lihat Analisis Kelas', onClick: () => navigate('/analytics') },
            });
        }

        // 2. Kehadiran rendah per kelas
        const attAgg: Record<string, { present: number; counted: number }> = {};
        attendance.forEach((a: RawAttendanceItem) => {
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
                title: `Kehadiran Rendah di ${lowAtt.length} Kelas`,
                subtitle: `Ambang batas kehadiran sehat ≥ 85.0%`,
                detail: `Terdapat ${lowAtt.length} kelas dengan tingkat kehadiran di bawah standar yang ditetapkan.`,
                badgeLabel: `${lowAtt.length} Kelas`,
                attendanceAnomalies: {
                    threshold: 85,
                    classes: lowAtt.slice(0, 4).map(v => ({
                        classId: v.cid,
                        className: className.get(v.cid) || 'Kelas',
                        rate: Number(v.rate.toFixed(1)),
                        diff: Number((v.rate - 85).toFixed(1)),
                        onClick: () => navigate('/absensi'),
                    })),
                },
                cta: { label: 'Buka Rekap Absensi', onClick: () => navigate('/absensi') },
            });
        }

        // 3. Siswa perlu perhatian (pelanggaran terbanyak)
        const vioByStudent: Record<string, number> = {};
        violations.forEach((v: RawViolationItem) => { vioByStudent[v.student_id] = (vioByStudent[v.student_id] || 0) + 1; });
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
                title: `${atRisk.length} Siswa Perlu Perhatian Khusus`,
                subtitle: 'Siswa dengan catatan pelanggaran tertinggi',
                detail: 'Akumulasi ≥ 3 catatan kedisiplinan pada semester ini.',
                badgeLabel: '≥ 3 Pelanggaran',
                riskStudents: atRisk.map(s => {
                    const rawName = studentName.get(s.sid) || 'Siswa';
                    const cName = className.get(studentClass.get(s.sid) || '') || '-';
                    return {
                        id: s.sid,
                        name: toTitleCase(rawName),
                        className: cName,
                        count: s.count,
                        parentPhone: studentParentPhone.get(s.sid) ?? null,
                        parentName: studentParentName.get(s.sid) ?? null,
                        onClick: () => navigate(`/siswa/${s.sid}`),
                    };
                }),
                cta: { label: 'Buka Direktori Siswa', onClick: () => navigate('/siswa') },
            });
        }

        // 4. Kelas dengan rata nilai di bawah rata-rata sekolah
        const acaAgg: Record<string, { sum: number; n: number }> = {};
        academics.forEach((a: RawAcademicItem) => {
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
                    title: `Rata Nilai di Bawah Sekolah: ${below.length} Kelas`,
                    subtitle: `Rata-rata sekolah saat ini: ${schoolAvg.toFixed(1)} poin`,
                    detail: `Terdapat ${below.length} kelas dengan deviasi nilai > 5 poin di bawah rata-rata sekolah (${schoolAvg.toFixed(1)}).`,
                    badgeLabel: `${below.length} Kelas`,
                    scoreAnomalies: {
                        schoolAvg: Number(schoolAvg.toFixed(1)),
                        classes: below.slice(0, 4).map(c => ({
                            classId: c.cid,
                            className: className.get(c.cid) || 'Kelas',
                            score: Number(c.avg.toFixed(1)),
                            diff: Number((c.avg - schoolAvg).toFixed(1)),
                            onClick: () => navigate('/analytics'),
                        })),
                    },
                    cta: { label: 'Buka Analisis Nilai Lengkap', onClick: () => navigate('/analytics') },
                });
            }
        }

        if (result.length === 0) {
            result.push({
                id: 'all-good',
                severity: 'good',
                icon: CheckCircle2,
                title: 'Kondisi Sekolah Stabil & Normal',
                subtitle: 'Tidak ada anomali kedisiplinan atau akademik',
                detail: 'Seluruh kelas dan siswa berada dalam batas aman untuk kehadiran, nilai, dan ketertiban semester ini. Kerja luar biasa!',
                badgeLabel: 'Semua Aman',
            });
        }
        return result;
    }, [data, navigate]);

    if (isLoading) {
        return (
            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/60 p-5 mb-6 animate-pulse text-sm text-slate-400 flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-700 animate-spin" />
                <span>Menganalisis anomali dan data madrasah...</span>
            </div>
        );
    }

    const activeAlertCount = insights.filter(i => i.severity === 'high' || i.severity === 'warning').length;

    return (
        <div className="mb-6">
            {/* Header Section */}
            <div className="flex items-center justify-between gap-2 mb-3.5">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500/20 to-brand-600/10 dark:from-brand-400/20 dark:to-brand-500/10 flex items-center justify-center border border-brand-500/20 shadow-sm">
                        <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                            Insight & Peringatan Cerdas
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                            Deteksi otomatis anomali kedisiplinan, capaian akademik, dan kehadiran
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => refetch()}
                        disabled={isFetching}
                        className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
                        title="Segarkan data insight"
                        aria-label="Segarkan data insight"
                    >
                        <RotateCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-brand-600' : ''}`} />
                    </button>
                    {activeAlertCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            {activeAlertCount} Perlu Perhatian
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Kondisi Normal
                        </span>
                    )}
                </div>
            </div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-stretch">
                {insights.map((ins, index) => {
                    const sev = SEV[ins.severity] || SEV.info;
                    const Icon = ins.icon;
                    // If odd number of cards and this is the last card, span across both columns
                    const isFullWidth = insights.length % 2 === 1 && index === insights.length - 1;
                    const colSpanClass = isFullWidth ? 'col-span-1 md:col-span-2' : 'col-span-1';

                    return (
                        <div
                            key={ins.id}
                            className={`rounded-3xl border ${sev.ring} ${sev.bg} ${sev.hover} p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 shadow-sm ${colSpanClass}`}
                        >
                            {/* Card Top: Header & Badge */}
                            <div>
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-9 h-9 rounded-2xl ${sev.iconBox} flex items-center justify-center shrink-0`}>
                                            <Icon className="w-4.5 h-4.5" />
                                        </div>
                                        <div>
                                            <h4 className={`text-sm sm:text-[15px] font-bold ${sev.title} leading-snug`}>
                                                {ins.title}
                                            </h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                                {ins.subtitle}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0 ${sev.badge}`}>
                                        {ins.badgeLabel}
                                    </span>
                                </div>

                                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                                    {ins.detail}
                                </p>

                                {/* 1. Violation Spike Rich Box */}
                                {ins.spikeData && (
                                    <div className="space-y-3 mb-4">
                                        <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 shadow-sm">
                                            <div className="px-1">
                                                <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                                    Kasus {ins.spikeData.className}
                                                </span>
                                                <div className="text-xl font-black text-rose-600 dark:text-rose-400 tracking-tight mt-0.5">
                                                    {ins.spikeData.count}
                                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">pelanggaran</span>
                                                </div>
                                            </div>
                                            <div className="px-1 border-l border-slate-200/70 dark:border-slate-800/70 pl-3">
                                                <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                                    Rata-rata Sekolah
                                                </span>
                                                <div className="text-xl font-black text-slate-700 dark:text-slate-300 tracking-tight mt-0.5">
                                                    {ins.spikeData.schoolAvg}
                                                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">/ kelas</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 px-0.5">
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="text-slate-500 dark:text-slate-400 font-medium">
                                                    Deviasi terhadap rata-rata sekolah
                                                </span>
                                                <span className="font-bold text-rose-600 dark:text-rose-400">
                                                    +{ins.spikeData.pctAboveAvg}% lebih tinggi
                                                </span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-200/70 dark:bg-slate-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all duration-500"
                                                    style={{ width: `${Math.min(100, Math.max(30, (ins.spikeData.count / (ins.spikeData.schoolAvg * 2.5 || 1)) * 100))}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* 2. Students at Risk Rich List */}
                                {ins.riskStudents && (
                                    <div className="space-y-2 mb-4">
                                        {ins.riskStudents.map((stu) => {
                                            const initials = getInitials(stu.name);
                                            return (
                                                <div
                                                    key={stu.id}
                                                    onClick={stu.onClick}
                                                    className="group flex items-center justify-between p-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 hover:border-rose-300 dark:hover:border-rose-800/80 hover:bg-rose-50/50 dark:hover:bg-rose-950/30 transition-all cursor-pointer shadow-sm"
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                                                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500/20 to-rose-600/10 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center shrink-0 border border-rose-500/20 shadow-xs">
                                                            {initials}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                                                                {stu.name}
                                                            </p>
                                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                                                                    {stu.className}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                                            {stu.count} pelanggaran
                                                        </span>
                                                        {stu.parentPhone && (
                                                            <a
                                                                href={createWhatsAppLink(
                                                                    stu.parentPhone,
                                                                    generateStudentConcernMessage(
                                                                        stu.name,
                                                                        stu.count,
                                                                        stu.className,
                                                                        stu.parentName ?? undefined
                                                                    )
                                                                )}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="p-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 transition-all cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95"
                                                                title={`Hubungi Wali Santri via WhatsApp (${stu.parentPhone})`}
                                                                aria-label={`Hubungi Wali Santri via WhatsApp (${stu.parentPhone})`}
                                                            >
                                                                <MessageCircle className="w-3.5 h-3.5" />
                                                            </a>
                                                        )}
                                                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all" />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* 3. Score Anomaly Rich Comparison */}
                                {ins.scoreAnomalies && (
                                    <div className={`mb-4 ${isFullWidth ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-2'}`}>
                                        {ins.scoreAnomalies.classes.map((cls) => {
                                            return (
                                                <div
                                                    key={cls.classId}
                                                    onClick={cls.onClick}
                                                    className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 hover:border-amber-300 dark:hover:border-amber-800/80 transition-all cursor-pointer space-y-2.5 shadow-sm"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-xs" />
                                                            {cls.className}
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                                                                {cls.score}
                                                            </span>
                                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                                                {cls.diff} pts
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <div className="relative w-full h-2 bg-slate-200/70 dark:bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
                                                                style={{ width: `${Math.min(100, Math.max(15, cls.score))}%` }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                                            <span>0</span>
                                                            <span className="text-slate-500 dark:text-slate-400">
                                                                Rata sekolah: {ins.scoreAnomalies?.schoolAvg}
                                                            </span>
                                                            <span>100</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* 4. Attendance Anomaly Rich Comparison */}
                                {ins.attendanceAnomalies && (
                                    <div className={`mb-4 ${isFullWidth ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'space-y-2'}`}>
                                        {ins.attendanceAnomalies.classes.map((cls) => {
                                            return (
                                                <div
                                                    key={cls.classId}
                                                    onClick={cls.onClick}
                                                    className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/70 hover:border-amber-300 dark:hover:border-amber-800/80 transition-all cursor-pointer space-y-2.5 shadow-sm"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                                            <span className="w-2 h-2 rounded-full bg-amber-500 shadow-xs" />
                                                            {cls.className}
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                                                                {cls.rate}%
                                                            </span>
                                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                                                {cls.diff}%
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <div className="relative w-full h-2 bg-slate-200/70 dark:bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-amber-500 to-teal-400 rounded-full"
                                                                style={{ width: `${Math.min(100, Math.max(10, cls.rate))}%` }}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                                                            <span>0%</span>
                                                            <span className="text-slate-500 dark:text-slate-400">
                                                                Target: {ins.attendanceAnomalies?.threshold}%
                                                            </span>
                                                            <span>100%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Generic Items fallback if any */}
                                {ins.items && !ins.riskStudents && !ins.scoreAnomalies && !ins.attendanceAnomalies && (
                                    <ul className="space-y-1.5 mb-4">
                                        {ins.items.map((it, i) => (
                                            <li
                                                key={i}
                                                className={`flex items-center justify-between text-xs p-2 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 ${it.onClick ? 'cursor-pointer hover:border-slate-300' : ''}`}
                                                onClick={it.onClick}
                                            >
                                                <span className="text-slate-700 dark:text-slate-200 truncate flex-1 min-w-0 pr-2 font-medium">
                                                    {it.label}
                                                </span>
                                                <span className={`font-bold ml-2 shrink-0 ${sev.title}`}>
                                                    {it.meta}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* Card Bottom: Action CTA Button */}
                            {ins.cta && (
                                <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/50 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={ins.cta.onClick}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-xl hover:bg-white/80 dark:hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700/80 cursor-pointer"
                                    >
                                        <span>{ins.cta.label}</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default SmartInsightsPanel;
