-- PromptVault — Fashion Prompt room
-- Separate data surface for fashion styles so the main PromptVault prompt gallery remains independent.

begin;

create table if not exists public.fashion_prompts (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default now(),
  title text not null,
  slug text not null unique,
  source_style_id text,
  region text,
  country text,
  era text,
  scene text,
  gender text,
  visual_dna text,
  silhouette text,
  wardrobe text,
  hair text,
  makeup text,
  accessories text,
  palette text,
  avoid_notes text,
  tags text[] not null default '{}',
  image_infographic_url text,
  prompt_infographic text not null,
  prompt_img2img text,
  image_img2img_url text,
  batch text not null default 'batch-1',
  view_count bigint not null default 0,
  copy_count bigint not null default 0,
  favorite_count bigint not null default 0,
  is_featured boolean not null default false,
  status text not null default 'published' check (status = any (array['published'::text,'draft'::text]))
);

alter table public.fashion_prompts add column if not exists source_style_id text;
alter table public.fashion_prompts add column if not exists prompt_img2img text;
alter table public.fashion_prompts add column if not exists image_img2img_url text;

create index if not exists fashion_prompts_status_created_idx on public.fashion_prompts(status, created_at desc);
create index if not exists fashion_prompts_region_idx on public.fashion_prompts(region);
create index if not exists fashion_prompts_scene_idx on public.fashion_prompts(scene);
create unique index if not exists fashion_prompts_source_style_id_uidx
  on public.fashion_prompts(source_style_id)
  where source_style_id is not null;

alter table public.fashion_prompts enable row level security;

drop policy if exists "anon read published fashion prompts" on public.fashion_prompts;
drop policy if exists "authenticated read published fashion prompts" on public.fashion_prompts;
drop policy if exists "admin read all fashion prompts" on public.fashion_prompts;
drop policy if exists "admin insert fashion prompts" on public.fashion_prompts;
drop policy if exists "admin update fashion prompts" on public.fashion_prompts;
drop policy if exists "admin delete fashion prompts" on public.fashion_prompts;

create policy "anon read published fashion prompts"
on public.fashion_prompts for select to anon
using (status='published');

create policy "authenticated read published fashion prompts"
on public.fashion_prompts for select to authenticated
using (status='published');

create policy "admin read all fashion prompts"
on public.fashion_prompts for select to authenticated
using (public.is_promptvault_admin());

create policy "admin insert fashion prompts"
on public.fashion_prompts for insert to authenticated
with check (public.is_promptvault_admin());

create policy "admin update fashion prompts"
on public.fashion_prompts for update to authenticated
using (public.is_promptvault_admin())
with check (public.is_promptvault_admin());

create policy "admin delete fashion prompts"
on public.fashion_prompts for delete to authenticated
using (public.is_promptvault_admin());

create or replace function public.increment_fashion_prompt_metric(fashion_prompt_id_input bigint, metric_input text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if metric_input = 'view' then
    update public.fashion_prompts set view_count = view_count + 1
    where id = fashion_prompt_id_input and status='published';
  elsif metric_input = 'copy' then
    update public.fashion_prompts set copy_count = copy_count + 1
    where id = fashion_prompt_id_input and status='published';
  elsif metric_input = 'favorite' then
    update public.fashion_prompts set favorite_count = favorite_count + 1
    where id = fashion_prompt_id_input and status='published';
  elsif metric_input = 'unfavorite' then
    update public.fashion_prompts set favorite_count = greatest(0, favorite_count - 1)
    where id = fashion_prompt_id_input and status='published';
  end if;
end;
$$;

grant execute on function public.increment_fashion_prompt_metric(bigint, text) to anon, authenticated;

commit;
