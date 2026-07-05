import { supabase } from './supabase';
import { violationList, type BintangAspect } from './violations.data';
import type { 
  BintangMentoringRow, 
  BintangMentoringInsert, 
  BintangDailyObservationRow, 
  BintangDailyObservationInsert,
  BintangEvaluationRow,
  BintangEvaluationInsert,
  BintangEvaluationUpdate
} from '../types/database';

// =============================================================================
// BINTANG SCORING ENGINE
// =============================================================================

export type BintangGrade = 'A' | 'B' | 'C' | 'D';

export interface BintangScoreThreshold {
  grade: BintangGrade;
  label: string;
  maxPoints: number; // inclusive upper bound (Infinity for the last tier)
  color: string;
}

/** 
 * Scoring thresholds — conversion from total violation points to letter grade.
 * Applied per-aspect: each aspect tallies its own violation points independently.
 */
export const BINTANG_THRESHOLDS: BintangScoreThreshold[] = [
  { grade: 'A', label: 'Sangat Baik', maxPoints: 0,  color: 'emerald' },
  { grade: 'B', label: 'Baik',        maxPoints: 10, color: 'blue' },
  { grade: 'C', label: 'Cukup',       maxPoints: 20, color: 'amber' },
  { grade: 'D', label: 'Kurang',      maxPoints: Infinity, color: 'rose' },
];

/** Convert total violation points for one aspect into a BINTANG letter grade. */
export function pointsToGrade(points: number): BintangGrade {
  if (points <= 0) return 'A';
  if (points <= 10) return 'B';
  if (points <= 20) return 'C';
  return 'D';
}

/** Get the threshold metadata for a given grade. */
export function getThresholdForGrade(grade: BintangGrade): BintangScoreThreshold {
  return BINTANG_THRESHOLDS.find(t => t.grade === grade)!;
}

/**
 * Build a lookup map from violation description → BintangAspect.
 * Used to classify each violation record from the DB into the correct aspect.
 */
const descriptionToAspect = new Map<string, BintangAspect>(
  violationList.map(v => [v.description, v.bintangAspect])
);

/** Look up which BINTANG aspect a violation falls under based on its description. */
export function getAspectForViolation(description: string): BintangAspect {
  return descriptionToAspect.get(description) ?? 'KEDISIPLINAN'; // safe fallback
}

export interface AspectPointsSummary {
  ADAB: { points: number; count: number; grade: BintangGrade };
  KEDISIPLINAN: { points: number; count: number; grade: BintangGrade };
  KERAPIAN: { points: number; count: number; grade: BintangGrade };
}

/** Calculate per-aspect violation points from an array of violation rows. */
export function calculateAspectPoints(violations: Array<{ description: string; points: number }>): AspectPointsSummary {
  const summary: AspectPointsSummary = {
    ADAB: { points: 0, count: 0, grade: 'A' },
    KEDISIPLINAN: { points: 0, count: 0, grade: 'A' },
    KERAPIAN: { points: 0, count: 0, grade: 'A' },
  };

  for (const v of violations) {
    const aspect = getAspectForViolation(v.description);
    summary[aspect].points += v.points;
    summary[aspect].count += 1;
  }

  // Compute grades
  summary.ADAB.grade = pointsToGrade(summary.ADAB.points);
  summary.KEDISIPLINAN.grade = pointsToGrade(summary.KEDISIPLINAN.points);
  summary.KERAPIAN.grade = pointsToGrade(summary.KERAPIAN.points);

  return summary;
}

// =============================================================================
// BINTANG SERVICE
// =============================================================================

