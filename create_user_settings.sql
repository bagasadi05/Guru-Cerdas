-- Create the user_settings table
create table public.user_settings (
  user_id uuid not null references auth.users on delete cascade,
  semester_1_locked boolean default false,
  school_name text default 'MI AL IRSYAD KOTA MADIUN',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id)
);

-- Enable Row Level Security (RLS)
alter table public.user_settings enable row level security;

-- Create policies
create policy "Users can view their own settings"
  on public.user_settings for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own settings"
  on public.user_settings for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own settings"
  on public.user_settings for update
  using ( auth.uid() = user_id );

-- Create updated_at trigger
create extension if not exists moddatetime schema extensions;

create trigger handle_updated_at before update on public.user_settings
  for each row execute procedure moddatetime (updated_at);
