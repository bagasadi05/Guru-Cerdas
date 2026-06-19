/**
 * Detects if a Supabase query/RPC error is due to missing achievement backend database objects.
 * 
 * Specifically checks for:
 * - code '42P01' (undefined_table): student_achievements table does not exist
 * - code '42883' (undefined_function): get_student_portal_data RPC mismatch
 * - code 'PGRST202' (RPC function not found): PostgREST undefined function
 * - message containing 'student_achievements' or 'get_student_portal_data' with 'does not exist' or 'schema cache'
 * 
 * @param error - The Supabase query/RPC error object or general Error
 * @returns true if the error indicates achievements backend objects are missing, false otherwise
 */
export function isAchievementsBackendMissing(error: unknown): boolean {
    if (!error) return false;

    // Handle Supabase error structure
    const code = (error as any).code || (error as any).status;
    const message = (error as any).message || '';

    // PostgreSQL & PostgREST codes for missing tables or functions
    if (code === '42P01' || code === '42883' || code === 'PGRST202') {
        return true;
    }

    // String checking on messages (handles Error objects and supabase errors)
    const lowerMessage = message.toLowerCase();
    const hasTargetName = lowerMessage.includes('student_achievements') || lowerMessage.includes('get_student_portal_data');
    const hasMissingPhrase = lowerMessage.includes('does not exist') || lowerMessage.includes('schema cache') || lowerMessage.includes('not found');

    if (hasTargetName && hasMissingPhrase) {
        return true;
    }

    return false;
}
