import { supabase } from './supabase';
import { logger } from './logger';
import { AcademicYearRow, SemesterRow } from '../types';

/**
 * Helper to determine current academic year name and active semester based on date.
 * Indonesian Academic Year starts in July (Ganjil) and second half starts in January (Genap).
 */
export function getCurrentAcademicTerm(date: Date = new Date()) {
    const month = date.getMonth(); // 0-indexed, 0 = Jan, 6 = Jul
    const year = date.getFullYear();

    let academicYearName = '';
    let semesterType: 'Ganjil' | 'Genap' = 'Ganjil';
    let semesterNumber = 1;

    // July (6) to December (11) -> Ganjil
    if (month >= 6) {
        academicYearName = `${year}/${year + 1}`;
        semesterType = 'Ganjil';
        semesterNumber = 1;
    } else {
        // January (0) to June (5) -> Genap
        academicYearName = `${year - 1}/${year}`;
        semesterType = 'Genap';
        semesterNumber = 2;
    }

    return { academicYearName, semesterType, semesterNumber, date };
}

/**
 * Checks if the database has the current semester, if not, it automatically generates it.
 * Should only be called by an Admin/Global role to avoid RLS issues.
 */
export async function autoInitializeSemesters(): Promise<boolean> {
    try {
        const { academicYearName, semesterType, semesterNumber } = getCurrentAcademicTerm();
        
        // 1. Check/Create Academic Year
        let { data: academicYear, error: ayError } = await supabase
            .from('academic_years')
            .select('*')
            .eq('name', academicYearName)
            .is('deleted_at', null)
            .maybeSingle();

        if (ayError && ayError.code !== 'PGRST116') {
            logger.error('Error fetching academic year in AutoPilot', ayError as Error, undefined, 'SemesterAutoPilot');
            return false;
        }

        if (!academicYear) {
            // Need to create academic year
            const startYear = parseInt(academicYearName.split('/')[0]);
            const ayInsert = {
                name: academicYearName,
                start_date: `${startYear}-07-01`,
                end_date: `${startYear + 1}-06-30`,
                is_active: true
            };
            
            const { data: newAy, error: createAyError } = await supabase
                .from('academic_years')
                .insert(ayInsert)
                .select()
                .single();
                
            if (createAyError) {
                logger.error('Failed to auto-create academic year', createAyError as Error, undefined, 'SemesterAutoPilot');
                return false;
            }
            academicYear = newAy;
        }

        // 2. Check/Create Semesters for this Academic Year
        const { data: existingSemesters, error: esError } = await supabase
            .from('semesters')
            .select('*')
            .eq('academic_year_id', academicYear!.id)
            .is('deleted_at', null);

        if (esError) {
            logger.error('Error fetching semesters in AutoPilot', esError as Error, undefined, 'SemesterAutoPilot');
            return false;
        }

        const startYear = parseInt(academicYearName.split('/')[0]);
        let dataChanged = false;

        // Ensure Ganjil exists
        const ganjilExists = existingSemesters?.find(s => s.name.toLowerCase() === 'ganjil' || s.name === '1');
        let ganjilId = ganjilExists?.id;
        if (!ganjilExists) {
            const { data: newGanjil, error: gError } = await supabase
                .from('semesters')
                .insert({
                    academic_year_id: academicYear!.id,
                    name: 'Ganjil',
                    start_date: `${startYear}-07-01`,
                    end_date: `${startYear}-12-31`,
                    is_active: semesterType === 'Ganjil',
                    is_locked: false
                })
                .select()
                .single();
            if (!gError && newGanjil) {
                ganjilId = newGanjil.id;
                dataChanged = true;
            }
        }

        // Ensure Genap exists
        const genapExists = existingSemesters?.find(s => s.name.toLowerCase() === 'genap' || s.name === '2');
        let genapId = genapExists?.id;
        if (!genapExists) {
            const { data: newGenap, error: geError } = await supabase
                .from('semesters')
                .insert({
                    academic_year_id: academicYear!.id,
                    name: 'Genap',
                    start_date: `${startYear + 1}-01-01`,
                    end_date: `${startYear + 1}-06-30`,
                    is_active: semesterType === 'Genap',
                    is_locked: false
                })
                .select()
                .single();
            if (!geError && newGenap) {
                genapId = newGenap.id;
                dataChanged = true;
            }
        }

        // 3. Ensure the correct semester is active
        const targetActiveId = semesterType === 'Ganjil' ? ganjilId : genapId;
        
        // Deactivate others if necessary
        const { data: activeSemesters } = await supabase
            .from('semesters')
            .select('id')
            .eq('is_active', true)
            .is('deleted_at', null);
            
        const activeIds = activeSemesters?.map(s => s.id) || [];
        
        if (!activeIds.includes(targetActiveId as string) || activeIds.length > 1) {
            // First, set the correct one to active
            if (targetActiveId) {
                await supabase
                    .from('semesters')
                    .update({ is_active: true })
                    .eq('id', targetActiveId);
            }
            
            // Then deactivate all others
            const othersToDeactivate = activeIds.filter(id => id !== targetActiveId);
            if (othersToDeactivate.length > 0) {
                await supabase
                    .from('semesters')
                    .update({ is_active: false })
                    .in('id', othersToDeactivate);
            }
            dataChanged = true;
        }

        return dataChanged;
    } catch (error) {
        logger.error('Unexpected error in semester AutoPilot', error as Error, undefined, 'SemesterAutoPilot');
        return false;
    }
}
