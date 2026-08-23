-- PromptVault v2 — Phase A: analytics/schema foundation
-- Non-breaking: this migration intentionally DOES NOT replace existing prompt/settings/storage RLS policies.
-- Apply Phase B only after at least one Supabase Auth admin is registered in promptvault_admins.

begin;

alter table public.prompts add column if not exists view_count bigint not null default 0;
alter table public.prompts add column if not exists copy_count bigint not null default 0;
alter table public.prompts add column if not exists favorite_count bigint not null default 0;
alter table public.prompts add column if not exists is_featured boolean not null default false;
alter table public.prompts add column if not exists status text not null default 'published';
alter table public.prompts add column if not exists updated_at timestamptz not null default now();
update public.prompts set status='published' where status is null;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname='prompts_status_check' and conrelid='public.prompts'::regclass
  ) then
    alter table public.prompts add constraint prompts_status_check
      check (status in ('published','draft'));
  end if;
end $$;

create table if not exists public.promptvault_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.promptvault_admins enable row level security;
revoke all on table public.promptvault_admins from anon, authenticated;

create or replace function public.is_promptvault_admin()
returns boolean
language sql stable security definer
set search_path=''
as $$
  select exists (
    select 1 from public.promptvault_admins
    where user_id=(select auth.uid())
  );
$$;
revoke all on function public.is_promptvault_admin() from public, anon;
grant execute on function public.is_promptvault_admin() to authenticated;

create table if not exists public.site_visitors (
  visitor_key text primary key,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  visits bigint not null default 1
);
create table if not exists public.site_stats (
  id smallint primary key default 1 check (id=1),
  total_views bigint not null default 0,
  unique_visitors bigint not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.site_stats(id,total_views,unique_visitors)
values(1,0,0) on conflict(id) do nothing;
alter table public.site_visitors enable row level security;
alter table public.site_stats enable row level security;
revoke all on table public.site_visitors from anon, authenticated;
revoke all on table public.site_stats from anon, authenticated;

create or replace function public.track_site_visit(visitor_key text)
returns table(total_views bigint, unique_visitors bigint)
language plpgsql security definer
set search_path=''
as $$
begin
  if visitor_key is null or length(visitor_key)<8 or length(visitor_key)>128 then
    return query select s.total_views,s.unique_visitors from public.site_stats s where s.id=1;
    return;
  end if;
  insert into public.site_visitors(visitor_key,first_seen,last_seen,visits)
  values(visitor_key,now(),now(),1)
  on conflict(visitor_key) do update
    set last_seen=now(), visits=public.site_visitors.visits+1;
  update public.site_stats
    set total_views=public.site_stats.total_views+1,
        unique_visitors=(select count(*) from public.site_visitors),
        updated_at=now()
    where id=1;
  return query select s.total_views,s.unique_visitors from public.site_stats s where s.id=1;
end;
$$;
revoke all on function public.track_site_visit(text) from public;
grant execute on function public.track_site_visit(text) to anon, authenticated;

create or replace function public.get_public_stats()
returns table(total_views bigint, unique_visitors bigint)
language sql stable security definer
set search_path=''
as $$
  select s.total_views,s.unique_visitors from public.site_stats s where s.id=1;
$$;
revoke all on function public.get_public_stats() from public;
grant execute on function public.get_public_stats() to anon, authenticated;

create or replace function public.increment_prompt_metric(prompt_id_input text, metric_input text)
returns table(view_count bigint, copy_count bigint, favorite_count bigint)
language plpgsql security definer
set search_path=''
as $$
begin
  if metric_input='view' then
    update public.prompts set view_count=view_count+1 where id::text=prompt_id_input and status='published';
  elsif metric_input='copy' then
    update public.prompts set copy_count=copy_count+1 where id::text=prompt_id_input and status='published';
  elsif metric_input='favorite' then
    update public.prompts set favorite_count=favorite_count+1 where id::text=prompt_id_input and status='published';
  elsif metric_input='unfavorite' then
    update public.prompts set favorite_count=greatest(0,favorite_count-1) where id::text=prompt_id_input and status='published';
  else
    raise exception 'Unsupported metric';
  end if;
  return query select p.view_count,p.copy_count,p.favorite_count
    from public.prompts p where p.id::text=prompt_id_input;
end;
$$;
revoke all on function public.increment_prompt_metric(text,text) from public;
grant execute on function public.increment_prompt_metric(text,text) to anon, authenticated;

commit;
