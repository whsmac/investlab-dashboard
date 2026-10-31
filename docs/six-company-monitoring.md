# Six-company business and market monitor

Updated: 2026-10-31
Status: scope approved; free-data-first implementation. Live ingestion must use sources whose terms permit the intended automated retrieval, retention, and display.

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

## Free-first automated ingestion architecture

- The user explicitly prefers free data acquisition; do not select or require a paid market-data subscription or paid API.
- No manual CSV workflow in the user-facing monitor.
- First investigate free sources with documented public endpoints or explicit permission for automated retrieval, retention, and personal dashboard display. Verify six-symbol coverage including SPCX, daily history, refresh cadence, corporate-action fields, rate limits, and terms before implementation.
- Yahoo Finance may be considered only within its documented and permitted access routes. Yahoo Help states historical CSV downloads require Yahoo Finance Gold and that download availability may be restricted by licensing. Yahoo's Japanese Finance support explicitly prohibits automated scraping. The open-source yfinance project states it is unaffiliated with Yahoo, uses publicly available Yahoo endpoints, and that Yahoo Finance data is intended for personal use. Do not treat yfinance as an official Yahoo API or assume its use grants permission for automated server collection, cloud retention, or dashboard display.
- Do not scrape undocumented Yahoo endpoints or evade access controls, rate limits, blocks, or subscription restrictions. If a source's terms prohibit automation, do not use it for scheduled ingestion.
- If no free source with suitable permissions covers all six symbols, report the gap clearly. Do not silently switch to a paid API or unauthorized scraping; ask the user before any paid alternative is considered.
- Financials: use official SEC EDGAR company submissions/XBRL companyfacts and issuer filings for US-listed issuers, subject to SEC fair-access requirements. Use a server-side scheduled job with a descriptive User-Agent; never fetch SEC data from the browser.
- SEC companyfacts are not a guaranteed uniform CAPEX dataset. Map tags per company and reconcile with the relevant 10-Q/10-K cash-flow statement. Preserve source accession and filing period.
- SpaceX quarterly filings are available as a public issuer; use its SEC CIK 0001181412. Do not infer missing pre-IPO daily prices.
- Store raw observations with source, source URL/accession, retrieved_at, period_start, period_end, currency, unit, metric_definition, and quality status.
- Normalize and validate before writing to the test database. Production Supabase, existing holdings, and the live dashboard remain untouched until explicit approval.
- Any provider credentials must remain server-side; never commit API keys or expose them in browser JavaScript.
- Do not use sources whose terms prohibit automated collection, cloud retention, or display.

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
3. Compare free market-data sources and document permission, coverage, reliability, and limitations. Implement only a source with suitable permitted automated access.
4. Validate data completeness and company-specific CAPEX definitions with filings.
5. Connect to an isolated Supabase test project after work hours; no production changes.
6. Browser visual check and user review; keep all work in a Draft PR until explicit approval.

## Provider decision gate

The default is free-only. Daily price automation is not considered complete until a suitable free source is identified and its terms permit the intended automated use. If no such source is available for one or more symbols, mark the coverage gap and request direction rather than using paid data or prohibited scraping.

## Safety boundary

This feature branch and Draft PR are isolated. Do not merge, deploy, alter production Supabase, change existing holdings, or modify the production dashboard without explicit user approval.
