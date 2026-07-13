-- Keep schedule data valid even when it is written outside the web form.

alter table public.schedules
    add constraint schedules_end_after_start
    check (end_time > start_time) not valid;

-- NOT VALID preserves existing legacy rows while enforcing the rule for every
-- new or updated schedule. Invalid legacy rows can be corrected from the UI.
