# Six-company chart improvements — Phase 1 (2026-11-22)

Status: approved requirements; implementation pending. Isolated development branch. Do not merge or deploy to production.

## Approved UI behavior
- Multi-select companies: MSFT, GOOGL, AMZN, META, TSLA, SPCX.
- With no benchmark selected: show selected companies' actual USD adjusted-close price series.
- With NASDAQ 100 or S&P 500 selected: switch the **same chart** to base-100 normalized performance for selected companies and benchmarks.
- Deselect all benchmarks to return automatically to actual USD prices.
- Independent multi-select for NASDAQ 100 and S&P 500.
- Avoid misleading mixed units; show mode and units in title and tooltip.
- Price x-axis ticks adapt to selected date range and avoid overlapping labels.
- Mark highest and lowest **daily closing** prices within the selected range with date and price. For multi-company views, avoid label collisions.
- Hover/touch tooltips show date, ticker and value; shared date cursor for multiple series.
- Financial charts show values, revenue/CAPEX/operating income, operating margin, QoQ and YoY when data exists. Operating margin changes are percentage points, not percent. Missing preceding-quarter or prior-year data is not fabricated.

## Benchmark data integrity
- Benchmark data must come from a verified free source with provenance and timestamps; do not substitute ETF prices silently for index values.
- Use a common available start date for comparable base-100 performance and identify mismatched history/listing boundaries (especially SPCX).
- Never extrapolate or forward-fill unavailable benchmark data as actual observations.
- Keep existing TEST-only constraints; no production Supabase changes or paid APIs.

## Acceptance tests
1. TSLA alone -> USD actual price chart.
2. TSLA + MSFT -> both actual USD series.
3. TSLA + NASDAQ 100 -> both normalized to 100 at the stated common baseline.
4. TSLA + NASDAQ 100 + S&P 500 -> three normalized series.
5. Remove all benchmark selections -> USD price mode restored.
6. Date ticks visible for 1Y, 3Y, 5Y; highest/lowest closing price markers correct.
7. Hover and mobile touch reveal date/ticker/value.
8. Financial QoQ/YoY/margin calculations and missing-data cases verified.
9. No writes to Supabase, no changes to production, no PR merges.

## Implementation note
The starting branch is feature/six-company-sec-ingestion, an earlier preview. Before modifying charts, reconcile against the latest approved test UI to avoid overwriting newer work.
