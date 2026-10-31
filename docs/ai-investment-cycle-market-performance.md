# Market performance data integration design

Updated: 2026-10-31  
Status: provider-neutral calculation foundation implemented; **market-data vendor not selected** pending explicit confirmation of cloud storage and derived-analytics rights.

## Purpose and scope

Add a shareholder market-performance panel beside, but separate from, the AI CAPEX and business-performance panels.

Initial securities:
- Microsoft (MSFT)
- Alphabet (GOOGL)
- Amazon (AMZN)
- Meta (META)
- SPY as a tradable ETF proxy for the S&P 500 benchmark

SPY is not the S&P 500 index itself. Its adjusted close measures the total return of the ETF, including distributions, and will be labelled “S&P 500 proxy (SPY)” to avoid presenting it as the index's official total-return series.

## Return methodology

- Use daily end-of-day adjusted close values that incorporate both stock splits and cash dividends.
- Use USD and the same provider and adjustment methodology for all five symbols.
- Quarterly return runs from the last common trading date on or before the preceding calendar-quarter end to the last common trading date on or before the current quarter end.
- Company and SPY observations must use exactly the same start and end dates.
- Calculate company total return and SPY proxy total return separately. Excess return is their difference in percentage points, not a ratio.
- Require at least two common valid observations. Do not interpolate missing prices or carry stale observations forward.
- Reject duplicate dates and invalid/non-positive adjusted closes.
- If a quarter-end observation is more than seven calendar days before the quarter-end cutoff, return a stale-data status rather than calculating a return.
- For multi-quarter or trailing-year performance, compound quarterly returns; do not sum them.
- These are shareholder market returns, not returns attributable to AI CAPEX. Correlations with CAPEX are descriptive and cannot establish causation.

The pure helper `deriveQuarterlyMarketPerformance()` in `src/ai-investment-cycle/metrics.mjs` implements the common-date, quarter-end, staleness, and excess-return rules. Unit tests use synthetic prices only; no vendor data is included.

## Normalized input contract

Each daily observation supplied to the calculation layer:

| Field | Requirement |
|---|---|
| ticker | Provider symbol, e.g. MSFT or SPY |
| date | US-market session date, YYYY-MM-DD |
| adjustedClose | Positive USD price adjusted for splits and cash dividends |
| adjustmentBasis | Must explicitly identify split + cash-dividend adjustment |
| source | Provider name and dataset/endpoint |
| retrievedAt | UTC retrieval timestamp |
| currency | USD |

The ingestion adapter must preserve raw provider payloads only to the extent permitted by the selected data license. Provider credentials must remain server-side and must never be committed to GitHub or embedded in browser JavaScript.

## Provider and licensing review

The dashboard is deployed with cloud components, so a provider's “personal use” permission does not automatically establish that its data may be persisted in Supabase or processed by a server-side job. Terms were reviewed on 2026-10-31:

| Provider | Data capability | Key constraint | Decision |
|---|---|---|---|
| Alpha Vantage | Daily Adjusted API includes adjusted close and split/dividend events; 25+ years documented | Its Terms define investment analysis, research, testing and monitoring—even by an individual—as commercial use requiring a separate agreement. Daily Adjusted is a premium endpoint. | Do not use free/personal tier for this project; written commercial-use and cloud-storage terms required. |
| Tiingo | Daily adjusted close includes split and dividend adjustments; long historical coverage | Current Terms restrict Starter/Trial persistence and prohibit certain single-security rebased/indexed price paths or derived products that can reconstruct source data. | Not suitable without a specifically negotiated written license and clarification of permitted performance analytics. |
| Alpaca | Daily bars support `adjustment=all`; Basic feed is IEX, while Algo Trader Plus offers all-US-exchange coverage | Terms limit use to personal/non-commercial purposes, prohibit copying/redistribution to another server without consent, and state service is intended for US residents. The free IEX feed is not a consolidated-market benchmark. | Not suitable for this Korea-based cloud-hosted dashboard absent written authorization and an appropriate feed/license. |
| Massive (formerly Polygon) | Historical daily aggregates; split-adjusted by default | Its market-data FAQ says prices are not dividend-adjusted. Market Data Terms restrict redistribution and derivative works/non-display use without a license. | Not selected; dividend adjustment and derived-analytics rights would need a separate solution/license. |

Official references:
- Alpha Vantage adjusted daily data and API documentation: https://www.alphavantage.co/documentation/
- Alpha Vantage Terms of Service: https://www.alphavantage.co/terms_of_service/
- Tiingo EOD documentation: https://www.tiingo.com/documentation/end-of-day
- Tiingo pricing: https://www.tiingo.com/about/pricing
- Tiingo Terms of Use (updated 2026-10-06): https://app.tiingo.com/tos/
- Alpaca historical data adjustment documentation: https://alpaca.markets/learn/fetch-historical-data
- Alpaca Market Data API plans: https://docs.alpaca.markets/us/docs/about-market-data-api
- Alpaca Terms and Conditions: https://files.alpaca.markets/disclosures/library/TermsAndConditions.pdf
- Massive split/dividend adjustment FAQ: https://polygon.io/knowledge-base/article/is-polygons-stock-data-adjusted-for-splits-or-dividends
- Massive market-data terms: https://polygon.io/terms/market_data_terms.pdf

## Decision gate

Do not connect a vendor, persist market data, or run a live import until the chosen provider confirms in writing that the user's private cloud-hosted dashboard may:
1. retrieve daily US equity and SPY data;
2. persist the licensed observations in the user's private Supabase project;
3. calculate and retain quarterly total returns and benchmark-relative excess returns;
4. display those derived metrics in the user's private dashboard; and
5. retain historical observations for the required analysis period.

A public redistribution license is not required if the app remains strictly private, but the provider must explicitly permit the actual cloud storage and processing arrangement. If the provider does not permit this, use a local-only/manual-import workflow under a suitable data source's terms rather than bypassing the restriction.

## Implementation boundary

- The calculation helper and synthetic tests are isolated in the feature branch.
- No market data API key, live price series, vendor connection, Supabase schema, Edge Function, or production dashboard has been changed.
- No vendor is treated as selected or approved.
- The next implementation step after licensing confirmation is a read-only provider adapter that emits the normalized input contract, followed by a historical data-quality check and only then the market-response analysis.
