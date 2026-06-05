import { generateOpenRouterJson } from './openRouterService';

export interface AIStudentAdjustment {
    student_id: string;
    student_name: string;
    original_score: number;
    formula_score: number;
    ai_score: number;
    rationale: string;
}

export interface AIGradeAdjustmentResult {
    class_analysis: string;
    adjustments: AIStudentAdjustment[];
}

/**
 * Apply the Excel-like grading formula: NewScore = (Score * Weight) + Constant
 * Returns rounded integer score between 0 and 100.
 */
export const calculateFormulaScore = (
    score: number,
    weight: number = 0.6,
    constant: number = 40,
    minGrade: number = 0
): number => {
    if (score < 0 || score > 100) return score;
    const adjusted = (score * weight) + constant;
    return Math.min(100, Math.max(minGrade, Math.round(adjusted)));
};

/**
 * Call OpenRouter AI to analyze the grade distribution and generate a fair curve
 * that prevents compression issues in the 81-98 grade range.
 */
export const analyzeAndAdjustGradesWithAI = async (
    students: Array<{ id: string; name: string; score: number }>,
    subject: string,
    assessmentName: string,
    kkm: number = 75,
    formulaWeight: number = 0.6,
    formulaConstant: number = 40,
    targetAvgRange: { min: number; max: number } = { min: 81, max: 98 }
): Promise<AIGradeAdjustmentResult> => {
    // Generate scores for prompt comparison
    const studentListForAI = students.map(s => {
        const formulaScore = calculateFormulaScore(s.score, formulaWeight, formulaConstant, targetAvgRange.min);
        return {
            student_id: s.id,
            student_name: s.name,
            original_score: s.score,
            formula_score: formulaScore
        };
    });

    const systemInstruction = `Anda adalah asisten akademik AI Indonesia yang ahli dalam penilaian pendidikan dan statistika sekolah. Tugas Anda adalah melakukan audit nilai kelas dan memberikan penyesuaian (katrol) nilai yang adil.

Tujuan utama audit Anda adalah mencegah "efek kompresi" (high-tier compression bias) di mana siswa berprestasi tinggi (kisaran nilai asli 81-98) dirugikan karena selisih nilainya dipersempit dengan siswa bernilai rendah setelah rumus katrol linear applied.

PENTING: Rata-rata akhir kelas setelah penyesuaian (ai_score) WAJIB berada di kisaran target rata-rata sekolah: ${targetAvgRange.min} - ${targetAvgRange.max}.

Pedoman Penyesuaian AI (ai_score):
1. Batas nilai tertinggi (maksimal) setelah katrol adalah 100. Nilai siswa (ai_score) boleh mencapai 100, terutama bagi siswa dengan nilai asli tinggi.
2. Nilai terendah setelah katrol adalah ${targetAvgRange.min}. Tidak boleh ada nilai siswa (ai_score) di bawah ${targetAvgRange.min}.
3. Nilai di bawah KKM (${kkm}) yang terkatrol oleh rumus excel ke nilai tuntas (misal 50 menjadi 70) biarkan tuntas, namun pastikan siswa dengan nilai asli tinggi (81-98) mendapatkan apresiasi tambahan (ai_score lebih tinggi dari formula_score) agar jarak prestasi mereka tetap proporsional dan tidak terkejar terlalu dekat oleh siswa nilai rendah.
4. Rata-rata akhir rekomendasi nilai (ai_score) untuk seluruh siswa harus berada di rentang ${targetAvgRange.min} sampai ${targetAvgRange.max}.
5. Rekomendasi ai_score harus berkisar antara ${targetAvgRange.min} - 100 dan merupakan bilangan bulat.
6. Justifikasi singkat (rationale) dalam Bahasa Indonesia untuk setiap penyesuaian.
7. Analisis kelas singkat (class_analysis) tentang sebaran prestasi.

Format JSON yang diharapkan:
{
  "class_analysis": "Analisis singkat tentang distribusi nilai kelas...",
  "adjustments": [
    {
      "student_id": "id_siswa",
      "student_name": "Nama Siswa",
      "original_score": 85,
      "formula_score": 91,
      "ai_score": 93,
      "rationale": "Alasan penyesuaian..."
    }
  ]
}`;

    const prompt = `Lakukan audit nilai adil untuk mata pelajaran "${subject}" - Penilaian "${assessmentName}".
KKM Sekolah: ${kkm}
Rumus Excel yang diterapkan: =(${formulaWeight * 100}% * NilaiAsli) + ${formulaConstant}
Target Rata-rata Kelas: ${targetAvgRange.min} - ${targetAvgRange.max}

Daftar nilai siswa kelas:
${JSON.stringify(studentListForAI, null, 2)}

Tugas Anda:
1. Evaluasi sebaran nilai tersebut.
2. Hitung rekomendasi nilai baru (ai_score) yang adil untuk setiap siswa. Pastikan siswa di kisaran 81-98 tidak dirugikan oleh kompresi linear rumus tersebut, tidak ada nilai melebihi 100 atau di bawah ${targetAvgRange.min}, dan RATA-RATA KELAS AKHIR memenuhi target (${targetAvgRange.min} - ${targetAvgRange.max}).
3. Kembalikan data dalam format JSON yang valid sesuai instruksi sistem.`;


    try {
        const result = await generateOpenRouterJson<AIGradeAdjustmentResult>(prompt, systemInstruction);
        
        // Post-process fallback validation: make sure every student is represented
        const resolvedAdjustments = students.map(s => {
            const formulaScore = calculateFormulaScore(s.score, formulaWeight, formulaConstant, targetAvgRange.min);
            const aiAdjusted = result.adjustments?.find(a => a.student_id === s.id);
            
            if (aiAdjusted) {
                return {
                    student_id: s.id,
                    student_name: s.name,
                    original_score: s.score,
                    formula_score: formulaScore,
                    ai_score: Math.min(100, Math.max(targetAvgRange.min, Math.round(Number(aiAdjusted.ai_score) || formulaScore))),
                    rationale: aiAdjusted.rationale || 'Penyesuaian terhitung otomatis.'
                };
            }
            
            // Fallback if AI missed the student
            return {
                student_id: s.id,
                student_name: s.name,
                original_score: s.score,
                formula_score: formulaScore,
                ai_score: formulaScore,
                rationale: 'Dipertahankan sesuai rumus default.'
            };
        });

        return {
            class_analysis: result.class_analysis || 'Analisis sebaran kelas berhasil diproses.',
            adjustments: resolvedAdjustments
        };
    } catch (error) {
        console.error('Failed to adjust grades with AI:', error);
        // Clean fallback
        return {
            class_analysis: 'Analisis AI tidak tersedia sementara waktu. Menggunakan formula default.',
            adjustments: studentListForAI.map(s => ({
                student_id: s.student_id,
                student_name: s.student_name,
                original_score: s.original_score,
                formula_score: s.formula_score,
                ai_score: s.formula_score,
                rationale: 'Menggunakan perhitungan rumus excel default.'
            }))
        };
    }
};
