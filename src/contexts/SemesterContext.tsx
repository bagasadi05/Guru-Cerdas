import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { logger } from '../services/logger';
import { SemesterRow, AcademicYearRow } from '../types';
import { useAuth } from '../hooks/useAuth';
import { autoInitializeSemesters, getCurrentAcademicTerm } from '../services/semesterAutoPilot';

interface StudentAccessPeriod {
    canAccess: boolean;
    reason?: 'semester_locked' | 'maintenance' | 'expired';
}

// Extended Interface
export interface SemesterWithYear extends SemesterRow {
    academic_years: AcademicYearRow | null;
}

interface SemesterContextType {
    activeSemester: SemesterRow | null;
    activeAcademicYear: AcademicYearRow | null;
    currentSemesterId: string | null;
    semesters: SemesterWithYear[];
    isLoading: boolean;
    refreshSemester: () => Promise<void>;
    checkStudentAccess: () => StudentAccessPeriod;
    getSemesterByDate: (date: Date | string) => SemesterWithYear | undefined;
    isLocked: (idOrDate: string | Date) => boolean;
}

const SemesterContext = createContext<SemesterContextType | undefined>(undefined);

export const SemesterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { userRole, user } = useAuth();
    const [activeSemester, setActiveSemester] = useState<SemesterRow | null>(null);
    const [activeAcademicYear, setActiveAcademicYear] = useState<AcademicYearRow | null>(null);
    const [semesters, setSemesters] = useState<SemesterWithYear[]>([]);
    const [isLoading, setIsLoading] = useState(true);


    const fetchSemestersData = useCallback(async () => {
        setIsLoading(true);
        try {
            const performFetch = async () => {
                // Fetch all semesters with academic year info
                const semestersQuery = supabase
                    .from('semesters')
                    .select('*, academic_years(*)')
                    .is('deleted_at', null);
                
                const { data: allSemesters, error: allSemestersError } =
                    typeof (semestersQuery as { order?: unknown }).order === 'function'
                        ? await (semestersQuery as unknown as { order: (column: string, options: { ascending: boolean }) => Promise<{ data: SemesterWithYear[] | null; error: { code?: string; message: string } | null }> })
                            .order('start_date', { ascending: false })
                        : await semestersQuery;

                // Find the active semester
                const { data: semesterData, error: semesterError } = await supabase
                    .from('semesters')
                    .select('*')
                    .eq('is_active', true)
                    .is('deleted_at', null)
                    .maybeSingle();

                return { allSemesters, allSemestersError, semesterData, semesterError };
            };

            let { allSemesters, allSemestersError, semesterData, semesterError } = await performFetch();

            // Auto-Pilot Logic: Check if we need to initialize or switch semesters
            const isGlobalRole = userRole === 'admin' || userRole === 'kepala_madrasah' || userRole === 'waka_kesiswaan';
            if (isGlobalRole && !allSemestersError) {
                const { semesterType } = getCurrentAcademicTerm();
                const expectedNames = semesterType === 'Ganjil' ? ['ganjil', '1'] : ['genap', '2'];
                const isActiveCorrect = semesterData && expectedNames.includes(semesterData.name.toLowerCase());
                
                if (!allSemesters || allSemesters.length === 0 || !isActiveCorrect) {
                     logger.info('Auto-Pilot triggered: updating semesters...', undefined, 'SemesterContext');
                     const dataChanged = user ? await autoInitializeSemesters(user.id) : false;
                     if (dataChanged) {
                         // Re-fetch after auto generation
                         const newFetch = await performFetch();
                         allSemesters = newFetch.allSemesters;
                         allSemestersError = newFetch.allSemestersError;
                         semesterData = newFetch.semesterData;
                         semesterError = newFetch.semesterError;
                     }
                }
            }

            if (allSemestersError) {
                logger.error('Error fetching semesters', allSemestersError as unknown as Error, undefined, 'SemesterContext');
            } else {
                setSemesters(allSemesters as unknown as SemesterWithYear[]);
            }

            if (semesterError) {
                if (semesterError.code !== 'PGRST116') { // Not found error code
                    logger.error('Error fetching active semester', semesterError as unknown as Error, undefined, 'SemesterContext');
                }
                setActiveSemester(null);
                setActiveAcademicYear(null);
            } else if (!semesterData) {
                setActiveSemester(null);
                setActiveAcademicYear(null);
            } else {
                setActiveSemester(semesterData);

                // Fetch associated academic year for active semester
                const { data: yearData, error: yearError } = await supabase
                    .from('academic_years')
                    .select('*')
                    .eq('id', semesterData.academic_year_id)
                    .is('deleted_at', null)
                    .maybeSingle();

                if (yearError) {
                    logger.error('Error fetching academic year', yearError as unknown as Error, undefined, 'SemesterContext');
                } else {
                    setActiveAcademicYear(yearData);
                }
            }
        } catch (error) {
            logger.error('Unexpected error in fetchSemestersData', error as Error, undefined, 'SemesterContext');
        } finally {
            setIsLoading(false);
        }
    }, [userRole, user]);

    useEffect(() => {
        fetchSemestersData();
    }, [fetchSemestersData]);

    const getSemesterByDate = useCallback((date: Date | string): SemesterWithYear | undefined => {
        const checkDate = new Date(date);
        return semesters.find(s => {
            const start = new Date(s.start_date);
            const end = new Date(s.end_date);
            return checkDate >= start && checkDate <= end;
        });
    }, [semesters]);

    const isLocked = useCallback((idOrDate: string | Date): boolean => {
        if (idOrDate instanceof Date || (typeof idOrDate === 'string' && !isNaN(Date.parse(idOrDate)) && idOrDate.length > 10)) {
            // It's likely a date (or ISO string)
            const semester = getSemesterByDate(idOrDate);
            return semester?.is_locked ?? false;
        } else {
            // Assume it's an ID
            const semester = semesters.find(s => s.id === idOrDate);
            return semester?.is_locked ?? false;
        }
    }, [semesters, getSemesterByDate]);

    const checkStudentAccess = useCallback((): StudentAccessPeriod => {
        if (!activeSemester) return { canAccess: true }; // Allow if no semester system active yet? Or block?
        return { canAccess: true };
    }, [activeSemester]);

    return (
        <SemesterContext.Provider value={{
            activeSemester,
            activeAcademicYear,
            currentSemesterId: activeSemester?.id || null,
            semesters,
            isLoading,
            refreshSemester: fetchSemestersData,
            checkStudentAccess,
            getSemesterByDate,
            isLocked
        }}>
            {children}
        </SemesterContext.Provider>
    );
};

export const useSemester = () => {
    const context = useContext(SemesterContext);
    if (context === undefined) {
        throw new Error('useSemester must be used within a SemesterProvider');
    }
    return context;
};
