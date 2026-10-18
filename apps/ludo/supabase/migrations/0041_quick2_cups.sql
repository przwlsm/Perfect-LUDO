-- 0041: every Royal Road hall plays Quick 2, and the app can say how long a game takes.
--
-- A cup is two rounds back to back, so the full Classic game made the top
-- halls run long and Quick 1 made the low ones feel slight. For now every
-- hall plays Quick 2 (two coins home). Brackets already running keep the
-- tables they have; new tables take the new mode, because cup_make_lobby
-- reads the hall's variant when it seats a round.
--
-- cup_game_length() is the average real length of recent heads-up Quick 2
-- games: from the moment a match starts (matches.created_at) to the moment
-- it is decided (finished_at). Only finished games count, abandoned ones do
-- not, and the extremes are left out so one stalled table cannot skew it.
-- The app shows this on the Royal Road card ("about 6 min a game"), and
-- falls back to its own estimate until enough games have been played.
-- Safe to re-run.

update public.cups set variant = 'quick2' where variant <> 'quick2';

-- Recent finished games are found by time, so the average stays cheap as matches grow.
create index if not exists matches_finished_at_idx
  on public.matches (finished_at desc)
  where status = 'FINISHED';

create or replace function public.cup_game_length() returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  with recent as (
    select extract(epoch from (m.finished_at - m.created_at)) as secs
      from public.matches m
     where m.status = 'FINISHED'
       and m.variant = 'quick2'
       and m.player_count = 2
       and m.finished_at is not null
       and m.finished_at > now() - interval '30 days'
     order by m.finished_at desc
     limit 500
  )
  select jsonb_build_object(
    'variant', 'quick2',
    'seconds', coalesce(round(avg(secs))::int, 0),
    'samples', count(*)::int
  )
    from recent
   -- Under a minute is a walk-over; over an hour is a table left open.
   where secs between 60 and 3600;
$$;
revoke execute on function public.cup_game_length() from public, anon;
grant execute on function public.cup_game_length() to authenticated;
