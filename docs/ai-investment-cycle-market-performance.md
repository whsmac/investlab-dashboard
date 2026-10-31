# Market performance data integration design

Updated: 2026-10-31  
Status: quarterly return calculation implemented; **Pilot ingestion uses manual CSV only**. No account, API key, paid subscription, or automated provider connection is required.

## Purpose and scope

Add a shareholder market-performance panel beside, but separate from, the AI CAPEX and business-performance panels.

Initial securities:
- Microsoft (MSFT)
- Alphabet (GOOGL)
- Amazon (AMZN)
- Meta (META)
- SPY as a tradable ETF proxy for the S&P 500 benchmark

SPY is not the S&P 500 index itself. Label it “S&P 500 proxy (SPY)”.

## Pilot data acquisition policy

The Pilot must be usable without creating a data-vendor account, obtaining an API key, or paying a fee.

- Use user-downloaded CSV files from public sources only when the source permits the intended download and private analysis.
- No scraping, undocumented chart endpoints, browser automation, or automatic refresh against sites that prohibit automated collection.
- No live provider adapter, cloud ingestion, or Supabase persistence in this phase.
- The initial import path is local/manual CSV. The user downloads the file through the source's normal website and imports it into the Pilot.
- Before import, record the source name, source URL, retrieval timestamp, currency, adjustment basis, and a short license/usage note.
- A source must explicitly provide adjusted close incorporating both stock splits and cash dividends. If it does not, do not label the data total-return adjusted; keep it out of the quarterly total-return comparison.
- The parser validates the declared adjustment basis but cannot independently prove the source's calculation or grant data rights. The operator must verify the source's terms and field definition.
- If no source meets these requirements without registration, use synthetic fixtures for UI and calculation testing rather than weakening the data-quality rules.

## Initial symbols and benchmark

- MSFT, GOOGL, AMZN, META
- SPY as a tradable ETF proxy, not the official S&P 500 index or its official total-return series.

## Return methodology

- Daily USD adjusted close must incorporate both splits and cash dividends.
- Use the same source and adjustment methodology for all five symbols within a comparison set.
- Quarterly return runs from the last common trading date on or before the preceding calendar-quarter end to the last common trading date on or before the current quarter end.
- Company and SPY observations must use exactly the same start and end dates.
- Excess return is company total return minus SPY proxy total return, in percentage points.
- Do not interpolate missing prices or carry stale observations forward.
- Reject duplicate dates and invalid/non-positive adjusted closes.
- If a quarter-end observation is more than seven calendar days before quarter-end, return a stale-data status.
- Compound quarterly returns for multi-quarter/trailing-year performance; do not sum them.
- These are shareholder market returns, not returns attributable to AI CAPEX. Correlations with CAPEX are descriptive and cannot establish causation.

The calculation helper `deriveQuarterlyMarketPerformance()` in `src/ai-investment-cycle/metrics.mjs` implements quarterly return alignment.

## Manual CSV contract

File header must be exactly:

```csv
ticker,date,adjustedClose
MSFT,2025-01-02,410.50
MSFT,2025-01-03,412.10
```

One file contains one ticker. Dates use US-market session dates in `YYYY-MM-DD`; prices are positive USD decimals without thousands separators.

Import metadata is supplied separately and must include:
- `ticker`
- `source` and HTTPS `sourceUrl`
- `retrievedAt` as an ISO timestamp with timezone
- `currency: "USD"`
- `adjustmentBasis: "split_and_cash_dividends"`
- `licenseNote`, recording the source's applicable usage terms

`src/ai-investment-cycle/market-data-csv.mjs` parses and validates the CSV, sorts observations, rejects duplicate dates and ticker mismatches, and retains provenance. It does not fetch data, infer adjustment methodology, or determine legal permissions.

## Five-symbol import bundle validation

`src/ai-investment-cycle/market-data-bundle.mjs` validates the complete MSFT/GOOGL/AMZN/META/SPY import set before calculating relative returns.

- Requires all five tickers exactly once.
- Requires one common source URL, currency, and split-plus-dividend adjustment declaration across the comparison set.
- Reports per-ticker date coverage, common observation count, and first/last common dates.
- Requires at least one common trading observation on or before 2022-12-31 to establish the baseline for 2023-Q1 returns.
- Only when the bundle passes validation does it derive each company’s quarterly total return and SPY-relative excess return.
- Missing quarters remain unavailable; quarterly return logic retains its stale-observation and common-date checks.

