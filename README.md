# PromptVault v2

PromptVault is a curated AI visual prompt library built with Next.js, Supabase, and Vercel.

## v2 highlights

- Modern responsive masonry gallery.
- Featured / Newest / Popular sorting.
- Search, medium filters, and AI-model filters.
- Prompt drawer + shareable `/prompt/[id]` detail pages.
- Views, copies, favorites, and engagement-based popularity.
- Visitor / visit counters.
- Realtime `online now` using Supabase Realtime Presence.
- Local browser favorites without requiring visitor accounts.
- New `/admin` studio with Supabase Auth support.
- Draft / Published and Featured controls.
- WebP resize/compression before upload and Storage cleanup after replace/delete.

## Environment

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

The anon/publishable key is expected in the browser. Authorization is enforced with RLS, not by hiding a frontend key.

## Supabase rollout: two phases

PromptVault v2 intentionally separates analytics/schema changes from the final security cutover so an existing legacy admin cannot be locked out accidentally.

### Phase A — analytics + schema foundation

File:

```text
supabase/migrations/20260823_promptvault_v2.sql
```

Adds engagement columns, visitor tables, public counter RPCs, and the Auth admin allow-list foundation. It does **not** remove legacy prompt/settings/storage policies.

For the current production PromptVault project, Phase A has already been applied.

### Create the Auth admin before Phase B

1. Open **Supabase Dashboard → Authentication → Users**.
2. Create one admin email/password user. Do not enable public signup just for this.
3. Copy that Auth user's UUID.
4. Insert it into the allow-list:

```sql
insert into public.promptvault_admins(user_id)
values ('YOUR-AUTH-USER-UUID')
on conflict do nothing;
```

5. Verify it exists:

```sql
select user_id, created_at from public.promptvault_admins;
```

### Phase B — security cutover

File:

```text
supabase/migrations/20260823_promptvault_v2_phase_b_security.sql
```

Phase B removes the legacy public INSERT/UPDATE/DELETE policies, locks the legacy `settings` table behind the authenticated admin allow-list, and changes `prompt-images` Storage to public-read/admin-write.

The migration has a guard and **aborts automatically if `promptvault_admins` is empty**. Do not bypass that guard.

After Phase B, `/admin` should use Supabase Auth email/password. The legacy password fallback will no longer be able to read `settings` anonymously.

## Analytics semantics

- **Visitors**: unique browser IDs stored in localStorage. This approximates unique devices/browsers; it is not guaranteed to equal unique humans.
- **Visits**: one tracked visit per browser tab/session in the current frontend.
- **Online now**: connected clients currently present in the `promptvault-online` Supabase Presence channel.
- **Prompt views**: prompt opens/detail views.
- **Copies**: successful prompt-copy actions.
- **Favorites**: local-browser save state with an aggregate public counter.

Public metric functions intentionally expose only narrowly scoped counter operations. Direct visitor/stat tables remain inaccessible to anon/authenticated clients.

## Security notes

The old production database historically contained permissive public write policies for `prompts` and `prompt-images`. Phase B is the required final hardening step after an Auth admin exists.

After applying Phase B, run Supabase Security and Performance Advisors and confirm there are no unexpected anonymous write policies.

## Development

```bash
npm install
npm run dev
```

Production deploys through the repository's Vercel Git integration.
