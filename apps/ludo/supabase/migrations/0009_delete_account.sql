-- Self-service account deletion. Apply after 0008.
--
-- Every per-account table already references `auth.users (id) on delete
-- cascade` (profiles, social graph, wallet, presence -- see the "references
-- auth.users" foreign keys across every earlier migration), so removing that
-- one row is enough to erase an account everywhere except `feedback`, which
-- keeps its row with `uid` set to null on purpose (0008).

-- Fix a pre-existing gap: `matches.last_submit_user` (0005) had no ON DELETE
-- action, so deleting an account that had ever moved in an online match
-- would fail with a foreign key violation instead of deleting anything. It
-- is a bookkeeping column only (an idempotency marker for a retried move),
-- so nulling it on delete is harmless. Looked up by column rather than by a
-- guessed constraint name, so this is safe to re-run.
do $$
declare v_conname text;
begin
  select con.conname into v_conname
    from pg_constraint con
    join pg_attribute att
      on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
    where con.conrelid = 'public.matches'::regclass
      and con.contype = 'f'
      and att.attname = 'last_submit_user';
  if v_conname is not null then
    execute format('alter table public.matches drop constraint %I', v_conname);
  end if;
end $$;
alter table public.matches
  add constraint matches_last_submit_user_fkey
  foreign key (last_submit_user) references auth.users (id) on delete set null;

-- Deleting from auth.users normally needs the Supabase auth-admin role;
-- running this as SECURITY DEFINER, owned by the migration role (which
-- Supabase's hosted Postgres grants that privilege to), is the platform's
-- documented pattern for self-service deletion. A player can only ever
-- delete their own row: the id comes from their own session, never a
-- parameter, so there is nothing for a client to pass that reaches anyone
-- else's account.
create or replace function public.delete_own_account() returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Please sign in again to continue.' using errcode = '42501';
  end if;
  delete from auth.users where id = v_uid;
end $$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
