-- Make teacher approval enforceable and allow administrators to change it.
-- Existing accounts retain access; only accounts created after this migration
-- are pending until an administrator explicitly approves them.

alter table public.user_roles
    add column if not exists is_approved boolean;

update public.user_roles
set is_approved = true
where is_approved is null;

alter table public.user_roles
    alter column is_approved set default false,
    alter column is_approved set not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role, email, full_name, is_approved)
  values (
    new.id,
    'teacher',
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    false
  )
  on conflict (user_id) do update
  set email = excluded.email,
      full_name = excluded.full_name;
  return new;
end;
$$;

drop policy if exists "Admins can update user roles" on public.user_roles;
create policy "Admins can update user roles"
    on public.user_roles
    for update
    to authenticated
    using (public.is_admin_user(auth.uid()))
    with check (public.is_admin_user(auth.uid()));
