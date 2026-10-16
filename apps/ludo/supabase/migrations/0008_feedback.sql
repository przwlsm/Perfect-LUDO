-- In-app feedback: bug reports and suggestions. Apply after 0007.
--
-- Deliberately reachable by anyone -- signed in, a guest, or nobody at all --
-- because a player hitting a bug should be able to report it without first
-- creating an account. There is no select policy at all: a submitter cannot
-- read their own message back, let alone anyone else's, through this table.
-- Every write goes through submit_feedback, which validates and (for a
-- caller with an identity to throttle) rate-limits server-side.

create table if not exists public.feedback (
  id            uuid primary key default gen_random_uuid(),
  -- Kept even if the account is later deleted (see 0009): support history
  -- about a bug should survive the reporter's account, so this is `set
  -- null`, not `cascade`, unlike every other per-account table.
  uid           uuid references auth.users (id) on delete set null,
  category      text not null check (category in ('bug', 'suggestion', 'other')),
  message       text not null check (char_length(btrim(message)) between 1 and 2000),
  contact_email text check (contact_email is null or char_length(contact_email) <= 254),
  platform      text check (platform is null or char_length(platform) <= 20),
  app_version   text check (app_version is null or char_length(app_version) <= 20),
  created_at    timestamptz not null default now()
);

alter table public.feedback enable row level security;
-- No policies at all: deny by default for every role, including the
-- submitter's own session. Reading feedback is a support-tool concern, not
-- a client one.

create or replace function public.submit_feedback(
  p_category text,
  p_message text,
  p_contact_email text default null,
  p_platform text default null,
  p_app_version text default null
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid(); -- null for a caller with no session at all
  v_message text := btrim(coalesce(p_message, ''));
  v_email text := nullif(btrim(coalesce(p_contact_email, '')), '');
  v_recent int;
begin
  if p_category not in ('bug', 'suggestion', 'other') then
    raise exception 'Please choose a category.' using errcode = '22023';
  end if;
  if char_length(v_message) < 1 or char_length(v_message) > 2000 then
    raise exception 'Message must be between 1 and 2000 characters.' using errcode = '22023';
  end if;
  if v_email is not null and (
    char_length(v_email) > 254
    or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ) then
    raise exception 'That does not look like a valid email address.' using errcode = '22023';
  end if;
  -- A signed-in or guest session can be throttled by uid. A caller with no
  -- session at all has no identity to throttle by -- the same tradeoff every
  -- other anon-callable function here already makes (e.g.
  -- check_username_available), and message-length limits still bound a
  -- single request's cost.
  if v_uid is not null then
    select count(*) into v_recent from public.feedback
      where uid = v_uid and created_at > now() - interval '10 minutes';
    if v_recent >= 5 then
      raise exception 'You have sent several messages recently. Please wait a bit before sending more.'
        using errcode = 'P0001';
    end if;
  end if;
  insert into public.feedback (uid, category, message, contact_email, platform, app_version)
  values (
    v_uid, p_category, v_message, v_email,
    nullif(btrim(coalesce(p_platform, '')), ''),
    nullif(btrim(coalesce(p_app_version, '')), '')
  );
end $$;

revoke all on function public.submit_feedback(text, text, text, text, text) from public;
grant execute on function public.submit_feedback(text, text, text, text, text) to anon, authenticated;
