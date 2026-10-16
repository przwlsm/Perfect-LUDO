-- Authoritative transitions for private online matches. Apply after 0004.
-- Keep parity with src/domain/services/GameEngine.ts; scripts/check-online-rules.mjs
-- executes this PostgreSQL code against the TypeScript engine before release.

create or replace function public.ludo_opening(p_count int)
returns jsonb language plpgsql immutable set search_path = public, pg_temp as $$
declare colors text[] := array['RED','GREEN','YELLOW','BLUE','PURPLE','ORANGE']; players jsonb := '[]'; pieces jsonb; c text; i int; j int;
begin
  if p_count is null or p_count not between 2 and 6 then raise exception 'Invalid player count'; end if;
  if p_count = 2 then colors := array['RED','YELLOW']; end if;
  for i in 1..p_count loop
    c := colors[i]; pieces := '[]';
    for j in 0..3 loop pieces := pieces || jsonb_build_array(jsonb_build_object('id',c || '-' || j,'color',c,'progress',0)); end loop;
    players := players || jsonb_build_array(jsonb_build_object('id',c,'color',c,'pieces',pieces));
  end loop;
  return jsonb_build_object('players',players,'currentPlayerIndex',0,'lastRoll',null,'consecutiveSixes',0,'status','IN_PROGRESS','winnerColor',null);
end $$;

create or replace function public.ludo_successors(p_base jsonb, p_die int)
returns setof jsonb language plpgsql immutable set search_path = public, pg_temp as $$
declare
  colors text[] := array['RED','GREEN','YELLOW','BLUE','PURPLE','ORANGE'];
  n int := jsonb_array_length(p_base->'players'); turn int := (p_base->>'currentPlayerIndex')::int;
  track int; finish int; sixes int; source int; target int; square int; other_progress int; other_square int;
  moving_color text; other_color text; entry_square int; i int; j int; k int; occupants int; captures int;
  blocked boolean; won boolean; found_move boolean := false; next_state jsonb; base jsonb;
begin
  if p_die is null or p_die not between 1 and 6 or n not between 2 and 6
     or turn not between 0 and n-1 or p_base->>'status' <> 'IN_PROGRESS'
     or p_base->'lastRoll' is distinct from 'null'::jsonb then raise exception 'Invalid board or roll'; end if;
  track := case when n > 4 then n*13 else 52 end; finish := track+5;
  sixes := case when p_die=6 then (p_base->>'consecutiveSixes')::int+1 else 0 end;
  base := jsonb_set(p_base,'{consecutiveSixes}',to_jsonb(sixes));
  moving_color := p_base->'players'->turn->>'color';
  entry_square := (array_position(colors,moving_color)-1)*13;
  if sixes < 3 then
    for i in 0..3 loop
      source := (p_base->'players'->turn->'pieces'->i->>'progress')::int;
      if source=finish or (source=0 and p_die<>6) then continue; end if;
      target := case when source=0 then 1 else source+p_die end;
      if target > finish then continue; end if;
      blocked := false; captures := 0;
      next_state := jsonb_set(base,array['players',turn::text,'pieces',i::text,'progress'],to_jsonb(target));
      if target < track then
        square := (entry_square+target-1)%track;
        for j in 0..n-1 loop
          if j=turn then continue; end if;
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
      select bool_and((piece->>'progress')::int=finish) into won
        from jsonb_array_elements(next_state->'players'->turn->'pieces') piece;
      if won then
        next_state := next_state || jsonb_build_object('status','FINISHED','winnerColor',moving_color);
      elsif not (p_die=6 or captures>0 or target=finish) then
        next_state := next_state || jsonb_build_object('currentPlayerIndex',(turn+1)%n,'consecutiveSixes',0);
      end if;
      return next next_state;
    end loop;
  end if;
  if not found_move then
    return next base || jsonb_build_object('currentPlayerIndex',(turn+1)%n,'consecutiveSixes',0);
  end if;
end $$;

revoke all on function public.ludo_opening(int), public.ludo_successors(jsonb,int) from public, anon, authenticated;

alter table public.matches add column if not exists last_submit_version int;
alter table public.matches add column if not exists last_submit_user uuid references auth.users(id);

