-- Allow all authenticated users to see active classes for dropdowns
CREATE OR REPLACE FUNCTION public.get_active_classes()
RETURNS TABLE (
    id uuid,
    name text,
    user_id uuid
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT id, name, user_id
    FROM public.classes
    WHERE deleted_at IS NULL AND is_archived = false
    ORDER BY name;
$$;

REVOKE ALL ON FUNCTION public.get_active_classes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_classes() TO authenticated;
