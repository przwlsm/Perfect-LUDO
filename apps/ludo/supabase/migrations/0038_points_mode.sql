-- 0038: Points mode. Apply after 0037. Safe to re-run.
--
-- Everyone gets the same number of turns (turnLimit, 12); bonus rolls for a
-- six, a capture or a coin home stay inside the turn. Every step scores 1,
-- a capture 10, a coin home 20. The board counts turns completed and, once
-- every player has had theirs, the highest score wins: ties go to the most
-- coins home, then the furthest coins, then the earlier seat. The finished
-- board names the winner as the seat on turn, which is how the match
-- functions read a result. Bringing all four coins home still wins at
-- once. Points is scored per seat, so it is never played in pairs.
-- Mirrors GameEngine.ts / Variant.ts; the rules test compares the two.

create or replace function public.valid_variant(p_variant text) returns boolean
language sql immutable set search_path = public, pg_temp as $$
  select p_variant in ('classic', 'quick1', 'quick2', 'kill', 'points');
$$;

create or replace function public.ludo_opening(p_count int, p_variant text default 'classic', p_teams boolean default false)
returns jsonb language plpgsql immutable set search_path = public, pg_temp as $$
declare colors text[] := array['RED','GREEN','YELLOW','BLUE','PURPLE','ORANGE']; players jsonb := '[]'; pieces jsonb; c text; i int; j int; zeros jsonb := '[]';
begin
  if p_count is null or p_count not between 2 and 6 then raise exception 'Invalid player count'; end if;
  if p_count = 2 then colors := array['RED','YELLOW']; end if;
  for i in 1..p_count loop
    c := colors[i]; pieces := '[]';
    for j in 0..3 loop pieces := pieces || jsonb_build_array(jsonb_build_object('id',c || '-' || j,'color',c,'progress',0)); end loop;
    players := players || jsonb_build_array(jsonb_build_object('id',c,'color',c,'pieces',pieces));
    zeros := zeros || '0'::jsonb;
  end loop;
  return jsonb_build_object('players',players,'currentPlayerIndex',0,'lastRoll',null,'consecutiveSixes',0,'status','IN_PROGRESS','winnerColor',null)
    || case coalesce(p_variant, 'classic')
         when 'quick1' then jsonb_build_object('goal', 1)
         when 'quick2' then jsonb_build_object('goal', 2)
         when 'kill' then jsonb_build_object('killToEnter', true, 'hunters', '[]'::jsonb)
         when 'points' then jsonb_build_object('turnLimit', 12, 'turns', 0, 'scores', zeros)
         else '{}'::jsonb end
    || case when coalesce(p_teams, false) and p_count = 4 and coalesce(p_variant, 'classic') <> 'points'
            then jsonb_build_object('teams', true) else '{}'::jsonb end;
end $$;

drop function if exists public.ludo_points_leader(jsonb);
/** Points mode's leading seat: score, then coins home, then progress, then the earlier seat. */
create or replace function public.ludo_points_leader_seat(p_state jsonb) returns int
language sql immutable set search_path = public, pg_temp as $$
  with n as (select jsonb_array_length(p_state->'players') as n),
  seats as (
    select s.i,
           coalesce((p_state->'scores'->s.i)::int, 0) as score,
           (select count(*) from jsonb_array_elements(p_state->'players'->s.i->'pieces') piece
             where (piece->>'progress')::int = (case when n.n > 4 then n.n*13 else 52 end) + 5) as home,
           (select sum((piece->>'progress')::int) from jsonb_array_elements(p_state->'players'->s.i->'pieces') piece) as total
      from n, generate_series(0, n.n - 1) as s(i)
  )
  select i from seats order by score desc, home desc, total desc, i limit 1;
$$;
revoke all on function public.ludo_points_leader_seat(jsonb) from public, anon, authenticated;

/** A Points board whose turn is passing: one more turn done, and the result once all are. */
create or replace function public.ludo_points_pass(p_state jsonb, p_next int) returns jsonb
language plpgsql immutable set search_path = public, pg_temp as $$
declare
  n int := jsonb_array_length(p_state->'players');
  turns int := coalesce((p_state->>'turns')::int, 0) + 1;
  leader int;
