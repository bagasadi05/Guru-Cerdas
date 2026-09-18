-- Expand RLS policies on ph_schedules to support:
-- 1. Admin
-- 2. Homeroom teachers and subject teachers assigned to the class
-- 3. Class creator/owner (classes.user_id = auth.uid())
-- 4. PH schedule creator (created_by = auth.uid())

drop policy if exists "Walas can insert PH schedules" on public.ph_schedules;
create policy "Walas and teachers can insert PH schedules"
    on public.ph_schedules
    for insert
    to authenticated
    with check (
        public.is_admin_user(auth.uid())
        or public.has_teacher_class_assignment(
            auth.uid(), class_id, semester_id, array['homeroom', 'subject_teacher'], null
        )
        or exists (
            select 1 from public.classes c
            where c.id = class_id and c.user_id = auth.uid() and c.deleted_at is null
        )
    );

drop policy if exists "Walas can update PH schedules" on public.ph_schedules;
create policy "Walas and creators can update PH schedules"
    on public.ph_schedules
    for update
    to authenticated
    using (
        public.is_admin_user(auth.uid())
        or created_by = auth.uid()
        or public.has_teacher_class_assignment(
            auth.uid(), class_id, semester_id, array['homeroom', 'subject_teacher'], null
        )
        or exists (
            select 1 from public.classes c
            where c.id = class_id and c.user_id = auth.uid() and c.deleted_at is null
        )
    )
    with check (
        public.is_admin_user(auth.uid())
        or created_by = auth.uid()
        or public.has_teacher_class_assignment(
            auth.uid(), class_id, semester_id, array['homeroom', 'subject_teacher'], null
        )
        or exists (
            select 1 from public.classes c
            where c.id = class_id and c.user_id = auth.uid() and c.deleted_at is null
        )
    );

drop policy if exists "Walas can delete PH schedules" on public.ph_schedules;
create policy "Walas and creators can delete PH schedules"
    on public.ph_schedules
    for delete
    to authenticated
    using (
        public.is_admin_user(auth.uid())
        or created_by = auth.uid()
        or public.has_teacher_class_assignment(
            auth.uid(), class_id, semester_id, array['homeroom', 'subject_teacher'], null
        )
        or exists (
            select 1 from public.classes c
            where c.id = class_id and c.user_id = auth.uid() and c.deleted_at is null
        )
    );