The bundle validator does not download data, validate a provider's legal terms, or independently verify that a vendor's adjusted-close values truly include dividends and splits. It only validates the declared metadata and the imported observations.

## Historical coverage

To calculate 2023 quarterly returns, the import set needs at least one common trading observation on or before 2022-12-31, then sufficient daily observations through the desired end quarter. For all five symbols, use a common source and overlapping date range. Missing periods remain missing; do not interpolate.

## Provider and licensing review (future scale-out only)

A prior review considered Alpha Vantage, Tiingo, Alpaca, and Massive/Polygon. Their free/personal tiers or terms did not establish permission for this private cloud-hosted dashboard's persistence and derived analytics. They are not selected for the Pilot. Revisit only if a future phase explicitly authorizes paid/registered services and their data rights are confirmed.

## Implementation boundary

- CSV parser and tests are isolated in this feature branch.
- No API keys, live price series, vendor connections, Supabase schema, Edge Function, production dashboard, or existing holdings are changed.
- No automated data collection is performed.
- CSV values are not bundled as real market observations; tests use synthetic fixtures.


## Compounded returns and CAPEX-cycle linkage (added 2026-10-31)

`src/ai-investment-cycle/market-cycle-analysis.mjs` adds three calculation-only diagnostics:

- `deriveCompoundedMarketReturns()` compounds quarterly adjusted total returns using multiplication, not addition. It reports cumulative return from the first supplied quarter and trailing-four-quarter company, SPY-proxy, and excess returns. A missing, stale, invalid, or non-contiguous quarter blocks cumulative-from-first output; a trailing-four-quarter result is available only when all four consecutive quarters are valid.
- `deriveCapexMarketLinkage()` aligns company-wide CAPEX YoY growth with same-calendar-quarter shareholder total return and SPY-proxy excess return. It reports exact aligned quarters, sample count, and Pearson correlation only when the configurable minimum observation count is met (default 6). It does not shift quarters, fill gaps, or infer causality.
- `deriveCapexDeceleration()` counts consecutive quarters in which the CAPEX YoY growth rate's acceleration is negative. This means growth is slowing, not necessarily that CAPEX itself is falling. A missing or non-contiguous quarter resets the streak.

All outputs are descriptive diagnostics only. They are not AI-only spending measures, AI CAPEX ROI, predictive indicators, investment-cycle alerts, or buy/sell recommendations. The current history remains short and market prices have not been imported; tests use synthetic observations only. No production UI or live data source is connected.


## Local adjusted-price import and shareholder-return preview (2026-10-31)

The isolated preview now contains a manual five-file CSV import interface for MSFT, GOOGL, AMZN, META, and SPY.

- One normalized CSV per ticker, with exact header `ticker,date,adjustedClose`.
- Shared source name, HTTPS source URL, retrieval timestamp, USD currency, split-and-cash-dividend adjustment declaration, and usage-rights note are required.
- The user must explicitly confirm that the source terms permit the intended download, personal analysis, and local retention, and that adjusted close includes both cash dividends and splits.
- The parser and bundle validator reject missing tickers, mixed sources or adjustment methods, duplicate dates, malformed observations, and missing common pre-2023 baseline coverage.
- On a ready bundle, the preview renders quarterly total return, trailing-four-quarter compounded returns, SPY-proxy excess return, and descriptive same-quarter CAPEX/market-return correlations.
- The five imported files are processed in browser memory only. They are not uploaded, persisted to Supabase, or retained after page refresh.
- The UI does not fetch prices or connect to any provider. The parser's metadata checks do not independently verify vendor data methodology or grant data rights.
- SPY is an ETF proxy, not the official S&P 500 index. Shareholder returns are not AI CAPEX ROI. Correlations are descriptive only and are not predictive or trading signals.

### Source acquisition note

Yahoo's official help page currently says historical CSV downloads require Yahoo Finance Gold and may be unavailable for some instruments because of data licensing restrictions: https://help.yahoo.com/kb/account/account-security-sln2311.html . Do not assume free automated Yahoo downloads or scraping are permitted. Use only a source whose terms explicitly permit the user's intended workflow. If a valid source is unavailable, leave the market-return panel unpopulated rather than weakening the adjustment or rights checks.

### UI limitations

- The current import expects the normalized three-column CSV contract; provider exports must be converted to that format before import.
- One shared source URL is recorded for the five-file comparison bundle.
- The browser-memory import is a preview workflow, not a persistent portfolio database feature.
