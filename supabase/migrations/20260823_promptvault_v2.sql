-- PromptVault v2 migration
-- Run once in Supabase SQL Editor before disabling the legacy dashboard password.
-- Then create one Supabase Auth user and add its UUID to public.promptvault_admins.

begin;

-- 1) Prompt engagement + publishing metadata
alter table public.prompts add column if not exists view_count bigint not null default 0;
alter table public.prompts add column if not exists copy_count bigint not null default 0;
alter table public.prompts add column if not exists favorite_count bigint not null default 0;
alter table public.prompts add column if not exists is_featured boolean not null default false;
alter table public.prompts add column if not exists status text not null default 'published';
alter table public.prompts add column if not exists updated_at timestamptz not null default now();

update public.prompts set status = 'published' where status is null;

-- Avoid a named CHECK collision when rerunning manually.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'prompts_status_check'
      and conrelid = 'public.prompts'::regclass
  ) then
    alter table public.prompts add constraint prompts_status_check check (status in ('published','draft'));
  end if;
end $$;

-- 2) Dedicated admin allow-list. Public signup should stay disabled.
create table if not exists public.promptvault_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.promptvault_admins enable row level security;

create or replace function public.is_promptvault_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.promptvault_admins
    where user_id = auth.uid()
  );
$$;

grant execute on function public.is_promptvault_admin() to authenticated;

-- 3) Public traffic counters. visitor_key is a random browser ID, not PII.
create table if not exists public.site_visitors (
  visitor_key text primary key,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  visits bigint not null default 1
);

create table if not exists public.site_stats (
  id smallint primary key default 1 check (id = 1),
  total_views bigint not null default 0,
  unique_visitors bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.site_stats (id, total_views, unique_visitors)
values (1, 0, 0)
on conflict (id) do nothing;

alter table public.site_visitors enable row level security;
alter table public.site_stats enable row level security;

create or replace function public.track_site_visit(visitor_key text)
returns table(total_views bigint, unique_visitors bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  is_new boolean := false;
begin
  if visitor_key is null or length(visitor_key) < 8 or length(visitor_key) > 128 then
    return query select s.total_views, s.unique_visitors from public.site_stats s where s.id = 1;
    return;
  end if;

  insert into public.site_visitors(visitor_key, first_seen, last_seen, visits)
  values(visitor_key, now(), now(), 1)
  on conflict (visitor_key) do update
    set last_seen = now(), visits = public.site_visitors.visits + 1;

  get diagnostics is_new = row_count;
  -- row_count cannot distinguish insert/update, so recompute exact unique count below.
  update public.site_stats
    set total_views = total_views + 1,
        unique_visitors = (select count(*) from public.site_visitors),
        updated_at = now()
  where id = 1;

  return query select s.total_views, s.unique_visitors from public.site_stats s where s.id = 1;
end;
$$;

create or replace function public.get_public_stats()
returns table(total_views bigint, unique_visitors bigint)
language sql
stable
security definer
set search_path = public
as $$
  select s.total_views, s.unique_visitors from public.site_stats s where s.id = 1;
$$;

grant execute on function public.track_site_visit(text) to anon, authenticated;
grant execute on function public.get_public_stats() to anon, authenticated;

-- 4) Atomic engagement counter RPC. Works regardless of prompts.id type by comparing id::text.
create or replace function public.increment_prompt_metric(prompt_id_input text, metric_input text)
returns table(view_count bigint, copy_count bigint, favorite_count bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if metric_input = 'view' then
    update public.prompts set view_count = view_count + 1 where id::text = prompt_id_input and status = 'published';
  elsif metric_input = 'copy' then
    update public.prompts set copy_count = copy_count + 1 where id::text = prompt_id_input and status = 'published';
  elsif metric_input = 'favorite' then
    update public.prompts set favorite_count = favorite_count + 1 where id::text = prompt_id_input and status = 'published';
  elsif metric_input = 'unfavorite' then
    update public.prompts set favorite_count = greatest(0, favorite_count - 1) where id::text = prompt_id_input and status = 'published';
  else
    raise exception 'Unsupported metric';
  end if;

  return query
    select p.view_count, p.copy_count, p.favorite_count
    from public.prompts p where p.id::text = prompt_id_input;
end;
$$;

grant execute on function public.increment_prompt_metric(text, text) to anon, authenticated;

-- 5) Prompt RLS: public can only read published rows; only allow-listed admins can write.
alter table public.prompts enable row level security;

do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'prompts'
  loop
    execute format('drop policy if exists %I on public.prompts', p.policyname);
  end loop;
end $$;

create policy "public read published prompts"
on public.prompts for select
to anon, authenticated
using (status = 'published' or public.is_promptvault_admin());

create policy "admin insert prompts"
on public.prompts for insert
to authenticated
with check (public.is_promptvault_admin());

create policy "admin update prompts"
on public.prompts for update
to authenticated
using (public.is_promptvault_admin())
with check (public.is_promptvault_admin());

create policy "admin delete prompts"
on public.prompts for delete
to authenticated
using (public.is_promptvault_admin());

-- 6) Settings: stop exposing the legacy admin password to anon after migration.
alter table if exists public.settings enable row level security;

do $$
declare p record;
begin
  if to_regclass('public.settings') is not null then
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'settings'
    loop
      execute format('drop policy if exists %I on public.settings', p.policyname);
    end loop;
    execute 'create policy "admin settings only" on public.settings for all to authenticated using (public.is_promptvault_admin()) with check (public.is_promptvault_admin())';
  end if;
end $$;

-- 7) Storage policies for prompt-images. These names are safe to rerun.
-- IMPORTANT: review any older permissive storage.objects policies in Supabase Dashboard and remove them if they allow anon writes.
drop policy if exists "promptvault public images" on storage.objects;
drop policy if exists "promptvault admin upload" on storage.objects;
drop policy if exists "promptvault admin update" on storage.objects;
drop policy if exists "promptvault admin delete" on storage.objects;

create policy "promptvault public images"
on storage.objects for select
to public
using (bucket_id = 'prompt-images');

create policy "promptvault admin upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'prompt-images' and public.is_promptvault_admin());

create policy "promptvault admin update"
on storage.objects for update
to authenticated
using (bucket_id = 'prompt-images' and public.is_promptvault_admin())
with check (bucket_id = 'prompt-images' and public.is_promptvault_admin());

create policy "promptvault admin delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'prompt-images' and public.is_promptvault_admin());

commit;

-- BOOTSTRAP AFTER THIS MIGRATION:
-- 1. Supabase Dashboard > Authentication > Users > create your admin user.
-- 2. Copy that user's UUID and run:
--    insert into public.promptvault_admins(user_id) values ('YOUR-AUTH-USER-UUID') on conflict do nothing;
-- 3. Disable public email signups in Authentication settings.
-- 4. Verify Storage > Policies has no older anon INSERT/UPDATE/DELETE policies for prompt-images.
