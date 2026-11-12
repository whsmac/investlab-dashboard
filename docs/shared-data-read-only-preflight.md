# Shared data schema — read-only Supabase preflight

## Purpose

Before applying the proposed shared-data schema migration, inspect the existing state of the **existing target project** without changing database objects, data, policies, or settings.

- Target: `investlab-ledger-test`
- Project ref: `gopofxyezhwpfxbecrxd`
- Region: `eu-west-1`
- **Never run this against** the operating project `whsmac’s Project` (`duffpsvaphccgxvkiobm`).

## Procedure

1. Open the Supabase Dashboard and verify the project ref in the project selector / URL is exactly `gopofxyezhwpfxbecrxd`.
2. Open SQL Editor. Do not use the operating project's SQL Editor.
3. Run `docs/shared-data-read-only-preflight.sql` as one script.
4. Save/export the result grids or screenshots for review. Do not include secrets or personal user details.
5. In the Dashboard, inspect **Authentication → Users** (record only whether users exist and approximate count) and **Authentication → Providers / URL Configuration** (record enabled providers and relevant redirect configuration; do not change anything).
6. If query 9 reports migration history exists, run the commented history query separately. If it does not exist, record that fact.
7. Return the results for review. Do not apply the migration yet.

## What must be reviewed

- Existing schemas and ownership.
- Existing relations and whether any proposed table names already exist.
- Existing functions, triggers, extensions, RLS state and policies.
- Existing constraints on proposed table names.
- Supabase migration history.
- Auth user count and Dashboard Auth configuration.

## Safety guarantees and limits

- The SQL file contains catalog and count-only `SELECT` statements inside a read-only transaction.
- It does not create/drop/alter objects, write data, change RLS, grant/revoke privileges, or alter Auth settings.
- The Auth user query returns only a count. If access is denied, do not broaden permissions; inspect the Dashboard instead.
- This preflight is not a migration and does not prove that the proposed migration is safe until its results have been reviewed.
- The migration in PR #29 remains unapplied. Do not merge PR #29 or apply any migration as part of this step.
