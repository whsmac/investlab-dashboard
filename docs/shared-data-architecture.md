# Shared data architecture proposal

Status: Proposed; design only. No database, credentials, production deployment, or application runtime changes are included.
Date: 2026-11-05

## 1. Decision and goal

The long-term INVESTLAB target is a shared, authenticated data service so the same market-price and issuer-financial observations are available from any device after sign-in.

The current six-company preview remains a standalone MVP until the shared-data work is reviewed and explicitly promoted. This proposal does not silently expand PR #27's approved Phase 1 scope.

Primary goals:
- One canonical dataset for all signed-in devices.
- Preserve issuer-reported fiscal-period labels and source provenance.
- Keep market prices and company financials independent of dashboard presentation.
- Support iterative additions of companies, metrics, modules, and analysis without redesigning the database.
- Prevent accidental changes to production dashboard data and existing holdings.
- Make imports validated, repeatable, auditable, and recoverable.

Non-goals for the first shared-data increment:
- Automatic market-price collection or paid market-data APIs.
- Live SEC ingestion or automatic XBRL mapping.
- AI investment-cycle conclusions, alerts, or buy/sell signals.
- Portfolio holdings, account balances, or personally sensitive investment records.
- Production dashboard integration.

## 2. Proposed system boundaries

1. Dashboard UI: renders charts and tables; contains no authoritative dataset.
2. Data access layer: typed/query functions for companies, prices, financial observations, and import history.
3. Validation/import layer: validates CSV content, detects duplicates/conflicts, previews changes, and writes only approved rows.
4. Dedicated Supabase project: PostgreSQL, Supabase Auth, Row Level Security (RLS), and backups.
5. GitHub repository: application source, migrations, tests, and design records; never credentials or user-uploaded data files.

The new Supabase project must be separate from any production Supabase project. It must not reuse production tables, credentials, or service-role keys.

## 3. Logical data model

### companies
- ticker (primary key)
- display_name
- issuer_name
- listing_date (nullable; SPCX listing boundary is 2026-06-12)
- fiscal_calendar_note
- active

This registry allows additional issuers without hard-coding the six-company list into every data table.

### market_price_observations
- id (UUID primary key)
- ticker (foreign key to companies)
- trading_date (date)
- adjusted_close (numeric; strictly positive)
- currency (initially USD)
- price_basis (initially adjusted-close; never mix with unadjusted close)
- source_name
- source_url (HTTPS when present)
- retrieved_at
- import_batch_id
- created_at

Unique logical key: (ticker, trading_date, price_basis). Conflicting values must be reported for review, not silently overwritten.

### quarterly_financial_observations
- id (UUID primary key)
- ticker (foreign key to companies)
- fiscal_period_label (e.g. 2025-Q1; preserve issuer label)
- period_start (nullable)
- period_end (nullable)
- revenue_usd_bn (nullable, non-negative)
- capex_usd_bn (nullable, non-negative)
- capex_definition (required when CAPEX is present)
- source_url (nullable, HTTPS when present)
- source_name (nullable)
- import_batch_id
- revision_number
- is_current
- created_at

A current-record uniqueness constraint should prevent two current records for the same (ticker, fiscal_period_label). Superseded records may be retained for correction history. Do not normalize Microsoft fiscal quarters into calendar quarters by relabeling. If a common calendar comparison is later needed, add explicit period dates/mapping while preserving the reported fiscal label.

### import_batches
- id (UUID primary key)
- import_type (market_prices or quarterly_financials)
- original_filename (metadata only)
- file_sha256
- submitted_by (authenticated user)
- status (validated, committed, rejected, rolled_back)
- row_count, accepted_count, rejected_count
- validation_summary
- created_at, committed_at

The first increment stores normalized rows and import metadata, not the original CSV binary. Raw file retention can be decided separately.

### Future extensibility
New metrics should use explicit metric definitions and units, not overloaded columns or ambiguous generic values. A later metric catalog can define metric key, display name, unit, scope, calculation basis, and comparability notes. Add it when a real second metric family requires it rather than prematurely building a generic analytics platform.

## 4. Authentication and access control

- Enable Supabase Auth; each device signs in to the same account.
- Use authenticated-user RLS policies for reads and writes.
- Initially restrict write/import privileges to the owner's authenticated user ID or an explicit administrator role.
- Do not expose the Supabase service-role key in browser code, HTML, Vercel public environment variables, or Git.
- Browser code may use only the publishable/anon key with RLS enforced.
- Database constraints and policies are the security boundary; client-side validation is usability, not authorization.
- Require HTTPS and keep authentication/session handling within the supported Supabase client.
- Do not add portfolio or personal account data to this public-company dataset.

If multi-user access is later introduced, add explicit roles and tenant ownership before granting access. Do not assume all authenticated users should see or modify every future dataset.

