// Grade Validation Utilities
// Provides validation for grade entries including KKM, duplicates, and outliers

export interface GradeEntry {
    studentId: string;
    studentName: string;
    score: number | '';
}

export interface ExistingGrade {
    id: string;
    studentId: string;
    score: number;
    assessmentName?: string;
    createdAt?: string;
}

export interface ValidationError {
    studentId: string;
    field: string;
    message: string;
    type: 'error';
}

export interface ValidationWarning {
    studentId: string;
    message: string;
    type: 'warning' | 'info';
    action?: 'overwrite' | 'below_kkm' | 'outlier';
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    summary: {
        total: number;
        valid: number;
        belowKkm: number;
        overwrites: number;
        outliers: number;
    };
}

export interface ValidationOptions {
    kkm?: number;
    checkDuplicates?: boolean;
    existingGrades?: ExistingGrade[];
    outlierThreshold?: { min: number; max: number };
    minScore?: number;
    maxScore?: number;
}

const DEFAULT_KKM = 75;
const DEFAULT_OUTLIER_MIN = 20;
const DEFAULT_OUTLIER_MAX = 95;

/**
 * Validate a single grade value
 */
export const validateSingleGrade = (
    value: string | number,
    options: { min?: number; max?: number } = {}
): { isValid: boolean; error: string | null } => {
    const { min = 0, max = 100 } = options;

    if (value === '' || value === undefined || value === null) {
        return { isValid: true, error: null }; // Empty is valid (optional)
    }

    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numValue)) {
        return { isValid: false, error: 'Nilai harus berupa angka' };
    }

    if (numValue < min) {
        return { isValid: false, error: `Nilai tidak boleh kurang dari ${min}` };
    }

    if (numValue > max) {
        return { isValid: false, error: `Nilai tidak boleh lebih dari ${max}` };
    }

    if (!Number.isInteger(numValue) && value.toString().split('.')[1]?.length > 2) {
        return { isValid: false, error: 'Maksimal 2 angka desimal' };
    }

    return { isValid: true, error: null };
};

/**
 * Validate all grades with comprehensive checks
 */
export const validateGrades = (
    grades: GradeEntry[],
    options: ValidationOptions = {}
): ValidationResult => {
    const {
        kkm = DEFAULT_KKM,
        checkDuplicates = true,
        existingGrades = [],
        outlierThreshold = { min: DEFAULT_OUTLIER_MIN, max: DEFAULT_OUTLIER_MAX },
        minScore = 0,
        maxScore = 100,
    } = options;

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let belowKkmCount = 0;
    let overwriteCount = 0;
    let outlierCount = 0;
    let validCount = 0;

    const existingGradesMap = new Map(
        existingGrades.map(g => [g.studentId, g])
    );

    grades.forEach(grade => {
        if (grade.score === '' || grade.score === undefined) {
            return; // Skip empty grades
        }

        const score = typeof grade.score === 'string'
            ? parseFloat(grade.score)
            : grade.score;

        // Basic validation
        const validation = validateSingleGrade(score, { min: minScore, max: maxScore });
        if (!validation.isValid) {
            errors.push({
                studentId: grade.studentId,
                field: 'score',
                message: validation.error || 'Nilai tidak valid',
                type: 'error',
            });
            return;
        }

        validCount++;

        // KKM Check
        if (score < kkm) {
            belowKkmCount++;
            warnings.push({
                studentId: grade.studentId,
                message: `Nilai ${score} di bawah KKM (${kkm})`,
                type: 'warning',
                action: 'below_kkm',
            });
        }

        // Outlier Check
        if (score < outlierThreshold.min) {
            outlierCount++;
            warnings.push({
                studentId: grade.studentId,
                message: `Nilai ${score} sangat rendah, periksa kembali`,
                type: 'warning',
                action: 'outlier',
            });
        } else if (score > outlierThreshold.max && score < maxScore) {
            // Only warn if not perfect score
            outlierCount++;
            warnings.push({
                studentId: grade.studentId,
                message: `Nilai ${score} sangat tinggi, periksa kembali`,
                type: 'info',
                action: 'outlier',
            });
        }

        // Duplicate/Overwrite Check
        if (checkDuplicates) {
            const existing = existingGradesMap.get(grade.studentId);
            if (existing) {
                overwriteCount++;
                warnings.push({
                    studentId: grade.studentId,
                    message: `Akan menimpa nilai sebelumnya: ${existing.score}`,
                    type: 'info',
                    action: 'overwrite',
                });
            }
        }
    });

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        summary: {
            total: grades.filter(g => g.score !== '').length,
            valid: validCount,
            belowKkm: belowKkmCount,
            overwrites: overwriteCount,
            outliers: outlierCount,
        },
    };
};

/**
 * Get color class for grade value based on validation status
 */
export const getGradeColorClass = (
    score: number | '',
    options: { kkm?: number; existingScore?: number } = {}
): { border: string; bg: string; text: string } => {
    const { kkm = DEFAULT_KKM, existingScore } = options;

    if (score === '' || score === undefined) {
        return { border: '', bg: '', text: '' };
    }

    const numScore = typeof score === 'string' ? parseFloat(score) : score;

    if (isNaN(numScore)) {
        return {
            border: 'border-red-500',
            bg: 'bg-red-50 dark:bg-red-900/20',
            text: 'text-red-600 dark:text-red-400',
        };
    }

    // Overwrite indicator
    if (existingScore !== undefined) {
        return {
            border: 'border-blue-500',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            text: 'text-blue-600 dark:text-blue-400',
        };
    }

    // Below KKM
    if (numScore < kkm) {
        return {
            border: 'border-amber-500',
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            text: 'text-amber-600 dark:text-amber-400',
        };
    }

    // Above KKM (good)
    return {
        border: 'border-green-500',
        bg: 'bg-green-50 dark:bg-green-900/20',
        text: 'text-green-600 dark:text-green-400',
    };
};

/**
 * Calculate statistics from grades
 */
export const calculateGradeStats = (grades: GradeEntry[]): {
    average: number;
    min: number;
    max: number;
    count: number;
    belowKkmCount: number;
    aboveKkmCount: number;
    perfectCount: number;
} => {
    const validGrades = grades
        .filter(g => g.score !== '' && !isNaN(Number(g.score)))
        .map(g => Number(g.score));

    if (validGrades.length === 0) {
        return {
            average: 0,
            min: 0,
            max: 0,
            count: 0,
            belowKkmCount: 0,
            aboveKkmCount: 0,
            perfectCount: 0,
        };
    }

    return {
        average: Math.round(validGrades.reduce((a, b) => a + b, 0) / validGrades.length),
        min: Math.min(...validGrades),
        max: Math.max(...validGrades),
        count: validGrades.length,
        belowKkmCount: validGrades.filter(s => s < DEFAULT_KKM).length,
        aboveKkmCount: validGrades.filter(s => s >= DEFAULT_KKM).length,
        perfectCount: validGrades.filter(s => s === 100).length,
    };
};

export default {
    validateSingleGrade,
    validateGrades,
    getGradeColorClass,
    calculateGradeStats,
};
