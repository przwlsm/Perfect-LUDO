-- 0040: twenty more computer players, bringing the pool to fifty.
--
-- Same shape as 0032's seed: an auth user per account (so RLS and the
-- functions treat them like anyone else) and a profile flagged is_bot.
-- Everything else about how they are seated and how they play lives in
-- 0032 and needs no change; a bigger pool just means tables see more
-- different names and flags. Safe to re-run.
do $$
declare
  r record;
  v_real_auth boolean := exists (
    select 1 from information_schema.columns
     where table_schema = 'auth' and table_name = 'users' and column_name = 'aud'
  );
begin
  for r in
    select * from (values
      ('b0000000-0000-4000-8000-000000000031'::uuid, 'priya_n',   'Priya',   '🪷', 'IN'),
      ('b0000000-0000-4000-8000-000000000032'::uuid, 'rohan_m',   'Rohan',   '🏏', 'IN'),
      ('b0000000-0000-4000-8000-000000000033'::uuid, 'ananya_s',  'Ananya',  '🎨', 'IN'),
      ('b0000000-0000-4000-8000-000000000034'::uuid, 'kavya_r',   'Kavya',   '🎶', 'IN'),
      ('b0000000-0000-4000-8000-000000000035'::uuid, 'arjun_v',   'Arjun',   '🚴', 'IN'),
      ('b0000000-0000-4000-8000-000000000036'::uuid, 'sneha_p',   'Sneha',   '🌻', 'IN'),
      ('b0000000-0000-4000-8000-000000000037'::uuid, 'sanjay_k',  'Sanjay',  '🥭', 'IN'),
      ('b0000000-0000-4000-8000-000000000038'::uuid, 'meera_d',   'Meera',   '🪔', 'IN'),
      ('b0000000-0000-4000-8000-000000000039'::uuid, 'rahul_t',   'Rahul',   '🎧', 'IN'),
      ('b0000000-0000-4000-8000-000000000040'::uuid, 'divya_l',   'Divya',   '🦚', 'IN'),
      ('b0000000-0000-4000-8000-000000000041'::uuid, 'sita_g',    'Sita',    '🏔️', 'NP'),
      ('b0000000-0000-4000-8000-000000000042'::uuid, 'dilshan_f', 'Dilshan', '🥥', 'LK'),
      ('b0000000-0000-4000-8000-000000000043'::uuid, 'tariq_m',   'Tariq',   '🏹', 'PK'),
      ('b0000000-0000-4000-8000-000000000044'::uuid, 'sophie_b',  'Sophie',  '🌧️', 'GB'),
      ('b0000000-0000-4000-8000-000000000045'::uuid, 'ethan_w',   'Ethan',   '🏈', 'US'),
      ('b0000000-0000-4000-8000-000000000046'::uuid, 'olivia_j',  'Olivia',  '🦘', 'AU'),
      ('b0000000-0000-4000-8000-000000000047'::uuid, 'yusuf_a',   'Yusuf',   '🌴', 'MY'),
      ('b0000000-0000-4000-8000-000000000048'::uuid, 'amina_d',   'Amina',   '🌍', 'SN'),
      ('b0000000-0000-4000-8000-000000000049'::uuid, 'thabo_m',   'Thabo',   '🦓', 'ZA'),
      ('b0000000-0000-4000-8000-000000000050'::uuid, 'sofia_a',   'Sofía',   '🧉', 'AR')
    ) as b(uid, username, display_name, avatar, country)
  loop
    insert into auth.users (id, email, is_anonymous)
    values (r.uid, r.username || '@bots.ludorumble.app', false)
    on conflict (id) do nothing;
    if v_real_auth then
      execute $q$
        update auth.users set
          instance_id = '00000000-0000-0000-0000-000000000000',
          aud = 'authenticated', role = 'authenticated',
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
          raw_user_meta_data = '{"bot":true}'::jsonb,
          confirmation_token = '', recovery_token = '', email_change_token_new = '',
          email_change = '', email_change_token_current = '', phone_change = '',
          phone_change_token = '', reauthentication_token = '',
          banned_until = 'infinity', updated_at = now()
        where id = $1
      $q$ using r.uid;
    end if;
    insert into public.profiles (uid, username, display_name, avatar, is_guest, is_bot, country, public_id, coins)
    values (r.uid, r.username, r.display_name, r.avatar, false, true, r.country, public.new_public_id(), 0)
    on conflict (uid) do update set
      username = excluded.username, display_name = excluded.display_name,
      avatar = excluded.avatar, is_bot = true, country = excluded.country;
  end loop;
end $$;