## 5. Import and correction workflow

1. User signs in on any device.
2. UI downloads the current canonical dataset from the database.
3. User selects one or more CSV files.
4. Existing parser validates exact headers, ticker, dates/periods, units, source metadata, duplicates, and overlaps.
5. UI displays a dry-run summary: new rows, exact duplicates, conflicts, invalid rows, and proposed corrections.
6. User confirms the import.
7. Database transaction records the import batch and inserts accepted observations; any failed transaction leaves prior data unchanged.
8. UI refreshes from the canonical database and displays the committed data.
9. Correction imports create a new financial observation revision or require explicit replacement approval; never silently overwrite a historical value.

Market-price duplicate policy:
- Exact same ticker/date/basis/value: deduplicate.
- Same ticker/date/basis but different value: reject as conflict pending explicit correction.
- Different source or adjustment basis: do not merge without an explicit comparison policy.

Financial duplicate policy:
- Exact same ticker/fiscal period/values/definition/source: deduplicate.
- Same ticker/fiscal period with differing values or definitions: reject for review.
- Blank metric may be supplemented only under a documented rule that confirms the new source and does not erase a previously verified value.

## 6. Fiscal-period and source integrity

- Preserve issuer-reported fiscal period labels exactly.
- Microsoft FY2025-Q1 remains distinct from calendar 2025-Q1.
- Keep CAPEX definition per issuer and per observation; Tesla's net-of-sales/ex-finance-lease definition must not be silently treated as identical to gross PP&E purchases from other issuers.
- Store source URL, source name, retrieval time, and import batch for traceability.
- Missing observations remain missing; no interpolation or forward-fill.
- Do not force quarterly rounded values to reconcile exactly to annual totals where the difference is explained by published rounding.
- Never fabricate a source URL or financial value.

## 7. Reliability, backup, and migration

- Keep schema changes as version-controlled SQL migrations.
- Apply migrations first to a non-production development project.
- Test migrations against a disposable database or local Supabase environment before applying them to the shared project.
- Enable database backups appropriate to the selected Supabase plan; also support a periodic CSV export as a portable recovery copy.
- Document restore steps and test a restore before relying on the database.
- Use idempotent migrations and additive schema changes where possible.
- Do not drop or rename columns while an older deployed preview may still use them; use expand/migrate/contract.
- Add automated tests for RLS, duplicate constraints, transaction rollback, fiscal labels, and cross-device read-after-write.

## 8. Deployment and environment separation

- Keep the existing preview URL and Vercel project unchanged during design and implementation.
- Use separate environment variables for local development, shared-data preview, and any future production environment.
- Do not connect the existing production dashboard to the new database as part of the first increment.
- Deploy the shared-data version to a separate preview deployment or isolated route only after schema, auth, and import tests pass.
- No live data provider, scheduled job, SEC fetch, or paid API is introduced by this proposal.

## 9. Incremental implementation plan

### Step A — approve the design
Review this document and confirm the dedicated Supabase project, authentication approach, and initial single-owner write model.

### Step B — schema and security foundation
Create a separate Supabase project only after the owner authorizes project creation and billing/region settings are confirmed. Add migrations, Auth configuration, RLS policies, and schema tests. Do not seed or import data yet.

### Step C — data-access adapter
Add a provider-neutral application interface for loading and writing prices and financial observations. Keep chart components independent of Supabase-specific calls.

### Step D — import preview and transactional persistence
Connect existing CSV parsers to dry-run and confirmed commit flows. Add conflict review, batch history, and safe rollback.

### Step E — cross-device verification
Sign in from two separate devices/browsers, import once, and verify both show the same observations after refresh and re-login. Verify a user without permission cannot write.

### Step F — operational hardening
Test backups/restores, migration rollback strategy, error states, session expiry, and export. Only then consider broader dashboard integration.

## 10. Explicit safety boundaries

Until a separate implementation step is approved:
- PR #27 remains Draft, open, and unmerged.
- PR #24–#26 remain untouched.
- No existing production dashboard, Supabase project, holdings, or production data is modified.
- No Supabase project is created and no credentials are requested or stored.
- No existing Vercel alias or preview deployment is changed.
- No automatic price or SEC data collection is enabled.

## 11. Acceptance criteria for the first shared-data release

- Same signed-in account sees the same canonical price and financial rows on two different devices.
- Refresh and re-login do not lose committed data.
- Unauthenticated users cannot read or write protected data.
- Client code contains no service-role secret.
- Duplicate/conflicting CSV rows are handled according to the policies above.
- Failed import transactions leave prior data unchanged.
- Source, fiscal-period, CAPEX-definition, and import-batch provenance are retained.
- Existing six-company charts render the database data without changing their calculation semantics.
- A documented export and tested restore path exist.
- Existing production dashboard and PR #24–#27 merge states remain unchanged.