create or replace function public.submit_match_turn(p_match_id uuid,p_version int,p_state jsonb,p_winner_seat int default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.require_uid(); m public.matches; seat int; base jsonb; next_seat int; winner int;
begin
  select * into m from public.matches where id=p_match_id for update;
  if not found then raise exception 'That match is no longer available.' using errcode='P0002'; end if;
  select seat_index into seat from public.match_players where match_id=p_match_id and user_id=uid;
  if seat is null then raise exception 'You are not in that match.' using errcode='42501'; end if;
  -- A lost response can be retried without applying a move twice.
  if m.last_submit_user=uid and m.last_submit_version=p_version and m.version=p_version+1 and m.state=p_state then
    return public.match_snapshot(p_match_id);
  end if;
  if m.status<>'IN_PROGRESS' then raise exception 'That match has finished.' using errcode='22023'; end if;
  if seat<>m.turn_seat then raise exception 'It is not your turn.' using errcode='42501'; end if;
  if p_version is distinct from m.version then raise exception 'The board has changed. Refresh and try again.' using errcode='22023'; end if;
  if m.last_roll is null then raise exception 'Roll the dice before moving.' using errcode='22023'; end if;
  base := coalesce(m.state,public.ludo_opening(m.player_count));
  if not exists(select 1 from public.ludo_successors(base,m.last_roll) expected where expected=p_state) then
    raise exception 'That move is not legal for the current roll.' using errcode='22023';
  end if;
  next_seat := (p_state->>'currentPlayerIndex')::int;
  if p_state->>'status'='FINISHED' then winner := next_seat; end if;
  if p_winner_seat is distinct from winner then raise exception 'The result does not match the board.' using errcode='22023'; end if;
  update public.matches set state=p_state,version=version+1,turn_seat=next_seat,last_roll=null,
    status=case when winner is null then 'IN_PROGRESS'::public.match_status else 'FINISHED'::public.match_status end,
    winner_seat=winner,finished_at=case when winner is null then null else now() end,
    last_submit_version=p_version,last_submit_user=uid where id=p_match_id;
  return public.match_snapshot(p_match_id);
end $$;
revoke execute on function public.submit_match_turn(uuid,int,jsonb,int) from public,anon;
grant execute on function public.submit_match_turn(uuid,int,jsonb,int) to authenticated;

-- Versioned rolls prevent a delayed retry from rolling again after a bonus move.
create or replace function public.roll_match_dice(p_match_id uuid,p_version int)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.require_uid(); m public.matches; seat int; die int;
begin
  select * into m from public.matches where id=p_match_id for update;
  if not found then raise exception 'That match is no longer available.' using errcode='P0002'; end if;
  select seat_index into seat from public.match_players where match_id=p_match_id and user_id=uid;
  if seat is null or seat<>m.turn_seat then raise exception 'It is not your turn.' using errcode='42501'; end if;
  if m.status<>'IN_PROGRESS' then raise exception 'That match has finished.' using errcode='22023'; end if;
  if m.last_roll is not null and m.version=p_version+1 then return public.match_snapshot(p_match_id); end if;
  if p_version is distinct from m.version then raise exception 'The board has changed. Refresh and try again.' using errcode='22023'; end if;
  if m.last_roll is not null then raise exception 'You have already rolled. Move a coin.' using errcode='22023'; end if;
  -- Use an unbiased byte from PostgreSQL's cryptographically random UUID source.
  loop
    die := get_byte(uuid_send(gen_random_uuid()),0);
    exit when die < 252;
  end loop;
  die := die%6+1;
  update public.matches set last_roll=die,version=version+1 where id=p_match_id;
  return public.match_snapshot(p_match_id);
end $$;
revoke execute on function public.roll_match_dice(uuid,int) from public,anon;
grant execute on function public.roll_match_dice(uuid,int) to authenticated;
-- Old clients must update; otherwise an unversioned network retry can take an extra roll.
revoke execute on function public.roll_match_dice(uuid) from public,anon,authenticated;

-- Repeated leave requests must not spam every other player's notification inbox.
create or replace function public.abandon_match(p_match_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := public.require_uid(); changed int;
begin
  if not public.is_match_member(p_match_id) then raise exception 'You are not in that match.' using errcode='42501'; end if;
  update public.matches set status='ABANDONED',finished_at=now(),version=version+1
    where id=p_match_id and status='IN_PROGRESS';
  get diagnostics changed = row_count;
  if changed>0 then
    insert into public.notifications(user_id,type,title,message,related_lobby_id)
    select mp.user_id,'CHALLENGE_CANCELLED','Game ended',public.display_of(uid)||' left the game.',m.lobby_id
      from public.match_players mp join public.matches m on m.id=mp.match_id
      where mp.match_id=p_match_id and mp.user_id<>uid;
  end if;
  return public.match_snapshot(p_match_id);
end $$;
revoke execute on function public.abandon_match(uuid) from public,anon;
grant execute on function public.abandon_match(uuid) to authenticated;
