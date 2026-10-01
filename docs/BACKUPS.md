# Database backups

The Supabase free plan has no managed backups, so `.github/workflows/db-backup.yml`
takes one every day at 02:00 IST. Each backup is an encrypted bundle kept for 30 days
under **Actions → Database backup → a run → Artifacts**.

The app stores nothing in Supabase Storage, so the database dump is the whole backup.

## One-time setup

1. In the Supabase dashboard, click **Connect** and copy the **Session pooler**
   connection string (port `5432`). Replace `[YOUR-PASSWORD]` with the database
   password. Do not use the direct `db.<ref>.supabase.co` string: it is IPv6-only and
   GitHub runners cannot reach it.
2. Generate a long random passphrase and store it somewhere safe, such as a password
   manager. **Without it, the backups cannot be opened.**
3. In GitHub, go to **Settings → Secrets and variables → Actions** and add:
   - `SUPABASE_DB_URL`: the connection string from step 1
   - `BACKUP_PASSPHRASE`: the passphrase from step 2
4. Merge the workflow to `main` (scheduled workflows only run from the default
   branch), then run it once by hand from **Actions → Database backup → Run workflow**.
   Check that it succeeds and shows no warning about `auth.users`.

## Restoring

Restore into a **new** Supabase project first, check it, then point the app at it.
Restoring over a live database overwrites current player data.

Requires `gpg` (included with Git for Windows) and `psql` (PostgreSQL client tools).

```bash
gpg --decrypt ludo-db-YYYYMMDD-HHMM.tar.gz.gpg > backup.tar.gz
tar -xzf backup.tar.gz

psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file backup/roles.sql \
  --file backup/schema.sql \
  --command 'SET session_replication_role = replica' \
  --file backup/data.sql \
  --dbname "<session pooler connection string of the target project>"
```

Afterwards, redeploy the Edge Functions (`supabase functions deploy`) and update
`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` if the project changed.

Source: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
