import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { SemesterRow, AcademicYearRow } from '../types';


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
    const [activeSemester, setActiveSemester] = useState<SemesterRow | null>(null);
    const [activeAcademicYear, setActiveAcademicYear] = useState<AcademicYearRow | null>(null);
    const [semesters, setSemesters] = useState<SemesterWithYear[]>([]);
    const [isLoading, setIsLoading] = useState(true);


    const fetchSemestersData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Fetch all semesters with academic year info
            const { data: allSemesters, error: allSemestersError } = await supabase
                .from('semesters')
                .select('*, academic_years(*)')
                .order('start_date', { ascending: false });

            if (allSemestersError) {
                console.error('Error fetching semesters:', allSemestersError);
            } else {
                setSemesters(allSemesters as unknown as SemesterWithYear[]);
            }

            // Find the active semester
            const { data: semesterData, error: semesterError } = await supabase
                .from('semesters')
                .select('*')
                .eq('is_active', true)
                .single();

            if (semesterError) {
                if (semesterError.code !== 'PGRST116') { // Not found error code
                    console.error('Error fetching active semester:', semesterError);
                }
                setActiveSemester(null);
                setActiveAcademicYear(null);
                // Don't return, keep semesters list populated
            } else {
                setActiveSemester(semesterData);

                // Fetch associated academic year for active semester
                const { data: yearData, error: yearError } = await supabase
                    .from('academic_years')
                    .select('*')
                    .eq('id', semesterData.academic_year_id)
                    .single();

                if (yearError) {
                    console.error('Error fetching academic year:', yearError);
                } else {
                    setActiveAcademicYear(yearData);
                }
            }
        } catch (error) {
            console.error('Unexpected error in fetchSemestersData:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSemestersData();
    }, [fetchSemestersData]);

    const getSemesterByDate = useCallback((date: Date | string): SemesterWithYear | undefined => {
        const checkDate = new Date(date);
        return semesters.find(s => {
            const start = new Date(s.start_date);
            const end = new Date(s.end_date);
            // Include end date in the range (set to end of day if needed, but simple comparison usually works if dates are YYYY-MM-DD)
            // Assuming database dates are just dates or start/end of days.
            // Let's ensure strict day comparison if inputs are ISO strings.
            // For now, simple object comparison might be risky if times differ.
            // Let's normalize to string YYYY-MM-DD for safety if they are strings in DB.
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

        // Example logic: if semester is locked, maybe students can't edit things?
        // For now, always return true unless specific logic added
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
