# Shared data CSV validation — isolated development

Branch: `feature/shared-data-csv-import-validation` (based on PR #30; do not merge existing Draft PRs).

The pure validator at `src/shared-data/csv-validator.mjs` accepts only the agreed Phase 1 formats:
- Market prices: `date,ticker,close` (adjusted close, USD)
- Quarterly financials: `ticker,period,revenue_usd_bn,capex_usd_bn,capex_definition,source_url`

Call `validateSharedCsv(csvText, 'market_price' | 'quarterly_financial', registeredTickers)`. It returns accepted and rejected rows, including line numbers and reasons. No writes occur. The caller must obtain registered tickers from `public.companies` and must not silently accept rejected rows.

**Important:** The module is validation groundwork, not an upload button or an importer. Database writes must be a separate, explicitly reviewed step with authenticated owner permissions, a committed `import_batches` record, rollback/transaction behavior, and conflict policy. A browser-side service-role key is prohibited. Existing personal ledger tables are untouched.

Run: `node --test tests/shared-data-csv-validator.test.mjs`.