export const bintangService = {
  // --- Mentoring Logs ---
  async getMentoringLogs(classId?: string, studentId?: string) {
    try {
      let studentIds: string[] | null = null;
      if (studentId) {
        studentIds = [studentId];
      } else if (classId) {
        const { data: classStudents } = await supabase
          .from('students')
          .select('id')
          .eq('class_id', classId)
          .is('deleted_at', null);
        studentIds = classStudents?.map(s => s.id) || [];
        if (studentIds.length === 0) return [];
      }

      let query = supabase.from('bintang_mentoring_logs').select('*');
      if (studentIds) {
        query = query.in('student_id', studentIds);
      }

      const { data, error } = await query.order('date', { ascending: false });
      if (error) {
        console.warn('bintangService.getMentoringLogs error:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.warn('bintangService.getMentoringLogs exception:', err);
      return [];
    }
  },

  async bulkInsertMentoringLogs(logs: BintangMentoringInsert[]) {
    const { data, error } = await supabase
      .from('bintang_mentoring_logs')
      .insert(logs)
      .select();
      
    if (error) throw error;
    return data;
  },

  // --- Daily Observations ---
  async getDailyObservations(classId?: string, month?: string) {
    try {
      let studentIds: string[] | null = null;
      if (classId) {
        const { data: classStudents } = await supabase
          .from('students')
          .select('id')
          .eq('class_id', classId)
          .is('deleted_at', null);
        studentIds = classStudents?.map(s => s.id) || [];
        if (studentIds.length === 0) return [];
      }

      let query = supabase.from('bintang_daily_observations').select('*');
      if (studentIds) {
        query = query.in('student_id', studentIds);
      }
      
      if (month) {
        const startDate = `${month}-01`;
        const [year, monthNum] = month.split('-');
        const nextMonthNum = parseInt(monthNum) === 12 ? 1 : parseInt(monthNum) + 1;
        const nextYear = parseInt(monthNum) === 12 ? parseInt(year) + 1 : parseInt(year);
        const endDate = `${nextYear}-${nextMonthNum.toString().padStart(2, '0')}-01`;
        
        query = query.gte('date', startDate).lt('date', endDate);
      }

      const { data, error } = await query.order('date', { ascending: false });
      if (error) {
        console.warn('bintangService.getDailyObservations error:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.warn('bintangService.getDailyObservations exception:', err);
      return [];
    }
  },

  async insertDailyObservation(observation: BintangDailyObservationInsert) {
    const { data, error } = await supabase
      .from('bintang_daily_observations')
      .insert(observation)
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  // --- Violation Points (for BINTANG scoring) ---

  /**
   * Fetch violations for a given class within a month date range.
   * Returns raw violation rows needed for BINTANG score calculation.
   */
  async getViolationsForClass(classId: string, month: string) {
    try {
      const startDate = `${month}-01`;
      const [year, monthNum] = month.split('-');
      const nextMonthNum = parseInt(monthNum) === 12 ? 1 : parseInt(monthNum) + 1;
      const nextYear = parseInt(monthNum) === 12 ? parseInt(year) + 1 : parseInt(year);
      const endDate = `${nextYear}-${nextMonthNum.toString().padStart(2, '0')}-01`;

      const { data: classStudents } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', classId)
        .is('deleted_at', null);

      const studentIds = classStudents?.map(s => s.id) || [];
      if (studentIds.length === 0) return [];

      const { data, error } = await supabase
        .from('violations')
        .select('id, student_id, description, points, date, severity')
        .in('student_id', studentIds)
        .gte('date', startDate)
        .lt('date', endDate)
        .is('deleted_at', null)
        .order('date', { ascending: false });

      if (error) {
        console.warn('bintangService.getViolationsForClass error:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.warn('bintangService.getViolationsForClass exception:', err);
      return [];
    }
  },

  /**
   * Fetch violations for a specific student within a month date range.
   */
  async getViolationsForStudent(studentId: string, month: string) {
    try {
      const startDate = `${month}-01`;
      const [year, monthNum] = month.split('-');
      const nextMonthNum = parseInt(monthNum) === 12 ? 1 : parseInt(monthNum) + 1;
      const nextYear = parseInt(monthNum) === 12 ? parseInt(year) + 1 : parseInt(year);
      const endDate = `${nextYear}-${nextMonthNum.toString().padStart(2, '0')}-01`;

      const { data, error } = await supabase
        .from('violations')
        .select('id, student_id, description, points, date, severity')
        .eq('student_id', studentId)
        .gte('date', startDate)
        .lt('date', endDate)
        .is('deleted_at', null)
        .order('date', { ascending: false });

      if (error) {
        console.warn('bintangService.getViolationsForStudent error:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.warn('bintangService.getViolationsForStudent exception:', err);
      return [];
    }
  },

  // --- Monthly Evaluations ---
  async getMonthlyEvaluations(classId: string, month: string) {
    try {
      const { data: classStudents } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', classId)
        .is('deleted_at', null);

      const studentIds = classStudents?.map(s => s.id) || [];
      if (studentIds.length === 0) return [];

      const { data, error } = await supabase
        .from('bintang_monthly_evaluations')
        .select('*')
        .in('student_id', studentIds)
        .eq('month', month);
        
      if (error) {
        console.warn('bintangService.getMonthlyEvaluations error:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.warn('bintangService.getMonthlyEvaluations exception:', err);
      return [];
    }
  },
  
  async getStudentEvaluations(studentId: string, isPublishedOnly: boolean = true) {
    try {
      let query = supabase
        .from('bintang_monthly_evaluations')
        .select('*')
        .eq('student_id', studentId);
        
      if (isPublishedOnly) {
        query = query.eq('is_published', true);
      }
      
      const { data, error } = await query.order('month', { ascending: false });
      if (error) {
        console.warn('bintangService.getStudentEvaluations error:', error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.warn('bintangService.getStudentEvaluations exception:', err);
      return [];
    }
  },

  async upsertEvaluation(evaluation: BintangEvaluationInsert) {
    // Since we have a UNIQUE constraint on (student_id, month), we can use upsert
    const { data, error } = await supabase
      .from('bintang_monthly_evaluations')
      .upsert(evaluation, { onConflict: 'student_id, month' })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },

  /** Bulk upsert evaluations for all students in a class at once. */
  async bulkUpsertEvaluations(evaluations: BintangEvaluationInsert[]) {
    const { data, error } = await supabase
      .from('bintang_monthly_evaluations')
      .upsert(evaluations, { onConflict: 'student_id, month' })
      .select();

    if (error) throw error;
    return data;
  },
  
  async publishEvaluations(classId: string, month: string) {
     // First, fetch the evaluations for this class and month
     const evaluations = await this.getMonthlyEvaluations(classId, month);
     if (!evaluations || evaluations.length === 0) return [];
     
     const evaluationIds = evaluations.map(e => e.id);
     
     const { data, error } = await supabase
       .from('bintang_monthly_evaluations')
       .update({ is_published: true })
       .in('id', evaluationIds)
       .select();
       
     if (error) throw error;
     return data;
  }
};
