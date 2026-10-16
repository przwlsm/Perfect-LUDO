-- 0026: the guest vault. Apply after 0025.
--
-- Guests earn into a locked, device-held vault (bot wins and opt-in
-- rewarded ads). When they create an account, the app pays the vault onto
-- it through this function. The number is the client's word, so it is
-- capped at 5,000 and an account can claim it exactly once — the same
-- bounded-trust model as bot-game rewards. Mirrors GUEST_VAULT_* in
-- src/domain/entities/Wallet.ts.

create or replace function public.claim_vault(p_coins integer) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := public.lock_wallet();
  v_amount int := least(greatest(coalesce(p_coins, 0), 0), 5000);
begin
  if exists (select 1 from public.profile_rewards where uid = v_uid and match_id = 'vault:once') then
    return public.wallet_json(v_uid);
  end if;
  insert into public.profile_rewards (uid, match_id, coins, won)
  values (v_uid, 'vault:once', v_amount, false);
  if v_amount > 0 then
    update public.profiles set coins = coins + v_amount where uid = v_uid;
  end if;
  return public.wallet_json(v_uid);
end $$;
revoke execute on function public.claim_vault(integer) from public, anon;
grant execute on function public.claim_vault(integer) to authenticated;
