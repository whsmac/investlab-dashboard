# Six-company business and market monitor

Updated: 2026-10-31
Status: scope approved; implementation foundation. Live ingestion is gated on a market-data provider and its redistribution/storage rights.

## Product decision

Replace the shareholder-return / SPY-relative / CAPEX-correlation analysis with a simple company monitor. The user wants three directly comparable time series for each company:

1. Share price (daily)
2. Total company capital expenditure (quarterly)
3. Total company revenue (quarterly)

Do not calculate shareholder total return, SPY excess return, CAPEX/price correlations, AI ROI, predictive signals, or buy/sell recommendations in this module.

## Universe

| Company | Symbol / identifier | Listed status |
|---|---|---|
| Microsoft | MSFT | Listed |
| Alphabet (Google) | GOOGL | Listed |
| Amazon | AMZN | Listed |
| Meta Platforms | META | Listed |
| Tesla | TSLA | Listed |
| SpaceX | SPCX | Listed on Nasdaq Global Select Market and Nasdaq Texas from 2026-06-12 |

SpaceX listing is confirmed by its official investor FAQ and IPO closing release, Nasdaq's listing notice, and its SEC Form 10-Q. Do not treat SpaceX as private or substitute a private-market valuation for its traded share price. Historical SPCX price data must begin no earlier than its actual listing date; never join any unrelated historical security that previously used the SPCX symbol.

## Display requirements

- Company selector: All companies or one company.
- Period selector: 1 year, 3 years, 5 years, maximum available.
- Three independent charts with a shared period selection:
  - Daily share price (USD per share, unadjusted close for quoted price; document any provider's split-adjustment convention).
  - Quarterly total CAPEX (USD billions).
  - Quarterly total revenue (USD billions).
- Company comparison table for the latest available period, showing value, previous comparable period, and YoY change.
- Clearly show each metric's latest period and retrieval timestamp.
- Missing or undisclosed values display "미공개" or "자료 없음"; never fabricate or interpolate.
- Financials are quarterly and should not be forward-filled into later quarters. Daily share prices remain daily; chart rendering may downsample visually without altering stored observations.
- Use fiscal quarter labels and disclose fiscal-period differences when they differ from calendar quarters.

## Financial metric definitions

- Revenue: consolidated company-wide revenue, not AI-only or segment revenue.
- CAPEX: cash purchases/additions of property, plant and equipment, using the closest consistently disclosed cash-flow statement concept. Record the original XBRL tag / provider field and definition per company.
- Do not silently mix cash CAPEX with gross PP&E additions or lease additions. If company-specific definitions cannot be reconciled, show the definition/source note and avoid ranking across companies.
- Report quarterly values, not trailing-four-quarter sums, unless the user later requests an additional view.
- Convert financial statement values to USD billions; retain source currency and original units in raw records.

## Automated ingestion architecture

- No manual CSV workflow in the user-facing monitor.
- Market prices: a licensed market-data provider adapter is required for daily history and scheduled updates. Provider selection must confirm symbol coverage (including SPCX), historical depth, corporate-action handling, cloud storage/derived-display rights, rate limits, and pricing.
- Financials: prefer official SEC EDGAR company submissions/XBRL companyfacts for US-listed issuers, supplemented by issuer filings where a tag is missing or company presentation needs interpretation. Use a server-side scheduled job with a descriptive User-Agent and SEC fair-access limits; never fetch SEC data from the browser.
- SEC companyfacts are not a guaranteed uniform CAPEX dataset. Map tags per company and reconcile with the relevant 10-Q/10-K cash-flow statement. Preserve source accession and filing period.
- SpaceX quarterly filings are now available as a public issuer; use its SEC CIK 0001181412. Do not infer missing pre-IPO daily prices.
- Store raw observations with source, source URL/accession, retrieved_at, period_start, period_end, currency, unit, metric_definition, and quality status.
- Normalize and validate before writing to the test database. Production Supabase, existing holdings, and the live dashboard remain untouched until explicit approval.
- Keep provider credentials server-side only (secrets/Edge Function or approved server environment); never commit API keys or expose them in browser JavaScript.
- Do not scrape undocumented endpoints or use sources whose terms prohibit automated collection, cloud retention, or display.

## Validation and quality controls

- Reject duplicate (company, metric, period_end) observations unless the source accession/version is explicitly superseding an earlier filing.
- Preserve restatements and amendments as new source versions; current view selects latest valid filing while audit history remains available.
- Check units, currency, sign, fiscal-period duration, missing quarters, and implausible discontinuities.
- Store reported values separately from normalized USD values and conversion metadata.
- Distinguish zero from missing / not disclosed.
- For stock prices, verify provider symbol mapping and listing start date; corporate-action adjustments must be documented. Price chart is quoted share price, not shareholder total return.
- Display source and last-updated timestamp per panel.

## Implementation sequence

1. Simplify preview UI and metric schema to the six-company / three-metric scope; remove the manual CSV import and shareholder-return analysis from the new monitor.
2. Implement and test SEC financial statement ingestion and per-company XBRL mapping in an isolated server-side job.
3. Select a market-data vendor only after licensing, coverage, and cost review; implement daily price ingestion adapter.
4. Validate data completeness and company-specific CAPEX definitions with filings.
5. Connect to an isolated Supabase test project after work hours; no production changes.
6. Browser visual check and user review; keep all work in a Draft PR until explicit approval.

## Provider decision gate

Automated daily share prices cannot responsibly be enabled until a provider is selected and its rights are confirmed. SEC financial statements can be collected separately from official filings, but this does not solve daily price ingestion. Do not substitute free scraping or manual CSV while presenting the result as automatic.

## Safety boundary

This feature branch and Draft PR are isolated. Do not merge, deploy, alter production Supabase, change existing holdings, or modify the production dashboard without explicit user approval.
