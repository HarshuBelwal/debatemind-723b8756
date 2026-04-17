-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Thinker',
  avatar_emoji text not null default '🧑‍🎓',
  total_score integer not null default 0,
  current_streak integer not null default 0,
  best_streak integer not null default 0,
  rank_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_emoji)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'Thinker'),
    coalesce(new.raw_user_meta_data ->> 'avatar_emoji', '🧑‍🎓')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ============ DEBATES ============
create table public.debates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  side text not null check (side in ('for','against','devil')),
  transcript jsonb not null default '[]'::jsonb,
  strength_user integer not null default 50,
  verdict text,
  score_awarded integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.debates enable row level security;

create policy "Users can view their own debates" on public.debates for select using (auth.uid() = user_id);
create policy "Users can insert their own debates" on public.debates for insert with check (auth.uid() = user_id);
create policy "Users can update their own debates" on public.debates for update using (auth.uid() = user_id);
create policy "Users can delete their own debates" on public.debates for delete using (auth.uid() = user_id);

create trigger debates_updated_at
  before update on public.debates
  for each row execute function public.set_updated_at();

create index debates_user_id_idx on public.debates (user_id, created_at desc);

-- ============ QUIZ ATTEMPTS ============
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  correct integer not null default 0,
  total integer not null default 0,
  score_awarded integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.quiz_attempts enable row level security;

create policy "Users can view their own quiz attempts" on public.quiz_attempts for select using (auth.uid() = user_id);
create policy "Users can insert their own quiz attempts" on public.quiz_attempts for insert with check (auth.uid() = user_id);

create index quiz_attempts_user_id_idx on public.quiz_attempts (user_id, created_at desc);

-- ============ ARGUMENTS (Toulmin builder) ============
create table public.arguments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  claim text not null,
  evidence text not null,
  warrant text not null,
  rebuttal text not null,
  ai_analysis text,
  ai_score integer,
  created_at timestamptz not null default now()
);

alter table public.arguments enable row level security;

create policy "Users can view their own arguments" on public.arguments for select using (auth.uid() = user_id);
create policy "Users can insert their own arguments" on public.arguments for insert with check (auth.uid() = user_id);
create policy "Users can delete their own arguments" on public.arguments for delete using (auth.uid() = user_id);

create index arguments_user_id_idx on public.arguments (user_id, created_at desc);