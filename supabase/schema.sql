-- StudyMind AI: run in the Supabase SQL editor before enabling credentials.
-- All user data is protected by row-level security. No service-role key is required.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '', email text not null default '', exam text not null default 'Other',
  daily_goal integer not null default 30 check (daily_goal between 5 and 240),
  updated_at timestamptz not null default now()
);
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60), color text not null default '#6c9669',
  created_at timestamptz not null default now(), unique(user_id, name)
);
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180), subject text not null default 'General',
  language text not null default 'English', format text not null default 'Detailed', source text not null default 'ai' check(source in ('ai','imported')),
  video jsonb not null default '{}'::jsonb, content jsonb not null,
  folder_id uuid references public.folders(id) on delete set null,
  bookmarked boolean not null default false, revision_progress integer not null default 0 check(revision_progress between 0 and 100),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid references public.notes(id) on delete cascade, note_title text not null,
  answers jsonb not null default '[]'::jsonb, score integer not null default 0, total integer not null check(total > 0),
  created_at timestamptz not null default now()
);
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade, role text not null check(role in ('user','assistant')),
  content text not null check(char_length(content) <= 20000), created_at timestamptz not null default now()
);
create table if not exists public.study_activity (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null, minutes integer not null default 0 check(minutes between 0 and 240),
  created_at timestamptz not null default now()
);
create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  email text not null, subject text not null, message text not null, created_at timestamptz not null default now()
);
create table if not exists private.rate_limits (
  key text primary key, count integer not null default 0, expires_at timestamptz not null
);

alter table public.profiles enable row level security;
alter table public.folders enable row level security;
alter table public.notes enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.chat_messages enable row level security;
alter table public.study_activity enable row level security;
alter table public.support_requests enable row level security;

drop policy if exists own_profile on public.profiles;
create policy own_profile on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
do $$ declare t text; begin
  foreach t in array array['folders','notes','quiz_attempts','chat_messages','study_activity','support_requests'] loop
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format('create policy own_rows on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;

create index if not exists notes_user_updated on public.notes(user_id, updated_at desc);
create index if not exists notes_folder on public.notes(folder_id);
create index if not exists chats_user_note on public.chat_messages(user_id, note_id, created_at);
create index if not exists attempts_user_created on public.quiz_attempts(user_id, created_at desc);
create index if not exists activity_user_created on public.study_activity(user_id, created_at desc);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, name, email) values(new.id, coalesce(new.raw_user_meta_data->>'name','Student'), new.email)
  on conflict(id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Atomic quota, shared across serverless instances. Hourly + calendar-month UTC.
create or replace function public.consume_quota(action_name text, hourly_limit integer, monthly_limit integer)
returns boolean language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); hour_key text; month_key text; hour_count integer; month_count integer; now_utc timestamptz := now();
begin
  if u is null then raise exception 'Authentication required'; end if;
  if action_name not in ('generate','chat','quiz') then raise exception 'Invalid action'; end if;
  perform pg_advisory_xact_lock(hashtext(u::text || action_name));
  hour_key := u::text || ':' || action_name || ':hour:' || to_char(now_utc, 'YYYY-MM-DD-HH24');
  month_key := u::text || ':' || action_name || ':month:' || to_char(now_utc, 'YYYY-MM');
  select count into month_count from private.rate_limits where key = month_key and expires_at > now_utc;
  if coalesce(month_count,0) >= monthly_limit then return false; end if;
  insert into private.rate_limits(key,count,expires_at) values(hour_key,1,date_trunc('hour',now_utc) + interval '1 hour')
    on conflict(key) do update set count = private.rate_limits.count + 1 returning count into hour_count;
  if hour_count > hourly_limit then return false; end if;
  insert into private.rate_limits(key,count,expires_at) values(month_key,1,date_trunc('month',now_utc) + interval '1 month')
    on conflict(key) do update set count = private.rate_limits.count + 1 returning count into month_count;
  return month_count <= monthly_limit;
end $$;
revoke all on function public.consume_quota(text,integer,integer) from public, anon;
grant execute on function public.consume_quota(text,integer,integer) to authenticated;

-- Users can export/delete their own rows through the app. Account deletion is
-- available through Supabase Auth dashboard; do not expose service keys to clients.
