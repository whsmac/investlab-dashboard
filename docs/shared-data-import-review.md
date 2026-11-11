# INVESTLAB shared CSV importer — review gate

Status: DRAFT. No SQL has been executed against Supabase.

## Branch isolation
PR #33 targets PR #30's branch. The original personal dashboard, ledger transactions, production Supabase project, and PR #27–#30 remain unchanged and unmerged.

## Implemented
- Offline strict CSV validation for daily adjusted closes and issuer-specific quarterly revenue/CAPEX.
- Authenticated import preflight that maps ticker to TEST project company IDs and checks existing observation keys.
- An explicit commit API using the atomic Postgres RPC `public.import_shared_observations`.
- Review-only SQL file: `supabase/review-only/20261108_atomic_shared_import_rpc.sql`.
- Unit tests in `tests/shared-data-csv-import-validator.test.mjs` and `tests/shared-data-importer.test.mjs`.

## Not yet complete
- The review-only RPC has NOT been installed on the TEST database.
- No browser import controls are wired to the shared-data page.
- No actual CSV was uploaded to the database.
- Live Postgres transaction/permission testing is pending.

## Deployment checklist — requires user approval
1. Verify the Supabase project ref is exactly `gopofxyezhwpfxbecrxd` (isolated TEST, never the personal production project).
2. Review the SQL file, especially owner-only permission and rollback semantics.
3. Apply the SQL only in the TEST SQL editor after explicit approval.
4. Confirm the authenticated TEST user is registered in `app_private.data_owners`.
5. Test one authorized insert and one intentional duplicate to verify full rollback, then verify the import batch count.
6. Only after success, wire an owner-only browser upload button requiring explicit confirmation.
7. Import previously verified user CSV files; never assume files are in GitHub.

The importer never receives a service_role key. An unprivileged authenticated user may read shared data but the RPC must reject writes.

## Data contracts
Price: `date,ticker,close` (USD adjusted close).
Financial: `ticker,period,revenue_usd_bn,capex_usd_bn,capex_definition,source_url`.
SPCX must not contain a trading date before the verified 2026-06-12 first trading date.

A dry run makes no changes. A commit requires `{commit:true}`, the RPC deployed, and a valid owner session. The RPC is a single database transaction: an error rolls back both the batch record and all observation rows.
