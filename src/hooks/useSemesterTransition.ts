/**
 * @fileoverview Semester Transition Hook
 *
 * Detects when the active semester has ended and provides logic to:
 * 1. Find the next semester (within the same academic year or the next one).
 * 2. Auto-create a new academic year + 2 default semesters if none exist.
 * 3. Activate the next semester via the `activate_semester` RPC.
 *
 * The hook does NOT auto-activate — it exposes state for a confirmation banner.
 *
 * @module hooks/useSemesterTransition
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './useAuth';
import { useSemester, SemesterWithYear } from '../contexts/SemesterContext';
import { useToast } from './useToast';
import { logger } from '../services/logger';

interface TransitionTarget {
    semester: SemesterWithYear;
    academicYearName: string;
}

interface SemesterTransitionState {
    /** Whether the active semester has ended and a transition is needed */
    needsTransition: boolean;
    /** The next semester to transition to (null if still being determined) */
    target: TransitionTarget | null;
    /** Whether the hook is currently creating a new academic year */
    isCreating: boolean;
    /** Whether the transition (activation) is in progress */
    isTransitioning: boolean;
    /** Perform the actual transition (activate next semester + lock old one) */
    performTransition: () => Promise<void>;
    /** Dismiss the banner for today */
    dismiss: () => void;
    /** Whether the user has dismissed the banner today */
    isDismissed: boolean;
}

const DISMISS_KEY = 'semester-transition-dismissed';

/**
 * Check if the user has dismissed the transition banner today.
 */
function isDismissedToday(): boolean {
    try {
        const stored = localStorage.getItem(DISMISS_KEY);
        if (!stored) return false;
        const today = new Date().toISOString().slice(0, 10);
        return stored === today;
    } catch {
        return false;
    }
}

