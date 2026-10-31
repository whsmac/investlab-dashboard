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

## Historical coverage

To calculate 2023 quarterly returns, the import set needs at least one common trading observation on or before 2022-12-31, then sufficient daily observations through the desired end quarter. For all five symbols, use a common source and overlapping date range. Missing periods remain missing; do not interpolate.

## Provider and licensing review (future scale-out only)

A prior review considered Alpha Vantage, Tiingo, Alpaca, and Massive/Polygon. Their free/personal tiers or terms did not establish permission for this private cloud-hosted dashboard's persistence and derived analytics. They are not selected for the Pilot. Revisit only if a future phase explicitly authorizes paid/registered services and their data rights are confirmed.

## Implementation boundary

- CSV parser and tests are isolated in this feature branch.
- No API keys, live price series, vendor connections, Supabase schema, Edge Function, production dashboard, or existing holdings are changed.
- No automated data collection is performed.
- CSV values are not bundled as real market observations; tests use synthetic fixtures.
