import { Shield, AlertTriangle, Sparkles } from 'lucide-react';
import type { BintangGrade } from '../../../services/bintangService';

// ─── Grade Colors ──────────────────────────────────────────────────────────

export const gradeColors: Record<string, string> = {
    A: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 ring-emerald-500/20',
    B: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 ring-blue-500/20',
    C: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 ring-amber-500/20',
    D: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 ring-rose-500/20',
};

// ─── Aspect Metadata ────────────────────────────────────────────────────────

export const aspectMeta = {
    ADAB: { icon: Shield, label: 'Adab', color: 'text-indigo-500', bgLight: 'bg-indigo-50 dark:bg-indigo-900/20', borderColor: 'border-indigo-200 dark:border-indigo-800' },
    KEDISIPLINAN: { icon: AlertTriangle, label: 'Kedisiplinan', color: 'text-amber-500', bgLight: 'bg-amber-50 dark:bg-amber-900/20', borderColor: 'border-amber-200 dark:border-amber-800' },
    KERAPIAN: { icon: Sparkles, label: 'Kerapian', color: 'text-teal-500', bgLight: 'bg-teal-50 dark:bg-teal-900/20', borderColor: 'border-teal-200 dark:border-teal-800' },
} as const;

// ─── Auto-Note Generators ───────────────────────────────────────────────────

export function generateAutoNote(adab: BintangGrade, kedis: BintangGrade, kerapian: BintangGrade, activePoints: number = 0) {
    let adabNote = '';
    let kedisNote = '';
    let kerapianNote = '';

    const activeBonusText = activePoints > 0 ? ` Serta sangat aktif di kelas (+${activePoints} poin keaktifan).` : '';

    if (adab === 'A') adabNote = `Ananda menunjukkan akhlak mulia dan sopan santun yang sangat baik.${activeBonusText}`;
    else if (adab === 'B') adabNote = `Secara umum adab Ananda sudah baik, namun bisa lebih ramah dan santun lagi.${activeBonusText}`;
    else if (adab === 'C') adabNote = `Adab dan perilaku Ananda perlu lebih diperhatikan, terutama dalam berinteraksi dengan orang lain.${activeBonusText}`;
    else adabNote = `Sangat perlu bimbingan orang tua di rumah terkait tata krama dan sopan santun Ananda.`;

    if (kedis === 'A') kedisNote = "Kedisiplinannya di sekolah sangat tinggi dan selalu menaati aturan.";
    else if (kedis === 'B') kedisNote = "Kedisiplinan cukup memadai meski sesekali masih perlu diingatkan.";
    else if (kedis === 'C') kedisNote = "Ananda masih sering kurang disiplin, mohon dorongan agar lebih tepat waktu dan fokus.";
    else kedisNote = "Tingkat kedisiplinan sangat kurang dan butuh pengawasan ekstra ketat dari rumah.";

    if (kerapian === 'A') kerapianNote = "Senantiasa menjaga kebersihan dan kerapian seragam dengan sangat konsisten.";
    else if (kerapian === 'B') kerapianNote = "Penampilan sudah cukup rapi, mohon pertahankan kelengkapan atribut sekolah.";
    else if (kerapian === 'C') kerapianNote = "Sering terlihat kurang rapi, mohon dicek kembali penampilannya sebelum berangkat sekolah.";
    else kerapianNote = "Kerapian sangat kurang diperhatikan, mohon kerja samanya untuk selalu mengingatkan Ananda.";

    return { adabNote, kedisNote, kerapianNote };
}

export function generateHomeroomNote(adab: BintangGrade, kedis: BintangGrade, kerapian: BintangGrade, activePoints: number = 0) {
    const grades = [adab, kedis, kerapian];
    const countA = grades.filter(g => g === 'A').length;
    const countB = grades.filter(g => g === 'B').length;
    const hasD = grades.includes('D');
    const hasC = grades.includes('C');

    const activeBonusText = activePoints > 0 ? ` Serta menunjukkan partisipasi aktif yang luar biasa (+${activePoints} poin keaktifan).` : '';

    if (countA === 3) {
        return `Alhamdulillah, perkembangan sikap Ananda pada bulan ini sangat baik di kelas.${activeBonusText} Pertahankan adab mulia, kedisiplinan, dan kerapian yang telah ditunjukkan.`;
    }
    if (hasD) {
        return `Ananda memerlukan perhatian khusus dan bimbingan ekstra, baik di sekolah maupun di rumah, untuk memperbaiki kedisiplinan dan kepatuhan terhadap tata tertib sekolah.${activeBonusText}`;
    }
    if (hasC) {
        return `Secara keseluruhan sikap Ananda sudah cukup baik, namun mohon bantuan Orang Tua untuk memotivasi Ananda agar lebih meningkatkan kedisiplinan.${activeBonusText}`;
    }
    if (countB >= 2 || (countA >= 1 && countB >= 1)) {
        return `Perkembangan sikap Ananda pada bulan ini dinilai baik.${activeBonusText} Teruslah bersemangat dalam belajar dan selalu konsisten mempertahankan sikap positif di sekolah.`;
    }
    return `Perkembangan sikap Ananda secara keseluruhan dinilai baik.${activeBonusText} Mohon terus dukung dan arahkan Ananda agar dapat terus konsisten meningkatkan pembiasaan baiknya.`;
}