export function useSemesterTransition(): SemesterTransitionState {
    const { user, isAdmin } = useAuth();
    const { activeSemester, activeAcademicYear, semesters, refreshSemester } = useSemester();
    const toast = useToast();

    const [isCreating, setIsCreating] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [isDismissed, setIsDismissed] = useState(() => isDismissedToday());
    const [autoCreatedTarget, setAutoCreatedTarget] = useState<TransitionTarget | null>(null);

    // ──────────────────────────────────────────────────────────
    // 1. Determine if the active semester has ended
    // ──────────────────────────────────────────────────────────
    const hasEnded = useMemo(() => {
        if (!isAdmin) return false;
        if (!activeSemester) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const endDate = new Date(activeSemester.end_date);
        endDate.setHours(23, 59, 59, 999);
        return today > endDate;
    }, [activeSemester]);

    // ──────────────────────────────────────────────────────────
    // 2. Find the next semester from existing data
    // ──────────────────────────────────────────────────────────
    const existingTarget = useMemo((): TransitionTarget | null => {
        if (!hasEnded || !activeSemester) return null;

        // Case A: Next semester within the same academic year (Ganjil → Genap)
        if (activeSemester.semester_number === 1) {
            const nextSem = semesters.find(
                s => s.academic_year_id === activeSemester.academic_year_id
                    && s.semester_number === 2
                    && s.id !== activeSemester.id
            );
            if (nextSem) {
                return {
                    semester: nextSem,
                    academicYearName: nextSem.academic_years?.name || activeAcademicYear?.name || '',
                };
            }
        }

        // Case B: Next academic year's first semester (Genap → next year's Ganjil)
        if (activeSemester.semester_number === 2 && activeAcademicYear) {
            // Find next academic year by looking for one whose start_date is after current year's end
            const currentEndDate = new Date(activeAcademicYear.end_date);
            const nextYear = semesters.find(s => {
                const semStart = new Date(s.start_date);
                return semStart > currentEndDate && s.semester_number === 1;
            });
            if (nextYear) {
                return {
                    semester: nextYear,
                    academicYearName: nextYear.academic_years?.name || '',
                };
            }
        }

        return null;
    }, [hasEnded, activeSemester, activeAcademicYear, semesters]);

    // ──────────────────────────────────────────────────────────
    // 3. Auto-create next academic year if none exists
    // ──────────────────────────────────────────────────────────
    const createNextAcademicYear = useCallback(async () => {
        if (!user || !activeAcademicYear || !activeSemester) return;
        if (activeSemester.semester_number !== 2) return; // Only when Genap ends

        setIsCreating(true);
        try {
            // Calculate next academic year dates
            const currentEndYear = new Date(activeAcademicYear.end_date).getFullYear();
            const nextStartYear = currentEndYear; // e.g., if current ends Jun 2026, next starts Jul 2026
            const nextYearName = `${nextStartYear}/${nextStartYear + 1}`;

            // Check if it already exists (race condition guard)
            const { data: existingYear } = await supabase
                .from('academic_years')
                .select('id')
                .eq('name', nextYearName)
                .is('deleted_at', null)
                .maybeSingle();

            if (existingYear) {
                // Year exists but semesters might not be loaded yet, refresh
                await refreshSemester();
                return;
            }

            // Create the new academic year
            const newYearStart = `${nextStartYear}-07-01`;
            const newYearEnd = `${nextStartYear + 1}-06-30`;

            const { data: yearData, error: yearError } = await supabase
                .from('academic_years')
                .insert({
                    name: nextYearName,
                    start_date: newYearStart,
                    end_date: newYearEnd,
                    is_active: false,
                    user_id: user.id,
                })
                .select()
                .single();

            if (yearError) throw yearError;

            // Create 2 default semesters
            const sem1Start = `${nextStartYear}-07-01`;
            const sem1End = `${nextStartYear}-12-31`;
            const sem2Start = `${nextStartYear + 1}-01-01`;
            const sem2End = `${nextStartYear + 1}-06-30`;

            const { data: semData, error: semError } = await supabase
                .from('semesters')
                 
                .insert([
                    {
                        academic_year_id: yearData.id,
                        name: 'Ganjil',
                        semester_number: 1,
                        start_date: sem1Start,
                        end_date: sem1End,
                        is_active: false,
                        is_locked: false,
                        user_id: user.id,
                    },
                    {
                        academic_year_id: yearData.id,
                        name: 'Genap',
                        semester_number: 2,
                        start_date: sem2Start,
                        end_date: sem2End,
                        is_active: false,
                        is_locked: false,
                        user_id: user.id,
                    },
                ] as any)
                .select('*, academic_years(*)');

            if (semError) throw semError;

            // Set the target to the first semester of the new year
            const ganjilSem = (semData as unknown as SemesterWithYear[])?.find(s => s.semester_number === 1);
            if (ganjilSem) {
                setAutoCreatedTarget({
                    semester: ganjilSem,
                    academicYearName: nextYearName,
                });
            }

            await refreshSemester();
            logger.info(`Auto-created academic year ${nextYearName}`, undefined, 'SemesterTransition');
        } catch (error) {
            logger.error('Failed to auto-create academic year', error as Error, undefined, 'SemesterTransition');
            toast.error('Gagal membuat tahun ajaran baru secara otomatis.');
        } finally {
            setIsCreating(false);
        }
    }, [user, activeAcademicYear, activeSemester, refreshSemester, toast]);

    // Trigger auto-creation when semester ended & no next target found
    useEffect(() => {
        if (
            hasEnded
            && !existingTarget
            && !autoCreatedTarget
            && !isCreating
            && activeSemester?.semester_number === 2
            && user
        ) {
            createNextAcademicYear();
        }
    }, [hasEnded, existingTarget, autoCreatedTarget, isCreating, activeSemester, user, createNextAcademicYear]);

    // ──────────────────────────────────────────────────────────
    // 4. Combined target (existing or auto-created)
    // ──────────────────────────────────────────────────────────
    const target = existingTarget || autoCreatedTarget;

    // ──────────────────────────────────────────────────────────
    // 5. Perform Transition
    // ──────────────────────────────────────────────────────────
    const performTransition = useCallback(async () => {
        if (!target || !activeSemester) return;

        setIsTransitioning(true);
        try {
            // Lock the old semester
            await supabase
                .from('semesters')
                .update({ is_locked: true })
                .eq('id', activeSemester.id);

            // Activate the next semester via RPC
            const { error } = await supabase.rpc('activate_semester', {
                p_semester_id: target.semester.id,
                p_year_id: target.semester.academic_year_id,
            });

            if (error) throw error;

            toast.success(
                `Berhasil beralih ke Semester ${target.semester.name} — ${target.academicYearName}! 🎉`
            );

            // Clear dismiss state & auto-created target
            localStorage.removeItem(DISMISS_KEY);
            setIsDismissed(false);
            setAutoCreatedTarget(null);

            // Refresh global semester context
            await refreshSemester();
        } catch (error) {
            logger.error('Semester transition failed', error as Error, undefined, 'SemesterTransition');
            toast.error('Gagal beralih semester. Silakan coba lagi atau beralih manual dari Pengaturan.');
        } finally {
            setIsTransitioning(false);
        }
    }, [target, activeSemester, refreshSemester, toast]);

    // ──────────────────────────────────────────────────────────
    // 6. Dismiss for today
    // ──────────────────────────────────────────────────────────
    const dismiss = useCallback(() => {
        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem(DISMISS_KEY, today);
        setIsDismissed(true);
    }, []);

    return {
        needsTransition: hasEnded && !!target && !isDismissed,
        target,
        isCreating,
        isTransitioning,
        performTransition,
        dismiss,
        isDismissed,
    };
}
