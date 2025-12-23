-- Create table for storing user-specific settings
create table public.user_settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  semester_1_locked boolean default false,
  school_name text default 'MI AL IRSYAD KOTA MADIUN',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id)
);

-- Enable Row Level Security (RLS)
alter table public.user_settings enable row level security;

-- Create policies
create policy "Users can view their own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can update their own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);

create policy "Users can insert their own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

-- Function to handle updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for updated_at
create trigger handle_settings_updated_at
  before update on public.user_settings
  for each row
  execute function public.handle_updated_at();
