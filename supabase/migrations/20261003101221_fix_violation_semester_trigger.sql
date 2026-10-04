-- The BEFORE INSERT trigger picked the semester from NEW.created_at (when the
-- row was typed in), overwriting whatever the app sent. A violation dated
-- 20 Dec but entered in January landed in the Genap semester. Use the
-- violation's own date; only fall back to the app's value, then the active
-- semester, when no semester covers that date.
create or replace function public.set_violation_semester_id()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
    matching_semester_id uuid;
begin
    select id into matching_semester_id
    from public.semesters
    where NEW.date between start_date and end_date
      and deleted_at is null
    order by start_date desc, id
    limit 1;

    if matching_semester_id is null then
        if NEW.semester_id is not null then
            return NEW;
        end if;
        select id into matching_semester_id
        from public.semesters
        where is_active = true and deleted_at is null
        order by start_date desc, id
        limit 1;
    end if;

    if matching_semester_id is not null then
        NEW.semester_id := matching_semester_id;
    end if;

    return NEW;
end;
$function$;
