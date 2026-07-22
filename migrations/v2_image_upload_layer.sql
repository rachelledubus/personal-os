-- ============================================================
-- Migration: Image upload storage (generic, works anywhere)
-- ============================================================
-- One shared, public-read Storage bucket for any user-uploaded image
-- anywhere in the app — not "a banners bucket," a general one. Today
-- it's used for banners and the profile avatar; future features
-- (Guardian art, whatever else) reuse the exact same bucket and
-- upload service rather than needing their own setup.
--
-- Public read (bucket_id public = true) because these are always
-- decorative images meant to render as plain <img> tags — no more
-- exposed than the arbitrary external URLs the paste-a-link option
-- already allowed. Write/delete is locked to each user's own folder
-- (path starts with their user id), same ownership model as every
-- RLS policy elsewhere in this app.
--
-- Run this once in the Supabase SQL Editor. Safe to run again —
-- every statement is guarded.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('user-assets', 'user-assets', true)
on conflict (id) do nothing;

drop policy if exists "user-assets: owner insert" on storage.objects;
create policy "user-assets: owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'user-assets' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "user-assets: owner update" on storage.objects;
create policy "user-assets: owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'user-assets' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "user-assets: owner delete" on storage.objects;
create policy "user-assets: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'user-assets' and (storage.foldername(name))[1] = auth.uid()::text);

-- Public bucket already serves files without this, but an explicit
-- policy keeps the intent visible rather than relying only on the
-- bucket flag.
drop policy if exists "user-assets: public read" on storage.objects;
create policy "user-assets: public read" on storage.objects
  for select to public
  using (bucket_id = 'user-assets');
