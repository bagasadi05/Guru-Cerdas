/**
 * Detects if a Supabase query error is due to missing teaching_journals backend database objects.
 *
 * Checks for:
 * - code '42P01' (undefined_table): teaching_journals table does not exist
 * - code '42883' (undefined_function): related RPC mismatch
 * - code 'PGRST202' (RPC function not found): PostgREST undefined function
 * - message containing 'teaching_journals' with 'does not exist' or 'schema cache'
 *
 * @param error - The Supabase query error object or general Error
 * @returns true if the error indicates teaching_journals backend objects are missing
 */
export function isTeachingJournalsBackendMissing(error: unknown): boolean {
    if (!error) return false;

    // Handle Supabase error structure
    const code = (error as any).code || (error as any).status;
    const message = (error as any).message || '';

    // PostgreSQL & PostgREST codes for missing tables or functions
    if (code === '42P01' || code === '42883' || code === 'PGRST202' || code === 'PGRST205') {
        return true;
    }

    // String checking on messages
    const lowerMessage = message.toLowerCase();
    const hasTargetName = lowerMessage.includes('teaching_journals');
    const hasMissingPhrase =
        lowerMessage.includes('does not exist') ||
        lowerMessage.includes('schema cache') ||
        lowerMessage.includes('not found');

    if (hasTargetName && hasMissingPhrase) {
        return true;
    }

    return false;
}
