-- Add INSERT policy for audit_logs so client-side audit logging works
-- The trigger function already uses SECURITY DEFINER, but the client-side
-- writeAuditLog() function inserts directly and needs an INSERT policy.

CREATE POLICY "Users can insert own audit logs" ON audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
