import React, { useState } from 'react';
import { generateGeminiJson } from '../../../../../services/geminiService';
import { StudentRow, ReviewDataItem } from '../../types';
import { findStudentMatch as centralFindStudentMatch } from '../../../../../utils/studentMatcher';
import { useToast } from '../../../../../hooks/useToast';

export const findStudentMatch = (targetName: string, students: StudentRow[]): StudentRow | undefined => {
    const res = centralFindStudentMatch(targetName, students);
    if (res.method !== 'none') {
        return students.find(s => s.id === res.studentId);
    }
    return undefined;
};

interface UseMassInputAiParseParams {
    studentsData: StudentRow[] | undefined;
    pasteData: string;
    selectedClass: string;
    subjectGradeInfo: { subject: string; assessment_name: string; notes: string; semester: string };
    selectedStudentIds: Set<string>;
    setScores: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    isScoresDirtyRef: React.MutableRefObject<boolean>;
    setIsScoresDirty?: (isDirty: boolean) => void;
    saveSubjectGradeDraft?: (draft: any) => void;
    toast: ReturnType<typeof useToast>;
}

export function useMassInputAiParse({
    studentsData,
    pasteData,
    selectedClass,
    subjectGradeInfo,
    selectedStudentIds,
    setScores,
    isScoresDirtyRef,
    setIsScoresDirty,
    saveSubjectGradeDraft,
    toast,
}: UseMassInputAiParseParams) {
    const [isParsing, setIsParsing] = useState(false);

    const handleAiParse = async () => {
        if (!studentsData || studentsData.length === 0) {
            toast.warning('Pilih kelas dengan siswa terlebih dahulu.');
            return;
        }
        if (!pasteData.trim()) {
            toast.warning('Tempelkan data nilai terlebih dahulu.');
            return;
        }
        setIsParsing(true);
        try {
            const studentNames = studentsData.map(s => s.name);
            const systemInstruction = `Anda adalah asisten entri data. Tugas Anda adalah mencocokkan nama dari teks yang diberikan dengan daftar nama siswa yang ada dan mengekstrak nilainya. Hanya cocokkan nama yang ada di daftar. Abaikan nama yang tidak ada di daftar. Format output harus JSON yang valid.
            
            Format JSON yang diharapkan:
            [
              { "studentName": "Nama Siswa", "score": "85" }
            ]`;
            const prompt = `Daftar Siswa: ${JSON.stringify(studentNames)}\n\nTeks Nilai untuk Diproses:\n${pasteData}`;
            const parsedResults = await generateGeminiJson<ReviewDataItem[]>(prompt, systemInstruction, 'parse-values');
            if (!Array.isArray(parsedResults)) throw new Error('Format respon AI tidak valid (bukan list).');
            const newScores: Record<string, string> = {};
            let matchedCount = 0;
            const unmatchedNames: string[] = [];
            parsedResults.forEach(item => {
                if (!item || typeof item.studentName !== 'string') return;
                const student = findStudentMatch(item.studentName, studentsData);
                if (student) {
                    const score = item.score !== undefined && item.score !== null ? String(item.score) : '';
                    if (score && !isNaN(Number(score))) {
                        newScores[student.id] = score;
                        matchedCount++;
                    }
                } else {
                    unmatchedNames.push(item.studentName);
                }
            });
            if (unmatchedNames.length > 0) {
                toast.warning(`Nama tidak dikenali: ${unmatchedNames.slice(0, 3).join(', ')}${unmatchedNames.length > 3 ? `, dan ${unmatchedNames.length - 3} lainnya` : ''}`);
            }
            if (isScoresDirtyRef) {
                isScoresDirtyRef.current = true;
            }
            setIsScoresDirty?.(true);
            setScores(prev => {
                const merged = { ...prev, ...newScores };
                saveSubjectGradeDraft?.({
                    selectedClass,
                    subjectGradeInfo,
                    scores: merged,
                    selectedStudentIds: Array.from(selectedStudentIds),
                });
                return merged;
            });
            toast.success(`${matchedCount} dari ${parsedResults.length} nilai berhasil dicocokkan dan diisi.`);
        } catch (error) {
            console.error('AI Parsing Error:', error);
            const errMsg = error instanceof Error ? error.message : '';
            if (errMsg.includes('network') || errMsg.includes('fetch') || errMsg.includes('Failed to fetch')) {
                toast.error('Gagal terhubung ke server AI. Periksa koneksi internet Anda.');
            } else if (errMsg.includes('rate') || errMsg.includes('limit') || errMsg.includes('429')) {
                toast.error('Batas permintaan AI tercapai. Coba lagi dalam beberapa saat.');
            } else {
                toast.error('Gagal memproses data. Pastikan format teks sesuai contoh yang diberikan.');
            }
        } finally {
            setIsParsing(false);
        }
    };

    return {
        handleAiParse,
        isParsing,
    };
}
