-- PromptVault v2 — Phase B: security cutover
-- IMPORTANT: this migration intentionally aborts unless an Auth admin has already been allow-listed.

begin;

do $$
begin
  if not exists (select 1 from public.promptvault_admins) then
    raise exception 'PromptVault Phase B aborted: create a Supabase Auth user and insert its UUID into public.promptvault_admins first.';
  end if;
end $$;

-- PROMPTS: remove legacy permissive policies.
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='prompts'
  loop
    execute format('drop policy if exists %I on public.prompts', p.policyname);
  end loop;
end $$;

alter table public.prompts enable row level security;

create policy "anon read published prompts"
on public.prompts for select to anon
using (status='published');

create policy "authenticated read published prompts"
on public.prompts for select to authenticated
using (status='published');

create policy "admin read all prompts"
on public.prompts for select to authenticated
using (public.is_promptvault_admin());

create policy "admin insert prompts"
on public.prompts for insert to authenticated
with check (public.is_promptvault_admin());

create policy "admin update prompts"
on public.prompts for update to authenticated
using (public.is_promptvault_admin())
with check (public.is_promptvault_admin());

create policy "admin delete prompts"
on public.prompts for delete to authenticated
using (public.is_promptvault_admin());

-- SETTINGS: legacy password is no longer exposed to anonymous clients.
if to_regclass('public.settings') is not null then
  alter table public.settings enable row level security;
end if;

do $$
declare p record;
begin
  if to_regclass('public.settings') is not null then
    for p in select policyname from pg_policies where schemaname='public' and tablename='settings'
    loop
      execute format('drop policy if exists %I on public.settings', p.policyname);
    end loop;
  end if;
end $$;

-- PostgreSQL does not allow CREATE POLICY inside the IF above, so create it only when table exists.
do $$
begin
  if to_regclass('public.settings') is not null then
    execute 'create policy "admin settings only" on public.settings for all to authenticated using (public.is_promptvault_admin()) with check (public.is_promptvault_admin())';
  end if;
end $$;

-- STORAGE: remove the old public write policies and replace with public-read/admin-write.
drop policy if exists "Public Select Storage" on storage.objects;
drop policy if exists "Public Update Storage" on storage.objects;
drop policy if exists "Public Upload Storage" on storage.objects;
drop policy if exists "Public Delete Storage" on storage.objects;
drop policy if exists "promptvault public images" on storage.objects;
drop policy if exists "promptvault admin upload" on storage.objects;
drop policy if exists "promptvault admin update" on storage.objects;
drop policy if exists "promptvault admin delete" on storage.objects;

create policy "promptvault public images"
on storage.objects for select to public
using (bucket_id='prompt-images');

create policy "promptvault admin upload"
on storage.objects for insert to authenticated
with check (bucket_id='prompt-images' and public.is_promptvault_admin());

create policy "promptvault admin update"
on storage.objects for update to authenticated
using (bucket_id='prompt-images' and public.is_promptvault_admin())
with check (bucket_id='prompt-images' and public.is_promptvault_admin());

create policy "promptvault admin delete"
on storage.objects for delete to authenticated
using (bucket_id='prompt-images' and public.is_promptvault_admin());

commit;