begin
  if turns >= (p_state->>'turnLimit')::int * n then
    leader := public.ludo_points_leader_seat(p_state);
    return p_state || jsonb_build_object('turns', turns, 'status', 'FINISHED',
      'winnerColor', p_state->'players'->leader->>'color', 'currentPlayerIndex', leader);
  end if;
  return p_state || jsonb_build_object('turns', turns, 'currentPlayerIndex', p_next, 'consecutiveSixes', 0);
end $$;
revoke all on function public.ludo_points_pass(jsonb, int) from public, anon, authenticated;

create or replace function public.ludo_successors(p_base jsonb, p_die int)
returns setof jsonb language plpgsql immutable set search_path = public, pg_temp as $$
declare
  colors text[] := array['RED','GREEN','YELLOW','BLUE','PURPLE','ORANGE'];
  n int := jsonb_array_length(p_base->'players'); turn int := (p_base->>'currentPlayerIndex')::int;
  track int; finish int; sixes int; source int; target int; square int; other_progress int; other_square int;
  moving_color text; other_color text; entry_square int; i int; j int; k int; occupants int; captures int;
  blocked boolean; won boolean; found_move boolean := false; next_state jsonb; base jsonb;
  goal int; kill boolean; hunter boolean; teams boolean; ctrl int; mate int;
  points_game boolean; points int;
begin
  if p_die is null or p_die not between 1 and 6 or n not between 2 and 6
     or turn not between 0 and n-1 or p_base->>'status' <> 'IN_PROGRESS'
     or p_base->'lastRoll' is distinct from 'null'::jsonb then raise exception 'Invalid board or roll'; end if;
  track := case when n > 4 then n*13 else 52 end; finish := track+5;
  goal := coalesce((p_base->>'goal')::int, 4);
  kill := coalesce((p_base->>'killToEnter')::boolean, false);
  teams := coalesce((p_base->>'teams')::boolean, false) and n = 4;
  points_game := coalesce((p_base->>'turnLimit')::int, 0) > 0;
  ctrl := turn;
  if teams and not exists (
    select 1 from jsonb_array_elements(p_base->'players'->turn->'pieces') piece
     where (piece->>'progress')::int <> finish
  ) then ctrl := (turn + 2) % 4; end if;
  mate := case when teams then (ctrl + 2) % 4 else -1 end;
  sixes := case when p_die=6 then (p_base->>'consecutiveSixes')::int+1 else 0 end;
  base := jsonb_set(p_base,'{consecutiveSixes}',to_jsonb(sixes));
  moving_color := p_base->'players'->ctrl->>'color';
  entry_square := (array_position(colors,moving_color)-1)*13;
  hunter := coalesce(p_base->'hunters', '[]'::jsonb) ? moving_color;
  if sixes < 3 then
    for i in 0..3 loop
      source := (p_base->'players'->ctrl->'pieces'->i->>'progress')::int;
      if source=finish or (source=0 and p_die<>6) then continue; end if;
      target := case when source=0 then 1 else source+p_die end;
      if target > finish then continue; end if;
      if kill and not hunter and target >= track then continue; end if;
      blocked := false; captures := 0;
      next_state := jsonb_set(base,array['players',ctrl::text,'pieces',i::text,'progress'],to_jsonb(target));
      if target < track then
        square := (entry_square+target-1)%track;
        for j in 0..n-1 loop
          if j=ctrl or j=mate then continue; end if;
          other_color := p_base->'players'->j->>'color'; occupants := 0;
          for k in 0..3 loop
            other_progress := (p_base->'players'->j->'pieces'->k->>'progress')::int;
            if other_progress > 0 and other_progress < track then
              other_square := ((array_position(colors,other_color)-1)*13+other_progress-1)%track;
              if other_square=square then
                occupants := occupants+1;
                if square%13 not in (0,8) then
                  next_state := jsonb_set(next_state,array['players',j::text,'pieces',k::text,'progress'],'0');
                  captures := captures+1;
                end if;
              end if;
            end if;
          end loop;
          if occupants >= 2 then blocked := true; exit; end if;
        end loop;
      end if;
      if blocked then continue; end if;
      found_move := true;
      if kill and captures > 0 and not hunter then
        next_state := jsonb_set(next_state, '{hunters}', coalesce(p_base->'hunters', '[]'::jsonb) || to_jsonb(moving_color));
      end if;
      -- Points: a step scores 1, a capture 10, a coin home 20, for the seat on turn.
      if points_game then
        points := coalesce((p_base->'scores'->turn)::int, 0)
                  + greatest(1, target - source) + 10 * captures + case when target = finish then 20 else 0 end;
        next_state := jsonb_set(next_state, array['scores', turn::text], to_jsonb(points));
      end if;
      if teams then
        select bool_and(home >= goal) into won from (
          select count(*) filter (where (piece->>'progress')::int=finish) as home
            from unnest(array[turn, (turn + 2) % 4]) seat_no,
                 jsonb_array_elements(next_state->'players'->seat_no->'pieces') piece
           group by seat_no
        ) pair;
      else
        select count(*) filter (where (piece->>'progress')::int=finish) >= goal into won
          from jsonb_array_elements(next_state->'players'->turn->'pieces') piece;
      end if;
      if won then
        next_state := next_state || jsonb_build_object('status','FINISHED','winnerColor',p_base->'players'->turn->>'color');
      elsif not (p_die=6 or captures>0 or target=finish) then
        if points_game then
          next_state := public.ludo_points_pass(next_state, (turn+1)%n);
        else
          next_state := next_state || jsonb_build_object('currentPlayerIndex',(turn+1)%n,'consecutiveSixes',0);
        end if;
      end if;
      return next next_state;
    end loop;
  end if;
  if not found_move then
    if points_game then
      return next public.ludo_points_pass(base, (turn+1)%n);
    else
      return next base || jsonb_build_object('currentPlayerIndex',(turn+1)%n,'consecutiveSixes',0);
    end if;
  end if;
