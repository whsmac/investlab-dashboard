# Shared-data owner bootstrap runbook

Status: proposal only. This document does not authorize or perform any Supabase changes.

Target project: `investlab-ledger-test` (`gopofxyezhwpfxbecrxd`).
Never use the existing operating project `whsmac's Project` (`duffpsvaphccgxvkiobm`).

## Current observed state

Read-only inspection on 2026-11-07 found:

- `auth.users` count: 0.
- `public.ledger_transactions`: present, 0 rows, 21 columns, RLS enabled.
- Existing policy on the ledger restricts access to rows where `auth.uid() = user_id`.
- No user-defined functions in `public` or `app_private`; only Supabase Auth helpers appeared in `auth`.
- No user-defined triggers in `public` or `app_private`.
- No `supabase_migrations.schema_migrations` relation was found.
- Five installed extensions: `pg_stat_statements`, `pgcrypto`, `plpgsql`, `supabase_vault`, `uuid-ossp`.

These observations are limited to the read-only catalog queries that were run. Auth provider settings, redirect URLs, SMTP configuration, and dashboard-level security settings have not yet been inspected.

## Safe account setup sequence

1. In the Supabase Dashboard, verify the project selector and confirm the project ID is exactly `gopofxyezhwpfxbecrxd`.
2. Open Authentication settings and inspect (do not change yet):
   - Email provider enabled/disabled.
   - Whether new sign-ups are allowed.
   - Email confirmation requirement.
   - Site URL and redirect URL allowlist.
   - SMTP/email delivery configuration and any rate limits.
3. Decide whether this project should use a single owner account or a controlled invitation flow. Do not enable public sign-up merely to bootstrap the first owner.
4. If the settings are suitable and the project owner explicitly approves account creation, create the intended account through the Supabase Dashboard's supported Auth user flow. Use an email address controlled by the project owner. Do not put passwords, access tokens, service-role keys, or recovery codes in GitHub, SQL files, or chat.
5. Complete the configured email verification step, if required.
6. Retrieve the created user's UUID from the Dashboard. Treat it as an identifier, not as a secret, but do not publish it in repository files.
7. Before granting data-owner rights, re-check the active project ID and confirm the shared-data schema migration has been reviewed and intentionally applied.
8. Only after explicit approval, add that exact Auth UUID to `app_private.data_owners` using a one-time, manually reviewed SQL statement. Do not seed a placeholder UUID or grant owner rights to an unverified account.
9. Verify the owner row and test read/write permissions using the intended authenticated account. Also verify that a different authenticated account cannot write.
10. Record the procedure and outcome without recording credentials or personal data.

## Important migration dependency

The current schema migration creates `app_private.data_owners` and its owner-check helper, but intentionally inserts no owner. Therefore, until a real Auth user is created and explicitly registered, authenticated users can read the shared tables but cannot write.

Do not run an owner-registration statement before the migration has been applied and the account UUID has been verified.

## Explicitly prohibited in this phase

- Do not change the operating Supabase project.
- Do not alter or drop `ledger_transactions`, its columns, data, or RLS policy.
- Do not enable unrestricted public sign-up as a shortcut.
- Do not paste secrets or credentials into SQL, GitHub, or chat.
- Do not apply the schema migration or insert an owner as part of this runbook.
