# INVESTLAB shared-data atomic import — deployment checklist

**Status: draft; TEST project only; do not apply automatically.**

## Files
- `src/shared-data/csv-import-validator.mjs`: pure CSV parser and validation.
- `src/shared-data/shared-importer.mjs`: authenticated dry-run, duplicate checks, explicit atomic RPC call.
- `supabase/review-only/20261108_atomic_shared_import_rpc.sql`: transaction-scoped PostgreSQL RPC; **not deployed**.

## Safety and deployment
1. Verify target project URL is exactly `https://gopofxyezhwpfbxebcrxd.supabase.co`; never apply to the personal ledger project.
2. Inspect SQL, privileges, and current schema. Obtain explicit user approval before applying this script in the TEST SQL Editor.
3. Use only publishable/anon key and authenticated owner login in the browser. Never use a service-role key.
4. Verify non-owner is rejected and owner can import a *small disposable test sample*. Confirm batch count and row count match.
5. Repeated import must fail on unique key collision, leaving no new batch or partial observations. Test invalid CAPEX definition and prelisting SPCX price.
6. Do not import user CSV until the test has passed. Never overwrite conflicting historical observations.

## CSV headers
Prices: `date,ticker,close` (USD adjusted close).
Quarterly: `ticker,period,revenue_usd_bn,capex_usd_bn,capex_definition,source_url`.
SpaceX SPCX starts **2026-06-12**; earlier SPCX ticker data belongs to a different security.

## Caveats
- The importer has not been integrated into a browser upload UI. Unit tests use mocked Supabase client responses.
- The SQL function has not yet been executed against PostgreSQL. Its transaction and RLS behavior require integration testing before deployment.
- The dry-run collision preflight is advisory; database uniqueness and atomic transaction remain authoritative.
- This PR is stacked on draft PR #30 and does not merge or modify production.