end $$;

-- Placement, as 0028, except a Points board ranks the seats by score first.
create or replace function public.match_placement(
  p_state jsonb, p_seat int, p_winner int, p_out int[] default '{}'
) returns int language plpgsql immutable set search_path = public, pg_temp as $$
declare
  n int := jsonb_array_length(p_state -> 'players');
  fin int;
  better int := 0;
  my_home int;
  my_total int;
  my_score int := coalesce((p_state -> 'scores' -> p_seat)::int, 0);
  my_out boolean := p_seat = any(coalesce(p_out, '{}'));
  h int;
  t int;
  sc int;
  i int;
begin
  if p_seat = p_winner then return 1; end if;
  fin := (case when n > 4 then n * 13 else 52 end) + 5;
  select count(*) filter (where (pc ->> 'progress')::int = fin),
         coalesce(sum((pc ->> 'progress')::int), 0)
    into my_home, my_total
    from jsonb_array_elements(p_state -> 'players' -> p_seat -> 'pieces') pc;
  for i in 0..n - 1 loop
    continue when i = p_seat;
    if i = p_winner then
      better := better + 1;
      continue;
    end if;
    -- An out seat never beats one still in; a still-in seat always beats me if I am out.
    if i = any(coalesce(p_out, '{}')) and not my_out then continue; end if;
    if my_out and not (i = any(coalesce(p_out, '{}'))) then
      better := better + 1;
      continue;
    end if;
    select count(*) filter (where (pc ->> 'progress')::int = fin),
           coalesce(sum((pc ->> 'progress')::int), 0)
      into h, t
      from jsonb_array_elements(p_state -> 'players' -> i -> 'pieces') pc;
    sc := coalesce((p_state -> 'scores' -> i)::int, 0);
    if sc > my_score
       or (sc = my_score and (h > my_home or (h = my_home and (t > my_total or (t = my_total and i < p_seat))))) then
      better := better + 1;
    end if;
  end loop;
  return better + 1;
end $$;
