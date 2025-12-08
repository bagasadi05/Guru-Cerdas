import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { BrainCircuitIcon, SparklesIcon } from '../../Icons';
import { ai } from '../../../services/supabase';
import { useToast } from '../../../hooks/useToast';
import { Type } from '@google/genai';
import { StudentDetailsData, AiSummary } from './types';

interface AiStudentSummaryProps {
    studentDetails: StudentDetailsData;
}

export const AiStudentSummary: React.FC<AiStudentSummaryProps> = ({ studentDetails }) => {
    const [summary, setSummary] = useState<AiSummary | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const toast = useToast();

    // Auto-generate summary on mount if not already present, checking cache first
    React.useEffect(() => {
        if (studentDetails) {
            const cacheKey = `ai_summary_${studentDetails.student.id}`;
            const cachedData = localStorage.getItem(cacheKey);

            if (cachedData) {
                try {
                    const parsed = JSON.parse(cachedData);
                    // Optional: Check if cache is expired (e.g., 24 hours)? For now, just use it.
                    if (parsed && parsed.data) {
                        setSummary(parsed.data);
                        return;
                    }
                } catch (e) {
                    console.error("Error parsing AI summary cache:", e);
                    localStorage.removeItem(cacheKey);
                }
            }

            // Only generate if no valid cache found
            if (!summary) {
                generateSummary();
            }
        }
    }, [studentDetails.student.id]); // Depend on ID specifically to avoid unnecessary re-runs

    const generateSummary = async () => {
        setIsLoading(true);
        try {
            const { student, academicRecords, attendanceRecords, violations } = studentDetails;
            const systemInstruction = `Anda adalah seorang konselor akademik AI yang ahli dalam merangkum performa siswa secara holistik. Berikan ringkasan yang seimbang, menyoroti hal positif sambil memberikan saran konstruktif. Gunakan Bahasa Indonesia yang formal namun memotivasi. Format output harus JSON sesuai skema.`;

            const academicSummary = academicRecords.length > 0
                ? `Memiliki ${academicRecords.length} catatan nilai dengan rata-rata ${Math.round(academicRecords.reduce((sum, r) => sum + r.score, 0) / academicRecords.length)}.`
                : 'Belum ada data nilai akademik.';

            const attendanceSummary = `Memiliki ${attendanceRecords.filter(r => r.status === 'Alpha').length} hari alpha, ${attendanceRecords.filter(r => r.status === 'Izin').length} hari izin, dan ${attendanceRecords.filter(r => r.status === 'Sakit').length} hari sakit.`;

            const behaviorSummary = violations.length > 0
                ? `Terdapat ${violations.length} catatan pelanggaran dengan total ${violations.reduce((sum, v) => sum + v.points, 0)} poin.`
                : 'Tidak ada catatan pelanggaran, menunjukkan perilaku yang baik.';

            const prompt = `
            Analisis data siswa berikut untuk membuat ringkasan performa holistik.
            Nama Siswa: ${student.name}
            Data Akademik: ${academicSummary}
            Data Kehadiran: ${attendanceSummary}
            Data Perilaku: ${behaviorSummary}

            Tugas:
            1.  **general_evaluation**: Berikan evaluasi umum 1-2 kalimat.
            2.  **strengths**: Identifikasi 1-2 kekuatan utama siswa (bisa dari akademik, kehadiran, atau perilaku).
            3.  **development_focus**: Identifikasi 1-2 area utama yang memerlukan perhatian atau pengembangan.
            4.  **recommendations**: Berikan 1-2 rekomendasi konkret dan positif untuk siswa atau guru.
            `;

            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    general_evaluation: { type: Type.STRING, description: 'Evaluasi umum 1-2 kalimat.' },
                    strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: '1-2 kekuatan utama.' },
                    development_focus: { type: Type.ARRAY, items: { type: Type.STRING }, description: '1-2 area fokus pengembangan.' },
                    recommendations: { type: Type.ARRAY, items: { type: Type.STRING }, description: '1-2 rekomendasi konkret.' }
                },
                required: ["general_evaluation", "strengths", "development_focus", "recommendations"]
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { systemInstruction, responseMimeType: "application/json", responseSchema }
            });

            const result = JSON.parse(response.text || '{}') as AiSummary;

            // Save to cache
            const cacheKey = `ai_summary_${student.id}`;
            localStorage.setItem(cacheKey, JSON.stringify({
                timestamp: Date.now(),
                data: result
            }));

            setSummary(result);

        } catch (error) {
            console.error("Failed to generate AI summary:", error);
            // toast.error("Gagal membuat ringkasan AI."); // Suppress error on auto-load to avoid annoyance
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                        <BrainCircuitIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        <span>Ringkasan Performa AI</span>
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={generateSummary} disabled={isLoading}>
                        <SparklesIcon className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        {isLoading ? 'Menganalisis...' : 'Refresh'}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading && !summary ? (
                    <div className="space-y-3">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
                    </div>
                ) : summary ? (
                    <div className="space-y-4 text-sm animate-fade-in">
                        <p className="text-gray-700 dark:text-gray-300 italic border-l-4 border-purple-500 pl-3 py-1 bg-purple-50 dark:bg-purple-900/10 rounded-r">
                            "{summary.general_evaluation}"
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                            <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-lg border border-green-100 dark:border-green-800">
                                <h5 className="font-bold text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Kekuatan
                                </h5>
                                <ul className="space-y-1.5 text-gray-700 dark:text-gray-300">
                                    {summary.strengths.map((s, i) => <li key={i} className="flex items-start gap-2"><span className="mt-1.5 w-1 h-1 rounded-full bg-green-400"></span>{s}</li>)}
                                </ul>
                            </div>
                            <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg border border-amber-100 dark:border-amber-800">
                                <h5 className="font-bold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Fokus Pengembangan
                                </h5>
                                <ul className="space-y-1.5 text-gray-700 dark:text-gray-300">
                                    {summary.development_focus.map((d, i) => <li key={i} className="flex items-start gap-2"><span className="mt-1.5 w-1 h-1 rounded-full bg-amber-400"></span>{d}</li>)}
                                </ul>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                                <h5 className="font-bold text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Rekomendasi
                                </h5>
                                <ul className="space-y-1.5 text-gray-700 dark:text-gray-300">
                                    {summary.recommendations.map((r, i) => <li key={i} className="flex items-start gap-2"><span className="mt-1.5 w-1 h-1 rounded-full bg-blue-400"></span>{r}</li>)}
                                </ul>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <p>Gagal memuat ringkasan. Silakan coba refresh.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
