# AI Investment Cycle Analysis — Data & Metric Design

## Purpose
Provide a quarterly view of hyperscaler capital expenditure, disclosed AI business results, and cycle-risk signals. This module is analytical support, not a buy/sell signal.

## Initial company universe
- Alphabet (Google)
- Amazon
- Microsoft
- Meta Platforms
- Oracle (optional comparison group; keep separate from the initial hyperscaler aggregate until coverage is consistent)

The universe must be configurable. Do not silently treat missing company quarters as zero.

## What the CAPEX series means
The primary comparable series is **company-reported total capital expenditure** from quarterly filings, earnings releases, and investor materials. It is not AI-only CAPEX. Cloud/AI infrastructure is a major driver for some companies, but disclosures differ and company-wide CAPEX includes other assets. The dashboard must label the series “reported total CAPEX” and show company-level lines as well as a coverage-aware aggregate.

AI-specific infrastructure CAPEX may be displayed only as a separate series when the company explicitly discloses it. Estimates must never be mixed into reported totals.

## AI business performance
Capture quarterly AI revenue only when the company explicitly discloses a value and definition. Examples of non-equivalent disclosures include AI product revenue, AI services revenue, AI annualized revenue run rate, cloud AI revenue growth, and AI-related bookings. These must retain their original metric name, period basis, currency, and source. Do not convert growth rates or bookings into revenue.

When no comparable quarterly AI revenue is disclosed, store null and show “not separately disclosed”; do not estimate it from total cloud revenue.

## Metrics
All stored financial amounts use USD millions and fiscal-quarter labels (YYYY-Qn), with fiscal-calendar metadata retained per company.

1. Quarterly CAPEX and trailing-four-quarter CAPEX.
2. CAPEX QoQ and YoY growth.
3. YoY growth acceleration (percentage-point change in YoY growth).
4. Disclosed AI revenue / AI business metric and YoY growth, only for comparable definitions.
5. Trailing-four-quarter disclosed AI revenue divided by trailing-four-quarter CAPEX, labelled **AI revenue-to-total-CAPEX proxy**, never “ROI” or “investment return”. It is not profit, cash flow, or attributable return on AI CAPEX.
6. Market response: adjusted-close total return over selected horizons and excess return versus a benchmark (initially S&P 500), shown separately from operating results and CAPEX. This measures shareholder market performance, not the return earned directly on AI CAPEX.

## Cycle signal
Initial transparent rules:
- Accelerating: CAPEX YoY >= 25% and YoY growth acceleration >= +10 percentage points.
- Decelerating: CAPEX YoY < 0% or YoY growth acceleration <= -10 percentage points.
- Steady: sufficient data, neither condition.
- Insufficient data: no same-quarter-prior-year CAPEX or prior YoY comparison.

These are review flags, not forecasts. Thresholds are configurable and must be reviewed against history before being used as alerts.

## Data contract
Each company-quarter record:
- company, ticker, fiscalQuarter, fiscalYearEnd
- capexUsdM, capexScope (company_total | explicitly_ai_only), capexDefinition
- aiMetricValueUsdM (nullable), aiMetricName, aiMetricBasis (quarterly_revenue | annualized_run_rate | bookings | growth_rate | other)
- currency, sourceName, sourceUrl, sourcePublishedAt, retrievedAt
- reported | estimated, confidence, notes

The calculation module in `src/ai-investment-cycle/metrics.mjs` accepts normalized company-quarter records with `company`, `quarter`, `capexUsdM`, and nullable `aiRevenueUsdM`; it also calculates adjusted-close market return against an aligned benchmark series. It intentionally does not fetch or invent source data.

## Data source hierarchy
1. Company quarterly earnings releases and investor-relations materials.
2. SEC 10-Q / 10-K filings (including cash-flow statement purchases of property and equipment).
3. Earnings-call transcripts only for supplementary AI business metrics; retain exact wording and basis.
4. Third-party estimates only in a separately labelled estimate layer with provider, date, methodology, and confidence.

CAPEX definition differences must be documented. Where the filing reports “purchases of property and equipment” in cash flow, reconcile it to management's stated CAPEX definition; do not assume every company uses an identical definition.

## Next implementation stages
1. Build source-backed quarterly dataset and company fiscal-calendar mapping.
2. Validate CAPEX figures against filings and calculate a consistent reported series.
3. Add disclosed AI revenue/business metric panel with comparability labels.
4. Add share-price performance panel for operating-results-versus-market-response comparison.
5. Add cycle warning panel with missing-data and definition caveats.
6. Integrate as a separate dashboard section only after isolated tests and source validation.

## Safety boundary
No production Supabase schema, Edge Function, or dashboard UI is changed in this first implementation step. No production data is read or modified.
