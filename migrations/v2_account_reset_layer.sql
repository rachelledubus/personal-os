-- ============================================================
-- Migration: Full account reset function
-- ============================================================
-- Deliberately dynamic rather than a hardcoded table list — this app
-- has 90+ tables and growing; a hand-maintained list would silently
-- go stale the next time a new table gets added, leaving orphaned
-- data behind on "reset." Instead this finds every table in the
-- public schema with a user_id column and deletes that user's rows
-- from each one, at call time — always current, no maintenance.
--
-- Excluded on purpose: `profiles` — almost certainly holds account
-- identity (name/avatar), not app data, and wiping it risks breaking
-- auth-dependent UI. If that assumption is wrong, this is the one
-- line to change.
--
-- security definer + explicit auth.uid() scoping: runs with elevated
-- privilege ONLY so it can iterate information_schema and issue
-- per-table deletes, but every delete is filtered to the CALLING
-- user's own id — this cannot delete another user's data even though
-- it runs as definer. Revoked from public, granted only to
-- authenticated, and only deletes rows matching the caller's own
-- auth.uid() — there is no user_id parameter to spoof.
-- ============================================================

create or replace function reset_all_user_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  caller_id uuid := auth.uid();
begin
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  for r in
    select table_name from information_schema.columns
    where table_schema = 'public'
      and column_name = 'user_id'
      and table_name <> 'profiles'
  loop
    execute format('delete from public.%I where user_id = $1', r.table_name) using caller_id;
  end loop;
end;
$$;

revoke all on function reset_all_user_data() from public;
grant execute on function reset_all_user_data() to authenticated;
