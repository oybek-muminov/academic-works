-- Academic Works — Supabase sxemasi, RLS va storage siyosatlari.
-- Supabase Dashboard → SQL Editor da bir marta ishga tushiring.
-- Idempotent: qayta ishga tushirish xavfsiz.

-- ============ Jadvallar ============

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  university text,
  faculty text,
  username text,
  avatar_url text,
  year int,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists university text;
alter table public.profiles add column if not exists faculty text;
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists year int;
alter table public.profiles add column if not exists created_at timestamptz not null default now();

create table if not exists public.works (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  authors text,
  category_id int not null default 1,
  is_public boolean not null default false,
  file_url text,
  file_name text,
  created_at timestamptz not null default now()
);

alter table public.works add column if not exists description text;
alter table public.works add column if not exists authors text;
alter table public.works add column if not exists category_id int not null default 1;
alter table public.works add column if not exists is_public boolean not null default false;
alter table public.works add column if not exists file_url text;
alter table public.works add column if not exists file_name text;
alter table public.works add column if not exists created_at timestamptz not null default now();

create index if not exists works_user_created_idx on public.works (user_id, created_at desc);
create index if not exists works_public_created_idx on public.works (is_public, created_at desc);

-- Username → email faqat RPC orqali o'qiladi; email ommaviy jadvalda saqlanmaydi.
create table if not exists public.profile_logins (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  username text not null unique,
  email text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'login_email'
  ) then
    insert into public.profile_logins (user_id, username, email)
    select id, lower(trim(username)), login_email
    from public.profiles
    where username is not null and trim(username) <> '' and login_email is not null
    on conflict do nothing;

    alter table public.profiles drop column login_email;
  end if;
end $$;

-- ============ RLS ============

alter table public.profiles enable row level security;
alter table public.works enable row level security;
alter table public.profile_logins enable row level security;

drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read on public.profiles
  for select to anon, authenticated using (true);

drop policy if exists profiles_own_insert on public.profiles;
create policy profiles_own_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_own_update on public.profiles;
create policy profiles_own_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists works_public_or_own_read on public.works;
create policy works_public_or_own_read on public.works
  for select to anon, authenticated using (is_public or user_id = auth.uid());

drop policy if exists works_own_insert on public.works;
create policy works_own_insert on public.works
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists works_own_update on public.works;
create policy works_own_update on public.works
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists works_own_delete on public.works;
create policy works_own_delete on public.works
  for delete to authenticated using (user_id = auth.uid());

drop policy if exists profile_logins_own_insert on public.profile_logins;
create policy profile_logins_own_insert on public.profile_logins
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists profile_logins_own_update on public.profile_logins;
create policy profile_logins_own_update on public.profile_logins
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists profile_logins_own_delete on public.profile_logins;
create policy profile_logins_own_delete on public.profile_logins
  for delete to authenticated using (user_id = auth.uid());

-- Foydalanuvchi faqat o'z qatorini o'qiydi. Bu policy majburiy: PostgREST
-- upsert (INSERT ... ON CONFLICT DO UPDATE) mavjud qatorni ko'rishi kerak,
-- aks holda 42501 "new row violates row-level security policy" xatosi chiqadi.
drop policy if exists profile_logins_own_read on public.profile_logins;
create policy profile_logins_own_read on public.profile_logins
  for select to authenticated using (user_id = auth.uid());

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant select on public.works to anon, authenticated;
grant insert, update, delete on public.works to authenticated;
grant insert, update, delete on public.profile_logins to authenticated;
grant select on public.profile_logins to authenticated;
-- profile_logins: SELECT faqat o'z qatoriga (yuqoridagi policy), email
-- ommaviy o'qilmaydi; username → email `email_for_username` RPC orqali.

create or replace function public.email_for_username(uname text)
returns text
language sql
security definer
set search_path = public
as $$
  select email from public.profile_logins
  where lower(username) = lower(trim(uname))
  limit 1
$$;

revoke all on function public.email_for_username(text) from public;
grant execute on function public.email_for_username(text) to anon, authenticated;

-- ============ Storage ============

-- Bucket private: fayllar faqat imzolangan havola orqali ochiladi.
-- Hajm (20 MB) va MIME turlari server tomonda ham cheklangan.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'works-files',
  'works-files',
  false,
  20971520,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists works_files_read on storage.objects;
create policy works_files_read on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'works-files' and (
      (storage.foldername(name))[1] = 'avatars'
      or (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.works w
        where w.is_public
          and w.file_url like '%/object/public/works-files/' || name
      )
    )
  );

drop policy if exists works_files_insert on storage.objects;
create policy works_files_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'works-files' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or ((storage.foldername(name))[1] = 'avatars'
          and split_part(storage.filename(name), '.', 1) = auth.uid()::text)
    )
  );

drop policy if exists works_files_update on storage.objects;
create policy works_files_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'works-files' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or ((storage.foldername(name))[1] = 'avatars'
          and split_part(storage.filename(name), '.', 1) = auth.uid()::text)
    )
  )
  with check (
    bucket_id = 'works-files' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or ((storage.foldername(name))[1] = 'avatars'
          and split_part(storage.filename(name), '.', 1) = auth.uid()::text)
    )
  );

drop policy if exists works_files_delete on storage.objects;
create policy works_files_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'works-files' and (
      (storage.foldername(name))[1] = auth.uid()::text
      or ((storage.foldername(name))[1] = 'avatars'
          and split_part(storage.filename(name), '.', 1) = auth.uid()::text)
    )
  );
