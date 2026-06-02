export interface StudentMatchResult {
    studentId: string;
    studentName: string;
    confidence: number; // 0 to 100
    method: 'exact' | 'partial' | 'token' | 'none';
}

export interface MinimStudent {
    id: string;
    name: string;
}

export const cleanNameString = (str: string): string => {
    if (!str) return '';
    return str.toLowerCase()
              .replace(/[.,\-_']/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
};

export const findStudentMatch = (targetName: string, students: MinimStudent[]): StudentMatchResult => {
    if (!targetName || !students || students.length === 0) {
        return { studentId: '', studentName: '', confidence: 0, method: 'none' };
    }

    const cleanedTarget = cleanNameString(targetName);

    // 1. Exact match
    const exactMatch = students.find(s => cleanNameString(s.name) === cleanedTarget);
    if (exactMatch) {
        return { studentId: exactMatch.id, studentName: exactMatch.name, confidence: 100, method: 'exact' };
    }

    // 2. Partial match
    const partialMatch = students.find(s => {
        const cleanName = cleanNameString(s.name);
        return cleanName.includes(cleanedTarget) || cleanedTarget.includes(cleanName);
    });
    if (partialMatch) {
        return { studentId: partialMatch.id, studentName: partialMatch.name, confidence: 85, method: 'partial' };
    }

    // 3. Token-based overlap
    const targetTokens = cleanedTarget.split(' ').filter(t => t.length > 1);
    if (targetTokens.length > 0) {
        let bestTokenMatch: MinimStudent | null = null;
        let maxOverlap = 0;

        students.forEach(s => {
            const studentTokens = cleanNameString(s.name).split(' ');
            const intersect = targetTokens.filter(t => studentTokens.some(st => st.includes(t) || t.includes(st)));
            const overlap = intersect.length / targetTokens.length;
            if (overlap >= 0.75 && overlap > maxOverlap) {
                maxOverlap = overlap;
                bestTokenMatch = s;
            }
        });

        if (bestTokenMatch) {
            return {
                studentId: (bestTokenMatch as MinimStudent).id,
                studentName: (bestTokenMatch as MinimStudent).name,
                confidence: Math.round(maxOverlap * 100),
                method: 'token'
            };
        }
    }

    return { studentId: '', studentName: '', confidence: 0, method: 'none' };
};
