# PromptVault v2

PromptVault is a curated AI visual prompt library built with Next.js, Supabase, and Vercel.

## v2 highlights

- Modern dynamic masonry gallery inspired by contemporary AI prompt discovery products.
- Featured / Newest / Popular sorting.
- Search, medium filters, and AI-model filters.
- Prompt drawer + shareable `/prompt/[id]` detail pages.
- Views, copies, favorites, and engagement-based popularity.
- Public visitor / visit counters.
- Realtime `online now` counter using Supabase Realtime Presence.
- Local browser favorites without requiring user accounts.
- New admin studio with Supabase Auth support.
- Draft / Published and Featured controls.
- WebP image resize/compression before upload.
- Old Storage image cleanup after replace/delete.
- RLS migration for public-read / admin-write security.

## Environment

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

The anon key is expected in the browser. Security must be enforced with Supabase RLS, not by hiding the anon key.

## Supabase v2 migration

The migration is committed at:

```text
supabase/migrations/20260823_promptvault_v2.sql
```

Run it once in **Supabase Dashboard → SQL Editor**.

It adds:

- `view_count`, `copy_count`, `favorite_count`
- `is_featured`
- `status` (`published` / `draft`)
- visitor and aggregate site-stat tables
- RPCs for public counters
- Prompt RLS policies
- admin allow-list table
- Storage policies for `prompt-images`

### Admin bootstrap after migration

1. Open **Supabase Dashboard → Authentication → Users**.
2. Create your admin email/password user.
3. Copy the Auth user UUID.
4. Run:

```sql
insert into public.promptvault_admins(user_id)
values ('YOUR-AUTH-USER-UUID')
on conflict do nothing;
```

5. Disable public email signups in Supabase Auth settings.
6. Review **Storage → Policies** and remove any older policies that still allow anon INSERT / UPDATE / DELETE on `prompt-images`.

Before the migration is run, `/admin` still supports the legacy dashboard password by leaving the email field empty. After the migration removes anon access to `settings`, use Supabase Auth.

## Visitor analytics semantics

- **Visitors**: unique browser IDs stored in localStorage. It is an approximation of unique devices/browsers, not guaranteed unique humans.
- **Visits**: one tracked visit per browser tab/session in the current frontend implementation.
- **Online now**: live connected clients in the `promptvault-online` Supabase Presence channel.

## Development

```bash
npm install
npm run dev
```

Production is deployed through the repository's Vercel Git integration.
