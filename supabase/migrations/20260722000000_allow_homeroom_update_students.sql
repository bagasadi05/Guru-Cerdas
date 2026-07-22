-- Allow homeroom teachers to update (soft-delete) students in their assigned classes
-- Previously only the class owner (user_id) could update students, blocking walas/homeroom teachers

drop policy if exists "Homeroom teachers can update assigned students" on public.students;
create policy "Homeroom teachers can update assigned students"
    on public.students
    for update
    using (
        -- Owner of the class can always update
        auth.uid() = user_id
        -- Homeroom teachers can update students in their assigned classes
        or public.has_teacher_class_assignment(
            auth.uid(),
            class_id,
            null,
            array['homeroom'],
            null
        )
        -- Admins can always update
        or public.is_admin_user(auth.uid())
    )
    with check (
        auth.uid() = user_id
        or public.has_teacher_class_assignment(
            auth.uid(),
            class_id,
            null,
            array['homeroom'],
            null
        )
        or public.is_admin_user(auth.uid())
    );
